import { z } from 'zod';
export const TaskModuleCreateSchema = z.object({
  task_id: z.string().uuid(),
  billable_module_id: z.string().uuid(),
  name: z.string().min(1).max(200).trim(),
  price: z.number().nonnegative('Price cannot be negative').multipleOf(0.01),
  gst_rate: z.number().min(0).max(100).multipleOf(0.01),
  sac_code: z.string().max(20).optional().nullable(),
  quantity: z.number().int().positive('Quantity must be positive')
});

export const TaskModuleUpdateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  price: z.number().nonnegative().multipleOf(0.01).optional(),
  gst_rate: z.number().min(0).max(100).multipleOf(0.01).optional(),
  sac_code: z.string().max(20).optional().nullable(),
  quantity: z.number().int().positive().optional()
});

export const TaskModuleBulkCreateSchema = z.object({
  task_id: z.string().uuid(),
  modules: z.array(TaskModuleCreateSchema.omit({ task_id: true })).min(1)
});