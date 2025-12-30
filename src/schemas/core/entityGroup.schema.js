import { z } from "zod";

export const EntityGroupTypeEnum = z.enum([
  "FAMILY",
  "BUSINESS",
  "TRUST",
  "PARTNERSHIP",
  "ORGANIZATION",
  "NON_PROFIT",
  "COOPERATIVE",
  "ASSOCIATION",
  "JOINT_VENTURE",
  "GOVERNMENT",
  "OTHER",
]);

export const EntityGroupCreateSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  group_type: EntityGroupTypeEnum,
});

export const EntityGroupUpdateSchema = z
  .object({
    name: z.string().min(1).max(100).trim().optional(),
    group_type: EntityGroupTypeEnum.optional(),
  })
  .refine((data) => data.name !== undefined || data.group_type !== undefined, {
    message: "At least one field must be provided to update",
    path: ["_root"],
  });

// Zod schema for sync members payload
export const EntityGroupMemberSyncSchema = z.object({
  entity_group_id: z.string().uuid(),
  members: z
    .array(
      z.object({
        entity_id: z.string().uuid("Invalid entity ID"),
        role: z.string().min(1, "Role is required"),
      })
    )
    .nonempty("Members array cannot be empty"),
});

export const EntityGroupListSchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),

  page_size: z.coerce.number().int().positive().max(50).default(10).optional(),

  group_type: EntityGroupTypeEnum.optional(),

  search: z.string().trim().min(1).optional(),
});
