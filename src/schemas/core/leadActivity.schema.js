import { z } from "zod";

/* ---------------------------------------------------
ENUMS
--------------------------------------------------- */

const activityTypeEnum = z.enum(["CALL", "EMAIL", "WHATSAPP", "VIDEO_CALL"]);

const activityStatusEnum = z.enum(["COMPLETED", "MISSED"]);

const missedByEnum = z.enum(["CLIENT"]);

/* ---------------------------------------------------
EMAIL PAYLOAD
--------------------------------------------------- */

export const emailPayloadSchema = z.object({
  to_email: z.string().email(),

  subject: z.string().trim().min(1).max(300),

  body: z.string().trim().min(1),

  attachments: z
    .array(
      z.object({
        document_id: z.string().uuid(),
      }),
    )
    .max(3)
    .optional(),
});

/* ---------------------------------------------------
BASE CREATE ACTIVITY
--------------------------------------------------- */

export const createLeadActivitySchema = z
  .object({
    activity_type: activityTypeEnum,

    title: z.string().trim().max(120),

    description: z.string().trim().max(300).optional(),

    status: activityStatusEnum.optional(),

    scheduled_at: z.string().datetime().optional(),

    completion_note: z.string().trim().optional(),

    missed_reason: z.string().trim().optional(),

    missed_by: missedByEnum.optional().default("CLIENT"),

    email: emailPayloadSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const isCompleted = data.status === "COMPLETED";
    const isMissed = data.status === "MISSED";
    const isScheduled = !data.status;

    /* ---------------------------------------------
    SCHEDULED ACTIVITY
    --------------------------------------------- */

    if (isScheduled) {
      if (!data.scheduled_at) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduled_at is required for scheduled activities",
        });
      }
    }

    /* ---------------------------------------------
    COMPLETED ACTIVITY
    --------------------------------------------- */

    if (isCompleted) {
      if (!data.completion_note) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "completion_note is required when marking activity completed",
        });
      }

      if (data.scheduled_at) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduled_at cannot be sent for completed activities",
        });
      }
    }

    /* ---------------------------------------------
    MISSED ACTIVITY
    --------------------------------------------- */

    if (isMissed) {
      if (!data.missed_reason || !data.missed_by) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "missed_reason and missed_by are required when activity is missed",
        });
      }

      if (data.scheduled_at) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduled_at cannot be sent for missed activities",
        });
      }
    }

    /* ---------------------------------------------
    EMAIL VALIDATION
    --------------------------------------------- */
    if (data.activity_type === "EMAIL") {
      // Email payload cannot exist for logged activities
      if (data.status && data.email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "email payload only allowed for scheduled automatic emails",
        });
      }

      // If email payload exists, activity must be scheduled
      if (data.email && !data.scheduled_at) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduled_at required when sending automatic email",
        });
      }
    }
  });

/* ---------------------------------------------------
UPDATE ACTIVITY
--------------------------------------------------- */

export const updateLeadActivitySchema = z.object({
  title: z.string().trim().max(120).optional(),

  description: z.string().trim().optional(),

  scheduled_at: z.string().datetime().optional(),
});

/* ---------------------------------------------------
LIFECYCLE UPDATE
--------------------------------------------------- */

export const updateActivityLifecycleSchema = z
  .object({
    action: z.enum(["COMPLETE", "MISSED"]),

    completion_note: z.string().trim().optional(),

    missed_reason: z.string().trim().optional(),

    missed_by: missedByEnum.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "COMPLETE" && !data.completion_note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "completion_note required when completing activity",
      });
    }

    if (data.action === "MISSED") {
      if (!data.missed_reason || !data.missed_by) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "missed_reason and missed_by required",
        });
      }
    }
  });

/* ---------------------------------------------------
ID
--------------------------------------------------- */

export const activityIdSchema = z.object({
  id: z.string().uuid(),
});

/* ---------------------------------------------------
LIST FILTERS
--------------------------------------------------- */

export const listLeadActivitySchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1))
    .optional()
    .default(1),

  page_size: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1).max(50))
    .optional()
    .default(20),

  activity_type: activityTypeEnum.optional(),

  status: z.enum(["ACTIVE", "COMPLETED", "MISSED"]).optional(),

  created_by: z.string().uuid().optional(),

  by_me: z.enum(["true", "false"]).optional(),

  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

// DASHBOARD ACTIVITY
export const listActivitiesDashboardSchema = z.object({
  filter: z
    .enum(["TODAY", "TOMORROW", "NEXT_3_DAYS", "NEXT_7_DAYS"])
    .optional(),

  status: z.enum(["ACTIVE", "COMPLETED", "MISSED"]).optional(),

  activity_type: z.enum(["CALL", "EMAIL", "WHATSAPP", "VIDEO_CALL"]).optional(),

  created_by: z.string().uuid().optional(),

  page: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1))
    .optional()
    .default(1),

  page_size: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1).max(50))
    .optional()
    .default(20),
});
