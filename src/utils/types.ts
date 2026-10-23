// src/utils/types.ts
export const headerMappings = {
  name: [
    "name",
    "full name",
    "Full name",
    "Full Name",
    "contact name",
    "customer name",
    "client name",
    "firstname",
    "first name",
    "lastname",
    "last name",
    "surname",
    "Name",
    "NAME",
    "First Name",
    "Last Name",
    "FIRST NAME",
    "LAST NAME",
  ],
  email: [
    "email",
    "email address",
    "mail",
    "e-mail",
    "contact email",
    "customer email",
    "emailaddress",
    "Email",
    "EMAIL",
    "Email Address",
  ],
  phone: [
    "phone",
    "phone number",
    "Phone number",
    "Phone Number",
    "contact number",
    "mobile",
    "telephone",
    "tel",
    "contact phone",
    "Phone",
    "PHONE",
    "Mobile",
  ],
  source: [
    "company",
    "Source",
    "source",
    "organization",
    "organisation",
    "business name",
    "company name",
    "Company",
    "COMPANY",
  ],
  status: ["status", "lead status", "contact status", "Status", "STATUS"],
  country: ["country", "nation", "location", "Country", "COUNTRY"],
  comments: ["comments", "notes", "description", "Comments", "COMMENTS"],
} as const;

export const DEFAULT_STATUS = "NEW" as const;

export type ContactField = keyof typeof headerMappings;
export type ValidStatus =
  | "NEW"
  | "CONTACTED"
  | "IN_PROGRESS"
  | "QUALIFIED"
  | "LOST"
  | "WON";

export interface LeadRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  source?: string;
  status: ValidStatus;
  country?: string;
  comments?: string;
}

export interface ExcelRow {
  [key: string]: string | number | undefined;
}
