import { z } from "zod";

/**
 * Task status aligned with service layer
 */
export const TaskStatusEnum = z.enum([
  "ALL",
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
  .default("LOW");

export const TaskPriorityEnumD = z.enum(["LOW", "NORMAL", "HIGH"]);

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
    apply_sla: z.boolean().optional().default(true),

    status: TaskStatusEnum.default("PENDING"),

    priority: TaskPriorityEnum,

    end_date: z.coerce.date().optional().nullable(),
    due_date: z.coerce.date().optional().nullable(),

    // optional categorisation
    task_category_id: z
      .string()
      .uuid("Invalid category ID format")
      .optional()
      .nullable(),
  })

  // due date not in past
  .refine((data) => !data.due_date || data.due_date >= new Date(), {
    message: "Due date cannot be in the past",
    path: ["due_date"],
  });

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
    entity_missing: z.boolean().optional(),
    unassigned_only: z.boolean().optional(),

    status: TaskStatusEnum.optional().nullable(),
    priority: TaskPriorityEnumD.optional().nullable(),

    task_category_id: z.string().uuid("Invalid category ID").optional(),

    created_by: z.string().uuid("Invalid user ID").optional(),
    assigned_to: z.string().uuid("Invalid user ID").optional(),

    due_date_from: z.string().datetime().optional(),
    due_date_to: z.string().datetime().optional(),

    created_date_from: z.string().datetime().optional(),
    created_date_to: z.string().datetime().optional(),

    search: z.string().min(3).optional(),

    is_billable: z.boolean().optional(),

    sort_by: z
      .enum(["due_date", "priority", "created_at"])
      .default("created_at"),
    sort_order: z.enum(["asc", "desc"]).default("desc").optional(),
    is_magic_sort: z.coerce.boolean().optional().default(false),

    sla_status: z
      .enum(["RUNNING", "PAUSED", "BREACHED", "COMPLETED"])
      .optional(),
    sla_due_date_from: z.string().datetime().optional(),
    sla_due_date_to: z.string().datetime().optional(),
    sla_paused_before: z.string().datetime().optional(),
  })
  .refine(
    (data) =>
      !data.due_date_from ||
      !data.due_date_to ||
      new Date(data.due_date_from) <= new Date(data.due_date_to),
    { message: "due_date_from must be before or equal to due_date_to" },
  )
  .refine(
    (data) =>
      !data.created_date_from ||
      !data.created_date_to ||
      new Date(data.created_date_from) <= new Date(data.created_date_to),
    { message: "created_date_from must be before or equal to created_date_to" },
  )
  .refine(
    (data) =>
      !data.sla_due_date_from ||
      !data.sla_due_date_to ||
      new Date(data.sla_due_date_from) <= new Date(data.sla_due_date_to),
    { message: "sla_due_date_from must be before or equal to sla_due_date_to" },
  );

/**
 * UPDATE TASK
 */
export const TaskUpdateSchema = z
  .object({
    title: z.string().min(1).max(500).trim().optional(),

    description: z.string().max(5000).optional().nullable(),

    entity_id: z.string().uuid("Invalid entity ID").optional().nullable(),

    status: TaskStatusEnum.optional(),
    priority: TaskPriorityEnum.optional(),

    task_category_id: z.string().uuid().optional().nullable(),

    due_date: z
      .union([z.coerce.date(), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    is_billable: z.boolean().optional(),
  })

  .refine(
    (data) => {
      if (!data.due_date) return true;

      const timeZone = "Asia/Kolkata";

      const today = new Date();
      const due = new Date(data.due_date);

      const todayIST = new Date(today.toLocaleString("en-US", { timeZone }));
      const dueIST = new Date(due.toLocaleString("en-US", { timeZone }));

      todayIST.setHours(0, 0, 0, 0);
      dueIST.setHours(0, 0, 0, 0);

      return dueIST >= todayIST;
    },
    {
      message: "Due date cannot be in the past",
      path: ["due_date"],
    },
  );

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

export const taskSearchQuerySchema = z.object({
  search: z.string().min(2, "Search must be at least 2 characters"),

  entity_id: z.string().uuid().optional(),
  status: z
    .enum([
      "PENDING",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "ON_HOLD",
      "PENDING_CLIENT_INPUT",
    ])
    .optional(),

  priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),

  task_category_id: z.string().uuid().optional(),

  created_date_from: z.coerce.date().optional(),
  created_date_to: z.coerce.date().optional(),

  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(50).default(10),
});
