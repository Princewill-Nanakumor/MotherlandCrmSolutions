/**
 * Human-facing header examples (all casings). Matching itself is
 * case-insensitive via normalizeText — these lists drive UI copy and
 * error suggestions so users see Phone, Phone Number, Email Address, etc.
 */

export const IMPORT_NAME_HEADERS = [
  "Name",
  "name",
  "Full Name",
  "Full name",
  "full name",
  "FULL NAME",
] as const;

export const IMPORT_FIRST_NAME_HEADERS = [
  "First Name",
  "First name",
  "first name",
  "Firstname",
  "Given Name",
] as const;

export const IMPORT_LAST_NAME_HEADERS = [
  "Last Name",
  "Last name",
  "last name",
  "Lastname",
  "Surname",
  "Family Name",
] as const;

export const IMPORT_EMAIL_HEADERS = [
  "Email",
  "email",
  "EMAIL",
  "Email Address",
  "Email address",
  "email Address",
  "email address",
  // Common sheet typo (double L)
  "Emaill Address",
  "Emaill address",
  "emaill Address",
  "emaill address",
  "E-mail",
  "E-mail Address",
  "Emails",
] as const;

export const IMPORT_PHONE_HEADERS = [
  "Phone",
  "phone",
  "PHONE",
  "Phone Number",
  "Phone number",
  "phone Number",
  "phone number",
  "Phone No",
  "Mobile",
  "Cell",
] as const;

export const IMPORT_COUNTRY_HEADERS = [
  "Country",
  "country",
  "COUNTRY",
] as const;

export const IMPORT_SOURCE_HEADERS = [
  "Source",
  "source",
  "Lead Source",
  "Origin",
] as const;
