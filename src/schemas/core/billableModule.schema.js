import { z } from "zod";

export const BillableModuleUpdateSchema = z
  .object({
    name: z
      .string()
      .min(1, "Module name cannot be empty")
      .max(255, "Module name must not exceed 255 characters")
      .trim()
      .regex(
        /^[A-Za-z0-9\- ]+$/,
        "Module name can only contain letters, numbers, spaces, and hyphens"
      )
      .optional(),

    description: z.string().optional().nullable(),

    category_id: z
      .string()
      .uuid("Invalid category ID format")
      .optional()
      .nullable(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.category_id !== undefined,
    {
      message: "At least one field must be provided to update",
      path: ["_root"],
    }
  );

export const BillableModuleCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Module name is required")
    .max(255, "Module name must not exceed 255 characters")
    .trim()
    .regex(
      /^[A-Za-z0-9\- ]+$/,
      "Module name can only contain letters, numbers, spaces, and hyphens"
    ),
  description: z.string().optional().nullable(),
  category_id: z.string().uuid("Invalid category ID format"),
});

export const BillableModuleQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  page_size: z.coerce.number().int().positive().max(100).optional().default(10),
  category_id: z.string().uuid("Invalid category ID format").optional(),
  search: z.string().optional(),
});

export const BillableModuleCreateCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must not exceed 50 characters")
    .trim(),
  description: z.string().optional().nullable(),
});

export const BillableModuleListCategoriesSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  page_size: z.coerce.number().int().positive().max(20).optional().default(10),
  search: z.string().optional(),
});

export const BillableModuleUpdateCategorySchema = z
  .object({
    name: z
      .string()
      .min(1, "Name cannot be empty")
      .max(50, "Name must not exceed 50 characters")
      .trim()
      .optional(),

    description: z.string().optional().nullable(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "At least one field must be provided to update",
    path: ["_root"], 
  });
