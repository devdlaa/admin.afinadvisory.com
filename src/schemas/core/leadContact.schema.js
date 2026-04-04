import { z } from "zod";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/* ─────────────────────────────────────────────
   Base object — no cross-field refinements yet.
   We keep this as a plain ZodObject so that
   .partial() works correctly on the update schema.
───────────────────────────────────────────── */
const leadContactBaseSchema = z.object({
  entity_type: z.enum([
    "INDIVIDUAL",
    "UN_REGISTRED",
    "PRIVATE_LIMITED_COMPANY",
    "PUBLIC_LIMITED_COMPANY",
    "ONE_PERSON_COMPANY",
    "SECTION_8_COMPANY",
    "PRODUCER_COMPANY",
    "SOLE_PROPRIETORSHIP",
    "PARTNERSHIP_FIRM",
    "LIMITED_LIABILITY_PARTNERSHIP",
    "TRUST",
    "SOCIETY",
    "COOPERATIVE_SOCIETY",
    "FOREIGN_COMPANY",
    "GOVERNMENT_COMPANY",
    "ASSOCIATION_OF_PERSON",
    "HUF",
  ]),

  contact_person: z.string().trim().min(2).max(120),

  company_name: z.string().trim().max(150).optional(),
  designation: z.string().trim().max(120).optional(),

  primary_email: z.string().trim().email(),
  secondary_email: z.string().trim().email().optional(),

  primary_phone: z.string().trim().min(7).max(20),
  primary_whatsapp: z.boolean().optional(),

  secondary_phone: z.string().trim().min(7).max(20).optional(),
  secondary_whatsapp: z.boolean().optional(),

  website: z.string().trim().max(200).url().optional(),

  industry: z
    .enum([
      "ACCOMMODATION_SERVICES",
      "ADMINISTRATIVE_SERVICES",
      "CONSTRUCTION",
      "CONSUMER_SERVICES",
      "EDUCATION",
      "ENTERTAINMENT",
      "FARMING_FORESTRY",
      "FINANCIAL_SERVICES",
      "GOVERNMENT",
      "HOLDING_COMPANY",
      "HEALTHCARE",
      "MANUFACTURING",
      "OIL_GAS_MINING",
      "PROFESSIONAL_SERVICES",
      "REAL_ESTATE",
      "RETAIL",
      "TECHNOLOGY",
      "TRANSPORT_LOGISTICS",
      "UTILITIES",
      "OTHER",
    ])
    .optional(),

  pan: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PAN_REGEX, "Invalid PAN number")
    .optional(),

  gst_number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GST_REGEX, "Invalid GST number")
    .optional(),

  preferred_language: z
    .enum([
      "ENGLISH",
      "HINDI",
      "MARATHI",
      "GUJARATI",
      "TAMIL",
      "TELUGU",
      "BENGALI",
      "OTHER",
    ])
    .optional(),

  address_line1: z.string().trim().max(200).optional(),
  address_line2: z.string().trim().max(200).optional(),

  country_code: z.string().trim().length(2).optional(),
  country_name: z.string().trim().max(80).optional(),

  state_code: z.string().trim().max(10).optional(),
  state_name: z.string().trim().max(80).optional(),

  city: z.string().trim().max(80).optional(),
  pincode: z.string().trim().max(15).optional(),

  notes: z.string().trim().optional(),

  social_links: z
    .array(
      z.object({
        platform: z.enum([
          "LINKEDIN",
          "TWITTER",
          "FACEBOOK",
          "INSTAGRAM",
          "YOUTUBE",
          "OTHER",
        ]),
        url: z.string().trim().url(),
      }),
    )
    .optional()
    .refine(
      (links) => {
        if (!links) return true;
        const urls = links.map((l) => l.url);
        return new Set(urls).size === urls.length;
      },
      { message: "Duplicate social links are not allowed" },
    ),
});

/* ─────────────────────────────────────────────
   CREATE — base + mandatory fields enforced by
   type + cross-field refinements.
───────────────────────────────────────────── */
export const createLeadContactSchema = leadContactBaseSchema
  .refine(
    (data) =>
      !data.primary_email ||
      !data.secondary_email ||
      data.primary_email !== data.secondary_email,
    {
      message: "Primary and secondary email cannot be the same",
      path: ["secondary_email"],
    },
  )
  .refine(
    (data) =>
      !data.primary_phone ||
      !data.secondary_phone ||
      data.primary_phone !== data.secondary_phone,
    {
      message: "Primary and secondary phone cannot be the same",
      path: ["secondary_phone"],
    },
  );

/* ─────────────────────────────────────────────
   UPDATE — everything optional (partial on the
   raw ZodObject, before refinements), then we
   re-attach the same cross-field checks so they
   still fire when both fields are present.
───────────────────────────────────────────── */
export const updateLeadContactSchema = leadContactBaseSchema
  .partial()
  .refine(
    (data) =>
      !data.primary_email ||
      !data.secondary_email ||
      data.primary_email !== data.secondary_email,
    {
      message: "Primary and secondary email cannot be the same",
      path: ["secondary_email"],
    },
  )
  .refine(
    (data) =>
      !data.primary_phone ||
      !data.secondary_phone ||
      data.primary_phone !== data.secondary_phone,
    {
      message: "Primary and secondary phone cannot be the same",
      path: ["secondary_phone"],
    },
  );

/* ─────────────────────────────────────────────
   ID
───────────────────────────────────────────── */
export const leadContactIdSchema = z.object({
  id: z.string().uuid(),
});

/* ─────────────────────────────────────────────
   LIST
───────────────────────────────────────────── */
export const listLeadContactSchema = z.object({
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

  search: z.string().trim().max(120).optional(),

  compact: z
    .string()
    .transform((v) => v === "1" || v === "true")
    .optional(),

  entity_type: leadContactBaseSchema.shape.entity_type.optional(),

  industry: leadContactBaseSchema.shape.industry.optional(),

  country_code: z.string().trim().length(2).optional(),

  state_code: z.string().trim().max(10).optional(),

  preferred_language: leadContactBaseSchema.shape.preferred_language.optional(),

  has_email: z
    .string()
    .transform((v) => v === "true")
    .optional(),

  has_phone: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});
