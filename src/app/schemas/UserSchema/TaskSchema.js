import { z } from "zod";
import admin from "firebase-admin";

const TimestampSchema = z.custom(
  (val) => val instanceof admin.firestore.Timestamp,
  { message: "Must be a Firestore Timestamp" }
);

// Enums
const TaskTypeSchema = z.enum(["task", "enquiry"]);

const StatusSchema = z
  .enum([
    "follow_up_required",
    "pending_client_approval",
    "in_progress",
    "completed",
    "canceled",
  ])
  .default("in_progress");

const ChecklistItemSchema = z.object({
  id: z.string(),
  title: z
    .string()
    .min(1, "Checklist title is required")
    .max(200, "Title too long"),
  done: z.boolean().default(false),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  updatedBy: z.string().min(1),
});

const PrioritySchema = z.enum(["low", "normal", "high"]);

const LinkProviderSchema = z.enum(["razorpay", "phonepe"]).nullable();

const ChargeCategorySchema = z.enum(["service_fee", "external_charge"]);

// Who bears the cost initially
const ChargeBearerSchema = z.enum(["client", "firm"]);

// Current financial status
const ChargeStatusSchema = z.enum(["paid", "unpaid", "written_off"]);

const ChargeSchema = z.object({
  id: z.string(),

  name: z.string().min(1, "Charge name is required"),
  amount: z.number().nonnegative(),

  category: ChargeCategorySchema,
  bearer: ChargeBearerSchema,
  status: ChargeStatusSchema,

  remarks: z.string().nullable(),

  // Auto-managed timestamps
  createdAt: TimestampSchema,
  paidAt: TimestampSchema.nullable(),
  writtenOffAt: TimestampSchema.nullable(),
});

const PaymentSchema = z.object({
  charges: z.array(ChargeSchema),

  // Calculated financial metrics
  totalAmountBilled: z.number().nonnegative(), // sum of service_fee amounts
  totalAmountPaid: z.number().nonnegative(), // what client has already paid
  totalAmountPending: z.number().nonnegative(), // unpaid client obligations

  totalFirmExpense: z.number().nonnegative(), // external_charge where bearer=firm
  totalFirmExpensePaid: z.number().nonnegative(),
  totalFirmExpensePending: z.number().nonnegative(),

  totalRecoverable: z.number().nonnegative(), // firm-expense paid but client still owes
  totalRecovered: z.number().nonnegative(), // recovered amount
  totalWrittenOff: z.number().nonnegative(), // losses absorbed by firm

  netProfit: z.number(), // billed - firm expense
});

const PaymentLinkSchema = z.object({
  linkId: z.string().nullable(),
  provider: LinkProviderSchema,
  type: z.enum(["standard", "upi"]).nullable(),
  currency: z.enum(["INR"]).default("INR"),
  amount: z.number().nonnegative(),

  chargeIds: z.array(z.string()),

  status: z
    .enum(["issued", "paid", "expired", "cancelled", "partially_paid"])
    .default("issued"),

  linkUrl: z.string().nullable(),
  referenceId: z.string().nullable(),
  description: z.string().nullable(),

  reminderCount: z.number().nonnegative().default(0),
  lastSentAt: TimestampSchema.nullable(),

  createdAt: TimestampSchema,
  expiryAt: TimestampSchema.nullable(),
  paidAt: TimestampSchema.nullable(),
  partialPaidAmount: z.number().nullable(),

  remarks: z.string().nullable(),

  createdById: z.string().nullable(),
  createdByName: z.string().nullable(),
});

const AssignedMemberSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  assignedAt: TimestampSchema,
  assignedBy: z.string().min(1),
});

export const AssignmentSchema = z.object({
  assignToAll: z.boolean().default(false),

  members: z.array(AssignedMemberSchema).default([]),

  createdById: z.string().min(1),
  createdByName: z.string().min(1),
  createdAt: TimestampSchema,

  assignedKeys: z.array(z.string()).default([]),
});

// Main schema
export const TaskSchema = z.object({
  id: z.string(),
  business: z.object({
    id: z.string().min(1, "Business ID is required"),
    name: z.string().min(1, "Business name is required"),
    email: z.string().email("Valid business email is required"),
    phone: z.string().nullable(),
  }),
  type: TaskTypeSchema,

  client: z.object({
    id: z.string().nullable(),
    name: z.string().min(1, "Client name is required"),
    prefered_lang: z
      .enum(["Hindi", "English", "Hindi & English"])
      .default("English"),
    phone: z.string().nullable(),
  }),

  particulars: z.object({
    name: z.string().min(1, "Service name is required"),
    category: z.string().nullable(),
    description: z.string().nullable(),
    internalTags: z.array(z.string()),
  }),

  assignment: AssignmentSchema,
  checklist: z
    .array(ChecklistItemSchema)
    .max(30, "Maximum 30 checklist items allowed")
    .default([]),

  lifecycle: z.object({
    status: StatusSchema,
    priority: PrioritySchema,
  }),

  dates: z.object({
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    startDate: TimestampSchema.nullable(),
    completedAt: TimestampSchema.nullable(),
  }),

  payment: PaymentSchema,
  paymentLinks: z.array(PaymentLinkSchema),

  audit: z.object({
    lastStatusChangedById: z.string().nullable(),
    lastStatusChangedAt: TimestampSchema.nullable(),
  }),

  flags: z.object({
    softDeleted: z.boolean(),
  }),
});

// Create/Update schemas
export const TaskCreateSchema = TaskSchema.omit({ id: true });
export const TaskUpdateSchema = TaskSchema.partial().required({ id: true });
export const ChargeCreateSchema = ChargeSchema.omit({
  id: true,
  createdAt: true,
});

// Validation helpers
export function validateTask(data) {
  const result = TaskSchema.safeParse(data);
  return result.success
    ? { valid: true, data: result.data }
    : { valid: false, errors: result.error.errors };
}

export function validateTaskCreate(data) {
  const result = TaskCreateSchema.safeParse(data);
  return result.success
    ? { valid: true, data: result.data }
    : { valid: false, errors: result.error.errors };
}

export function validateTaskUpdate(data) {
  const result = TaskUpdateSchema.safeParse(data);
  return result.success
    ? { valid: true, data: result.data }
    : { valid: false, errors: result.error.errors };
}

export function calculatePaymentMetrics(charges) {
  const now = admin.firestore.Timestamp.now();

  // Service fees (what we bill to client)
  const serviceFees = charges.filter((c) => c.category === "service_fee");
  const totalAmountBilled = serviceFees.reduce((sum, c) => sum + c.amount, 0);
  const totalAmountPaid = serviceFees
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);
  const totalAmountPending = serviceFees
    .filter((c) => c.status === "unpaid")
    .reduce((sum, c) => sum + c.amount, 0);

  // Firm expenses (external charges we pay)
  const firmExpenses = charges.filter(
    (c) => c.category === "external_charge" && c.bearer === "firm"
  );
  const totalFirmExpense = firmExpenses.reduce((sum, c) => sum + c.amount, 0);
  const totalFirmExpensePaid = firmExpenses
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);
  const totalFirmExpensePending = firmExpenses
    .filter((c) => c.status === "unpaid")
    .reduce((sum, c) => sum + c.amount, 0);

  // Recoverable: firm paid external charges that client still owes (via service_fee)
  // We need to check if there's a corresponding service_fee that's unpaid
  const totalRecoverable = firmExpenses
    .filter((c) => c.status === "paid")
    .reduce((sum, firmCharge) => {
      // Check if there's an unpaid service_fee covering this expense
      const hasUnpaidServiceFee = serviceFees.some(
        (sf) => sf.status === "unpaid" && sf.amount >= firmCharge.amount
      );
      return hasUnpaidServiceFee ? sum + firmCharge.amount : sum;
    }, 0);

  // Recovered: firm paid expenses that client has now paid back
  const totalRecovered = firmExpenses
    .filter((c) => c.status === "paid")
    .reduce((sum, firmCharge) => {
      const hasPaidServiceFee = serviceFees.some(
        (sf) => sf.status === "paid" && sf.amount >= firmCharge.amount
      );
      return hasPaidServiceFee ? sum + firmCharge.amount : sum;
    }, 0);

  // Written off amounts
  const totalWrittenOff = charges
    .filter((c) => c.status === "written_off")
    .reduce((sum, c) => sum + c.amount, 0);

  // Net profit: what we billed minus what we spent
  const netProfit = totalAmountBilled - totalFirmExpense;

  return {
    charges,
    totalAmountBilled,
    totalAmountPaid,
    totalAmountPending,
    totalFirmExpense,
    totalFirmExpensePaid,
    totalFirmExpensePending,
    totalRecoverable,
    totalRecovered,
    totalWrittenOff,
    netProfit,
  };
}

// Helper to mark charges as paid
export function markChargesPaid(charges, chargeIds) {
  const now = admin.firestore.Timestamp.now();
  return charges.map((c) => {
    if (chargeIds.includes(c.id) && c.status === "unpaid") {
      return {
        ...c,
        status: "paid",
        paidAt: now,
      };
    }
    return c;
  });
}

// Helper to mark charges as written off
export function markChargesWrittenOff(charges, chargeIds) {
  const now = admin.firestore.Timestamp.now();
  return charges.map((c) => {
    if (chargeIds.includes(c.id) && c.status === "unpaid") {
      return {
        ...c,
        status: "written_off",
        writtenOffAt: now,
      };
    }
    return c;
  });
}
