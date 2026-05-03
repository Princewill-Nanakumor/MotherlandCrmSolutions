import { NextResponse } from "next/server";
import {
  buildCaptchaSetCookieHeader,
  CAPTCHA_TTL_SECONDS,
  issueCaptchaPayload,
  type CaptchaCookieKind,
} from "@/lib/serverCaptcha";
import { rateLimitEnhanced } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Issues a 6-digit captcha stored in an HttpOnly signed cookie.
 * Call with `credentials: "include"` before submitting auth forms.
 *
 * - Default / no query: **login** cookie (`ml_captcha_v1`) — NextAuth, signup, forgot, reset.
 * - `?purpose=resend`: **resend** cookie (`ml_captcha_resend_v1`) — resend-verification only,
 *   so it never shares or overwrites the login captcha on the same page.
 */
export async function GET(req: Request) {
  if (!rateLimitEnhanced(req, 40, 60_000)) {
    return NextResponse.json(
      { error: "Too many captcha requests. Try again shortly." },
      {
        status: 429,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }

  const purpose = new URL(req.url).searchParams.get("purpose");
  const kind: CaptchaCookieKind = purpose === "resend" ? "resend" : "login";

  try {
    const { cookieValue, masked } = issueCaptchaPayload();
    const res = NextResponse.json({
      ok: true,
      masked,
      expiresIn: CAPTCHA_TTL_SECONDS,
    });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    res.headers.set("Pragma", "no-cache");
    res.headers.append(
      "Set-Cookie",
      buildCaptchaSetCookieHeader(cookieValue, kind),
    );
    return res;
  } catch (e) {
    console.error("captcha-issue:", e);
    return NextResponse.json(
      { error: "Captcha could not be issued. Check server configuration." },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}
