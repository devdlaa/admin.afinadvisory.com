import { z } from "zod";

// ================= CREATE (BULK) =================
export const PermissionCreateSchema = z.object({
  body: z.object({
    permissions: z
      .array(
        z.object({
          code: z.string().min(3).max(100),
          label: z.string().max(200).optional(),
          category: z.string().max(100).optional(),
        }),
      )
      .min(1),
  }),
});

// ================= UPDATE =================
export const PermissionUpdateSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      code: z.string().min(3).max(100).optional(),
      label: z.string().max(200).nullable().optional(),
      category: z.string().max(100).nullable().optional(),
    })
    .refine((v) => Object.keys(v).length > 0),
});

// ================= BULK UPDATE =================
export const PermissionBulkUpdateSchema = z.object({
  body: z.object({
    updates: z
      .array(
        z.object({
          id: z.string().uuid(),
          fields: z.object({
            code: z.string().min(3).max(100).optional(),
            label: z.string().max(200).nullable().optional(),
            category: z.string().max(100).nullable().optional(),
          }),
        }),
      )
      .min(1),
  }),
});

// ================= DELETE =================
export const PermissionDeleteSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// ================= LIST =================
export const PermissionListSchema = z.object({
  query: z.object({
    category: z.string().optional(),
    search: z.string().optional(),
  }),
});
