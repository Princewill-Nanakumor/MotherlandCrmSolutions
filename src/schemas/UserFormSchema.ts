import * as z from "zod";

// Password validation rules
const passwordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine(
    (val) => /[A-Z]/.test(val),
    "Password must contain at least one uppercase letter"
  )
  .refine(
    (val) => /[0-9]/.test(val),
    "Password must contain at least one number"
  )
  .refine(
    (val) => /[!@#$%^&*(),.?\":{}|<>]/.test(val),
    "Password must contain at least one special character"
  );

// CREATE: password required
export const UserFormCreateSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordValidation,
  phoneNumber: z.string().min(1, "Phone number is required"),
  country: z.string().min(1, "Country is required"),
  role: z.enum(["AGENT", "SUBADMIN"]).optional().default("AGENT"),
  status: z.string().optional().default("ACTIVE"),
  permissions: z.array(z.string()).default([]),
  canViewEmails: z.boolean().optional().default(false),
  canViewPhoneNumbers: z.boolean().optional().default(false),
});

export const UserFormEditSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 8,
      "Password must be at least 8 characters"
    )
    .refine(
      (val) => !val || /[A-Z]/.test(val),
      "Password must contain at least one uppercase letter"
    )
    .refine(
      (val) => !val || /[0-9]/.test(val),
      "Password must contain at least one number"
    )
    .refine(
      (val) => !val || /[!@#$%^&*(),.?\":{}|<>]/.test(val),
      "Password must contain at least one special character"
    ),
  phoneNumber: z.string().min(1, "Phone number is required"),
  country: z.string().min(1, "Country is required"),
  role: z.enum(["AGENT", "SUBADMIN", "ADMIN"]).optional().default("AGENT"),
  status: z.string().optional().default("ACTIVE"),
  permissions: z.array(z.string()).default([]),
  canViewEmails: z.boolean().optional().default(false),
  canViewPhoneNumbers: z.boolean().optional().default(false),
});

export type UserFormCreateData = z.infer<typeof UserFormCreateSchema>;
export type UserFormEditData = z.infer<typeof UserFormEditSchema>;
