import { z } from 'zod';
export const TaskAssignmentCreateSchema = z.object({
  task_id: z.string().uuid(),
  admin_user_id: z.string().uuid(),
  assignment_source: z.string().max(100).optional().nullable()
});

export const TaskAssignmentBulkSchema = z.object({
  task_id: z.string().uuid(),
  admin_user_ids: z.array(z.string().uuid()).min(1, 'At least one assignee required'),
  assignment_source: z.string().max(100).optional().nullable()
});