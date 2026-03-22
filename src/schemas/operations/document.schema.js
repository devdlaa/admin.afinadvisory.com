import { z } from "zod";

export const DocumentScopeEnum = z.enum([
  "TASK",
  "INVOICE",
  "ENTITY",
  "COMPANY_PROFILE",
  "OTHER",
]);

export const documentUploadSchema = z.object({
  scope: DocumentScopeEnum,
  scope_id: z.string().uuid(),
});

export const documentListQuerySchema = z.object({
  scope: DocumentScopeEnum,
  scope_id: z.string().uuid(),

  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(20),

  sort: z
    .enum(["created_at", "original_name", "mime_type", "size_bytes"])
    .default("created_at"),

  order: z.enum(["asc", "desc"]).default("desc"),


  mime_types: z
    .string()
    .nullish()
    .optional()
    .transform((val) => (val ? val.split(",") : undefined)),

  min_size: z.coerce.number().optional(),
  max_size: z.coerce.number().optional(),
});

export const documentDeleteSchema = z.object({
  id: z.string().uuid(),
});

export const renameDocumentSchema = z.object({
  id: z.string().uuid("Invalid document ID"),
  name: z
    .string()
    .min(1, "File name cannot be empty")
    .max(255, "File name too long")
    .trim()
    // Strip any path traversal attempts
    .refine((v) => !v.includes("/") && !v.includes("\\"), {
      message: "File name cannot contain slashes",
    }),
});
