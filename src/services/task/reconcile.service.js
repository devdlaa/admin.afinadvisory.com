import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/utils/server/db";
import { NotFoundError, ValidationError } from "@/utils/server/errors";

/* ============================
   Helpers
============================ */

function validateDateRange(from, to) {
  if (!from || !to) return;
  const f = new Date(from);
  const t = new Date(to);
  if (f > t) throw new ValidationError("from_date must be <= to_date");
}

function mapCharge(c) {
  return {
    id: c.id,
    title: c.title,
    amount: c.amount,
    charge_type: c.charge_type,
    status: c.status,
    remark: c.remark,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

function mapTask(t) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    created_at: t.created_at,
    task_type: t.task_type,
    is_system: t.is_system,
    invoice_internal_number: t?.invoice_internal_number,

    category: t.category ? { id: t.category.id, name: t.category.name } : null,

    creator: t.creator
      ? {
          id: t.creator.id,
          name: t.creator.name,
          email: t.creator.email,
          admin_role: t.creator.admin_role,
          status: t.creator.status,
        }
      : null,

    entity: t.entity
      ? {
          id: t.entity.id,
          name: t.entity.name,
          email: t.entity.email,
          phone: t.entity.primary_phone,
        }
      : null,
  };
}

/* ============================
   UNRECONCILED (Task based)
============================ */

export async function getUnreconciledTasks(filters) {
  validateDateRange(filters.from_date, filters.to_date);

  if (filters.entity_id) {
    const exists = await prisma.entity.findUnique({
      where: { id: filters.entity_id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError("Entity not found");
  }

  const page = Number(filters.page) || 1;
  const pageSize = Math.min(Number(filters.page_size) || 50, 200);

  const taskWhere = {
    is_billable: true,
    entity_id: { not: null },
    invoice_internal_number: null,
  };

  if (filters.entity_id) taskWhere.entity_id = filters.entity_id;
  if (filters.task_category_id)
    taskWhere.task_category_id = filters.task_category_id;
  if (filters.task_status) taskWhere.status = filters.task_status;

  if (filters.from_date || filters.to_date) {
    taskWhere.created_at = {};
    if (filters.from_date)
      taskWhere.created_at.gte = new Date(filters.from_date);
    if (filters.to_date) taskWhere.created_at.lte = new Date(filters.to_date);
  }

  const taskInclude = {
    entity: {
      select: { id: true, name: true, email: true, primary_phone: true },
    },
    category: { select: { id: true, name: true } },
    creator: {
      select: {
        id: true,
        name: true,
        email: true,
        admin_role: true,
        status: true,
      },
    },
    charges: {
      orderBy: { created_at: "asc" },
      where: { deleted_at: null },
    },
  };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      include: taskInclude,
      orderBy: { created_at: filters.order === "asc" ? "asc" : "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.task.count({ where: taskWhere }),
  ]);

  const items = tasks.map((task) => ({
    type: task.task_type === "SYSTEM_ADHOC" ? "ADHOC" : "TASK",
    task: mapTask(task),
    charges: task.charges.map(mapCharge),
  }));

  return {
    tab: "UNRECONCILED",
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

export async function getNonBillableTasks(filters) {
  validateDateRange(filters.from_date, filters.to_date);

  const page = Number(filters.page) || 1;
  const pageSize = Math.min(Number(filters.page_size) || 50, 200);

  const taskWhere = {
    is_billable: false,
    task_type: "REGULAR",
    entity_id: { not: null },
  };

  if (filters.entity_id) taskWhere.entity_id = filters.entity_id;
  if (filters.task_category_id)
    taskWhere.task_category_id = filters.task_category_id;
  if (filters.task_status) taskWhere.status = filters.task_status;

  if (filters.from_date || filters.to_date) {
    taskWhere.created_at = {};
    if (filters.from_date)
      taskWhere.created_at.gte = new Date(filters.from_date);
    if (filters.to_date) taskWhere.created_at.lte = new Date(filters.to_date);
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      include: {
        entity: {
          select: { id: true, name: true, email: true, primary_phone: true },
        },
        category: { select: { id: true, name: true } },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            admin_role: true,
            status: true,
          },
        },
        charges: {
          orderBy: { created_at: "asc" },
          where: { deleted_at: null },
        },
      },
      orderBy: { created_at: filters.order || "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.task.count({ where: taskWhere }),
  ]);

  return {
    tab: "NON_BILLABLE",
    items: tasks.map((t) => ({
      type: "TASK",
      task: mapTask(t),
      charges: t.charges.map(mapCharge),
    })),
    pagination: {
      page,
      page_size: pageSize,
      total_items: total,
      total_pages: Math.ceil(total / pageSize),
      has_more: page * pageSize < total,
    },
  };
}

export async function markTasksNonBillable(taskIds, currentUser) {
  const updated = [];
  const rejected = [];

  await prisma.$transaction(async (tx) => {
    for (const taskId of taskIds) {
      const task = await tx.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          task_type: true,
          is_system: true,
          invoice_internal_number: true,
          charges: {
            where: { deleted_at: null },
            select: { status: true },
          },
        },
      });

      if (!task) {
        rejected.push({ id: taskId, reason: "NOT_FOUND" });
        continue;
      }

      if (task.task_type === "SYSTEM_ADHOC" || task.is_system) {
        rejected.push({ id: taskId, reason: "SYSTEM_TASK" });
        continue;
      }

      if (task.invoice_internal_number) {
        rejected.push({ id: taskId, reason: "ALREADY_INVOICED" });
        continue;
      }

      const hasUnpaid = task.charges.some((c) => c.status === "NOT_PAID");
      if (hasUnpaid) {
        rejected.push({ id: taskId, reason: "HAS_UNPAID_CHARGES" });
        continue;
      }

      await tx.task.update({
        where: { id: taskId },
        data: {
          is_billable: false,
          updated_by: currentUser.id,
        },
      });

      updated.push(taskId);
    }
  });

  return { updated, rejected };
}

export async function restoreTasksBillable(taskIds, currentUser) {
  const restored = [];
  const rejected = [];

  await prisma.$transaction(async (tx) => {
    for (const taskId of taskIds) {
      const task = await tx.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          task_type: true,
          is_system: true,
          invoice_internal_number: true,
        },
      });

      if (!task) {
        rejected.push({ id: taskId, reason: "NOT_FOUND" });
        continue;
      }

      if (task.task_type === "SYSTEM_ADHOC" || task.is_system) {
        rejected.push({ id: taskId, reason: "SYSTEM_TASK" });
        continue;
      }

      if (task.invoice_internal_number) {
        rejected.push({ id: taskId, reason: "ALREADY_INVOICED" });
        continue;
      }

      await tx.task.update({
        where: { id: taskId },
        data: {
          is_billable: true,
          updated_by: currentUser.id,
        },
      });

      restored.push(taskId);
    }
  });

  return { restored, rejected };
}

/* ============================
   RECONCILED (Invoice based)
============================ */

export async function getReconciledInvoices(filters) {
  const page = Number(filters.page) || 1;
  const pageSize = Math.min(Number(filters.page_size) || 50, 200);

  const invoiceWhere = {};

  if (filters.entity_id) {
    const exists = await prisma.entity.findUnique({
      where: { id: filters.entity_id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError("Entity not found");

    invoiceWhere.entity_id = filters.entity_id;
  }

  if (filters.from_date || filters.to_date) {
    invoiceWhere.invoice_date = {};
    if (filters.from_date)
      invoiceWhere.invoice_date.gte = new Date(filters.from_date);
    if (filters.to_date)
      invoiceWhere.invoice_date.lte = new Date(filters.to_date);
  }

  if (filters.invoice_status) {
    invoiceWhere.status = filters.invoice_status;
  }
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: invoiceWhere,
      include: {
        charges: {
          where: { deleted_at: null },
          include: {
            tasks: {
              include: {
                charges: {
                  where: { deleted_at: null },
                  orderBy: { created_at: "asc" },
                },
              },
            },
          },
          orderBy: { created_at: "asc" },
        },
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where: invoiceWhere }),
  ]);

  return {
    tab: "RECONCILED",
    invoices: invoices.map(groupInvoice),
    pagination: {
      page,
      page_size: pageSize,
      total_items: total,
      total_pages: Math.ceil(total / pageSize),
      has_more: page * pageSize < total,
    },
  };
}

/* ============================
   Group Invoice Charges
============================ */

function groupInvoice(invoice) {
  const groups = invoice.tasks.map((task) => ({
    type: task.task_type === "SYSTEM_ADHOC" ? "ADHOC" : "TASK",
    task_id: task.id,
    task_title: task.title,
    charges: task.charges.map(mapCharge),
  }));

  return {
    invoice: {
      id: invoice.id,
      internal_number: invoice.internal_number,
      external_number: invoice.external_number,
      status: invoice.status,
      invoice_date: invoice.invoice_date,
      created_at: invoice.created_at,
    },
    groups,
  };
}

/* ============================
   Helpers for delta sync
============================ */

function computeContribution(charge) {
  if (charge.deleted_at) {
    return zeroDelta();
  }

  const amount = Number(charge.amount);

  const isService = charge.charge_type === "SERVICE_FEE";
  const isGov = charge.charge_type === "GOVERNMENT_FEE";
  const isExternal = charge.charge_type === "EXTERNAL_CHARGE";

  const isNotPaid = charge.status === "NOT_PAID";
  const isWrittenOff = charge.status === "WRITTEN_OFF";

  const delta = zeroDelta();

  // TOTALS (original amount always counts)
  if (isService) delta.service_fee_total = amount;
  if (isGov) delta.government_fee_total = amount;
  if (isExternal) delta.external_charge_total = amount;

  // OUTSTANDING
  if (isNotPaid) {
    if (isService) delta.service_fee_outstanding = amount;
    if (isGov) delta.government_fee_outstanding = amount;
    if (isExternal) delta.external_charge_outstanding = amount;

    delta.client_total_outstanding = amount;
    delta.pending_charges_count = 1;
  }

  // WRITTEN OFF
  if (isWrittenOff) {
    if (isService) delta.service_fee_written_off = amount;
    if (isGov) delta.government_fee_written_off = amount;
    if (isExternal) delta.external_charge_written_off = amount;
  }

  return delta;
}
function zeroDelta() {
  return {
    service_fee_total: 0,
    service_fee_outstanding: 0,
    service_fee_written_off: 0,

    government_fee_total: 0,
    government_fee_outstanding: 0,
    government_fee_written_off: 0,

    external_charge_total: 0,
    external_charge_outstanding: 0,
    external_charge_written_off: 0,

    client_total_outstanding: 0,
    pending_charges_count: 0,
  };
}
function negateDelta(delta) {
  const negated = {};
  for (const key of Object.keys(delta)) {
    negated[key] = -delta[key];
  }
  return negated;
}
function computeDeltaDiff(oldContribution, newContribution) {
  const diff = {};
  for (const key of Object.keys(oldContribution)) {
    diff[key] = newContribution[key] - oldContribution[key];
  }
  return diff;
}
async function applyDelta(entityId, delta, tx = prisma) {
  const targets = [entityId];

  for (const id of targets) {
    await tx.reconcileStatsCurrent.upsert({
      where: { entity_id: id },
      create: {
        entity_id: id,
        ...delta,
      },
      update: {
        service_fee_total: { increment: delta.service_fee_total },
        service_fee_outstanding: { increment: delta.service_fee_outstanding },
        service_fee_written_off: { increment: delta.service_fee_written_off },

        government_fee_total: { increment: delta.government_fee_total },
        government_fee_outstanding: {
          increment: delta.government_fee_outstanding,
        },
        government_fee_written_off: {
          increment: delta.government_fee_written_off,
        },

        external_charge_total: { increment: delta.external_charge_total },
        external_charge_outstanding: {
          increment: delta.external_charge_outstanding,
        },
        external_charge_written_off: {
          increment: delta.external_charge_written_off,
        },

        client_total_outstanding: {
          increment: delta.client_total_outstanding,
        },
        pending_charges_count: { increment: delta.pending_charges_count },
      },
    });
  }
}

export async function applyChargeCreate(entityId, charge, tx = prisma) {
  const delta = computeContribution(charge);

  await applyDelta(entityId, delta, tx);
}

export async function applyChargeUpdate(
  entityId,
  oldCharge,
  newCharge,
  tx = prisma,
) {
  const before = computeContribution(oldCharge);
  const after = computeContribution(newCharge);
  const delta = computeDeltaDiff(before, after);

  await applyDelta(entityId, delta, tx);
}

export async function applyChargeDelete(entityId, charge, tx = prisma) {
  const before = computeContribution(charge);
  const delta = negateDelta(before);
  await applyDelta(entityId, delta, tx);
}

export async function applyChargeRestore(entityId, charge, tx = prisma) {
  const delta = computeContribution(charge);
  await applyDelta(entityId, delta, tx);
}

// ------------------Outstanding-api-service------------------------------

export const listOutstandingEntities = async (filters = {}) => {
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize =
    Number(filters.page_size) > 0 ? Number(filters.page_size) : 20;

  const offset = (page - 1) * pageSize;

  // ===============================
  // SORT (STRICT WHITELIST)
  // ===============================
  const sortFieldMap = {
    total_outstanding: "total_outstanding",
    service_fee: "service_fee",
    government_fee: "government_fee",
    external_charge: "external_charge",
  };

  const sortBy = sortFieldMap[filters.sort_by] || "total_outstanding";
  const sortOrder = filters.sort_order === "asc" ? "ASC" : "DESC";

  // ===============================
  // ENTITY FILTER
  // ===============================
  let entityWhereClause = "";
  if (Array.isArray(filters.entity_ids) && filters.entity_ids.length > 0) {
    const ids = filters.entity_ids.map((id) => `'${id}'`).join(",");

    entityWhereClause = `AND tc.entity_id IN (${ids})`;
  }

  // ===============================
  // LIST QUERY
  // ===============================
  const listSql = `
    SELECT
      tc.entity_id,

      COALESCE(SUM(tc.amount), 0)::numeric AS total_outstanding,

      COALESCE(SUM(tc.amount) FILTER (
        WHERE tc.charge_type = 'SERVICE_FEE'
      ), 0)::numeric AS service_fee,

      COALESCE(SUM(tc.amount) FILTER (
        WHERE tc.charge_type = 'GOVERNMENT_FEE'
      ), 0)::numeric AS government_fee,

      COALESCE(SUM(tc.amount) FILTER (
        WHERE tc.charge_type = 'EXTERNAL_CHARGE'
      ), 0)::numeric AS external_charge,

      COUNT(*)::int AS pending_charges_count

    FROM "TaskCharge" tc
    WHERE tc.deleted_at IS NULL
      AND tc.status = 'NOT_PAID'
      AND tc.bearer = 'CLIENT'
      ${entityWhereClause}

    GROUP BY tc.entity_id
    HAVING SUM(tc.amount) > 0
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ${pageSize}
    OFFSET ${offset};
  `;

  // ===============================
  // COUNT QUERY
  // ===============================
  const countSql = `
    SELECT COUNT(DISTINCT tc.entity_id)::int AS total
    FROM "TaskCharge" tc
    WHERE tc.deleted_at IS NULL
      AND tc.status = 'NOT_PAID'
      AND tc.bearer = 'CLIENT'
      ${entityWhereClause};
  `;

  const [rows, countResult] = await Promise.all([
    prisma.$queryRawUnsafe(listSql),
    prisma.$queryRawUnsafe(countSql),
  ]);

  if (!rows.length) {
    return {
      list: {
        data: [],
        pagination: {
          page,
          page_size: pageSize,
          total_items: 0,
          total_pages: 0,
          has_more: false,
        },
      },
    };
  }

  // ===============================
  // ENTITY DETAILS
  // ===============================
  const entityIds = rows.map((r) => r.entity_id);

  const entities = await prisma.entity.findMany({
    where: { id: { in: entityIds } },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
    },
  });

  const entityMap = Object.fromEntries(entities.map((e) => [e.id, e]));

  // ===============================
  // FORMAT RESPONSE
  // ===============================
  const data = rows.map((r) => ({
    entity: entityMap[r.entity_id] || null,
    money: {
      total_outstanding: Number(r.total_outstanding),
      pending_charges_count: Number(r.pending_charges_count),
      service_fee: Number(r.service_fee),
      government_fee: Number(r.government_fee),
      external_charge: Number(r.external_charge),
    },
  }));

  const total = Number(countResult[0]?.total || 0);
  const totalPages = Math.ceil(total / pageSize);

  return {
    list: {
      data,
      pagination: {
        page,
        page_size: pageSize,
        total_items: total,
        total_pages: totalPages,
        has_more: page < totalPages,
      },
    },
  };
};

export const getOutstandingGlobalStats = async () => {
  const result = await prisma.$queryRaw`
    SELECT
      -- TOTAL RECOVERABLE
      COALESCE(SUM(tc.amount), 0)::numeric AS total_recoverable,

      -- UNINVOICED
      COALESCE(SUM(tc.amount) FILTER (
        WHERE t.invoice_internal_number IS NULL
      ), 0)::numeric AS uninvoiced,

      -- DRAFT INVOICES
      COALESCE(SUM(tc.amount) FILTER (
        WHERE i.status = 'DRAFT'
      ), 0)::numeric AS draft_invoices,

      -- ISSUED BUT UNPAID
      COALESCE(SUM(tc.amount) FILTER (
        WHERE i.status = 'ISSUED'
      ), 0)::numeric AS issued_pending

    FROM "TaskCharge" tc
    LEFT JOIN "Task" t ON t.id = tc.task_id
    LEFT JOIN "Invoice" i ON i.internal_number = t.invoice_internal_number
    WHERE tc.deleted_at IS NULL
      AND tc.status = 'NOT_PAID'
      AND tc.bearer = 'CLIENT'
  `;

  const row = result[0];

  return {
    total_recoverable: Number(row.total_recoverable || 0),
    uninvoiced: Number(row.uninvoiced || 0),
    draft_invoices: Number(row.draft_invoices || 0),
    issued_pending: Number(row.issued_pending || 0),
  };
};

/**
 * Get detailed breakdown of outstanding charges for a specific entity
 * Shows: Unreconciled, Draft Invoices, Issued Invoices
 */
export const getEntityOutstandingBreakdown = async (entityId) => {
  const result = await prisma.$queryRaw`
    SELECT 
      -- UNRECONCILED (no invoice attached)
      COALESCE(SUM(tc.amount) FILTER (
        WHERE t.invoice_internal_number IS NULL
      ), 0)::numeric AS unreconciled_amount,
      COUNT(*) FILTER (
        WHERE t.invoice_internal_number IS NULL
      )::int AS unreconciled_count,

      -- DRAFT INVOICES
      COALESCE(SUM(tc.amount) FILTER (
        WHERE t.invoice_internal_number IS NOT NULL
          AND i.status = 'DRAFT'
      ), 0)::numeric AS draft_amount,
      COUNT(*) FILTER (
        WHERE t.invoice_internal_number IS NOT NULL
          AND i.status = 'DRAFT'
      )::int AS draft_count,
      COUNT(DISTINCT i.internal_number) FILTER (
        WHERE i.status = 'DRAFT'
      )::int AS draft_invoice_count,

      -- ISSUED INVOICES
      COALESCE(SUM(tc.amount) FILTER (
        WHERE t.invoice_internal_number IS NOT NULL
          AND i.status = 'ISSUED'
      ), 0)::numeric AS issued_amount,
      COUNT(*) FILTER (
        WHERE t.invoice_internal_number IS NOT NULL
          AND i.status = 'ISSUED'
      )::int AS issued_count,
      COUNT(DISTINCT i.internal_number) FILTER (
        WHERE i.status = 'ISSUED'
      )::int AS issued_invoice_count,

      -- TOTAL
      COALESCE(SUM(tc.amount), 0)::numeric AS total_outstanding,
      COUNT(*)::int AS total_count

    FROM "TaskCharge" tc
    LEFT JOIN "Task" t ON t.id = tc.task_id
    LEFT JOIN "Invoice" i ON i.internal_number = t.invoice_internal_number
    WHERE tc.entity_id = ${entityId}::uuid
      AND tc.deleted_at IS NULL
      AND tc.status = 'NOT_PAID'
      AND tc.bearer = 'CLIENT'
  `;

  const row = result[0];

  if (!row || Number(row.total_count) === 0) {
    return {
      entity_id: entityId,
      breakdown: {
        unreconciled: { amount: 0, count: 0 },
        draft_invoices: { amount: 0, count: 0, invoice_count: 0 },
        issued_invoices: { amount: 0, count: 0, invoice_count: 0 },
        total: { amount: 0, count: 0 },
      },
    };
  }

  return {
    entity_id: entityId,
    breakdown: {
      unreconciled: {
        amount: Number(row.unreconciled_amount),
        count: Number(row.unreconciled_count),
      },
      draft_invoices: {
        amount: Number(row.draft_amount),
        count: Number(row.draft_count),
        invoice_count: Number(row.draft_invoice_count),
      },
      issued_invoices: {
        amount: Number(row.issued_amount),
        count: Number(row.issued_count),
        invoice_count: Number(row.issued_invoice_count),
      },
      total: {
        amount: Number(row.total_outstanding),
        count: Number(row.total_count),
      },
    },
  };
};

export async function buildUnreconciledItem(taskId, tx = prisma) {
  const task = await tx.task.findFirst({
    where: {
      id: taskId,
      is_billable: true,
      invoice_internal_number: null,
    },
    include: {
      entity: {
        select: {
          id: true,
          name: true,
          email: true,
          primary_phone: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          admin_role: true,
          status: true,
        },
      },
      charges: {
        where: { deleted_at: null },
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!task) {
    throw new NotFoundError("Unreconciled task not found");
  }

  return {
    type: task.task_type === "SYSTEM_ADHOC" ? "ADHOC" : "TASK",
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      created_at: task.created_at,
      task_type: task.task_type,
      is_system: task.is_system,

      category: task.category
        ? { id: task.category.id, name: task.category.name }
        : null,

      creator: task.creator
        ? {
            id: task.creator.id,
            name: task.creator.name,
            email: task.creator.email,
            admin_role: task.creator.admin_role,
            status: task.creator.status,
          }
        : null,

      entity: task.entity
        ? {
            id: task.entity.id,
            name: task.entity.name,
            email: task.entity.email,
            phone: task.entity.primary_phone,
          }
        : null,
    },
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
  };
}
