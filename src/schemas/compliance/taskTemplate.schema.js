import { z } from "zod";

// Zod validation schema for POST
export const TaskTemplateCreateSchema = z.object({
  compliance_rule_id: z.string().uuid("Invalid compliance rule ID format"),

  title_template: z
    .string()
    .min(1, "Title is required")
    .max(500, "Title must not exceed 500 characters")
    .trim()
    .regex(
      /^[A-Za-z0-9 _-]+$/,
      "Title can only contain letters, numbers, spaces, hyphens, and underscores"
    ),

  description_template: z.string().optional().nullable(),

  is_active: z.boolean().default(true).optional(),
});

export const TaskTemplateUpdateSchema = z
  .object({
    compliance_rule_id: z.string().uuid().optional(),

    title_template: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(500, "Title must not exceed 500 characters")
      .regex(
        /^[A-Za-z0-9 _-]+$/,
        "Title can only contain letters, numbers, spaces, hyphens, and underscores"
      )
      .optional(),

    description_template: z.string().optional().nullable(),

    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field must be provided to update",
    path: ["_root"],
  });

// Zod validation schema for GET query parameters
export const TaskTemplateListSchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),

  page_size: z.coerce.number().int().positive().max(100).default(10).optional(),

  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),

  compliance_rule_id: z
    .string()
    .uuid("Invalid compliance rule ID format")
    .optional(),

  search: z.string().trim().min(1).optional(),
});

export const TaskTemplateModuleSchema = z.object({
  modules: z
    .array(
      z.object({
        billable_module_id: z.string().uuid(),
      })
    )
    .default([]),
});
