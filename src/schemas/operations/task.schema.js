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
export const TaskPriorityEnum = z
  .enum(["LOW", "NORMAL", "HIGH"])
  .default("NORMAL");

export const createTaskSchema = z
  .object({
    entity_id: z.string().uuid("Invalid entity ID format"),

    entity_registration_id: z
      .string()
      .uuid("Invalid registration ID format")
      .optional()
      .nullable(),

    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title too long")
      .trim(),

    description: z.string().max(800).optional().nullable(),

    status: TaskStatusEnum.default("PENDING"),

    priority: TaskPriorityEnum,

    start_date: z.coerce.date().optional().nullable(),
    end_date: z.coerce.date().optional().nullable(),
    due_date: z.coerce.date().optional().nullable(),

    task_category_id: z.string().uuid("Invalid category ID format"),

    compliance_rule_id: z
      .string()
      .uuid("Invalid compliance rule ID format")
      .optional()
      .nullable(),

    period_start: z.coerce.date().optional().nullable(),
    period_end: z.coerce.date().optional().nullable(),

    financial_year: z.string().optional().nullable(),
    period_label: z.string().optional().nullable(),
  })
  // end >= start
  .refine(
    (data) =>
      !data.end_date || !data.start_date || data.end_date >= data.start_date,
    { message: "End date must be after start date", path: ["end_date"] }
  )
  // due date not in past
  .refine((data) => !data.due_date || data.due_date >= new Date(), {
    message: "Due date cannot be in the past",
    path: ["due_date"],
  });

/**
 * QUERY TASKS / LISTING
 * Supports filtering + pagination
 */

export const listTasksSchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),

    page_size: z.coerce
      .number()
      .int()
      .positive()
      .max(50)
      .optional()
      .default(20),

    entity_id: z.string().uuid("Invalid entity ID").optional(),
    status: TaskStatusEnum.optional(),
    priority: TaskPriorityEnum.optional(),

    task_category_id: z.string().uuid("Invalid category ID").optional(),
    compliance_rule_id: z.string().uuid("Invalid category ID").optional(),

    registration_type_id: z
      .string()
      .uuid("Invalid registration type ID")
      .optional(),

    created_by: z.string().uuid("Invalid user ID").optional(),
    assigned_to: z.string().uuid("Invalid user ID").optional(),

    due_date_from: z.string().datetime().optional(),
    due_date_to: z.string().datetime().optional(),

    search: z.string().optional(),

    sort_by: z
      .enum(["due_date", "priority", "created_at"])
      .default("created_at")
      .optional(),

    sort_order: z.enum(["asc", "desc"]).default("desc").optional(),
  })
  // ensure valid date window
  .refine(
    (data) =>
      !data.due_date_from ||
      !data.due_date_to ||
      new Date(data.due_date_from) <= new Date(data.due_date_to),
    { message: "due_date_from must be before or equal to due_date_to" }
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

    compliance_rule_id: z.string().uuid().optional().nullable(),

    start_date: z.coerce.date().optional().nullable(),
    end_date: z.coerce.date().optional().nullable(),
    due_date: z.coerce.date().optional().nullable(),

    period_start: z.coerce.date().optional().nullable(),
    period_end: z.coerce.date().optional().nullable(),
    financial_year: z.string().optional().nullable(),
    period_label: z.string().optional().nullable(),
  })
  // end >= start
  .refine(
    (data) =>
      !data.end_date || !data.start_date || data.end_date >= data.start_date,
    { message: "End date must be after start date", path: ["end_date"] }
  )
  // due date not in past
  .refine((data) => !data.due_date || data.due_date >= new Date(), {
    message: "Due date cannot be in the past",
    path: ["due_date"],
  });

/**
 * BULK STATUS UPDATE
 */
export const TaskBulkStatusUpdateSchema = z.object({
  task_ids: z
    .array(z.string().uuid("Invalid task ID format"))
    .min(1, "At least one task ID is required"),
  status: TaskStatusEnum,
});

/**
 * BULK PRIORITY UPDATE
 */
export const TaskBulkPriorityUpdateSchema = z.object({
  task_ids: z
    .array(z.string().uuid("Invalid task ID format"))
    .min(1, "At least one task ID is required"),
  priority: TaskPriorityEnum,
});
