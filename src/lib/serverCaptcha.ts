import crypto from "crypto";
import { tryConsumeCaptchaSignatureOnce } from "@/lib/captchaConsumeStore";

/**
 * Which HttpOnly captcha cookie a route reads/writes.
 * - `login`: NextAuth + signup/forgot/reset (shared `ml_captcha_v1`).
 * - `resend`: `/api/auth/resend-verification` only (`ml_captcha_resend_v1`).
 */
export type CaptchaCookieKind = "login" | "resend";

const COOKIE_NAMES: Record<CaptchaCookieKind, string> = {
  login: "ml_captcha_v1",
  resend: "ml_captcha_resend_v1",
};

/** HttpOnly cookie for login-related auth (default). */
export const CAPTCHA_COOKIE_NAME = COOKIE_NAMES.login;

/** HttpOnly cookie for resend-verification only (independent of login). */
export const CAPTCHA_COOKIE_NAME_RESEND = COOKIE_NAMES.resend;

/** Server-authoritative captcha lifetime. Keep clients aligned to this. */
export const CAPTCHA_TTL_SECONDS = 120;
const TTL_MS = CAPTCHA_TTL_SECONDS * 1000;

/** Extra buffer after cookie expiry so distributed consume keys remain unique until TTL cleanup. */
const CONSUME_GRACE_MS = 30_000;

/** Hard cap so a hostile client cannot make us HMAC megabytes of data. */
const MAX_RAW_COOKIE_LENGTH = 4096;

function cookieName(kind: CaptchaCookieKind): string {
  return COOKIE_NAMES[kind];
}

/** Captcha validation failed before or during consume (see `replay`). */
export type CaptchaFailureReason =
  | "invalid_answer_format"
  | "missing_cookie"
  | "malformed_cookie"
  | "signature_invalid"
  | "wrong_code"
  | "expired"
  /** Distributed store rejected reuse of an already-consumed signature. */
  | "replay";

/** User-safe copy for APIs and NextAuth `authorize` errors. */
export function captchaUserMessage(reason: CaptchaFailureReason): string {
  switch (reason) {
    case "invalid_answer_format":
      return "Enter exactly 6 digits for the security code.";
    case "missing_cookie":
      return "Security check was not started or the browser dropped the cookie. Click “I'm not a robot” and try again.";
    case "malformed_cookie":
      return "Security check data was invalid. Click “I'm not a robot” to get a new code.";
    case "signature_invalid":
      return "Security check could not be verified (wrong secret or tampered cookie). Refresh the page and start the check again.";
    case "wrong_code":
      return "That code does not match the digits shown. Check the code and try again.";
    case "expired":
      return "That security code has expired. Click “I'm not a robot” to get a new code.";
    case "replay":
      return "This security code was already used. Click “I'm not a robot” for a new code.";
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

/** Captcha cookies are signed with the same secret NextAuth uses. */
function signingSecret(): string {
  const s = process.env.NEXTAUTH_SECRET?.trim();
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("Set NEXTAUTH_SECRET for server captcha.");
  }
  return s || "dev-captcha-secret-not-for-production";
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function issueCaptchaPayload(): { cookieValue: string; masked: string } {
  const digits = Array.from({ length: 6 }, () =>
    crypto.randomInt(0, 10),
  ).join("");
  const exp = Date.now() + TTL_MS;
  // `n` is a per-issue nonce so two cookies issued back-to-back never share a signature.
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = JSON.stringify({ c: digits, e: exp, n: nonce });
  const secret = signingSecret();
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const cookieValue = `${Buffer.from(payload, "utf8").toString("base64url")}.${sig}`;
  return {
    cookieValue,
    masked: digits.split("").join(" "),
  };
}

/**
 * Cookie is scoped to /api/auth so unrelated requests never see or clobber it.
 */
export function buildCaptchaSetCookieHeader(
  cookieValue: string,
  kind: CaptchaCookieKind = "login",
): string {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${cookieName(kind)}=${encodeURIComponent(cookieValue)}`,
    "Path=/api/auth",
    `Max-Age=${CAPTCHA_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/** Emit a Set-Cookie header that immediately clears the captcha cookie for `kind`. */
export function buildClearCaptchaCookieHeader(
  kind: CaptchaCookieKind = "login",
): string {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${cookieName(kind)}=`,
    "Path=/api/auth",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function readCaptchaCookieValue(
  cookieHeader: string | null,
  kind: CaptchaCookieKind,
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const prefix = `${cookieName(kind)}=`;
  for (const p of parts) {
    if (p.startsWith(prefix)) {
      return decodeURIComponent(p.slice(prefix.length));
    }
  }
  return null;
}

export type CaptchaEvaluation =
  | { ok: true; sig: string }
  | { ok: false; reason: CaptchaFailureReason };

/**
 * Validates cookie + 6-digit answer without consuming. Use for NextAuth
 * before password check, or to surface precise failure reasons in APIs.
 */
export function evaluateCaptchaCookie(
  cookieHeader: string | null,
  answer: string,
  kind: CaptchaCookieKind = "login",
): CaptchaEvaluation {
  let secret: string;
  try {
    secret = signingSecret();
  } catch {
    return { ok: false, reason: "signature_invalid" };
  }

  const trimmed = typeof answer === "string" ? answer.trim() : "";
  if (!trimmed || trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
    return { ok: false, reason: "invalid_answer_format" };
  }

  const raw = readCaptchaCookieValue(cookieHeader, kind);
  if (!raw) return { ok: false, reason: "missing_cookie" };
  if (raw.length > MAX_RAW_COOKIE_LENGTH) return { ok: false, reason: "malformed_cookie" };

  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return { ok: false, reason: "malformed_cookie" };
  const b64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);

  let payload: string;
  try {
    payload = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return { ok: false, reason: "malformed_cookie" };
  }
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  if (!timingSafeEqualHex(expectedSig, sig)) {
    return { ok: false, reason: "signature_invalid" };
  }

  let parsed: { c?: string; e?: number; n?: string };
  try {
    parsed = JSON.parse(payload) as { c?: string; e?: number; n?: string };
  } catch {
    return { ok: false, reason: "malformed_cookie" };
  }
  if (typeof parsed.c !== "string" || typeof parsed.e !== "number") {
    return { ok: false, reason: "malformed_cookie" };
  }

  if (parsed.c !== trimmed) {
    return { ok: false, reason: "wrong_code" };
  }
  if (Date.now() > parsed.e) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, sig };
}

/**
 * Returns the captcha signature string if the cookie + answer are valid.
 * Does not check or record consumption (use after successful credential check
 * to call {@link tryConsumeCaptchaSignatureOnce} from `@/lib/captchaConsumeStore`).
 * Uses the **login** cookie only (NextAuth credentials).
 */
export function extractValidCaptchaSignature(
  cookieHeader: string | null,
  answer: string,
): string | null {
  const r = evaluateCaptchaCookie(cookieHeader, answer, "login");
  return r.ok ? r.sig : null;
}

/** TTL passed to distributed captcha consume (Mongo / optional Upstash). */
export function captchaConsumeTtlMs(): number {
  return TTL_MS + CONSUME_GRACE_MS;
}

export type CaptchaVerifyResult =
  | { ok: true }
  | { ok: false; reason: CaptchaFailureReason; message: string };

/**
 * Validates the captcha cookie and atomically marks it consumed across
 * instances (MongoDB, or Upstash when `UPSTASH_REDIS_*` is configured).
 */
export async function verifyAndConsumeCaptchaCookieAsync(
  cookieHeader: string | null,
  answer: string,
  kind: CaptchaCookieKind = "login",
): Promise<CaptchaVerifyResult> {
  const ev = evaluateCaptchaCookie(cookieHeader, answer, kind);
  if (!ev.ok) {
    return { ok: false, reason: ev.reason, message: captchaUserMessage(ev.reason) };
  }
  const consumed = await tryConsumeCaptchaSignatureOnce(
    ev.sig,
    captchaConsumeTtlMs(),
  );
  if (!consumed) {
    return {
      ok: false,
      reason: "replay",
      message: captchaUserMessage("replay"),
    };
  }
  return { ok: true };
}
