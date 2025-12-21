import { z } from "zod";
export const RegistrationTypeCreateSchema = z.object({
  code: z.string().min(1).max(50).trim().toUpperCase(),
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(false)
});

export const RegistrationTypeUpdateSchema = RegistrationTypeCreateSchema.partial();