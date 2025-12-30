import { z } from "zod";

//
// CREATE
//
export const RegistrationTypeCreateSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(50, "Code must not exceed 50 characters")
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z0-9_-]+$/.test(v), {
      message:
        "Code may contain only A–Z, digits, hyphen (-), or underscore (_)",
    }),

  name: z.string().min(1).max(200).trim().optional(),

  description: z.string().max(500).optional(),

  is_active: z.boolean().default(false),

  validation_regex: z
    .string()
    .min(1, "Validation regex is required")
    .refine(
      (pattern) => {
        try {
          new RegExp(pattern);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid regex pattern" }
    ),

  validation_hint: z
    .string()
    .min(1, "Validation hint is required")
    .max(255, "Hint is too long"),
});

//
// UPDATE (partial but cannot null-out required fields)
//
export const RegistrationTypeUpdateSchema = z.object({
  code: z
    .string()
    .max(50)
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z0-9_-]+$/.test(v), {
      message:
        "Code may contain only A–Z, digits, hyphen (-), or underscore (_)",
    })
    .optional(),

  name: z.string().min(1).max(200).trim().optional(),

  description: z.string().max(500).optional(),

  is_active: z.boolean().optional(),

  validation_regex: z
    .string()
    .refine(
      (pattern) => {
        try {
          new RegExp(pattern);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid regex pattern" }
    )
    .optional(),

  validation_hint: z.string().min(1).max(255).optional(),
});

//
// LIST / QUERY
//
export const RegistrationTypeListSchema = z.object({
  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),

  search: z.string().trim().optional(),

  page: z.coerce.number().int().positive().default(1).optional(),

  page_size: z.coerce.number().int().positive().max(50).default(10).optional(),
});
