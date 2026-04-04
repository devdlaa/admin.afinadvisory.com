import { z } from "zod";

const collaboratorItemSchema = z.object({
  admin_user_id: z.union([
    z.string().uuid(),
    z.literal("00000000-0000-0000-0000-000000000001"),
  ]),
});

export const syncLeadAssignmentsSchema = z.object({
  lead_id: z.string().uuid(),

  users: z
    .array(collaboratorItemSchema)
    .min(1, "At least one user must remain assigned")
    .max(5, "Maximum 5 collaborators allowed")
    .transform((arr) => {
      const map = new Map();
      for (const u of arr) map.set(u.admin_user_id, u);
      return [...map.values()];
    }),
});
