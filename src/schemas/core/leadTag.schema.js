import { z } from "zod";

const TAG_NAME_REGEX = /^[A-Za-z0-9_-]+$/;

/* COLOR PALETTE */

const LEAD_TAG_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#F59E0B", // amber
  "#EAB308", // yellow
  "#84CC16", // lime
  "#22C55E", // green
  "#10B981", // emerald
  "#14B8A6", // teal
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#A855F7", // purple
  "#EC4899", // pink
  "#6B7280", // gray
];

const LeadTagColorEnum = z.enum(LEAD_TAG_COLORS);

/* CREATE */

const createLeadTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(
      TAG_NAME_REGEX,
      "Name can only contain letters, numbers, underscore (_) and dash (-)",
    )
    .transform((v) => v.toUpperCase()),

  color: LeadTagColorEnum.optional(),

  description: z.string().trim().max(255).optional(),
});

/* UPDATE */

const updateLeadTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(
      TAG_NAME_REGEX,
      "Name can only contain letters, numbers, underscore (_) and dash (-)",
    )
    .transform((v) => v.toUpperCase())
    .optional(),

  color: LeadTagColorEnum.optional(),

  description: z.string().trim().max(255).optional(),
});

/* ID */

const leadTagIdSchema = z.object({
  id: z.string().uuid(),
});

/* LIST */

const listLeadTagSchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1))
    .optional()
    .default(1),

  page_size: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1).max(100))
    .optional()
    .default(20),

  search: z.string().trim().max(50).optional(),
});

module.exports = {
  LEAD_TAG_COLORS,
  LeadTagColorEnum,
  createLeadTagSchema,
  updateLeadTagSchema,
  leadTagIdSchema,
  listLeadTagSchema,
};
