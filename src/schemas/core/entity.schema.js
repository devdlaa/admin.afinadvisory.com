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
  "SOCIETY",
  "COOPERATIVE_SOCIETY",
  "FOREIGN_COMPANY",
  "GOVERNMENT_COMPANY",
]);

export const EntityStatusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const pincodeRegex = /^[0-9]{6}$/;
const phoneRegex = /^[0-9]{10}$/;

export const EntityCreateSchema = z
  .object({
    entity_type: EntityTypeEnum,

    name: z.string().min(1).max(120).trim(),

    pan: z
      .string()
      .regex(panRegex, "Invalid PAN format (e.g., ABCDE1234F)")
      .transform((v) => v.toUpperCase())
      .optional()
      .nullable(),

    email: z.string().email("Invalid email"),

    primary_phone: z.string().regex(phoneRegex, "Phone must be 10 digits"),

    contact_person: z.string().max(100).trim().optional().nullable(),

    secondary_phone: z
      .string()
      .regex(phoneRegex, "Phone must be 10 digits")
      .optional()
      .nullable(),

    address_line1: z.string().max(200).trim().optional().nullable(),
    address_line2: z.string().max(200).trim().optional().nullable(),
    city: z.string().max(50).trim().optional().nullable(),
    state: z.string().max(50).trim().optional().nullable(),

    pincode: z
      .string()
      .regex(pincodeRegex, "Pincode must be 6 digits")
      .optional()
      .nullable(),

    is_retainer: z.boolean().default(false),

    status: EntityStatusEnum.default("INACTIVE"),
  })

  // conditional PAN rule lives here
  .refine(
    (data) =>
      data.entity_type === "UN_REGISTRED" ||
      (data.pan && data.pan.trim().length > 0),
    {
      message: "PAN is required for this entity type",
      path: ["pan"],
    }
  );

export const EntityUpdateSchema = EntityCreateSchema.partial().refine(
  (data) =>
    data.entity_type === "UN_REGISTRED" ||
    (data.pan && data.pan.trim().length > 0),
  {
    message: "PAN is required for this entity type",
    path: ["pan"],
  }
);

export const EntityQuerySchema = z.object({
  entity_type: EntityTypeEnum.optional(),
  status: EntityStatusEnum.optional(),
  is_retainer: z.boolean().optional(),
  state: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
