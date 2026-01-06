import { z } from "zod";

// Schema for creating a comment
export const TaskCommentCreateSchema = z.object({
  task_id: z.string().uuid("Invalid task ID"),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message is too long"),
  mentions: z
    .array(z.string().uuid("Invalid user ID in mentions"))
    .optional()
    .default([]),
});

// Schema for updating a comment
export const TaskCommentUpdateSchema = z.object({
  task_id: z.string().uuid("Invalid task ID"),
  comment_id: z.string().min(1, "Comment ID is required"),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message is too long"),
});

// Schema for querying comments
export const TaskCommentQuerySchema = z.object({
  task_id: z.string().uuid("Invalid task ID"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  cursor: z.string().optional(),
  type: z.enum(["COMMENT", "ACTIVITY", "ALL"]).optional().default("ALL"),
});
