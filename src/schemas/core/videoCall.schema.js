import { z } from "zod";

/* -------------------------------------------------------------------
 ENUMS
------------------------------------------------------------------- */

const VideoCallAttendeeTypeEnum = z.enum([
  "HOST",
  "EMPLOYEE",
  "ENTITY",
  "LEAD_CONTACT",
  "EXTERNAL",
]);

/* -------------------------------------------------------------------
 BASE TYPES
------------------------------------------------------------------- */

const uuidSchema = z.string().uuid();

const dateSchema = z.coerce.date();

/* -------------------------------------------------------------------
 ATTENDEE
------------------------------------------------------------------- */

const attendeeSchema = z
  .object({
    attendee_type: VideoCallAttendeeTypeEnum,

    admin_user_id: uuidSchema.optional(),
    lead_contact_id: uuidSchema.optional(),
    entity_id: uuidSchema.optional(),

    name: z.string().max(120).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.attendee_type === "EMPLOYEE") {
      if (!data.admin_user_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "admin_user_id required for EMPLOYEE",
        });
      }
    }

    if (data.attendee_type === "LEAD_CONTACT") {
      if (!data.lead_contact_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "lead_contact_id required for LEAD_CONTACT",
        });
      }
    }

    if (data.attendee_type === "ENTITY") {
      if (!data.entity_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "entity_id required for ENTITY",
        });
      }
    }

    if (data.attendee_type === "EXTERNAL") {
      if (!data.name || !data.email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "name and email required for EXTERNAL attendee",
        });
      }
    }
  });

/* -------------------------------------------------------------------
 ATTENDEE LIST
------------------------------------------------------------------- */

const attendeeListSchema = z
  .array(attendeeSchema)
  .min(1, "At least one attendee required")
  .max(20, "Maximum 20 attendees allowed")
  .superRefine((attendees, ctx) => {
    const seenEmployees = new Set();
    const seenLeads = new Set();
    const seenExternalEmails = new Set();

    for (const a of attendees) {
      if (a.attendee_type === "EMPLOYEE") {
        if (seenEmployees.has(a.admin_user_id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate employee attendee",
          });
        }
        seenEmployees.add(a.admin_user_id);
      }

      if (a.attendee_type === "LEAD_CONTACT") {
        if (seenLeads.has(a.lead_contact_id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate lead attendee",
          });
        }
        seenLeads.add(a.lead_contact_id);
      }

      if (a.attendee_type === "EXTERNAL") {
        if (seenExternalEmails.has(a.email)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate external attendee email",
          });
        }
        seenExternalEmails.add(a.email);
      }
    }
  });

/* -------------------------------------------------------------------
 CREATE VIDEO CALL
------------------------------------------------------------------- */

const createVideoCallSchema = z
  .object({
    title: z.string().max(200).optional(),

    description: z.string().optional(),

    start_time: dateSchema,

    end_time: dateSchema.optional(),

    lead_activity_id: uuidSchema.optional(),

    task_id: uuidSchema.optional(),

    attendees: attendeeListSchema,  
  })
  .superRefine((data, ctx) => {
    /* duration validation */

    if (data.end_time) {
      const duration = data.end_time - data.start_time;

      const oneHour = 60 * 60 * 1000;

      if (duration <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "end_time must be after start_time",
        });
      }

      if (duration > oneHour) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Meeting cannot exceed 1 hour",
        });
      }
    }

    /* cannot belong to both task and activity */

    if (data.task_id && data.lead_activity_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Video call cannot belong to both task and lead activity",
      });
    }
  });

/* -------------------------------------------------------------------
 UPDATE VIDEO CALL
------------------------------------------------------------------- */

const updateVideoCallSchema = z
  .object({
    video_call_id: uuidSchema,

    title: z.string().max(200).optional(),

    description: z.string().optional(),

    start_time: dateSchema.optional(),

    end_time: dateSchema.optional(),

    attendees: attendeeListSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.start_time && data.end_time) {
      const duration = data.end_time - data.start_time;

      const oneHour = 60 * 60 * 1000;

      if (duration <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "end_time must be after start_time",
        });
      }

      if (duration > oneHour) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Meeting cannot exceed 1 hour",
        });
      }
    }
  });

/* -------------------------------------------------------------------
 CANCEL VIDEO CALL
------------------------------------------------------------------- */

const cancelVideoCallSchema = z.object({
  video_call_id: uuidSchema,
});

/* -------------------------------------------------------------------
 GET VIDEO CALL
------------------------------------------------------------------- */

const getVideoCallSchema = z.object({
  video_call_id: uuidSchema,
});

/* -------------------------------------------------------------------
 EXPORTS
------------------------------------------------------------------- */

module.exports = {
  VideoCallAttendeeTypeEnum,

  createVideoCallSchema,

  updateVideoCallSchema,

  cancelVideoCallSchema,

  getVideoCallSchema,
};















