import { z } from "zod";

/**
 * Task Template Create
 */
export const TaskTemplateCreateSchema = z.object({
  compliance_rule_id: z.string().uuid(),
  title_template: z.string().min(1).max(500).trim(),
  description_template: z.string().max(5000).optional().nullable(),
  is_active: z.boolean().default(true),

  // service modules attached to template
  modules: z
    .array(
      z.object({
        billable_module_id: z.string().uuid(),
        is_optional: z.boolean().default(false),
      })
    )
    .optional(),
});

/**
 * Task Template Update
 */
export const TaskTemplateUpdateSchema = z.object({
  title_template: z.string().min(1).max(500).trim().optional(),
  description_template: z.string().max(5000).optional().nullable(),
  is_active: z.boolean().optional(),
});

/**
 * Individual Template Module
 */
export const TaskTemplateModuleSchema = z.object({
  billable_module_id: z.string().uuid(),
  is_optional: z.boolean().default(false),
});
