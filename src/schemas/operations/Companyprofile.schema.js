import { z } from "zod";

// Indian state enum (based on your schema reference)
export const IndianStateEnum = z.enum([
  "ANDHRA_PRADESH",
  "ARUNACHAL_PRADESH",
  "ASSAM",
  "BIHAR",
  "CHHATTISGARH",
  "GOA",
  "GUJARAT",
  "HARYANA",
  "HIMACHAL_PRADESH",
  "JHARKHAND",
  "KARNATAKA",
  "KERALA",
  "MADHYA_PRADESH",
  "MAHARASHTRA",
  "MANIPUR",
  "MEGHALAYA",
  "MIZORAM",
  "NAGALAND",
  "ODISHA",
  "PUNJAB",
  "RAJASTHAN",
  "SIKKIM",
  "TAMIL_NADU",
  "TELANGANA",
  "TRIPURA",
  "UTTAR_PRADESH",
  "UTTARAKHAND",
  "WEST_BENGAL",
  "ANDAMAN_AND_NICOBAR",
  "CHANDIGARH",
  "DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU",
  "DELHI",
  "JAMMU_AND_KASHMIR",
  "LADAKH",
  "LAKSHADWEEP",
  "PUDUCHERRY",
]);

// Validation regex patterns
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const pincodeRegex = /^[0-9]{6}$/;
const phoneRegex = /^[0-9]{10}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// Title case transformation helper
const toTitleCase = (value) => {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// ----------------------------------------------------
// BASE SCHEMA (NO REFINES HERE — important for partial)
// ----------------------------------------------------
const CompanyProfileBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(150, "Company name too long (max 150)")
    .transform(toTitleCase),

  legal_name: z
    .string()
    .trim()
    .max(200, "Legal name too long (max 200)")
    .transform(toTitleCase)
    .optional()
    .nullable(),

  pan: z
    .string()
    .trim()
    .regex(panRegex, "Invalid PAN format (e.g., ABCDE1234F)")
    .transform((v) => v.toUpperCase())
    .optional()
    .nullable(),

  gst_number: z
    .string()
    .trim()
    .regex(gstRegex, "Invalid GST format (e.g., 27AAAAA0000A1Z5)")
    .transform((v) => v.toUpperCase())
    .optional()
    .nullable(),

  email: z.string().trim().email("Invalid email").optional().nullable(),

  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Phone must be 10 digits")
    .optional()
    .nullable(),

  address_line1: z
    .string()
    .trim()
    .max(200, "Address line 1 too long (max 200)")
    .optional()
    .nullable(),

  address_line2: z
    .string()
    .trim()
    .max(200, "Address line 2 too long (max 200)")
    .optional()
    .nullable(),

  city: z
    .string()
    .trim()
    .max(50, "City name too long (max 50)")
    .optional()
    .nullable(),

  state: IndianStateEnum.optional().nullable(),

  pincode: z
    .string()
    .trim()
    .regex(pincodeRegex, "Pincode must be 6 digits")
    .optional()
    .nullable(),

  bank_name: z
    .string()
    .trim()
    .max(100, "Bank name too long (max 100)")
    .optional()
    .nullable(),

  bank_account_no: z
    .string()
    .trim()
    .max(30, "Account number too long (max 30)")
    .optional()
    .nullable(),

  bank_ifsc: z
    .string()
    .trim()
    .regex(ifscRegex, "Invalid IFSC code format (e.g., SBIN0001234)")
    .transform((v) => v.toUpperCase())
    .optional()
    .nullable(),

  bank_branch: z
    .string()
    .trim()
    .max(100, "Branch name too long (max 100)")
    .optional()
    .nullable(),

  is_default: z.boolean().default(false),

  is_active: z.boolean().default(true),
});

// -------------------------------------------
// CREATE SCHEMA
// -------------------------------------------
export const CompanyProfileCreateSchema = CompanyProfileBaseSchema.refine(
  (data) => {
    // If GST is provided, PAN is required
    if (data.gst_number && !data.pan) {
      return false;
    }
    return true;
  },
  {
    message: "PAN is required when GST number is provided",
    path: ["pan"],
  },
)
  .refine(
    (data) => {
      // If GST is provided, it should start with PAN
      if (data.gst_number && data.pan) {
        const gstPanPart = data.gst_number.substring(2, 12);
        if (gstPanPart !== data.pan) {
          return false;
        }
      }
      return true;
    },
    {
      message: "GST number must contain the same PAN",
      path: ["gst_number"],
    },
  )
  .refine(
    (data) => {
      // If any bank detail is provided, all bank details should be provided
      const bankFields = [data.bank_name, data.bank_account_no, data.bank_ifsc];
      const filledBankFields = bankFields.filter((field) => field).length;

      if (filledBankFields > 0 && filledBankFields < 3) {
        return false;
      }
      return true;
    },
    {
      message:
        "All bank details (name, account number, IFSC) are required if any bank detail is provided",
      path: ["bank_name"],
    },
  );

// -------------------------------------------
// UPDATE SCHEMA (safe partial on base schema)
// -------------------------------------------
export const CompanyProfileUpdateSchema = CompanyProfileBaseSchema.partial()
  .refine(
    (data) => {
      // If GST is provided, PAN is required
      if (data.gst_number && !data.pan) {
        return false;
      }
      return true;
    },
    {
      message: "PAN is required when GST number is provided",
      path: ["pan"],
    },
  )
  .refine(
    (data) => {
      // If both GST and PAN are provided, validate they match
      if (data.gst_number && data.pan) {
        const gstPanPart = data.gst_number.substring(2, 12);
        if (gstPanPart !== data.pan) {
          return false;
        }
      }
      return true;
    },
    {
      message: "GST number must contain the same PAN",
      path: ["gst_number"],
    },
  );

// -------------------------------------------
// QUERY SCHEMA
// -------------------------------------------
export const CompanyProfileQuerySchema = z.object({
  is_default: z
    .union([z.string(), z.boolean()])
    .transform((val) => {
      if (typeof val === "boolean") return val;
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    })
    .optional(),

  is_active: z
    .union([z.string(), z.boolean()])
    .transform((val) => {
      if (typeof val === "boolean") return val;
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    })
    .optional(),

  state: IndianStateEnum.optional(),

  search: z.string().optional(),

  page: z.coerce.number().min(1).default(1),

  page_size: z.coerce.number().min(1).max(100).default(20),
});
