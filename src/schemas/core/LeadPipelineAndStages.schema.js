import { z } from "zod";

/* ---------------- ICON SET ---------------- */

export const PIPELINE_ICONS = [
  "chart",
  "support",
  "buildings",
  "tools",
  "truck",
  "code",
  "message",
  "telescope",
  "shield",
  "money",
  "bank",
  "education",
  "car",
  "settings",
  "user",
  "gift",
  "heart",
  "home",
  "medical",
  "workflow",
];

const PipelineIconEnum = z.enum(PIPELINE_ICONS).optional("settings");

/* ---------------- NAME RULES ---------------- */

const PIPELINE_NAME_REGEX = /^[A-Za-z0-9 ]+$/;

const pipelineNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(
    PIPELINE_NAME_REGEX,
    "Pipeline name can only contain letters, numbers and spaces",
  )
  .transform((v) => v.replace(/\s+/g, " "));

/* ---------------- STAGE ---------------- */

const stageSchema = z.object({
  id: z.string().uuid().optional(),

  name: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .transform((v) => v.replace(/\s+/g, " ")),
});

/* ---------------- CREATE ---------------- */

export const createLeadPipelineSchema = z
  .object({
    company_profile_id: z.string().uuid(),

    name: pipelineNameSchema,

    description: z.string().trim().max(200).optional(),

    icon: PipelineIconEnum.optional(),

    stages: z.array(stageSchema).min(1).max(10),
  })
  .superRefine((data, ctx) => {
    const names = data.stages.map((s) => s.name.toLowerCase());

    const duplicates = names.filter((name, i) => names.indexOf(name) !== i);

    if (duplicates.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate stage names are not allowed within a pipeline",
        path: ["stages"],
      });
    }
  });

/* ---------------- UPDATE ---------------- */

export const updateLeadPipelineSchema = z
  .object({
    name: pipelineNameSchema.optional(),

    description: z.string().trim().max(200).optional(),

    icon: PipelineIconEnum.optional(),

    stages: z.array(stageSchema).min(1).max(10).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.stages) return;

    const names = data.stages.map((s) => s.name.toLowerCase());

    const duplicates = names.filter((name, i) => names.indexOf(name) !== i);

    if (duplicates.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate stage names are not allowed within a pipeline",
        path: ["stages"],
      });
    }
  });

/* ---------------- ID ---------------- */

export const leadPipelineIdSchema = z.object({
  id: z.string().uuid(),
});

/* ---------------- LIST ---------------- */

export const listLeadPipelineSchema = z.object({
  company_profile_id: z.string().uuid().optional(),

  page: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1))
    .optional()
    .default(1),

  page_size: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1).max(50))
    .optional()
    .default(20),

  search: z.string().trim().max(120).optional(),
});
