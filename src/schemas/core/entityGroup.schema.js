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

export const EntityGroupRoleEnum = z.enum([
  "OWNER",
  "CO_OWNER",
  "BENEFICIARY",
  "MEMBER",
  "MANAGING_MEMBER",
  "DIRECTOR",
  "EXECUTIVE_DIRECTOR",
  "NOMINEE_DIRECTOR",
  "PARTNER",
  "MANAGING_PARTNER",
  "TRUSTEE",
  "SETTLOR",
  "SHAREHOLDER",
  "AUTHORIZED_SIGNATORY",
  "REPRESENTATIVE",
  "EMPLOYEE",
  "ADVISOR",
  "OBSERVER",
  "OTHER",
]);

export const EntityGroupCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  group_type: EntityGroupTypeEnum,
});

export const EntityGroupUpdateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  group_type: EntityGroupTypeEnum.optional(),
});

export const EntityGroupMemberAddSchema = z.object({
  entity_group_id: z.string().uuid(),
  entity_id: z.string().uuid(),
  role: EntityGroupRoleEnum,
});

export const EntityGroupMemberBulkAddSchema = z.object({
  entity_group_id: z.string().uuid(),
  members: z
    .array(
      z.object({
        entity_id: z.string().uuid(),
        role: EntityGroupRoleEnum,
      })
    )
    .min(1, "At least one member required"),
});

export const EntityGroupMemberListSchema = z.object({
  page: z
    .coerce.number()
    .int()
    .positive()
    .default(1)
    .optional(),

  page_size: z
    .coerce.number()
    .int()
    .positive()
    .max(50)
    .default(10)
    .optional(),
});


export const EntityGroupMemberUpdateSchema = z.object({
  role: EntityGroupRoleEnum,
});
