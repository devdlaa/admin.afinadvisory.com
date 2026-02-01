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
});

export const documentDeleteSchema = z.object({
  id: z.string().uuid(),
});
