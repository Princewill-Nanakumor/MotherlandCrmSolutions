import type { CreateEmailResponse } from "resend";

/** Resend returns `{ data, error }` and does not throw on 4xx API errors. */
export function resendEmailOk(result: CreateEmailResponse): boolean {
  return result.error === null && Boolean(result.data?.id);
}

export function logResendFailure(
  context: string,
  result: CreateEmailResponse,
): void {
  if (result.error) {
    console.error(
      `[${context}] Resend API error:`,
      result.error.name,
      "-",
      result.error.message,
    );
  } else {
    console.error(`[${context}] Resend: missing email id`, result);
  }
}

/**
 * Short hint for the client when verification (or similar) mail failed.
 * Always prefer Resend's own message so operators can see domain / from / key issues.
 */
export function resendEmailFailureHint(
  result: CreateEmailResponse | null,
  sendException: string | null,
): string | null {
  const err = result?.error;
  if (err) {
    const raw = (err.message ?? "").trim();
    const msg = raw.toLowerCase();
    if (
      err.name === "validation_error" &&
      (msg.includes("only send testing") ||
        msg.includes("your own email") ||
        msg.includes("verify a domain"))
    ) {
      return "Resend is in test mode: verification email can only be sent to the email address on your Resend account. Either sign up with that address, or verify a domain at resend.com/domains and set RESEND_FROM to a sender on that domain.";
    }
    if (
      msg.includes("domain") &&
      (msg.includes("not verified") ||
        msg.includes("unverified") ||
        msg.includes("verify"))
    ) {
      return `Email sender domain is not verified in Resend. Verify your RESEND_FROM / RESEND_FROM_VERTEX domain at resend.com/domains, then retry. ${raw}`;
    }
    if (raw) {
      return `Verification email failed: ${raw} Fix mail settings, then try signing up again or contact support.`;
    }
  }
  if (sendException?.trim()) {
    return `The mail provider returned an unexpected error (${sendException.trim()}). Try again later or contact support.`;
  }
  return "Verification email could not be sent. Check RESEND_API_KEY / RESEND_FROM on the server, or contact support.";
}
