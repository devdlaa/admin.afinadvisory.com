import { z } from "zod";

/**
 * Basic task-level identifier validation
 */
export const TaskAssignmentTaskIdSchema = z.object({
  task_id: z.string().uuid("Invalid task ID"),
});

export const BulkAssignTaskSchema = z.object({
  task_ids: z
    .array(z.string().uuid("Invalid task ID format"))
    .min(1, "At least one task ID is required"),
  user_ids: z
    .array(z.string().uuid("Invalid user ID format"))
    .min(1, "At least one user ID is required"),
});

/**
 * Sync semantics
 * The API you wrote uses:
 *  - user_ids[]
 *  - assigned_to_all: boolean
 */
export const TaskAssignmentSyncSchema = z.object({
  task_id: z.string().uuid(),
  user_ids: z.array(z.string().uuid("Invalid user ID")).default([]),
  assigned_to_all: z.boolean().default(false),
  assignment_source: z.string().max(100).optional().nullable(),
});
