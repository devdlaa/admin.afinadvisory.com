import { z } from 'zod';
export const EntityGroupTypeEnum = z.enum([
  'FAMILY',
  'BUSINESS',
  'TRUST',
  'PARTNERSHIP',
  'ORGANIZATION',
  'NON_PROFIT',
  'COOPERATIVE',
  'ASSOCIATION',
  'JOINT_VENTURE',
  'GOVERNMENT',
  'OTHER'
]);

export const EntityGroupRoleEnum = z.enum([
  'OWNER',
  'CO_OWNER',
  'BENEFICIARY',
  'MEMBER',
  'MANAGING_MEMBER',
  'DIRECTOR',
  'EXECUTIVE_DIRECTOR',
  'NOMINEE_DIRECTOR',
  'PARTNER',
  'MANAGING_PARTNER',
  'TRUSTEE',
  'SETTLOR',
  'SHAREHOLDER',
  'AUTHORIZED_SIGNATORY',
  'REPRESENTATIVE',
  'EMPLOYEE',
  'ADVISOR',
  'OBSERVER',
  'OTHER'
]);

export const EntityGroupCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  group_type: EntityGroupTypeEnum,
  members: z.array(z.object({
    entity_id: z.string().uuid(),
    role: EntityGroupRoleEnum
  })).min(1, 'At least one member required')
});

export const EntityGroupUpdateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  group_type: EntityGroupTypeEnum.optional()
});

export const EntityGroupMemberAddSchema = z.object({
  entity_id: z.string().uuid(),
  role: EntityGroupRoleEnum
});
