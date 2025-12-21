import { z } from 'zod';
export const EntityRegistrationSettingCreateSchema = z.object({
  entity_registration_id: z.string().uuid(),
  compliance_rule_id: z.string().uuid(),
  is_enabled: z.boolean().default(true),
  effective_from: z.coerce.date(),
  effective_to: z.coerce.date().optional().nullable()
}).refine(
  (data) => !data.effective_to || data.effective_to >= data.effective_from,
  { message: 'Effective to must be after effective from', path: ['effective_to'] }
);

export const EntityRegistrationSettingUpdateSchema = EntityRegistrationSettingCreateSchema.omit({
  entity_registration_id: true,
  compliance_rule_id: true
}).partial();