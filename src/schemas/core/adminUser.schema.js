import { z } from "zod";

// Indian States Enum
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
  "ANDAMAN_AND_NICOBAR_ISLANDS",
  "CHANDIGARH",
  "DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU",
  "DELHI",
  "JAMMU_AND_KASHMIR",
  "LADAKH",
  "LAKSHADWEEP",
  "PUDUCHERRY",
]);

export const ADMIN_ROLES = z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER"]);

// Admin User Status Enum
export const AdminUserStatusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);

// Phone validation reused
const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format");

// ------------------------
// BASE SCHEMA (no refine)
// ------------------------
const AdminUserBaseSchema = z.object({
  name: z.string().max(100).trim(),
  email: z.string().email("Invalid email"),
  phone: phoneSchema,

  alternate_phone: phoneSchema.optional().nullable(),

  address_line1: z.string().max(200).trim().optional(),
  address_line2: z.string().max(200).trim().optional().nullable(),
  city: z.string().max(50).trim().optional(),
  state: IndianStateEnum.optional(),

  pincode: z
    .string()
    .regex(/^\d{6}$/, "Pincode must be exactly 6 digits")
    .optional()
    .nullable(),

  admin_role: ADMIN_ROLES.default("ADMIN"),
  permission_codes: z.array(z.string()).default([]).optional(),
});

// ------------------------
// CREATE SCHEMA
// ------------------------
export const AdminUserCreateSchema = AdminUserBaseSchema.extend({
  name: z.string().min(1, "Name is required").max(100).trim(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
});

// ------------------------
// UPDATE SCHEMA
// ------------------------
export const AdminUserUpdateSchema = AdminUserBaseSchema.partial().extend({
  status: AdminUserStatusEnum.optional(),
});

// ------------------------
// LOGIN SCHEMA
// ------------------------
export const AdminUserLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

// ------------------------
// SEARCH SCHEMA
// ------------------------
export const AdminUserSearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
});

// ------------------------
// LIST SCHEMA
// ------------------------
export const AdminUserListSchema = z.object({
  status: AdminUserStatusEnum.optional(),
  search: z.string().trim().optional(),
  admin_role: ADMIN_ROLES.optional(),

  page: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().positive().max(100).default(40),
});

// ------------------------
// ID SCHEMA
// ------------------------
export const AdminUserIdSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
});
