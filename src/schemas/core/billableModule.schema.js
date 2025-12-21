import { z } from "zod";
export const BillableModuleCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(500).optional().nullable(),
  default_price: z.number().nonnegative('Price cannot be negative').multipleOf(0.01),
  gst_rate: z.number().min(0).max(100, 'GST rate must be between 0-100').multipleOf(0.01),
  sac_code: z.string().max(20).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  is_active: z.boolean().default(true)
});

export const BillableModuleUpdateSchema = BillableModuleCreateSchema.partial();

export const BillableModuleQuerySchema = z.object({
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});
