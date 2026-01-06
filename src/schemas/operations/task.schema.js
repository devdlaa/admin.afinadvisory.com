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

/**
 * Practice firms enum for billing-from
 */
export const PracticeFirmEnum = z.enum([
  "CA_FIRM",
  "AFIN_ADVISORY_PRIVATE_LIMITED",
  "MUTUAL_FUND_ADVISORY",
]);

/**
 * CREATE TASK
 */
export const createTaskSchema = z
  .object({
    entity_id: z
      .string()
      .uuid("Invalid entity ID format")
      .optional()
      .nullable(),

    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title too long")
      .trim(),

    description: z.string().max(2000).optional().nullable(),

    status: TaskStatusEnum.default("PENDING"),

    priority: TaskPriorityEnum,

    start_date: z.coerce.date().optional().nullable(),
    end_date: z.coerce.date().optional().nullable(),
    due_date: z.coerce.date().optional().nullable(),

    // optional categorisation
    task_category_id: z
      .string()
      .uuid("Invalid category ID format")
      .optional()
      .nullable(),

    /**
     * NEW BILLING FIELDS
     */
    is_billable: z.boolean().default(false),

    invoice_number: z
      .string()
      .max(100, "Invoice number too long")
      .optional()
      .nullable(),

    billed_from_firm: PracticeFirmEnum.optional().nullable(),
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
 * LIST / QUERY TASKS
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

    created_by: z.string().uuid("Invalid user ID").optional(),
    assigned_to: z.string().uuid("Invalid user ID").optional(),

    // date filters
    due_date_from: z.string().datetime().optional(),
    due_date_to: z.string().datetime().optional(),

    // search term
    search: z
      .string()
      .min(3, "Search must be at least 3 characters")
      .optional(),

    // new billing filters
    is_billable: z.boolean().optional(),
    billed_from_firm: PracticeFirmEnum.optional(),

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

    start_date: z.coerce.date().optional().nullable(),
    end_date: z.coerce.date().optional().nullable(),
    due_date: z.coerce.date().optional().nullable(),

    /**
     * NEW BILLING FIELDS
     */
    is_billable: z.boolean().optional(),

    invoice_number: z.string().max(100).optional().nullable(),

    billed_from_firm: PracticeFirmEnum.optional().nullable(),
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
