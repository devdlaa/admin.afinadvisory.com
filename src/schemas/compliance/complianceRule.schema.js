import { z } from 'zod';
export const FrequencyUnitEnum = z.enum(['DAY', 'MONTH', 'YEAR']);

export const ComplianceRuleCreateSchema = z.object({
  compliance_code: z.string().min(1).max(100).trim().toUpperCase(),
  name: z.string().min(1).max(200).trim(),
  registration_type_id: z.string().uuid(),
  applicable_entity_types: z.array(EntityTypeEnum).min(1, 'At least one entity type required'),
  frequency_interval: z.number().int().positive('Frequency must be positive'),
  frequency_unit: FrequencyUnitEnum.default('MONTH'),
  due_day: z.number().int().min(1).max(31, 'Due day must be 1-31'),
  is_active: z.boolean().default(true)
});

export const ComplianceRuleUpdateSchema = ComplianceRuleCreateSchema.partial();