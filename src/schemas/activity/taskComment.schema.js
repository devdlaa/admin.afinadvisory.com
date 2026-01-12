import { z } from "zod";

// UUID helper
const uuid = z.string().uuid("Invalid UUID format");

// ---------------------------------------------------
// Shared schemas
// ---------------------------------------------------

export const mentionSchema = z.object({
  id: uuid,
  name: z.string().min(1, "User name is required"),
});

// ---------------------------------------------------
// Types for timeline entries stored in Firestore
// ---------------------------------------------------

export const taskCommentTypeEnum = z.enum(["COMMENT", "ACTIVITY"]);

// ---------------------------------------------------
// USER COMMENT: CREATE
// ---------------------------------------------------

export const taskCommentCreateSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(3000, "Message too long"),

  mentions: z
    .array(mentionSchema)
    .max(10, "You can mention a maximum of 10 users")
    .optional()
    .default([]),
});

// ---------------------------------------------------
// USER COMMENT: UPDATE
// ---------------------------------------------------

export const taskCommentUpdateSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(3000, "Message too long"),

  mentions: z
    .array(mentionSchema)
    .max(10, "You can mention a maximum of 10 users")
    .optional()
    .default([]),
});

// ---------------------------------------------------
// LIST / QUERY COMMENTS
// ---------------------------------------------------

export const TaskCommentQuerySchema = z
  .object({
    task_id: uuid,
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .pipe(z.number().int().min(1).max(100))
      .default(20),

    cursor: z.string().optional().nullable(),

    type: z.enum(["COMMENT", "ACTIVITY", "ALL"]).optional().default("COMMENT"),
  })
  .refine((data) => data.limit || data.cursor || data.type, {
    message: "At least one query parameter is required",
  });

// ---------------------------------------------------
// INTERNAL ONLY: ACTIVITY ENTRY (backend creates only)
// ---------------------------------------------------

export const taskActivitySchema = z.object({
  event: z.string().min(1, "Event type required"),

  old_value: z.any().optional().nullable(),
  new_value: z.any().optional().nullable(),

  meta: z.record(z.any()).optional(),
});
