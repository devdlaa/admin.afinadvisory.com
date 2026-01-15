import { z } from "zod";
import admin from "firebase-admin";

const TimestampSchema = z.custom(
  (val) => val instanceof admin.firestore.Timestamp,
  { message: "Must be a Firestore Timestamp" }
);

// GSTIN validation: 2-char state code + 10-char PAN + 1-char entity + 1-char Z + 1-char checksum
const GSTINRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const BusinessSchema = z.object({
  id: z.string(),
  
  // Basic Info
  name: z.string().min(2, "Business name is required").max(100),
  email: z.string().email("Valid business email is required"),
  phone: z
    .string()
    .regex(/^\+\d{1,3}\d{8,12}$/, "Phone must include country code (e.g., +911234567890)")
    .max(15),
  
  // Tax Info
  gstin: z
    .string()
    .regex(GSTINRegex, "Invalid GSTIN format")
    .nullable(),
  
  // Features
  billingEnabled: z.boolean().default(false),
  
  // Audit Trail
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  createdBy: z.string().min(1),
  lastUpdatedBy: z.string().min(1),
  
  // Soft Delete
  flags: z.object({
    softDeleted: z.boolean().default(false),
    deletedAt: TimestampSchema.nullable(),
    deletedBy: z.string().nullable(),
  }),
});

// Create Schema
export const BusinessCreateSchema = BusinessSchema.omit({ 
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUpdatedBy: true,
  flags: true,
});

// Update Schema
export const BusinessUpdateSchema = BusinessSchema.partial()
  .required({ id: true })
  .omit({ 
    createdAt: true, 
    createdBy: true,
    ownerId: true, // Prevent ownership transfer via update
  });

// Validation helpers
export function validateBusiness(data) {
  const result = BusinessSchema.safeParse(data);
  return result.success
    ? { valid: true, data: result.data }
    : { valid: false, errors: result.error.errors };
}

export function validateBusinessCreate(data) {
  const result = BusinessCreateSchema.safeParse(data);
  return result.success
    ? { valid: true, data: result.data }
    : { valid: false, errors: result.error.errors };
}

export function validateBusinessUpdate(data) {
  const result = BusinessUpdateSchema.safeParse(data);
  return result.success
    ? { valid: true, data: result.data }
    : { valid: false, errors: result.error.errors };
}