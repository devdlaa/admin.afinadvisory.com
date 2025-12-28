import { z } from "zod";

export const taskMessageSchema = z.object({
  taskId: z.string().uuid(),

  text: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message too long"),

  createdBy: z.string().uuid(),

  mentions: z.array(z.string().uuid()).default([]),

  system: z.boolean().default(false),
});



export const createTaskMessageInput = z.object({
  taskId: z.string().uuid(),
  text: z.string().min(1).max(2000),
  mentions: z.array(z.string().uuid()).optional(),
});
