import { z } from "zod";

// UUID helper
const uuid = z.string().uuid("Invalid UUID format");

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

  // optional: we accept mentions but do not *require* or *enforce* yet
  mentions: z
    .array(uuid)
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

  // mentions cannot be changed after creation (keeps things sane)
});

// ---------------------------------------------------
// LIST / QUERY COMMENTS
// ---------------------------------------------------

export const TaskCommentQuerySchema = z
  .object({
    task_id: z.string().uuid("Invalid task ID"),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .pipe(z.number().int().min(1).max(100))
      .default(20),
    cursor: z.string().optional(),
    type: z.enum(["COMMENT", "ACTIVITY", "ALL"]).optional().default("ALL"),
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

  // optional structured metadata
  meta: z.record(z.any()).optional(),
});
