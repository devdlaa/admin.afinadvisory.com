import { z } from "zod";
const dateString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid date" });

export const reconciledReconcileQuerySchema = z
  .object({
    entity_id: z.string().uuid("Invalid entity id"),

    invoice_status: z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]).optional(),

    from_date: dateString.optional(),
    to_date: dateString.optional(),

    page: z.coerce.number().min(1).default(1),
    page_size: z.coerce.number().min(1).max(100).default(50),
  })
  .superRefine((data, ctx) => {
    if (data.from_date && data.to_date) {
      if (new Date(data.from_date) > new Date(data.to_date)) {
        ctx.addIssue({
          path: ["from_date"],
          message: "from_date must be <= to_date",
          code: z.ZodIssueCode.custom,
        });
      }
    }
  });

/* ============================
   Base filters
============================ */

export const reconcileBaseFilters = {
  entity_id: z.string().uuid().optional(),
  task_category_id: z.string().uuid().optional(),
  task_status: z
    .enum([
      "PENDING",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "ON_HOLD",
      "PENDING_CLIENT_INPUT",
    ])
    .optional(),

  from_date: dateString.optional(),
  to_date: dateString.optional(),

  order: z.enum(["asc", "desc"]).default("desc"),

  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(50),
};

/* ============================
   Unreconciled / Non-billable GET
============================ */

export const unreconciledReconcileQuerySchema = z
  .object(reconcileBaseFilters)
  .superRefine(dateRangeValidator);

export const nonBillableReconcileQuerySchema = z
  .object(reconcileBaseFilters)
  .superRefine(dateRangeValidator);

/* ============================
   Bulk mark non-billable
============================ */

export const markNonBillableSchema = z.object({
  task_ids: z.array(z.string().uuid()).min(1),
});

/* ============================
   Bulk restore billable
============================ */

export const restoreBillableSchema = z.object({
  task_ids: z.array(z.string().uuid()).min(1),
});

/* ============================
   Helpers
============================ */

function dateRangeValidator(data, ctx) {
  if (data.from_date && data.to_date) {
    if (new Date(data.from_date) > new Date(data.to_date)) {
      ctx.addIssue({
        path: ["from_date"],
        message: "from_date must be <= to_date",
        code: z.ZodIssueCode.custom,
      });
    }
  }
}

export const OutstandingQuerySchema = z.object({
  entity_ids: z.array(z.string().uuid()).max(10).optional(),

  charge_type: z
    .enum(["SERVICE_FEE", "GOVERNMENT_FEE", "EXTERNAL_CHARGE"])
    .optional(),

  sort_by: z
    .enum([
      "client_total_outstanding",
      "service_fee_outstanding",
      "government_fee_outstanding",
      "external_charge_outstanding",
      "pending_charges_count",
      "updated_at",
      "entity_name",
    ])
    .optional(),

  sort_order: z.enum(["asc", "desc"]).default("desc"),

  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(50).default(20),
});

export const bulkMarkNonBillableSchema = z.object({
  task_ids: z.array(z.string().uuid()).min(1).max(50),
});

export const bulkRestoreBillableSchema = z.object({
  task_ids: z.array(z.string().uuid()).min(1).max(50),
});
