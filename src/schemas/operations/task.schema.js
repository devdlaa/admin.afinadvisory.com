import { z } from 'zod';
export const TaskStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const BillingStatusEnum = z.enum(['NOT_BILLED', 'PARTIALLY_BILLED', 'BILLED']);

export const TaskCreateSchema = z.object({
  entity_id: z.string().uuid('Invalid entity ID'),
  title: z.string().min(1).max(500).trim(),
  description: z.string().max(5000).optional().nullable(),
  status: TaskStatusEnum.default('PENDING'),
  billing_status: BillingStatusEnum.default('NOT_BILLED'),
  start_date: z.coerce.date().optional().nullable(),
  end_date: z.coerce.date().optional().nullable(),
  due_date: z.coerce.date().optional().nullable(),
  priority: z.string().max(50).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  compliance_rule_id: z.string().uuid().optional().nullable(),
  is_assigned_to_all: z.boolean().default(false),
  assignee_ids: z.array(z.string().uuid()).optional() // For task assignments
}).refine(
  (data) => !data.end_date || !data.start_date || data.end_date >= data.start_date,
  { message: 'End date must be after start date', path: ['end_date'] }
);

export const TaskUpdateSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  description: z.string().max(5000).optional().nullable(),
  status: TaskStatusEnum.optional(),
  billing_status: BillingStatusEnum.optional(),
  start_date: z.coerce.date().optional().nullable(),
  end_date: z.coerce.date().optional().nullable(),
  due_date: z.coerce.date().optional().nullable(),
  priority: z.string().max(50).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  is_assigned_to_all: z.boolean().optional()
}).refine(
  (data) => !data.end_date || !data.start_date || data.end_date >= data.start_date,
  { message: 'End date must be after start date', path: ['end_date'] }
);

export const TaskQuerySchema = z.object({
  entity_id: z.string().uuid().optional(),
  status: TaskStatusEnum.optional(),
  billing_status: BillingStatusEnum.optional(),
  assigned_to: z.string().uuid().optional(),
  compliance_rule_id: z.string().uuid().optional(),
  category: z.string().optional(),
  due_from: z.coerce.date().optional(),
  due_to: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});