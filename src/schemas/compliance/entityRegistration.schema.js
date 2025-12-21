import { z } from 'zod';
export const EntityRegistrationStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED']);

export const EntityRegistrationCreateSchema = z.object({
  entity_id: z.string().uuid(),
  registration_type_id: z.string().uuid(),
  registration_number: z.string().min(1).max(100).trim(),
  state: z.string().min(1).max(100).trim(),
  effective_from: z.coerce.date(),
  effective_to: z.coerce.date().optional().nullable(),
  status: EntityRegistrationStatusEnum.default('INACTIVE'),
  is_primary: z.boolean().default(false)
}).refine(
  (data) => !data.effective_to || data.effective_to >= data.effective_from,
  { message: 'Effective to must be after effective from', path: ['effective_to'] }
);

export const EntityRegistrationUpdateSchema = EntityRegistrationCreateSchema.omit({
  entity_id: true,
  registration_type_id: true
}).partial();
