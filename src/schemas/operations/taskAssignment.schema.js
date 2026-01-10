import { z } from "zod";

/**
 * -------------------------------
 * Task ID validation
 * Used by:
 *  - GET /tasks/:task_id/assignments
 *  - POST /tasks/:task_id/assignments
 * -------------------------------
 */
export const TaskAssignmentTaskIdSchema = z.object({
  task_id: z.string().uuid("Invalid task ID"),
});

/**
 * -------------------------------
 * Sync task assignments
 * Used by:
 *  - POST /tasks/:task_id/assignments
 * -------------------------------
 */
export const TaskAssignmentSyncSchema = z.object({
  task_id: z.string().uuid(),

  assigned_to_all: z.boolean(),

  user_ids: z
    .array(z.string().uuid("Invalid user ID"))
    .max(5, "A maximum of 5 assignees is allowed")
    .optional(),
});

/**
 * -------------------------------
 * Bulk assign unowned tasks
 * Used by:
 *  - POST /tasks/assignments/bulk
 * -------------------------------
 */
export const BulkAssignTaskSchema = z.object({
  task_ids: z
    .array(z.string().uuid("Invalid task ID"))
    .min(1, "At least one task must be provided"),

  user_ids: z
    .array(z.string().uuid("Invalid user ID"))
    .min(1, "At least one user must be provided")
    .max(5, "A maximum of 5 assignees is allowed"),
});

