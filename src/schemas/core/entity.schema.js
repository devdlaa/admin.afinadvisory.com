import { z } from "zod";

export const EntityTypeEnum = z.enum([
  "UN_REGISTRED",
  "INDIVIDUAL",
  "PRIVATE_LIMITED_COMPANY",
  "PUBLIC_LIMITED_COMPANY",
  "ONE_PERSON_COMPANY",
  "SECTION_8_COMPANY",
  "PRODUCER_COMPANY",
  "SOLE_PROPRIETORSHIP",
  "PARTNERSHIP_FIRM",
  "LIMITED_LIABILITY_PARTNERSHIP",
  "TRUST",
  "HUF",
  "ASSOCIATION_OF_PERSON",
  "SOCIETY",
  "COOPERATIVE_SOCIETY",
  "FOREIGN_COMPANY",
  "GOVERNMENT_COMPANY",
]);

const CustomFieldSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Field name is required")
    .max(50, "Field name too long")
    .regex(/^[a-zA-Z0-9 _-]+$/, "Invalid characters in field name"),

  value: z.string().trim().max(255, "Value too long").optional().nullable(),
});

const CustomFieldsArraySchema = z
  .array(CustomFieldSchema)
  .max(10, "Maximum 10 custom fields allowed")
  .superRefine((fields, ctx) => {
    const seen = new Set();

    for (const f of fields) {
      const key = f.name.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate custom field name: ${f.name}`,
          path: ["custom_fields"],
        });
      }
      seen.add(key);
    }
  });

export const EntityStatusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const pincodeRegex = /^[0-9]{6}$/;
const phoneRegex = /^[0-9]{10}$/;

// ----------------------------------------------------
// BASE SCHEMA (NO REFINES HERE — important for partial)
// ----------------------------------------------------
const toTitleCase = (value) => {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const EntityBaseSchema = z.object({
  entity_type: EntityTypeEnum,

  // Normalize and title case the name
  name: z.string().min(1).max(120).transform(toTitleCase),

  pan: z
    .string()
    .trim()
    .regex(panRegex, "Invalid PAN format (e.g., ABCDE1234F)")
    .transform((v) => v.toUpperCase())
    .optional()
    .nullable(),

  email: z.string().trim().email("Invalid email"),

  primary_phone: z.string().trim().regex(phoneRegex, "Phone must be 10 digits"),

  contact_person: z.string().trim().max(100).optional().nullable(),

  secondary_phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Phone must be 10 digits")
    .optional()
    .nullable(),

  address_line1: z.string().trim().max(200).optional().nullable(),
  address_line2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(50).optional().nullable(),
  state: z.string().trim().max(50).optional().nullable(),

  pincode: z
    .string()
    .trim()
    .regex(pincodeRegex, "Pincode must be 6 digits")
    .optional()
    .nullable(),

  is_retainer: z.boolean().default(false),

  status: EntityStatusEnum.default("INACTIVE"),

  custom_fields: CustomFieldsArraySchema.optional(),
});
// -------------------------------------------
// CREATE SCHEMA (refinement lives only here)
// -------------------------------------------
export const EntityCreateSchema = EntityBaseSchema.refine(
  (data) =>
    data.entity_type === "UN_REGISTRED" ||
    (data.pan && data.pan.trim().length > 0),
  {
    message: "PAN is required for this entity type",
    path: ["pan"],
  }
);

// -------------------------------------------
// UPDATE SCHEMA (safe partial on base schema)
// -------------------------------------------
export const EntityUpdateSchema = EntityBaseSchema.partial().refine(
  (data) =>
    data.entity_type === "UN_REGISTRED" ||
    !data.pan ||
    data.pan.trim().length > 0,
  {
    message: "PAN is required for this entity type",
    path: ["pan"],
  }
);

// -------------------------------------------
// QUERY SCHEMA
// -------------------------------------------
export const EntityQuerySchema = z.object({
  entity_type: EntityTypeEnum.optional(),
  status: EntityStatusEnum.optional(),
  is_retainer: z.boolean().optional(),
  state: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(20),
});
