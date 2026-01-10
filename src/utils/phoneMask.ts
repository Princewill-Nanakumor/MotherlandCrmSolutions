/**
 * Masks a phone number, showing only the last 4 digits
 * Example: +1234567890 -> *******7890
 * Example: 1234567890 -> ******7890
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone || phone.trim() === "") {
    return "Not provided";
  }

  // Remove all spaces and formatting for consistent masking
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");

  // If the number is 4 digits or less, show all asterisks
  if (cleaned.length <= 4) {
    return "*".repeat(cleaned.length);
  }

  // Show last 4 digits, mask the rest with asterisks
  const last4 = cleaned.slice(-4);
  const maskedLength = cleaned.length - 4;
  const masked = "*".repeat(maskedLength);

  return `${masked}${last4}`;
}

/**
 * Masks an email address, showing only the first 2 characters before @ and the full domain
 * Example: john.doe@example.com -> jo***@example.com
 * Example: user@domain.com -> us***@domain.com
 * Example: a@b.com -> ***@b.com (if local part is too short)
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || email.trim() === "") {
    return "Not provided";
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Check if email contains @
  const atIndex = trimmedEmail.indexOf("@");
  if (atIndex === -1) {
    // Not a valid email format, mask the whole thing except first 2 chars
    if (trimmedEmail.length <= 2) {
      return "*".repeat(trimmedEmail.length);
    }
    const first2 = trimmedEmail.slice(0, 2);
    const maskedLength = trimmedEmail.length - 2;
    const masked = "*".repeat(Math.max(3, maskedLength)); // At least 3 asterisks
    return `${first2}${masked}`;
  }

  const localPart = trimmedEmail.slice(0, atIndex);
  const domain = trimmedEmail.slice(atIndex); // Includes @

  // If local part is 2 characters or less, show all asterisks
  if (localPart.length <= 2) {
    const masked = "*".repeat(Math.max(3, localPart.length)); // At least 3 asterisks
    return `${masked}${domain}`;
  }

  // Show first 2 characters, mask the rest
  const first2 = localPart.slice(0, 2);
  const maskedLength = localPart.length - 2;
  const masked = "*".repeat(Math.max(3, maskedLength)); // At least 3 asterisks

  return `${first2}${masked}${domain}`;
}
