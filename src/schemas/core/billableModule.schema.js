import { z } from "zod";

/**
 * CREATE service module
 * (formerly billable module)
 */
export const BillableModuleCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(500).optional().nullable(),

  // purely classification now
  category_id: z.string().uuid().optional().nullable(),

  is_active: z.boolean().default(true),
});

/**
 * UPDATE service module
 */
export const BillableModuleUpdateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
});

/**
 * QUERY service modules
 */
export const BillableModuleQuerySchema = z.object({
  category_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional(),

  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
