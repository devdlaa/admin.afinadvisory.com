import { prisma } from "@/utils/server/db";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "@/utils/server/errors";

/* =====================================================
 Helpers
===================================================== */
export const BulkRejectReason = {
  ALREADY_ISSUED: "ALREADY_ISSUED",
  ALREADY_PAID: "ALREADY_PAID",
  ALREADY_DRAFT: "ALREADY_DRAFT",
  NO_TASKS_LINKED: "NO_TASKS_LINKED",
  MISSING_EXTERNAL_NUMBER: "MISSING_EXTERNAL_NUMBER",
  CANCELLED_INVOICE: "CANCELLED_INVOICE",
  NOT_ISSUED_YET: "NOT_ISSUED_YET",
};

function ensureDraft(invoice) {
  if (invoice.status !== "DRAFT") {
    throw new ForbiddenError("Invoice is not editable");
  }
}
function generateInternalNumber() {
  return `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function formatInvoiceWithoutGroups(invoice) {
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
      updated_at: invoice.updated_at,
    },

    entity: invoice.entity
      ? {
          id: invoice.entity.id,
          name: invoice.entity.name,
          email: invoice.entity.email,
          primary_phone: invoice.entity.primary_phone,
          secondary_phone: invoice.entity.secondary_phone,
          address_line1: invoice.entity.address_line1,
          address_line2: invoice.entity.address_line2,
          city: invoice.entity.city,
          state: invoice.entity.state,
          pincode: invoice.entity.pincode,
        }
      : null,

    company_profile: invoice.company_profile
      ? {
          id: invoice.company_profile.id,
          name: invoice.company_profile.name,
          legal_name: invoice.company_profile.legal_name,
          gst_number: invoice.company_profile.gst_number,
          pan: invoice.company_profile.pan,
          email: invoice.company_profile.email,
          phone: invoice.company_profile.phone,
          address_line1: invoice.company_profile.address_line1,
          address_line2: invoice.company_profile.address_line2,
          city: invoice.company_profile.city,
          state: invoice.company_profile.state,
          pincode: invoice.company_profile.pincode,
          bank_name: invoice.company_profile.bank_name,
          bank_account_no: invoice.company_profile.bank_account_no,
          bank_ifsc: invoice.company_profile.bank_ifsc,
          bank_branch: invoice.company_profile.bank_branch,
        }
      : null,
  };
}

function formatInvoiceGroupsOnly(invoice) {
  return {
    invoice: {
      id: invoice.id,
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

async function fetchInvoiceWithoutGroups(invoiceId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      entity: true,
      company_profile: true,
    },
  });

  if (!invoice) throw new NotFoundError("Invoice not found");

  return formatInvoiceWithoutGroups(invoice);
}

async function fetchInvoiceGroupsOnly(invoiceId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
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

  return formatInvoiceGroupsOnly(invoice);
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
      updated_at: invoice.updated_at,
    },

    entity: invoice.entity
      ? {
          id: invoice.entity.id,
          name: invoice.entity.name,
          email: invoice.entity.email,
          pan: invoice.entity.pan,
          primary_phone: invoice.entity.primary_phone,
          secondary_phone: invoice.entity.secondary_phone,
        }
      : null,

    company_profile: invoice.company_profile
      ? {
          id: invoice.company_profile.id,
          name: invoice.company_profile.name,
          legal_name: invoice.company_profile.legal_name,
          gst_number: invoice.company_profile.gst_number,
          pan: invoice.company_profile.pan,
          email: invoice.company_profile.email,
          phone: invoice.company_profile.phone,
          address_line1: invoice.company_profile.address_line1,
          address_line2: invoice.company_profile.address_line2,
          city: invoice.company_profile.city,
          state: invoice.company_profile.state,
          pincode: invoice.company_profile.pincode,
          bank_name: invoice.company_profile.bank_name,
          bank_account_no: invoice.company_profile.bank_account_no,
          bank_ifsc: invoice.company_profile.bank_ifsc,
          bank_branch: invoice.company_profile.bank_branch,
        }
      : null,

    groups: invoice.tasks.map((task) => ({
      task_type: task.task_type === "SYSTEM_ADHOC" ? "ADHOC" : "TASK",
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      created_at: task.created_at,
      category: task.category
        ? { id: task.category.id, name: task.category.name }
        : null,
      is_system: task.is_system,
      invoice_internal_number: task?.invoice_internal_number,
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
          category: { select: { id: true, name: true } },
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
      console.log(invoice);
      console.log(entity_id);

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

  // Entity filter
  if (filters.entity_id) {
    where.entity_id = filters.entity_id;
  }

  if (filters.company_profile_id) {
    where.company_profile_id = filters.company_profile_id;
  }

  // Status filter
  if (filters.status) {
    where.status = filters.status;
  }

  // Date filtering
  if (filters.from_date || filters.to_date) {
    const dateField = filters.date_field || "created_at";
    where[dateField] = {};

    if (filters.from_date) {
      where[dateField].gte = filters.from_date;
    }

    if (filters.to_date) {
      where[dateField].lte = filters.to_date;
    }
  }

  // 🔍 Exact Search: internal + external invoice number
  if (filters.search) {
    const search = filters.search.trim();

    where.OR = [
      {
        internal_number: {
          equals: search,
          mode: "insensitive",
        },
      },
      {
        external_number: {
          equals: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const orderBy = {
    [filters.sort_by || "created_at"]: filters.sort_order || "desc",
  };

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        company_profile: {
          select: {
            id: true,
            name: true,
            legal_name: true,
          },
        },
        entity: {
          select: {
            name: true,
            email: true,
            primary_phone: true,
          },
        },
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
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
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice not found");
  }

  ensureDraft(invoice);

  const updateData = {};

  if ("company_profile_id" in data) {
    updateData.company_profile_id = data.company_profile_id;
  }

  if ("invoice_date" in data) {
    updateData.invoice_date = data.invoice_date;
  }

  if ("external_number" in data) {
    updateData.external_number = data.external_number;
  }

  if ("notes" in data) {
    updateData.notes = data.notes;
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: updateData,
  });

  return fetchInvoiceWithoutGroups(invoiceId);
}

/* =====================================================
 Update Invoice Status
===================================================== */

function ensureValidStatusTransition(current, next) {
  const allowed = {
    DRAFT: ["ISSUED", "CANCELLED"],
    ISSUED: ["DRAFT", "PAID", "CANCELLED"],
    PAID: ["DRAFT", "CANCELLED","ISSUED"],
    CANCELLED: ["DRAFT"],
  };

  if (!allowed[current]?.includes(next)) {
    throw new ValidationError(
      `Invalid status transition: ${current} → ${next}`,
    );
  }
}

export async function updateInvoiceStatus(invoiceId, status, options = {}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice not found");
  }

  ensureValidStatusTransition(invoice.status, status);

  if (status === "ISSUED" && !invoice.external_number) {
    throw new ValidationError("Please update invoice number before issuing");
  }

  const data = { status };

  switch (status) {
    case "DRAFT":
      data.issued_at = null;
      data.paid_at = null;
      break;

    case "ISSUED":
      data.issued_at = new Date();
      data.paid_at = null;
      break;

    case "PAID":
      // If your transitions allow skipping ISSUED
      data.issued_at ??= invoice.issued_at ?? new Date();
      data.paid_at = new Date();
      break;
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data,
  });

  return fetchInvoiceWithoutGroups(invoiceId);
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

export async function bulkInvoiceAction(invoiceIds, action) {
  const success = [];
  const ignored = [];
  const rejected = [];

  const ACTION_TO_STATUS = {
    MARK_ISSUED: "ISSUED",
    MARK_PAID: "PAID",
    MARK_DRAFT: "DRAFT",
  };

  const invoices = await prisma.invoice.findMany({
    where: { id: { in: invoiceIds } },
    include: {
      tasks: { select: { id: true } },
    },
  });

  for (const invoice of invoices) {
    const nextStatus = ACTION_TO_STATUS[action];

    if (!nextStatus) {
      rejected.push({
        id: invoice.id,
        reason: "UNKNOWN_ACTION",
      });
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // =====================
        // IGNORE SAME STATUS
        // =====================
        if (invoice.status === nextStatus) {
          ignored.push({
            id: invoice.id,
            reason:
              nextStatus === "ISSUED"
                ? BulkRejectReason.ALREADY_ISSUED
                : nextStatus === "PAID"
                  ? BulkRejectReason.ALREADY_PAID
                  : BulkRejectReason.ALREADY_DRAFT,
          });
          return;
        }

        // =====================
        // VALIDATE TRANSITION
        // =====================
        try {
          ensureValidStatusTransition(invoice.status, nextStatus);
        } catch (err) {
          rejected.push({
            id: invoice.id,
            reason: err.message,
          });
          return;
        }

        // =====================
        // EXTRA RULES
        // =====================
        if (nextStatus === "ISSUED") {
          if (!invoice.external_number) {
            rejected.push({
              id: invoice.id,
              reason: BulkRejectReason.MISSING_EXTERNAL_NUMBER,
            });
            return;
          }

          if (!invoice.tasks?.length) {
            rejected.push({
              id: invoice.id,
              reason: BulkRejectReason.NO_TASKS_LINKED,
            });
            return;
          }
        }

        // =====================
        // STATUS + DATE UPDATE
        // =====================
        const data = { status: nextStatus };

        switch (nextStatus) {
          case "DRAFT":
            data.issued_at = null;
            data.paid_at = null;
            break;

          case "ISSUED":
            data.issued_at = new Date();
            data.paid_at = null;
            break;

          case "PAID":
            data.paid_at = new Date();
            break;
        }

        await tx.invoice.update({
          where: { id: invoice.id },
          data,
        });

        success.push(invoice.id);
      });
    } catch (err) {
      rejected.push({
        id: invoice.id,
        reason: "INTERNAL_ERROR",
      });
    }
  }

  return {
    success,
    ignored,
    rejected,
  };
}
