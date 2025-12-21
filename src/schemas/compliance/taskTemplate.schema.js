import { z } from 'zod';
export const TaskTemplateCreateSchema = z.object({
  compliance_rule_id: z.string().uuid(),
  title_template: z.string().min(1).max(500).trim(),
  description_template: z.string().max(5000).optional().nullable(),
  is_active: z.boolean().default(true),
  modules: z.array(z.object({
    billable_module_id: z.string().uuid(),
    default_quantity: z.number().int().positive().default(1),
    is_optional: z.boolean().default(false)
  })).optional()
});

export const TaskTemplateUpdateSchema = z.object({
  title_template: z.string().min(1).max(500).trim().optional(),
  description_template: z.string().max(5000).optional().nullable(),
  is_active: z.boolean().optional()
});

export const TaskTemplateModuleSchema = z.object({
  billable_module_id: z.string().uuid(),
  default_quantity: z.number().int().positive().default(1),
  is_optional: z.boolean().default(false)
});