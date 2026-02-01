import { prisma } from "@/utils/server/db";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "@/utils/server/errors";

/* =====================================================
 Helpers
===================================================== */

function ensureDraft(invoice) {
  if (invoice.status !== "DRAFT") {
    throw new ForbiddenError("Invoice is not editable");
  }
}
function generateInternalNumber() {
  return `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function formatInvoice(invoice) {
  return {
    invoice: {
      id: invoice.id,
      entity_id: invoice.entity_id,
      internal_number: invoice.internal_number,
      external_number: invoice.external_number,
      status: invoice.status,
      invoice_date: invoice.invoice_date,
      issued_at: invoice.issued_at,
      paid_at: invoice.paid_at,
      notes: invoice.notes,
      company_profile_id: invoice.company_profile_id,
      created_at: invoice.created_at,
    },
    groups: invoice.tasks.map((task) => ({
      type: task.task_type === "SYSTEM_ADHOC" ? "ADHOC" : "TASK",
      task_id: task.id,
      task_title: task.title,
      charges: task.charges.map((c) => ({
        id: c.id,
        title: c.title,
        amount: c.amount,
        charge_type: c.charge_type,
        status: c.status,
        remark: c.remark,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
    })),
  };
}

async function fetchInvoiceFull(invoiceId) {
  console.log("invoice.internal_number", invoiceId);
  const invoice = await prisma.invoice.findUnique({
    where: { internal_number: invoiceId },
    include: {
      entity: true,
      company_profile: true,
      tasks: {
        include: {
          charges: {
            where: { deleted_at: null },
            orderBy: { created_at: "asc" },
          },
        },
      },
    },
  });

  if (!invoice) throw new NotFoundError("Invoice not found");

  return formatInvoice(invoice);
}

/* =====================================================
 Create / Append Invoice
===================================================== */

export async function createOrAppendInvoice({
  entity_id,
  task_ids,
  invoice_internal_number,
  invoice_data,
  currentUser,
}) {
  if (!task_ids?.length) {
    throw new ValidationError("No tasks selected");
  }

  const invoice = await prisma.$transaction(async (tx) => {
    let invoice;

    /* =====================================================
       CREATE OR FETCH INVOICE
    ===================================================== */

    if (invoice_internal_number) {
      invoice = await tx.invoice.findUnique({
        where: { internal_number: invoice_internal_number },
      });

      if (!invoice) {
        throw new ValidationError("Invoice not found");
      }

      ensureDraft(invoice);
      console.log(invoice)
      console.log(entity_id)

      if (invoice.entity_id !== entity_id) {
        throw new ValidationError("Entity mismatch with existing invoice");
      }
    } else {
      if (!invoice_data?.company_profile_id) {
        throw new ValidationError(
          "company_profile_id is required to create invoice",
        );
      }

      const companyProfile = await tx.companyProfile.findUnique({
        where: { id: invoice_data.company_profile_id },
        select: { id: true, is_active: true },
      });

      if (!companyProfile) {
        throw new ValidationError("Company profile not found");
      }

      if (!companyProfile.is_active) {
        throw new ValidationError("Company profile is inactive");
      }

      invoice = await tx.invoice.create({
        data: {
          entity_id,
          internal_number: generateInternalNumber(),
          status: "DRAFT",
          company_profile_id: companyProfile.id,
          invoice_date: new Date(),
          notes: invoice_data.notes ?? null,
          created_by: currentUser.id,
        },
      });
    }

    /* =====================================================
       FETCH & VALIDATE TASKS
    ===================================================== */

    const tasks = await tx.task.findMany({
      where: { id: { in: task_ids } },
      include: {
        charges: {
          where: { deleted_at: null },
          select: { id: true },
        },
      },
    });

    if (tasks.length !== task_ids.length) {
      throw new ValidationError("Some tasks not found");
    }

    const errors = [];

    for (const task of tasks) {
      if (task.entity_id !== entity_id) {
        errors.push(`Task ${task.id}: belongs to different entity`);
        continue;
      }

      if (task.invoice_internal_number) {
        errors.push(`Task ${task.id}: already invoiced`);
        continue;
      }

      if (!task.is_billable) {
        errors.push(`Task ${task.id}: not billable`);
        continue;
      }

      if (task.charges.length === 0) {
        errors.push(`Task ${task.id}: has no charges`);
        continue;
      }

      const isAdhoc = task.task_type === "SYSTEM_ADHOC" && task.is_system;
      const isCompleted = task.status === "COMPLETED";

      if (!isAdhoc && !isCompleted) {
        errors.push(
          `Task ${task.id}: must be COMPLETED (current: ${task.status})`,
        );
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(`Cannot invoice tasks:\n${errors.join("\n")}`);
    }

    /* =====================================================
       ATTACH TASKS (RACE-SAFE)
    ===================================================== */

    const { count } = await tx.task.updateMany({
      where: {
        id: { in: task_ids },
        invoice_internal_number: null, // ✅ guard against race
      },
      data: {
        invoice_internal_number: invoice.internal_number,
        invoiced_at: new Date(),
      },
    });

    if (count !== task_ids.length) {
      throw new ValidationError(
        "Some tasks were invoiced concurrently. Please retry.",
      );
    }

    return invoice;
  });

  return fetchInvoiceFull(invoice.internal_number);
}

/* =====================================================
 Get Invoice List
===================================================== */

export async function getInvoices(filters) {
  const page = Number(filters.page) || 1;
  const pageSize = Number(filters.page_size) || 50;

  const where = {};

  if (filters.entity_id) where.entity_id = filters.entity_id;
  if (filters.status) where.status = filters.status;

  if (filters.from_date || filters.to_date) {
    where.invoice_date = {};
    if (filters.from_date) where.invoice_date.gte = new Date(filters.from_date);
    if (filters.to_date) where.invoice_date.lte = new Date(filters.to_date);
  }

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      page_size: pageSize,
      total_items: total,
      total_pages: Math.ceil(total / pageSize),
      has_more: page * pageSize < total,
    },
  };
}

/* =====================================================
 Get Invoice Details
===================================================== */

export async function getInvoiceDetails(invoiceId) {
  return fetchInvoiceFull(invoiceId);
}

/* =====================================================
 Update Invoice Primary Info
===================================================== */

export async function updateInvoiceInfo(invoiceId, data) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new NotFoundError("Invoice not found");

  ensureDraft(invoice);

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      company_profile_id: data.company_profile_id ?? invoice.company_profile_id,
      invoice_date: data.invoice_date ?? invoice.invoice_date,
      notes: data.notes ?? invoice.notes,
    },
  });

  return { invoice_id: invoiceId };
}

/* =====================================================
 Update Invoice Status
===================================================== */

function ensureValidStatusTransition(current, next) {
  const allowed = {
    DRAFT: ["ISSUED", "CANCELLED"],
    ISSUED: ["PAID", "CANCELLED"],
    PAID: [],
    CANCELLED: [],
  };

  if (!allowed[current]?.includes(next)) {
    throw new ValidationError(
      `Invalid status transition: ${current} → ${next}`,
    );
  }
}

export async function updateInvoiceStatus(
  invoiceId,
  status,
  external_number,
  options = {},
) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new NotFoundError("Invoice not found");

  const { force_to_draft = false, currentUser } = options;

  // 🚨 Emergency path: revert to DRAFT from ISSUED or PAID
  if (status === "DRAFT" && force_to_draft) {
    if (!currentUser || currentUser.admin_role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Only super admins can revert invoices to draft",
      );
    }

    if (invoice.status === "DRAFT") {
      return { invoice_id: invoiceId, status: "DRAFT" };
    }

    if (!["ISSUED", "PAID"].includes(invoice.status)) {
      throw new ValidationError(
        `Cannot revert invoice from status ${invoice.status} to DRAFT`,
      );
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "DRAFT",
        reverted_from_status: invoice.status,
        reverted_at: new Date(),
      },
    });

    return { invoice_id: invoiceId, status: "DRAFT", forced: true };
  }

  // ✅ Normal strict flow
  ensureValidStatusTransition(invoice.status, status);

  if (status === "ISSUED") {
    if (!external_number) {
      throw new ValidationError(
        "external_number required when issuing invoice",
      );
    }
  }

  const data = { status };

  if (status === "ISSUED") {
    data.external_number = external_number;
    data.issued_at = new Date();
  }

  if (status === "PAID") {
    data.paid_at = new Date();
  }

  if (status === "CANCELLED") {
    data.cancelled_at = new Date(); // optional
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data,
  });

  return { invoice_id: invoiceId, status };
}
/* =====================================================
 Unlink Tasks from Invoice (Draft only)
===================================================== */

export async function unlinkTasksFromInvoice(invoiceId, taskIds) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new NotFoundError("Invoice not found");

  ensureDraft(invoice);

  await prisma.task.updateMany({
    where: {
      id: { in: taskIds },
      invoice_internal_number: invoice.internal_number,
    },
    data: {
      invoice_internal_number: null,
      invoiced_at: null,
    },
  });

  return {
    invoice_id: invoiceId,
    unlinked_task_ids: taskIds,
  };
}

/* =====================================================
 Cancel Invoice
===================================================== */

export async function cancelInvoice(invoiceId) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new NotFoundError("Invoice not found");

  await prisma.$transaction(async (tx) => {
    await tx.task.updateMany({
      where: { invoice_internal_number: invoice.internal_number },
      data: {
        invoice_internal_number: null,
        invoiced_at: null,
      },
    });

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: "CANCELLED" },
    });
  });

  return {
    invoice_id: invoiceId,
    status: "CANCELLED",
    groups: [],
  };
}

export async function bulkUpdateInvoiceStatus({
  invoice_ids,
  status,
  external_number_map,
  force_to_draft = false,
  currentUser,
}) {
  const success = [];
  const rejected = [];

  await prisma.$transaction(async (tx) => {
    for (const invoiceId of invoice_ids) {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        rejected.push({ id: invoiceId, reason: "NOT_FOUND" });
        continue;
      }

      if (status === "DRAFT" && force_to_draft) {
        if (!currentUser || currentUser.admin_role !== "SUPER_ADMIN") {
          rejected.push({ id: invoiceId, reason: "FORBIDDEN" });
          continue;
        }

        if (!["ISSUED", "PAID"].includes(invoice.status)) {
          rejected.push({ id: invoiceId, reason: "INVALID_CURRENT_STATUS" });
          continue;
        }

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            status: "DRAFT",
            reverted_from_status: invoice.status, // optional column
            reverted_at: new Date(), // optional column
          },
        });

        success.push(invoiceId);
        continue;
      }

      // ❄️ Immutable invoices
      if (["PAID", "CANCELLED"].includes(invoice.status)) {
        rejected.push({ id: invoiceId, reason: "IMMUTABLE_STATUS" });
        continue;
      }

      // 🚦 Normal transition validation
      if (!ensureValidStatusTransition(invoice.status, status)) {
        rejected.push({ id: invoiceId, reason: "INVALID_STATUS_TRANSITION" });
        continue;
      }

      // ISSUED requires external number
      if (status === "ISSUED") {
        const external = external_number_map?.[invoiceId];
        if (!external) {
          rejected.push({ id: invoiceId, reason: "MISSING_EXTERNAL_NUMBER" });
          continue;
        }

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            status: "ISSUED",
            external_number: external,
            issued_at: new Date(),
          },
        });

        success.push(invoiceId);
        continue;
      }

      if (status === "PAID") {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            status: "PAID",
            paid_at: new Date(),
          },
        });

        success.push(invoiceId);
        continue;
      }

      if (status === "CANCELLED") {
        // reuse your existing logic but transactional
        await tx.task.updateMany({
          where: { invoice_internal_number: invoice.internal_number },
          data: {
            invoice_internal_number: null,
            invoiced_at: null,
          },
        });

        await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: "CANCELLED" },
        });

        success.push(invoiceId);
        continue;
      }

      rejected.push({ id: invoiceId, reason: "UNHANDLED_CASE" });
    }
  });

  return { success, rejected };
}
