import { z } from "zod";

// Indian States Enum
const IndianStateEnum = z.enum([
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

export const ADMIN_ROLES = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "WEBSITE_MANAGER",
  "VIEW_ONLY",
]);

// Admin User Status Enum
const AdminUserStatusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);

export const AdminUserCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  email: z.string().email("Invalid email"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format"),

  alternate_phone: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format")
    .optional()
    .nullable(),

  address_line1: z.string().max(200).optional(),
  address_line2: z.string().max(200).optional().nullable(),
  city: z.string().max(50).optional(),
  state: IndianStateEnum.optional(),
  pincode: z
    .string()
    .length(6, "Pincode must be exactly 6 digits")
    .regex(/^\d{6}$/, "Pincode must contain only digits")
    .optional()
    .nullable(),

  date_of_joining: z.string().datetime().optional(),

  department_ids: z.array(z.string().uuid()).optional(),

  admin_role: ADMIN_ROLES.default("EMPLOYEE"),
  permission_codes: z.array(z.string()).optional().default([]),
});

export const AdminUserUpdateSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  email: z.string().email("Invalid email").optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format")
    .optional(),
  alternate_phone: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format")
    .optional()
    .nullable(),

  address_line1: z.string().max(200).optional(),
  address_line2: z.string().max(200).optional().nullable(),
  city: z.string().max(50).optional(),
  state: IndianStateEnum.optional(),
  pincode: z
    .string()
    .length(6)
    .regex(/^\d{6}$/)
    .optional()
    .nullable(),

  status: AdminUserStatusEnum.optional(),

  // keep departments only
  department_ids: z.array(z.string().uuid()).optional(),

  admin_role: ADMIN_ROLES.optional(),
  permission_codes: z.never().optional(),
});

export const AdminUserLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

export const AdminUserSearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
});

export const AdminUserListSchema = z.object({
  status: AdminUserStatusEnum.optional(),

  department_id: z.string().uuid().optional(),

  search: z.string().trim().min(1).optional(),

  admin_role: ADMIN_ROLES.optional(),
  page: z.coerce.number().int().nonnegative().default(0).optional(),

  limit: z.coerce.number().int().nonnegative().max(20).default(20).optional(),
});

export const ResendOnboardingInviteSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
});
