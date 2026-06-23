import { z } from "zod";

export const reminderTagIdSchema = z.object({
  id: z.string().uuid("Invalid tag ID format"),
});

export const createReminderTagSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, "Tag name is required")
      .max(50, "Tag name cannot exceed 50 characters"),

    color: z.string().trim().min(1, "Color is required"),
  }),
});

export const updateReminderTagSchema = z.object({
  params: reminderTagIdSchema,
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, "Tag name cannot be empty")
      .max(50)
      .optional(),

    color: z.string().trim().optional(),
  }),
});

export const deleteReminderTagSchema = z.object({
  params: reminderTagIdSchema,
});
