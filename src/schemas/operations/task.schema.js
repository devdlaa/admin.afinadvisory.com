import { z } from "zod";

/**
 * Task status aligned with service layer
 */
export const TaskStatusEnum = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "ON_HOLD",
  "PENDING_CLIENT_INPUT",
]);

/**
 * Priority helper (optional but recommended)
 */
export const TaskPriorityEnum = z.enum([
  "LOW",
  "NORMAL",
  "HIGH",
  "CRITICAL",
]).default("NORMAL");

/**
 * CREATE TASK
 * No billing fields anymore
 */
export const TaskCreateSchema = z
  .object({
    entity_id: z.string().uuid("Invalid entity ID"),

    entity_registration_id: z.string().uuid().optional().nullable(),

    title: z.string().min(1).max(500).trim(),
    description: z.string().max(5000).optional().nullable(),

    status: TaskStatusEnum.default("PENDING"),
    priority: TaskPriorityEnum,

    task_category_id: z.string().uuid().optional().nullable(),
    compliance_rule_id: z.string().uuid().optional().nullable(),

    start_date: z.coerce.date().optional().nullable(),
    end_date: z.coerce.date().optional().nullable(),
    due_date: z.coerce.date().optional().nullable(),

    // compliance period fields
    period_start: z.coerce.date().optional().nullable(),
    period_end: z.coerce.date().optional().nullable(),
    financial_year: z.string().optional().nullable(),
    period_label: z.string().optional().nullable(),

    is_assigned_to_all: z.boolean().default(false),
    assignee_ids: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) =>
      !data.end_date || !data.start_date || data.end_date >= data.start_date,
    { message: "End date must be after start date", path: ["end_date"] }
  );

/**
 * UPDATE TASK
 */
export const TaskUpdateSchema = z
  .object({
    title: z.string().min(1).max(500).trim().optional(),
    description: z.string().max(5000).optional().nullable(),

    status: TaskStatusEnum.optional(),
    priority: TaskPriorityEnum.optional(),

    task_category_id: z.string().uuid().optional().nullable(),
    entity_registration_id: z.string().uuid().optional().nullable(),

    start_date: z.coerce.date().optional().nullable(),
    end_date: z.coerce.date().optional().nullable(),
    due_date: z.coerce.date().optional().nullable(),

    // period fields allowed only for manual tasks (service layer enforces)
    period_start: z.coerce.date().optional().nullable(),
    period_end: z.coerce.date().optional().nullable(),
    financial_year: z.string().optional().nullable(),
    period_label: z.string().optional().nullable(),

    is_assigned_to_all: z.boolean().optional(),
  })
  .refine(
    (data) =>
      !data.end_date || !data.start_date || data.end_date >= data.start_date,
    { message: "End date must be after start date", path: ["end_date"] }
  );

/**
 * QUERY TASKS / LISTING
 * Supports filtering + pagination
 */
export const TaskQuerySchema = z.object({
  entity_id: z.string().uuid().optional(),
  entity_registration_id: z.string().uuid().optional(),
  compliance_rule_id: z.string().uuid().optional(),
  task_category_id: z.string().uuid().optional(),

  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),

  assigned_to: z.string().uuid().optional(),

  registration_type_id: z.string().uuid().optional(),

  // date range filtering
  due_date_from: z.coerce.date().optional(),
  due_date_to: z.coerce.date().optional(),

  search: z.string().optional(),

  // pagination
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),

  sort_by: z
    .enum(["due_date", "priority", "created_at"])
    .default("created_at")
    .optional(),
  sort_order: z.enum(["asc", "desc"]).default("desc").optional(),
});
