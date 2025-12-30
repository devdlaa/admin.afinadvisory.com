import { z } from "zod";

export const createTaskCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must not exceed 50 characters")
    .trim(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export const listTaskCategoriesSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  page_size: z.coerce.number().int().positive().max(50).optional().default(10),
  is_active: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  search: z.string().optional(),
});

export const updateTaskCategorySchema = z
  .object({
    name: z
      .string()
      .min(1, "Name cannot be empty")
      .max(50, "Name must not exceed 50 characters")
      .trim()
      .optional(),

    description: z.string().optional().nullable(),

    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
    path: ["_root"], // or put it on a specific field if you prefer
  });
