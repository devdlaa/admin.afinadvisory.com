import { z } from "zod";

/* ---------------------------------------------------
ENUMS
--------------------------------------------------- */

export const leadSourceEnum = z.enum([
  "MANUAL",
  "WEBSITE_FORM",
  "FACEBOOK_AD",
  "INSTAGRAM_AD",
  "GOOGLE_AD",
  "YOUTUBE_AD",
  "WHATSAPP",
  "REFERRAL",
  "EVENT",
  "COLD_CALL",
  "PARTNER",
  "OTHER",
]);

const leadPriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

/* ---------------------------------------------------
REFERENCE TYPES
--------------------------------------------------- */

const influencerReference = z
  .object({
    type: z.literal("INFLUENCER"),
    influencer_id: z.string().uuid(),
  })
  .strict();

const entityReference = z
  .object({
    type: z.literal("ENTITY"),
    entity_id: z.string().uuid(),
  })
  .strict();

const leadContactReference = z
  .object({
    type: z.literal("LEAD_CONTACT"),
    lead_contact_id: z.string().uuid(),
  })
  .strict();

const externalPersonReference = z
  .object({
    type: z.literal("EXTERNAL_PERSON"),
    name: z.string().trim().min(1).max(120),
    email: z.string().email().optional(),
    phone: z.string().trim().max(20).optional(),
  })
  .strict();

const leadReferenceSchema = z.union([
  influencerReference,
  entityReference,
  leadContactReference,
  externalPersonReference,
]);

/* ---------------------------------------------------
CREATE LEAD BODY
--------------------------------------------------- */

export const createLeadSchema = z.object({
  title: z.string().trim().min(1).max(200),

  description: z.string().trim().max(1000).optional(),

  pipeline_id: z.string().uuid(),

  company_profile_id: z.string().uuid(),

  lead_contact_id: z.string().uuid(),

  priority: leadPriorityEnum.optional().default("NORMAL"),

  expected_close_date: z.string().datetime().optional(),

  tags: z.array(z.string().uuid()).max(20).optional(),

  reference: leadReferenceSchema.optional(),
});

export const updateLeadSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),

  description: z.string().trim().max(1000).optional(),

  priority: leadPriorityEnum.optional(),

  lead_contact_id: z.string().uuid().optional(),

  company_profile_id: z.string().uuid().optional(),

  reference: leadReferenceSchema.nullable().optional(),

  tags: z.array(z.string().uuid()).max(20).optional(),
});

export const updateLeadParamsSchema = z.object({
  id: z.string().uuid(),
});

export const updateLeadStageBodySchema = z.object({
  stage_id: z.string().uuid(),
});

export const updateLeadTagsBodySchema = z.object({
  tag_ids: z.array(z.string().uuid()).max(20),
});

export const deleteLeadParamsSchema = z.object({
  id: z.string().uuid(),
});

export const getLeadParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listPipelineLeadsQuerySchema = z.object({
  limit: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1).max(20))
    .optional()
    .default(8),

  cursor: z.string().optional(),

  stage_ids: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",") : undefined)),
});
