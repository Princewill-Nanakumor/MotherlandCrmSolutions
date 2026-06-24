/**
 * Shared branding and URLs for auth-related emails (Resend).
 * Override via env in production (verified sender domain, public URL).
 *
 * Resend returns `{ data, error }` (no throw on API errors) — use
 * `resendEmailOk` from `@/lib/resendSend` after `emails.send`.
 *
 * With the default dev sender `onboarding@resend.dev`, Resend only delivers
 * to addresses you are allowed to test with (see Resend dashboard / docs).
 * Production needs `RESEND_FROM` on a verified domain.
 */
import { getServerAppBranding } from "@/lib/appBranding";

export const APP_DISPLAY_NAME = getServerAppBranding().displayName;

export function isProductionDeployment(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * When true, new signups get a verification email and must verify before
 * ADMIN credential login (requires Resend). Default is **on** in all
 * environments; set `REQUIRE_EMAIL_VERIFICATION=false` only for local/demo
 * without mail.
 */
export function shouldRequireEmailVerification(): boolean {
  const v = process.env.REQUIRE_EMAIL_VERIFICATION?.trim().toLowerCase();
  if (v === "false") return false;
  if (v === "true") return true;
  return true;
}

/** Returns an error message if outbound auth email cannot be sent, else null. */
export function assertAuthEmailConfigured(): string | null {
  if (!process.env.RESEND_API_KEY?.trim()) {
    return "Email service is not configured.";
  }
  if (isProductionDeployment() && !process.env.RESEND_FROM?.trim()) {
    return "Email sender (RESEND_FROM) is not configured for production.";
  }
  return null;
}

export function getPublicAppOrigin(): string {
  const raw =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Validates URL is http(s) with URL parser, then escapes for safe HTML text/href.
 * Rejects javascript:, data:, etc.
 */
export function safeEmailHttpUrl(url: string): string {
  try {
    const u = new URL(String(url).trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return escapeHtml("#");
    }
    return escapeHtml(u.toString());
  } catch {
    return escapeHtml("#");
  }
}

export function getResendFrom(): string {
  const from = process.env.RESEND_FROM?.trim();
  if (from) return from;
  if (isProductionDeployment()) {
    throw new Error(
      "RESEND_FROM must be set in production (verified domain in Resend).",
    );
  }
  return `${getServerAppBranding().shortName} <onboarding@resend.dev>`;
}

export function getResendReplyTo(): string {
  return (
    process.env.RESEND_REPLY_TO?.trim() ||
    getServerAppBranding().supportEmail
  );
}

export function hasResendApiKey(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function brandNameHtml(): string {
  return escapeHtml(APP_DISPLAY_NAME);
}

const EMAIL_STYLES = {
  wrap: `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;`,
  card: `border: 1px solid #e5e5e5; border-radius: 16px; padding: 40px; background: white;`,
  logoRow: `text-align: left; margin-bottom: 20px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px; display: inline-block;`,
  brandGradient: `background: linear-gradient(to right, #4f46e5, #059669);`,
  brandText: `font-size: 24px; font-weight: bold; background: linear-gradient(to right, #4f46e5, #059669); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;`,
  h1: `color: #1a1a1a; font-size: 28px; font-weight: bold; margin-bottom: 20px;`,
  p: `color: #1a1a1a; font-size: 16px; line-height: 24px; margin-bottom: 16px;`,
  muted: `color: #666666; font-size: 14px; line-height: 20px;`,
  button: `background: linear-gradient(to right, #4f46e5, #059669); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: 500; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.15);`,
};

function emailShell(inner: string): string {
  const year = new Date().getFullYear();
  return `
<div style="${EMAIL_STYLES.wrap}">
  <div style="${EMAIL_STYLES.card}">
    <div style="${EMAIL_STYLES.logoRow}">
      <div style="display: inline-flex; align-items: center; gap: 12px;">
        <div style="padding: 8px; ${EMAIL_STYLES.brandGradient}; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);">
          <span style="color: white; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">M</span>
        </div>
        <div style="${EMAIL_STYLES.brandText}">${brandNameHtml()}</div>
      </div>
    </div>
    ${inner}
    <div style="border-top: 1px solid #e5e5e5; margin-top: 32px; padding-top: 20px; text-align: center;">
      <p style="color: #888888; font-size: 12px; line-height: 18px;">
        © ${year} ${brandNameHtml()}
      </p>
    </div>
  </div>
</div>`;
}

export function createVerificationEmailHtml(
  name: string,
  verificationUrl: string,
): string {
  const safeName = escapeHtml(name);
  const href = safeEmailHttpUrl(verificationUrl);
  const body = `
    <h1 style="${EMAIL_STYLES.h1}">Welcome to ${brandNameHtml()}</h1>
    <p style="${EMAIL_STYLES.p}">
      Hello ${safeName},<br>
      Thank you for signing up. Confirm your account by clicking the button below:
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${href}" style="${EMAIL_STYLES.button}">Verify email</a>
    </div>
    <div style="border-top: 1px solid #e5e5e5; margin-top: 24px; padding-top: 16px;">
      <p style="${EMAIL_STYLES.muted} margin-bottom: 12px;">This link expires in 7 days.</p>
      <p style="${EMAIL_STYLES.muted}">
        If you did not create an account with ${brandNameHtml()}, you can ignore this email.
      </p>
    </div>
  `;
  return emailShell(body);
}

export function createPasswordResetEmailHtml(
  firstName: string,
  resetUrl: string,
): string {
  const safeFirst = escapeHtml(
    String(firstName ?? "")
      .trim() || "there",
  );
  const href = safeEmailHttpUrl(resetUrl);
  const urlText = safeEmailHttpUrl(resetUrl);
  const body = `
    <h1 style="${EMAIL_STYLES.h1}">Reset your password</h1>
    <p style="${EMAIL_STYLES.p}">Hello ${safeFirst},</p>
    <p style="${EMAIL_STYLES.p}">
      We received a request to reset the password for your ${brandNameHtml()} account.
      Use the button below to choose a new password:
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${href}" style="${EMAIL_STYLES.button}">Reset password</a>
    </div>
    <div style="border-top: 1px solid #e5e5e5; margin-top: 24px; padding-top: 16px;">
      <p style="${EMAIL_STYLES.muted} margin-bottom: 12px;">This link expires in 1 hour.</p>
      <p style="${EMAIL_STYLES.muted} margin-bottom: 12px;">
        If you did not request a reset, you can ignore this email.
      </p>
      <p style="${EMAIL_STYLES.muted}">If the button does not work, copy this URL:</p>
      <p style="color: #4f46e5; font-size: 12px; line-height: 18px; word-break: break-all; margin-top: 8px;">
        ${urlText}
      </p>
    </div>
  `;
  return emailShell(body);
}
