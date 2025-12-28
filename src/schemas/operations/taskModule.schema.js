import { z } from "zod";

/**
 * Create a task module
 * Purely informational service attachment
 */
export const TaskModuleCreateSchema = z.object({
  task_id: z.string().uuid(),
  billable_module_id: z.string().uuid(),

  // name is optional because we usually copy from billable module
  name: z.string().min(1).max(200).trim().optional(),

  // free-text remark only
  remark: z.string().max(1000).optional().nullable(),
});

/**
 * Update a task module
 */
export const TaskModuleUpdateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  remark: z.string().max(1000).optional().nullable(),
});

/**
 * Bulk add task modules
 */
export const TaskModuleBulkCreateSchema = z.object({
  task_id: z.string().uuid(),
  modules: z
    .array(
      TaskModuleCreateSchema.omit({ task_id: true })
    )
    .min(1),
});
