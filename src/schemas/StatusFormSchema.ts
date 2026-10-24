import { z } from "zod";

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{6})$/;

export const StatusFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Status name is required" })
    .max(50, { message: "Status name must be 50 characters or less" })
    .refine((value) => value.toUpperCase() !== "NEW", {
      message: '"NEW" is reserved for the default status',
    }),
  color: z
    .string()
    .trim()
    .regex(HEX_COLOR_RE, {
      message: "Color must be a valid hex value like #3B82F6",
    }),
});

export type StatusFormData = z.infer<typeof StatusFormSchema>;
