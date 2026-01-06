import { z } from "zod";

export const taskCategoryCreateSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long")
    .trim(),

  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(50)
    .toUpperCase(),

  description: z.string().max(500).optional().nullable(),
});

export const taskCategoryUpdateSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),

  code: z.string().min(2).max(50).toUpperCase().optional(),

  description: z.string().max(500).optional().nullable(),
});

export const taskCategoryIdSchema = z.object({
  id: z.string().uuid("Invalid category ID"),
});
