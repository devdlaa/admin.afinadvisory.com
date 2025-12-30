import { z } from "zod";

/**
 * Frequency type enum
 */
export const FrequencyTypeEnum = z.enum([
  "MONTHLY",
  "QUARTERLY",
  "HALFYEARLY",
  "YEARLY",
]);

/**
 * Create compliance rule schema
 * Note: anchor_months and period_label_type are auto-calculated, not user input
 */
export const ComplianceRuleCreateSchema = z.object({
  compliance_code: z
    .string()
    .min(1, "Compliance code is required")
    .max(100, "Compliance code must not exceed 100 characters")
    .trim()
    .transform((val) => val.toUpperCase())
    .refine((val) => /^[A-Z0-9]+(_[A-Z0-9]+)*$/.test(val), {
      message:
        "Compliance code must contain only uppercase letters, digits and underscores, " +
        "and must not start or end with an underscore",
    }),

  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must not exceed 255 characters")
    .trim(),

  registration_type_id: z.string().uuid("Invalid registration type ID"),

  frequency_type: FrequencyTypeEnum,

  // anchor_months - NOT in schema (auto-calculated based on frequency_type)
  // period_label_type - NOT in schema (auto-derived from frequency_type)

  due_day: z
    .number()
    .int()
    .min(1, "Due day must be at least 1")
    .max(31, "Due day must not exceed 31"),

  due_month_offset: z
    .number()
    .int()
    .min(-3, "Due month offset must be at least -3")
    .max(12, "Due month offset must not exceed 12")
    .default(0)
    .describe(
      "Months to add/subtract from anchor month for due date calculation"
    ),

  grace_days: z
    .number()
    .int()
    .min(0, "Grace days cannot be negative")
    .default(0)
    .describe("Additional days allowed after due date"),

  is_active: z.boolean().default(true),
});

/**
 * Update compliance rule schema
 * Cannot update compliance_code once created
 */
export const ComplianceRuleUpdateSchema = z
  .object({
    compliance_code: z
      .string()
      .min(1, "Compliance code is required")
      .max(100, "Compliance code must not exceed 100 characters")
      .trim()
      .transform((val) => val.toUpperCase())
      .refine((val) => /^[A-Z0-9]+(_[A-Z0-9]+)*$/.test(val), {
        message:
          "Compliance code must contain only uppercase letters, digits and underscores, " +
          "and must not start or end with an underscore",
      })
      .optional(),

    name: z.string().min(1).max(255).trim().optional(),

    registration_type_id: z.string().uuid().optional(),

    frequency_type: FrequencyTypeEnum.optional(),

    due_day: z.number().int().min(1).max(31).optional(),

    due_month_offset: z.number().int().min(-3).max(12).optional(),

    grace_days: z.number().int().min(0).optional(),

    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field must be provided to update",
    path: ["_root"],
  });

/**
 * Filter schema for listing compliance rules
 */
export const ComplianceRuleListSchema = z.object({
  registration_type_id: z.string().uuid().optional(),
  frequency_type: FrequencyTypeEnum.optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  search: z.string().optional(),
});
