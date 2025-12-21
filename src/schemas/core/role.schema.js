import { z } from "zod";
export const RoleCreateSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  permission_ids: z.array(z.string().uuid()).optional()
});

export const RoleUpdateSchema = RoleCreateSchema.partial();