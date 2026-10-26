/** Digits-only form of a phone for duplicate comparison. */
export function phoneDigitsOnly(phone: unknown): string {
  return String(phone ?? "").replace(/\D/g, "");
}

/** Enough digits to bother checking (matches secondary-phone validation floor). */
export function isCheckablePhone(phone: unknown): boolean {
  return phoneDigitsOnly(phone).length >= 3;
}

/**
 * Regex that matches a stored phone when its digits equal `digits` in order,
 * ignoring formatting characters between them.
 */
export function buildPhoneDigitsMatchRegex(digits: string): RegExp {
  const safe = digits.replace(/\D/g, "");
  if (!safe) return /^$/;
  return new RegExp(`^\\D*${safe.split("").join("\\D*")}\\D*$`);
}
