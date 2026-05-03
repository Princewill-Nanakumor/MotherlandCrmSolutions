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
 * Covers Resend sandbox: test `from` only allows the account owner inbox.
 */
export function resendEmailFailureHint(
  result: CreateEmailResponse | null,
  sendException: string | null,
): string | null {
  const err = result?.error;
  if (err) {
    const msg = (err.message ?? "").toLowerCase();
    if (
      err.name === "validation_error" &&
      (msg.includes("only send testing") ||
        msg.includes("your own email") ||
        msg.includes("verify a domain"))
    ) {
      return "Resend is in test mode: verification email can only be sent to the email address on your Resend account. Either sign up with that address, or verify a domain at resend.com/domains and set RESEND_FROM to a sender on that domain.";
    }
  }
  if (sendException?.trim()) {
    return "The mail provider returned an unexpected error. Use “Resend verification” on the sign-in page, or try again later.";
  }
  return null;
}
