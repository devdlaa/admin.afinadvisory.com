import { z } from "zod";

/**
 * Update a task module (override fields on TaskModule row)
 */
export const TaskModuleUpdateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  remark: z.string().max(1000).optional().nullable(),
});

/**
 * Delete / detach module from task
 */
export const TaskModuleDeleteSchema = z.object({
  task_id: z.string().uuid(),
});

/**
 * Bulk add task modules to a task
 */
export const TaskModuleBulkCreateSchema = z.object({
  task_id: z.string().uuid(),
  modules: z.array(TaskModuleCreateSchema.omit({ task_id: true })).min(1),
});
