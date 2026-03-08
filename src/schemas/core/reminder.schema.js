import { z } from "zod";

/* =======================================================================
   ENUMS
======================================================================= */

export const ReminderRecurrenceTypeEnum = z.enum([
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
]);

export const ReminderUpdateScopeEnum = z.enum([
  "INSTANCE",
  "INSTANCE_AND_FUTURE",
]);

export const ReminderLifecycleActionEnum = z.enum(["SNOOZE", "ACKNOWLEDGE"]);

/* =======================================================================
   SHARED FRAGMENTS
======================================================================= */

const BoardFiltersSchema = z.object({
  bucket_id: z.string().uuid().optional().nullable(),
  tag_ids: z.array(z.string().uuid()).optional().nullable(),
  limit: z.coerce.number().min(1).max(100).optional(),
  page: z.coerce.number().min(1).optional(),
});

const RecurrenceFieldsSchema = z.object({
  is_recurring: z.boolean().optional(),
  recurrence_type: ReminderRecurrenceTypeEnum.optional().nullable(),
  recurrence_every: z.number().int().min(1).optional().nullable(),
  recurrence_end: z.string().datetime().optional().nullable(),
  recurrence_ends_after: z.number().int().min(1).optional().nullable(),
  // 1=Mo, 2=Tu, 3=We, 4=Th, 5=Fr, 6=Sa, 7=Su — only used when type=WEEKLY
  week_days: z.array(z.number().int().min(1).max(7)).optional().nullable(),
  // "Day of the month" | "Day of the week" — only used when type=MONTHLY
  repeat_by: z
    .enum(["Day of the month", "Day of the week"])
    .optional()
    .nullable(),
});

/* =======================================================================
   CREATE
======================================================================= */

export const createReminderSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(255),
    description: z.string().trim().max(2000).optional().nullable(),
    due_at: z.string().datetime("Invalid due date"),
    assigned_to: z.string().uuid().optional().nullable(),
    bucket_id: z.string().uuid().optional().nullable(),
    task_id: z.string().uuid().optional().nullable(),
    tag_ids: z.array(z.string().uuid()).optional(),
    confirmed: z.boolean().optional(),
    checklist: z
      .array(
        z.object({
          title: z.string().trim().min(1, "Checklist item title is required"),
          order: z.number().int().min(0).optional(),
        }),
      )
      .optional(),
  })
  .merge(RecurrenceFieldsSchema)
  .superRefine((data, ctx) => {
    if (data.is_recurring) {
      if (!data.recurrence_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Recurrence type is required when is_recurring is true",
          path: ["recurrence_type"],
        });
      }
      if (!data.recurrence_every || data.recurrence_every <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Recurrence interval must be a positive integer",
          path: ["recurrence_every"],
        });
      }
      if (data.recurrence_type === "WEEKLY" && data.week_days?.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one day must be selected for weekly recurrence",
          path: ["week_days"],
        });
      }
      // Cannot set both recurrence_end and recurrence_ends_after
      if (data.recurrence_end && data.recurrence_ends_after) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cannot set both recurrence_end and recurrence_ends_after",
          path: ["recurrence_ends_after"],
        });
      }
    }
  });

/* =======================================================================
   UPDATE
======================================================================= */

export const updateReminderSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    due_at: z.string().datetime().optional(),
    assigned_to: z.string().uuid().optional().nullable(),
    bucket_id: z.string().uuid().optional().nullable(),
    task_id: z.string().uuid().optional().nullable(),
    tag_ids: z.array(z.string().uuid()).optional(),
    update_scope: ReminderUpdateScopeEnum.optional().default("INSTANCE"),
  })
  .merge(RecurrenceFieldsSchema)
  .superRefine((data, ctx) => {
    if (data.is_recurring === true) {
      if (!data.recurrence_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Recurrence type required when enabling recurrence",
          path: ["recurrence_type"],
        });
      }
      if (!data.recurrence_every || data.recurrence_every <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Recurrence interval must be a positive integer",
          path: ["recurrence_every"],
        });
      }
      if (data.recurrence_type === "WEEKLY" && data.week_days?.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one day must be selected for weekly recurrence",
          path: ["week_days"],
        });
      }
      if (data.recurrence_end && data.recurrence_ends_after) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cannot set both recurrence_end and recurrence_ends_after",
          path: ["recurrence_ends_after"],
        });
      }
    }
  });

/* =======================================================================
   LIFECYCLE  (snooze / acknowledge)
======================================================================= */

export const reminderLifecycleSchema = z
  .object({
    action: ReminderLifecycleActionEnum,
    // SNOOZE fields
    duration_minutes: z.number().int().min(1).optional(),
    snoozed_until: z.string().datetime().optional(),
    // ACKNOWLEDGE fields
    stop_recurring: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "SNOOZE") {
      if (!data.duration_minutes && !data.snoozed_until) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Provide duration_minutes or snoozed_until for snooze",
          path: ["duration_minutes"],
        });
      }
    }
  });

/* =======================================================================
   WEEK BOARDS
======================================================================= */

const WeekBoardKeysSchema = z
  .object({
    today: BoardFiltersSchema.optional(),
    tomorrow: BoardFiltersSchema.optional(),
    day_3: BoardFiltersSchema.optional(),
    day_4: BoardFiltersSchema.optional(),
    day_5: BoardFiltersSchema.optional(),
    day_6: BoardFiltersSchema.optional(),
    day_7: BoardFiltersSchema.optional(),
  })
  .optional();

export const listReminderWeekBoardsSchema = z.object({
  bucket_id: z.string().uuid().optional().nullable(),
  tag_ids: z.array(z.string().uuid()).optional().nullable(),
  boards: WeekBoardKeysSchema,
});

/* =======================================================================
   MY DAY
======================================================================= */

export const getMyDaySchema = z.object({
  bucket_id: z.string().uuid().optional().nullable(),
  tag_ids: z.array(z.string().uuid()).optional().nullable(),
  boards: z
    .object({
      overdue: BoardFiltersSchema.optional(),
      today: BoardFiltersSchema.optional(),
    })
    .optional(),
});

/* =======================================================================
   CHECK ALIVE
======================================================================= */

export const checkAliveSchema = z.object({
  ids: z
    .array(z.string().uuid())
    .min(1, "At least one reminder ID is required")
    .max(50, "Maximum 50 IDs per request"),
});
