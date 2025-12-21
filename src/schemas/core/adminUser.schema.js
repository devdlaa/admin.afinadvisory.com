import { z } from "zod";
export const AdminUserCreateSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[0-9]/, "Password must contain number")
    .regex(/[^A-Za-z0-9]/, "Password must contain special character"),
  role_ids: z.array(z.string().uuid()).min(1, "At least one role required"),
  department_ids: z.array(z.string().uuid()).optional(),
});

export const AdminUserUpdateSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  email: z.string().email("Invalid email").optional(),
  password: z.string().min(8).optional(),
  role_ids: z.array(z.string().uuid()).optional(),
  department_ids: z.array(z.string().uuid()).optional(),
});

export const AdminUserLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});
