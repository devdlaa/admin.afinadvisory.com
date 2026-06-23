import { z } from "zod";

/* REGEX (match service) */
export const TAG_NAME_REGEX = /^[A-Za-z0-9 _\-\/]+$/;

/* COLOR PALETTE */
import { REMINDER_TAG_COLORS } from "@/services/reminders/reminder.constants";

export const LeadTagColorEnum = z.enum(Object.keys(REMINDER_TAG_COLORS));

/* CREATE */

export const createLeadTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(
      TAG_NAME_REGEX,
      "Name can only contain letters, numbers, spaces, hyphens, underscores, and slashes",
    ),

  color: LeadTagColorEnum.optional(),
});

/* UPDATE */

export const updateLeadTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(
      TAG_NAME_REGEX,
      "Name can only contain letters, numbers, spaces, hyphens, underscores, and slashes",
    )
    .optional(),

  color: LeadTagColorEnum.optional(),
});

/* ID */

export const leadTagIdSchema = z.object({
  id: z.string().uuid(),
});

/* LIST (cursor based) */

export const listLeadTagSchema = z.object({
  cursor: z.string().uuid().optional(),

  limit: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1).max(100))
    .optional()
    .default(20),

  search: z.string().trim().max(50).optional(),
});
