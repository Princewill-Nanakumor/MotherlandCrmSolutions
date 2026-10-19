/**
 * Short strings returned from Credentials `authorize()` when email is not
 * verified. Sign-in UI maps these to human copy.
 */
export const CRED_EMAIL_VERIFY_PENDING_ADMIN = "CRED_EMAIL_VERIFY_PENDING_ADMIN";
export const CRED_EMAIL_VERIFY_EXPIRED_ADMIN = "CRED_EMAIL_VERIFY_EXPIRED_ADMIN";
export const CRED_EMAIL_VERIFY_PENDING_AGENT = "CRED_EMAIL_VERIFY_PENDING_AGENT";
export const CRED_EMAIL_VERIFY_EXPIRED_AGENT = "CRED_EMAIL_VERIFY_EXPIRED_AGENT";

export function isCredEmailVerifyCode(code: string): boolean {
  return (
    code === CRED_EMAIL_VERIFY_PENDING_ADMIN ||
    code === CRED_EMAIL_VERIFY_EXPIRED_ADMIN ||
    code === CRED_EMAIL_VERIFY_PENDING_AGENT ||
    code === CRED_EMAIL_VERIFY_EXPIRED_AGENT
  );
}

/** User-facing copy for the sign-in form (never show raw codes). */
export function humanMessageForCredEmailVerifyCode(
  code: string,
  displayName = "this CRM",
): string {
  switch (code) {
    case CRED_EMAIL_VERIFY_PENDING_ADMIN:
      return `Please verify your email before signing in. Open the link we sent from ${displayName}.`;
    case CRED_EMAIL_VERIFY_EXPIRED_ADMIN:
      return "Your verification link has expired or is no longer valid. Open an old verification email to request a new link, or contact support.";
    case CRED_EMAIL_VERIFY_PENDING_AGENT:
      return `Please verify your email before signing in. Open the link we sent from ${displayName}, or ask your administrator for help.`;
    case CRED_EMAIL_VERIFY_EXPIRED_AGENT:
      return "Your verification link has expired or is no longer valid. Ask your administrator for a new link, or contact support.";
    default:
      return code;
  }
}
