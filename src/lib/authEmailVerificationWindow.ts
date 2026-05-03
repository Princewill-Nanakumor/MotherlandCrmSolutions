/**
 * Whether the user still has an *unexpired* email-verification invite in the DB.
 * Used at login to choose copy: "open the link we sent" vs "link expired, resend".
 */
export function hasActiveEmailVerificationInvite(user: {
  emailVerified?: boolean | null;
  verificationToken?: string | null;
  verificationExpires?: Date | null;
}): boolean {
  if (user.emailVerified === true) return false;
  const tok = user.verificationToken;
  if (tok == null || String(tok).trim() === "") return false;
  const expRaw = user.verificationExpires;
  const exp =
    expRaw instanceof Date
      ? expRaw
      : expRaw != null
        ? new Date(expRaw as string | number)
        : null;
  if (!exp || Number.isNaN(exp.getTime())) return false;
  return exp.getTime() > Date.now();
}
