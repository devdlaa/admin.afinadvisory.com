import { z } from "zod";

import { REMINDER_LIST_ICONS } from "@/services/reminders/reminder.constants";

export const reminderListIdSchema = z.object({
  id: z.string().uuid("Invalid list ID format"),
});

const iconEnum = z.enum(Object.keys(REMINDER_LIST_ICONS));

export const createReminderListSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, "List name is required")
      .max(50, "List name cannot exceed 50 characters"),

    icon: iconEnum.optional().default("HASH"),
  }),
});

export const updateReminderListSchema = z.object({
  params: reminderListIdSchema,

  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, "List name cannot be empty")
      .max(50)
      .optional(),

    icon: iconEnum.optional(),
  }),
});

export const deleteReminderListSchema = z.object({
  params: reminderListIdSchema,
});

export const listReminderListsQuerySchema = z.object({
  query: z.object({
    all: z
      .string()
      .optional()
      .transform((val) => val === "true"),
  }),
});
