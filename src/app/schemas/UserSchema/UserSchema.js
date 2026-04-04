import { z } from "zod";

// 🆕 CREATE USER SCHEMA - Only what's needed for user creation
export const CreateUserSchema = z.object({
  // Required fields
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .trim(),

  email: z.string().email("Invalid email format").toLowerCase().trim(),

  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Phone number must be 10-15 digits")
    .transform((val) => val.replace(/\s/g, "")),

  role: z.enum(["superAdmin", "admin", "user"], {
    errorMap: () => ({ message: "Role must be superAdmin, admin, or user" }),
  }),

  dateOfJoining: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .transform((val) => new Date(val).toISOString()),

  // Optional fields
  permissions: z.array(z.string()).optional(),
  department: z.string().max(100).trim().optional(),
  designation: z.string().max(100).trim().optional(),
  alternatePhone: z
    .string()
    .transform((val) => val.replace(/\s/g, ""))
    .refine(
      (val) => val === "" || /^\+?[0-9]{10,15}$/.test(val),
      "Alternate phone must be 10-15 digits"
    )
    .optional()
    .default(""),

  address: z
    .object({
      line1: z.string().default(""),
      city: z.string().default(""),
      state: z.string().default(""),
      pincode: z.string().default(""),
    })
    .default({
      line1: "",
      city: "",
      state: "",
      pincode: "",
    }),
});

// 🔄 UPDATE USER SCHEMA - Only fields that can be updated
export const UpdateUserSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters")
      .trim()
      .optional(),

    email: z
      .string()
      .email("Invalid email format")
      .toLowerCase()
      .trim()
      .optional(),

    phone: z
      .string()
      .regex(/^\+?[0-9]{10,15}$/, "Phone number must be 10-15 digits")
      .transform((val) => val.replace(/\s/g, ""))
      .optional(),

    alternatePhone: z
      .string()
      .regex(/^\+?[0-9]{10,15}$/, "Alternate phone must be 10-15 digits")
      .transform((val) => val.replace(/\s/g, ""))
      .optional(),

    department: z.string().max(100).trim().optional(),
    designation: z.string().max(100).trim().optional(),

    dateOfJoining: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .transform((val) => new Date(val).toISOString())
      .optional(),

    role: z
      .enum(["superAdmin", "admin", "user"], {
        errorMap: () => ({
          message: "Role must be superAdmin, admin, or user",
        }),
      })
      .optional(),

    permissions: z.array(z.string()).optional(),

    status: z
      .enum(["pending", "active", "disabled"], {
        errorMap: () => ({
          message: "Status must be pending, active, or disabled",
        }),
      })
      .optional(),

    address: z
      .object({
        line1: z.string().min(1, "Address line 1 is required").max(200).trim(),
        city: z.string().min(1, "City is required").max(100).trim(),
        state: z.string().min(1, "State is required").max(100).trim(),
        pincode: z
          .string()
          .regex(/^[0-9]{6}$/, "Pincode must be 6 digits")
          .trim(),
      })
      .partial() // This allows partial address updates
      .optional(),

    // Support flat address fields (will be transformed to nested address)
    addressLine: z.string().min(1).max(200).trim().optional(),
    city: z.string().min(1).max(100).trim().optional(),
    state: z.string().min(1).max(100).trim().optional(),
    pincode: z
      .string()
      .regex(/^[0-9]{6}$/, "Pincode must be 6 digits")
      .trim()
      .optional(),
  })
  .refine(
    // Ensure at least one field is provided for update
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided for update" }
  );

// 📧 RESEND INVITE SCHEMA - Simple email validation
export const ResendInviteSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase().trim(),
});

// 🔐 UPDATE ROLE & PERMISSIONS SCHEMA
export const UpdateRolePermissionsSchema = z
  .object({
    userId: z.string().min(1, "User ID is required").trim(),

    role: z
      .enum(["superAdmin", "admin", "user"], {
        errorMap: () => ({
          message: "Role must be superAdmin, admin, or user",
        }),
      })
      .optional(),

    permissions: z
      .array(z.string())
      .min(0, "Permissions must be an array")
      .optional(),
  })
  .refine(
    // Ensure at least one field is provided for update
    (data) => data.role !== undefined || data.permissions !== undefined,
    {
      message: "Either role or permissions must be provided for update",
      path: ["update"],
    }
  );

// 🗑️ DELETE USER SCHEMA
export const DeleteUserSchema = z.object({
  userId: z.string().min(1, "User ID is required").trim(),

  // Optional: Add confirmation flag for safety
  confirmDelete: z
    .boolean()
    .default(false)
    .refine((val) => val === true, {
      message: "confirmDelete must be true to proceed with deletion",
    }),
});
