import { z } from "zod";

// ==================== ENUMS ====================

export const InvoiceStatusEnum = z.enum([
  "DRAFT",
  "ISSUED",
  "PAID",
  "CANCELLED",
]);

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
  notes: z.string().trim().max(1000, "Notes too long").optional().nullable(),
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
  body: z
    .object({
      status: InvoiceStatusEnum,
      external_number: z.string().trim().min(1).max(50).optional(),
    })
    .refine(
      (data) => {
        if (data.status === "ISSUED") {
          return !!data.external_number;
        }
        return true;
      },
      {
        message: "external_number is required when status is ISSUED",
        path: ["external_number"],
      },
    ),
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

export const InvoiceBulkUpdateStatusSchema = z.object({
  body: z
    .object({
      invoice_ids: z
        .array(z.string().uuid("Invalid invoice ID"))
        .min(1, "At least one invoice required")
        .max(100, "Maximum 100 invoices"),
      status: InvoiceStatusEnum,
      external_number_map: z
        .record(z.string().uuid(), z.string().trim().min(1).max(50))
        .optional(),
    })
    .refine(
      (data) => {
        if (data.status === "ISSUED") {
          return (
            !!data.external_number_map &&
            Object.keys(data.external_number_map).length > 0
          );
        }
        return true;
      },
      {
        message: "external_number_map is required when status is ISSUED",
        path: ["external_number_map"],
      },
    ),
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
  status: InvoiceStatusEnum.optional(),
  from_date: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === "string" ? new Date(val) : val))
    .optional(),
  to_date: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === "string" ? new Date(val) : val))
    .optional(),
  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(50),
});
