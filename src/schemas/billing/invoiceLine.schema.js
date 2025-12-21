import { z } from 'zod';
export const InvoiceLineCreateSchema = z.object({
  invoice_id: z.string().uuid(),
  task_id: z.string().uuid(),
  task_module_id: z.string().uuid(),
  description: z.string().max(500).optional().nullable(),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit_price: z.number().nonnegative().multipleOf(0.01),
  gst_rate: z.number().min(0).max(100).multipleOf(0.01),
  // Auto-calculated fields
  gst_amount: z.number().nonnegative().multipleOf(0.01).optional(),
  line_total: z.number().nonnegative().multipleOf(0.01).optional()
});

export const InvoiceLineUpdateSchema = InvoiceLineCreateSchema.omit({
  invoice_id: true,
  task_id: true,
  task_module_id: true
}).partial();
