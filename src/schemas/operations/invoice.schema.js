import { z } from "zod";

// ==================== ENUMS ====================

export const InvoiceStatusEnum = z.enum(["DRAFT", "ISSUED", "PAID"]);

// ==================== BASE SCHEMAS ====================

const InvoiceDataSchema = z.object({
  company_profile_id: z.string().uuid("Invalid company profile ID"),

  invoice_date: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === "string" ? new Date(val) : val))
    .optional()
    .nullable(),

  external_number: z
    .string()
    .trim()
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional(),

  notes: z
    .string()
    .trim()
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional(),
});

// ==================== CREATE OR APPEND INVOICE ====================

export const InvoiceCreateOrAppendSchema = z.object({
  body: z.object({
    entity_id: z.string().uuid("Invalid entity ID"),
    task_ids: z
      .array(z.string().uuid("Invalid task ID"))
      .min(1, "At least one task required")
      .max(100, "Maximum 100 tasks per invoice"),
    invoice_internal_number: z.string().optional().default(null),
    invoice_data: InvoiceDataSchema.optional().default({}),
  }),
});

// ==================== UPDATE INVOICE INFO ====================

export const InvoiceUpdateInfoSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid invoice ID"),
  }),
  body: InvoiceDataSchema,
});

// ==================== UPDATE INVOICE STATUS ====================

export const InvoiceUpdateStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid invoice ID"),
  }),
  body: z.object({
    status: InvoiceStatusEnum,
  }),
});

// ==================== UNLINK TASKS ====================

export const InvoiceUnlinkTasksSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid invoice ID"),
  }),
  body: z.object({
    task_ids: z
      .array(z.string().uuid("Invalid task ID"))
      .min(1, "At least one task required")
      .max(100, "Maximum 100 tasks"),
  }),
});

// ==================== CANCEL INVOICE ====================

export const InvoiceCancelSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid invoice ID"),
  }),
});

// ==================== BULK UPDATE STATUS ====================

export const BulkInvoiceActionEnum = z.enum([
  "MARK_ISSUED",
  "MARK_PAID",
  "MARK_DRAFT",
]);

export const bulkInvoiceActionSchema = z.object({
  body: z.object({
    invoice_ids: z
      .array(z.string().min(1))
      .min(1, "At least one invoice id is required"),

    action: BulkInvoiceActionEnum,
  }),
});

// ==================== GET INVOICE DETAILS ====================

export const InvoiceGetDetailsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^INV-\d{13}-\d+$/, "Invalid invoice ID format"),
  }),
});

// ==================== LIST INVOICES (QUERY) ====================

export const InvoiceQuerySchema = z.object({
  entity_id: z.string().uuid("Invalid entity ID").optional(),

  // ✅ NEW
  company_profile_id: z.string().uuid("Invalid company profile ID").optional(),

  status: z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]).optional(),

  date_field: z
    .enum(["created_at", "issued_at", "paid_at", "invoice_date"])
    .default("created_at"),

  from_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .transform((val) => new Date(`${val}T00:00:00.000Z`))
    .optional(),

  to_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .transform((val) => new Date(`${val}T23:59:59.999Z`))
    .optional(),

  // 🔍 search across invoice numbers
  search: z.string().trim().min(1).optional(),

  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(50),

  sort_by: z.enum(["created_at", "issued_at", "paid_at"]).default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});
