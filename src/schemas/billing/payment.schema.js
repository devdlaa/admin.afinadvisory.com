import { z } from 'zod';
export const PaymentStatusEnum = z.enum(['PENDING', 'RECEIVED', 'FAILED', 'REFUNDED']);

export const PaymentCreateSchema = z.object({
  invoice_id: z.string().uuid(),
  entity_id: z.string().uuid(),
  amount: z.number().positive('Amount must be positive').multipleOf(0.01),
  payment_date: z.coerce.date(),
  payment_mode: z.string().min(1).max(100).trim(),
  reference_number: z.string().max(200).optional().nullable(),
  status: PaymentStatusEnum.default('PENDING')
});

export const PaymentUpdateSchema = z.object({
  amount: z.number().positive().multipleOf(0.01).optional(),
  payment_date: z.coerce.date().optional(),
  payment_mode: z.string().min(1).max(100).trim().optional(),
  reference_number: z.string().max(200).optional().nullable(),
  status: PaymentStatusEnum.optional()
});

export const PaymentQuerySchema = z.object({
  entity_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid().optional(),
  status: PaymentStatusEnum.optional(),
  from_date: z.coerce.date().optional(),
  to_date: z.coerce.date().optional(),
  payment_mode: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});