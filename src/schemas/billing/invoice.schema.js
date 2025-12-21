import { z } from 'zod';
export const InvoiceStatusEnum = z.enum(['DRAFT', 'ISSUED', 'PAID', 'CANCELLED']);

// GSTIN validation (15 chars: 2 state + 10 PAN + 1 entity + 1 Z + 1 check)
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const InvoiceCreateSchema = z.object({
  entity_id: z.string().uuid(),
  gstin: z.string().regex(gstinRegex, 'Invalid GSTIN format').toUpperCase().optional().nullable(),
  invoice_date: z.coerce.date(),
  status: InvoiceStatusEnum.default('DRAFT'),
  task_ids: z.array(z.string().uuid()).min(1, 'At least one task required'),
  // Auto-calculated fields (optional for client, calculated on server)
  subtotal: z.number().nonnegative().multipleOf(0.01).optional(),
  gst_amount: z.number().nonnegative().multipleOf(0.01).optional(),
  total_amount: z.number().nonnegative().multipleOf(0.01).optional()
});

export const InvoiceUpdateSchema = z.object({
  gstin: z.string().regex(gstinRegex).toUpperCase().optional().nullable(),
  invoice_date: z.coerce.date().optional(),
  status: InvoiceStatusEnum.optional()
});

export const InvoiceQuerySchema = z.object({
  entity_id: z.string().uuid().optional(),
  status: InvoiceStatusEnum.optional(),
  from_date: z.coerce.date().optional(),
  to_date: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});
