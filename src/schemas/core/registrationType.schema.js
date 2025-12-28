import { z } from "zod";

export const RegistrationTypeCreateSchema = z.object({
  code: z.string().min(1).max(50).trim().toUpperCase(),
  name: z.string().min(1).max(200).trim().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(false),
  validation_regex: z.string().optional().nullable(),
  validation_hint: z.string().optional().nullable(),
});

export const RegistrationTypeUpdateSchema =
  RegistrationTypeCreateSchema.partial();

export const RegistrationTypeListSchema = z.object({
  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),

  search: z.string().trim().optional(),

  page: z.coerce.number().int().positive().default(1).optional(),
  page_size: z.coerce.number().int().positive().max(50).default(10).optional(),
});
