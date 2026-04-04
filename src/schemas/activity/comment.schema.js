import { z } from "zod";

// --------------------------------------
// Helpers
// --------------------------------------

const uuid = z.string().uuid("Invalid UUID format");

// --------------------------------------
// Shared
// --------------------------------------

export const mentionSchema = z.object({
  id: uuid,
  name: z.string().min(1, "User name is required"),
});

export const commentTypeEnum = z.enum(["COMMENT", "ACTIVITY"]);

export const commentScopeEnum = z.enum(["TASK", "LEAD"]);

// --------------------------------------
// CREATE
// --------------------------------------

export const commentCreateSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(3000, "Message too long"),

  mentions: z
    .array(mentionSchema)
    .max(10, "You can mention a maximum of 10 users")
    .optional()
    .default([]),

  is_private: z.boolean().optional(), // used only for LEAD
});

// --------------------------------------
// UPDATE
// --------------------------------------

export const commentUpdateSchema = z.object({
  message: z.string().max(3000, "Message too long").optional(),

  mentions: z
    .array(mentionSchema)
    .max(10, "You can mention a maximum of 10 users")
    .optional()
    .default([]),

  is_private: z.boolean().optional(), // toggle (LEAD only)
  is_pinned: z.boolean().optional(),
});

// --------------------------------------
// QUERY
// --------------------------------------

export const commentQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100))
    .default(20),

  cursor: z.string().optional().nullable(),

  type: z.enum(["COMMENT", "ACTIVITY", "ALL"]).optional().default("COMMENT"),

  user_id: uuid.optional().nullable(),
});
