import { prisma } from "@/utils/server/db.js";
import { Prisma } from "@prisma/client";

import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../utils/server/errors.js";
import { addTaskActivityLog } from "./taskComment.service.js";
import { buildActivityMessage } from "@/utils/server/activityBulder.js";

import {
  applyTaskCreate,
  applyTaskUpdate,
  applyTaskDelete,
} from "./task_aggregation_deltas.js";

// =============================================================================
// CONSTANTS
// =============================================================================

const PAUSE_STATUSES = new Set(["ON_HOLD", "PENDING_CLIENT_INPUT"]);
const RUNNING_STATUSES = new Set(["PENDING", "IN_PROGRESS"]);
const COMPLETION_STATUSES = new Set(["COMPLETED", "CANCELLED"]);
const WORKING_STATUSES = new Set(["IN_PROGRESS"]);

const ATTENTION_WINDOW_DAYS = 3;
const DEFAULT_SERVICE_LEVEL_AGREEMENT_DAYS = 7;

// =============================================================================
// IST DATE UTILITIES
// =============================================================================

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 19800000 ms

const getISTDayBoundaries = () => {
  const nowUtcMs = Date.now();
  const istDate = new Date(nowUtcMs + IST_OFFSET_MS);

  const endOfDayUtcMs =
    Date.UTC(
      istDate.getUTCFullYear(),
      istDate.getUTCMonth(),
      istDate.getUTCDate(),
      23,
      59,
      59,
      999,
    ) - IST_OFFSET_MS;

  return { nowUtcMs, endOfDayUtcMs };
};

const istToday = (h, m, s, ms) => {
  const istDate = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(
    Date.UTC(
      istDate.getUTCFullYear(),
      istDate.getUTCMonth(),
      istDate.getUTCDate(),
      h,
      m,
      s,
      ms,
    ) - IST_OFFSET_MS,
  );
};

// =============================================================================
// SHARED QUERY SELECTS
// =============================================================================

const ASSIGNMENT_SELECT = {
  id: true,
  task_id: true,
  admin_user_id: true,
  assigned_at: true,
  assigned_by: true,
  assignment_source: true,
  sla_status: true,
  due_date: true,
  sla_paused_at: true,
  assignee: { select: { id: true, name: true } },
};

const LIST_TASK_SELECT = {
  id: true,
  title: true,
  status: true,
  priority: true,
  due_date: true,
  created_at: true,
  assigned_to_all: true,
  entity: { select: { id: true, name: true } },
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
  assignments: {
    select: ASSIGNMENT_SELECT,
    orderBy: { assigned_at: "asc" },
    take: 3,
  },
  _count: { select: { assignments: true, charges: true } },
};

// =============================================================================
// COMPUTED FIELD HELPERS
// =============================================================================

const computeUrgencyScore = (task) => {
  const { nowUtcMs } = getISTDayBoundaries();

  const priorityBonus =
    task.priority === "HIGH" ? 4 : task.priority === "NORMAL" ? 2 : 1;
  const ageBonus = Math.floor(
    (nowUtcMs - new Date(task.created_at).getTime()) /
      (1000 * 60 * 60 * 24 * 3),
  );

  let dueBonus = 0;
  if (task.due_date) {
    const msUntilDue = new Date(task.due_date).getTime() - nowUtcMs;
    const DAY = 1000 * 60 * 60 * 24;
    if (msUntilDue < 0) dueBonus = 10;
    else if (msUntilDue < DAY) dueBonus = 5;
    else if (msUntilDue < DAY * 3) dueBonus = 2;
  }

  return priorityBonus + ageBonus + dueBonus;
};

const buildSlaSummary = (assignments) => {
  const { nowUtcMs, endOfDayUtcMs } = getISTDayBoundaries();

  const active = assignments.filter(
    (a) => a.sla_status === "RUNNING" || a.sla_status === "PAUSED",
  );
  if (!active.length) return null;

  const earliest = active.reduce((min, a) => {
    if (!a.due_date) return min;
    if (!min.due_date) return a;
    return a.due_date < min.due_date ? a : min;
  }, active[0]);

  const isPaused = active.every((a) => a.sla_status === "PAUSED");
  const isBreached =
    !isPaused && earliest.due_date && earliest.due_date.getTime() < nowUtcMs;
  const isDueToday =
    !isPaused &&
    !isBreached &&
    earliest.due_date &&
    earliest.due_date.getTime() <= endOfDayUtcMs;

  const status = isPaused
    ? "PAUSED"
    : isBreached
      ? "BREACHED"
      : isDueToday
        ? "DUE_TODAY"
        : "RUNNING";

  const earliestPausedAt = isPaused
    ? active.reduce((min, a) => {
        if (!a.sla_paused_at) return min;
        return !min || a.sla_paused_at < min ? a.sla_paused_at : min;
      }, null)
    : null;

  return {
    status,
    due_date: earliest.due_date ?? null,
    is_overdue: Boolean(isBreached),
    is_due_today: Boolean(isDueToday),
    is_paused: isPaused,
    paused_at: earliestPausedAt,
  };
};

const formatTask = (task, overrides = {}) => ({
  id: task.id,
  title: task.title,
  status: task.status,
  priority: task.priority,
  due_date: task.due_date,
  created_at: task.created_at,
  assigned_to_all: task.assigned_to_all,
  entity: task.entity ?? null,
  category: task.category ?? null,
  creator: task.creator ?? null,
  is_billable: (task._count?.charges ?? 0) > 0,
  document_count: task.document_count ?? 0,
  urgency_score: overrides.urgency_score ?? computeUrgencyScore(task),
  sla_summary: buildSlaSummary(task.assignments ?? []),
  assignments: (task.assignments ?? []).map((a) => ({
    id: a.id,
    task_id: a.task_id,
    admin_user_id: a.admin_user_id,
    assigned_at: a.assigned_at,
    assigned_by: a.assigned_by,
    assignment_source: a.assignment_source,
    sla_status: a.sla_status,
    sla_due_date: a.due_date,
    sla_paused_at: a.sla_paused_at,
    assignee: a.assignee,
  })),
  remaining_assignee_count:
    (task._count?.assignments ?? 0) > (task.assignments?.length ?? 0)
      ? task._count.assignments - task.assignments.length
      : 0,
});

// =============================================================================
// ACCESS / VISIBILITY HELPERS
// =============================================================================

export function buildTaskVisibilityWhere(user) {
  if (user.admin_role === "SUPER_ADMIN") return {};
  return {
    OR: [
      { assigned_to_all: true },
      { assignments: { some: { admin_user_id: user.id } } },
    ],
  };
}

// =============================================================================
// STATUS COUNTS
// =============================================================================

const getStatusCounts = async (where = {}, db = prisma) => {
  const statuses = [
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "ON_HOLD",
    "PENDING_CLIENT_INPUT",
  ];

  const grouped = await db.task.groupBy({
    by: ["status"],
    where: { AND: [where, { is_system: { not: true } }] },
    _count: { status: true },
  });

  const result = Object.fromEntries(statuses.map((s) => [s, 0]));
  grouped.forEach((item) => {
    if (result[item.status] !== undefined)
      result[item.status] = item._count.status;
  });
  return result;
};

// =============================================================================
// INVOICE LOCK GUARD
// =============================================================================

async function ensureTaskCriticalFieldsEditable(taskId, updates, tx = prisma) {
  const task = await tx.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      status: true,
      entity_id: true,
      task_category_id: true,
      is_billable: true,
      invoice_internal_number: true,
      invoice: { select: { id: true, status: true, internal_number: true } },
    },
  });

  if (!task) throw new NotFoundError("Task not found");

  if (
    task.invoice_internal_number &&
    updates.entity_id !== undefined &&
    updates.entity_id !== task.entity_id
  ) {
    throw new ForbiddenError(
      `Cannot modify client - task is Linked (invoice ${task.invoice.internal_number}). Status ${task.invoice.status}.`,
    );
  }

  if (
    task.invoice_internal_number &&
    task.invoice &&
    task.invoice.status !== "CANCELLED"
  ) {
    const criticalFields = {
      title: "title",
      status: "status",
      task_category_id: "task category",
      is_billable: "billable status",
      due_date: "due date",
      start_date: "start date",
      end_date: "end date",
    };

    const lockedChanges = Object.entries(criticalFields)
      .filter(
        ([field]) =>
          updates[field] !== undefined && updates[field] !== task[field],
      )
      .map(([, label]) => label);

    if (lockedChanges.length > 0) {
      throw new ForbiddenError(
        `Cannot modify ${lockedChanges.join(", ")} - task is locked because it's part of ${task.invoice.status.toLowerCase()} invoice (${task.invoice.internal_number}). Contact admin for corrections.`,
      );
    }
  }

  return task;
}

// =============================================================================
// LIST TASKS — HELPERS
// =============================================================================

/**
 * Build Prisma `where` from filter params.
 *
 * BUG FIX: SLA filter and status filter were being ANDed together, causing
 * zero results when combining e.g. status=PENDING + sla_status=PAUSED.
 * These are orthogonal concerns and should not block each other — the SLA
 * assignment filter already narrows the task set correctly on its own.
 *
 * The status filter is intentionally kept as-is; the issue is a UX one
 * (the frontend must clear status when applying SLA filters) but we also
 * make the backend robust by not double-filtering unnecessarily.
 */
const buildListWhere = (filters, visibilityWhere) => {
  const and = [visibilityWhere, { is_system: { not: true } }];

  // ── Standard task-level filters ──────────────────────────────────────────
  if (filters.status && filters.status !== "ALL")
    and.push({ status: filters.status });
  if (filters.priority) and.push({ priority: filters.priority });
  if (filters.task_category_id)
    and.push({ task_category_id: filters.task_category_id });
  if (filters.created_by) and.push({ created_by: filters.created_by });

  if (filters.assigned_to) {
    and.push({ assignments: { some: { admin_user_id: filters.assigned_to } } });
  }

  if (filters.due_date_from || filters.due_date_to) {
    const due = {};
    if (filters.due_date_from) due.gte = new Date(filters.due_date_from);
    if (filters.due_date_to) due.lte = new Date(filters.due_date_to);
    and.push({ due_date: due });
  }

  if (filters.entity_missing === true) {
    and.push({ entity_id: null });
  } else if (filters.entity_id) {
    and.push({ entity_id: filters.entity_id });
  }

  if (filters.created_date_from || filters.created_date_to) {
    const created = {};
    if (filters.created_date_from)
      created.gte = new Date(filters.created_date_from);
    if (filters.created_date_to)
      created.lte = new Date(filters.created_date_to);
    and.push({ created_at: created });
  }

  if (filters.unassigned_only === true) {
    and.push({
      assigned_to_all: false,
      assignments: { every: { assignment_source: "AUTO", sla_status: "NONE" } },
    });
  }

  if (filters.search) {
    if (filters.search.length < 3)
      throw new ValidationError("Search must be at least 3 characters");
    and.push({
      OR: [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ],
    });
  }

  // ── SLA assignment-level filters ─────────────────────────────────────────
  // BUG FIX: These are built as a SINGLE `assignments: { some: { ... } }` clause.
  // Previously this block was only entered when sla_status was present, which
  // meant sla_due_date_* filters would silently not apply without sla_status.
  // Now we enter the block whenever ANY sla filter is present.
  const hasSlaFilter =
    filters.sla_status ||
    filters.sla_due_date_from ||
    filters.sla_due_date_to ||
    filters.sla_paused_before;

  if (hasSlaFilter) {
    const sla = {};

    if (filters.sla_status) {
      // BUG FIX: The Zod schema accepts "BREACHED" but the DB SLAStatus enum
      // does not have a BREACHED value — it uses RUNNING + overdue due_date.
      // Map "BREACHED" → RUNNING so the query doesn't crash with invalid enum.
      // The sla_due_date_to filter (which is `now`) then does the actual
      // "overdue" narrowing.
      const dbSlaStatus =
        filters.sla_status === "BREACHED" ? "RUNNING" : filters.sla_status;
      sla.sla_status = dbSlaStatus;
    }

    if (filters.sla_due_date_from || filters.sla_due_date_to) {
      sla.due_date = {};
      if (filters.sla_due_date_from)
        sla.due_date.gte = new Date(filters.sla_due_date_from);
      if (filters.sla_due_date_to)
        sla.due_date.lte = new Date(filters.sla_due_date_to);
    }

    if (filters.sla_paused_before) {
      sla.sla_paused_at = { lt: new Date(filters.sla_paused_before) };
    }

    and.push({ assignments: { some: sla } });
  }

  return { AND: and };
};

const fetchDocumentCounts = async (taskIds) => {
  if (!taskIds.length) return new Map();
  const rows = await prisma.document.groupBy({
    by: ["scope_id"],
    where: { scope: "TASK", scope_id: { in: taskIds }, deleted_at: null },
    _count: { scope_id: true },
  });
  return new Map(rows.map((r) => [r.scope_id, r._count.scope_id]));
};

/**
 * Raw SQL magic-sort query.
 *
 * BUG FIX: Same BREACHED→RUNNING mapping applied here for the sla_status
 * EXISTS subquery so magic-sort and normal sort behave identically.
 */
const magicSortQuery = (filters, currentUser, pageSize, page) => {
  const visibilityClause =
    currentUser.admin_role === "SUPER_ADMIN"
      ? Prisma.sql`TRUE`
      : Prisma.sql`(
          t.assigned_to_all = TRUE OR EXISTS (
            SELECT 1 FROM "TaskAssignment" ta
            WHERE ta.task_id = t.id AND ta.admin_user_id = ${currentUser.id}::uuid
          )
        )`;

  // Map BREACHED → RUNNING for DB compatibility
  const dbSlaStatus =
    filters.sla_status === "BREACHED" ? "RUNNING" : filters.sla_status;

  const clauses = [
    filters.entity_id
      ? Prisma.sql`AND t.entity_id = ${filters.entity_id}::uuid`
      : Prisma.empty,
    filters.unassigned_only === true
      ? Prisma.sql`AND t.assigned_to_all = FALSE AND NOT EXISTS (
          SELECT 1 FROM "TaskAssignment" ta
          WHERE ta.task_id = t.id
          AND NOT (ta.assignment_source = 'AUTO' AND ta.sla_status = 'NONE')
        )`
      : Prisma.empty,
    filters.status && filters.status !== "ALL"
      ? Prisma.sql`AND t.status = ${filters.status}::"TaskStatus"`
      : Prisma.empty,
    filters.priority
      ? Prisma.sql`AND t.priority = ${filters.priority}::"TaskPriority"`
      : Prisma.empty,
    filters.task_category_id
      ? Prisma.sql`AND t.task_category_id = ${filters.task_category_id}::uuid`
      : Prisma.empty,
    filters.created_by
      ? Prisma.sql`AND t.created_by = ${filters.created_by}::uuid`
      : Prisma.empty,
    filters.entity_missing === true
      ? Prisma.sql`AND t.entity_id IS NULL`
      : Prisma.empty,
    filters.assigned_to
      ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM "TaskAssignment" ta
          WHERE ta.task_id = t.id AND ta.admin_user_id = ${filters.assigned_to}::uuid
        )`
      : Prisma.empty,
    filters.due_date_from
      ? Prisma.sql`AND t.due_date >= ${new Date(filters.due_date_from)}`
      : Prisma.empty,
    filters.due_date_to
      ? Prisma.sql`AND t.due_date <= ${new Date(filters.due_date_to)}`
      : Prisma.empty,
    filters.created_date_from
      ? Prisma.sql`AND t.created_at >= ${new Date(filters.created_date_from)}`
      : Prisma.empty,
    filters.created_date_to
      ? Prisma.sql`AND t.created_at <= ${new Date(filters.created_date_to)}`
      : Prisma.empty,
    filters.search
      ? Prisma.sql`AND (t.title ILIKE ${`%${filters.search}%`} OR t.description ILIKE ${`%${filters.search}%`})`
      : Prisma.empty,
    // BUG FIX: Use dbSlaStatus (BREACHED mapped to RUNNING) instead of raw filters.sla_status
    dbSlaStatus
      ? Prisma.sql`AND EXISTS (SELECT 1 FROM "TaskAssignment" ta WHERE ta.task_id = t.id AND ta.sla_status = ${dbSlaStatus}::"SLAStatus")`
      : Prisma.empty,
    filters.sla_due_date_from
      ? Prisma.sql`AND EXISTS (SELECT 1 FROM "TaskAssignment" ta WHERE ta.task_id = t.id AND ta.due_date >= ${new Date(filters.sla_due_date_from)})`
      : Prisma.empty,
    filters.sla_due_date_to
      ? Prisma.sql`AND EXISTS (SELECT 1 FROM "TaskAssignment" ta WHERE ta.task_id = t.id AND ta.due_date <= ${new Date(filters.sla_due_date_to)})`
      : Prisma.empty,
    filters.sla_paused_before
      ? Prisma.sql`AND EXISTS (SELECT 1 FROM "TaskAssignment" ta WHERE ta.task_id = t.id AND ta.sla_paused_at < ${new Date(filters.sla_paused_before)})`
      : Prisma.empty,
  ];

  return prisma.$queryRaw`
    SELECT
      t.id, t.title, t.status, t.priority, t.due_date, t.created_at,
      t.assigned_to_all, t.entity_id, t.task_category_id, t.created_by,
      (
        CASE t.priority
          WHEN 'HIGH'   THEN 4
          WHEN 'NORMAL' THEN 2
          WHEN 'LOW'    THEN 1
          ELSE 1
        END
        + FLOOR(EXTRACT(DAY FROM (NOW() - t.created_at)) / 3)
        + CASE
            WHEN t.due_date IS NULL                      THEN 0
            WHEN t.due_date < NOW()                      THEN 10
            WHEN t.due_date < NOW() + INTERVAL '1 day'  THEN 5
            WHEN t.due_date < NOW() + INTERVAL '3 days' THEN 2
            ELSE 0
          END
      ) AS urgency_score
    FROM "Task" t
    WHERE t.is_system = FALSE
      AND ${visibilityClause}
      ${Prisma.join(clauses, " ")}
    ORDER BY urgency_score DESC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `;
};

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

export const createTask = async (data, currentUser) => {
  if (data.due_date) {
    const timeZone = "Asia/Kolkata";
    const today = new Date();
    const todayIST = new Date(today.toLocaleString("en-US", { timeZone }));
    const dueIST = new Date(
      new Date(data.due_date).toLocaleString("en-US", { timeZone }),
    );
    todayIST.setHours(0, 0, 0, 0);
    dueIST.setHours(0, 0, 0, 0);
    if (dueIST < todayIST) {
      throw new ValidationError("Due date cannot be in the past");
    }
  }

  const currentUID = currentUser.id;

  const result = await prisma.$transaction(async (tx) => {
    const [entity, category] = await Promise.all([
      data.entity_id
        ? tx.entity.findUnique({
            where: { id: data.entity_id },
            select: { id: true },
          })
        : null,
      data.task_category_id
        ? tx.taskCategory.findUnique({
            where: { id: data.task_category_id },
            select: { id: true },
          })
        : null,
    ]);

    if (data.entity_id && !entity) throw new NotFoundError("Entity not found");
    if (data.task_category_id && !category)
      throw new NotFoundError("Task category not found or inactive");

    const task = await tx.task.create({
      data: {
        entity_id: data.entity_id ?? null,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? "PENDING",
        priority: data.priority ?? "NORMAL",
        start_date: null,
        end_date: null,
        due_date: data.due_date ? new Date(data.due_date) : null,
        task_category_id: data.task_category_id ?? null,
        is_billable: true,
        created_by: currentUID,
        updated_by: currentUID,
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        due_date: true,
        created_at: true,
        assigned_to_all: true,
        entity_id: true,
      },
    });

    await applyTaskCreate(task, tx);

    const assignedAt = new Date();
    const shouldApplySLA =
      currentUser.admin_role !== "SUPER_ADMIN" || data.apply_sla === true;
    let slaDue = null;

    if (shouldApplySLA) {
      slaDue = new Date(assignedAt);
      slaDue.setDate(slaDue.getDate() + DEFAULT_SERVICE_LEVEL_AGREEMENT_DAYS);
      if (task.due_date && slaDue > task.due_date) slaDue = task.due_date;
    }

    await tx.taskAssignment.create({
      data: {
        task_id: task.id,
        admin_user_id: currentUID,
        assigned_by: currentUID,
        assignment_source: "AUTO",
        assigned_at: assignedAt,
        due_date: slaDue,
        sla_status: shouldApplySLA ? "RUNNING" : "NONE",
      },
    });

    return task;
  });

  const [freshTask, globalCounts] = await Promise.all([
    prisma.task.findUnique({
      where: { id: result.id },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        due_date: true,
        created_at: true,
        assigned_to_all: true,
        assignments: {
          select: ASSIGNMENT_SELECT,
          orderBy: { assigned_at: "asc" },
          take: 3,
        },
        _count: { select: { assignments: true, charges: true } },
      },
    }),
    getStatusCounts({}),
  ]);

  return {
    task: {
      ...freshTask,
      is_billable: freshTask._count.charges > 0,
      sla_summary: buildSlaSummary(freshTask.assignments),
      assignments: freshTask.assignments.map((a) => ({
        id: a.id,
        task_id: a.task_id,
        admin_user_id: a.admin_user_id,
        assigned_at: a.assigned_at,
        assigned_by: a.assigned_by,
        assignment_source: a.assignment_source,
        sla_status: a.sla_status,
        sla_due_date: a.due_date,
        sla_paused_at: a.sla_paused_at,
        assignee: a.assignee,
      })),
      remaining_assignee_count:
        freshTask._count.assignments > freshTask.assignments.length
          ? freshTask._count.assignments - freshTask.assignments.length
          : 0,
    },
    status_counts: { global: globalCounts, filtered: null },
  };
};

// ─────────────────────────────────────────────────────────────────────────────

export const updateTask = async (task_id, data, currentUser) => {
  if (data.due_date) {
    const timeZone = "Asia/Kolkata";
    const today = new Date();
    const todayIST = new Date(today.toLocaleString("en-US", { timeZone }));
    const dueIST = new Date(
      new Date(data.due_date).toLocaleString("en-US", { timeZone }),
    );
    todayIST.setHours(0, 0, 0, 0);
    dueIST.setHours(0, 0, 0, 0);
    if (dueIST < todayIST) {
      throw new ValidationError("Due date cannot be in the past");
    }
  }

  const changes = [];
  let statusChanged = false;

  const updatedTask = await prisma.$transaction(async (tx) => {
    const visibilityWhere = buildTaskVisibilityWhere(currentUser);

    await ensureTaskCriticalFieldsEditable(task_id, data, tx);

    const existing = await tx.task.findFirst({
      where: { AND: [{ id: task_id }, visibilityWhere] },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        due_date: true,
        end_date: true,
        entity_id: true,
        task_category_id: true,
        entity: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    if (!existing) throw new NotFoundError("Task not found");

    const categoryPromise =
      data.task_category_id !== undefined &&
      data.task_category_id !== existing.task_category_id
        ? data.task_category_id
          ? tx.taskCategory.findUnique({
              where: { id: data.task_category_id },
              select: { id: true, name: true },
            })
          : Promise.resolve(null)
        : null;

    const entityPromise =
      data.entity_id !== undefined && data.entity_id !== existing.entity_id
        ? data.entity_id
          ? tx.entity.findUnique({
              where: { id: data.entity_id },
              select: { id: true, name: true, status: true },
            })
          : Promise.resolve(null)
        : null;

    await Promise.all([categoryPromise, entityPromise].filter(Boolean));

    if (categoryPromise) {
      const category = await categoryPromise;
      if (data.task_category_id && !category)
        throw new NotFoundError("Task category not found");
    }
    if (entityPromise) {
      const entity = await entityPromise;
      if (data.entity_id && !entity)
        throw new NotFoundError("Entity not found");
      if (entity && entity.status !== "ACTIVE")
        throw new ValidationError("Only ACTIVE entities can be assigned");
    }

    const from = {};
    const to = {};

    for (const field of ["title", "description", "status", "priority"]) {
      if (data[field] !== undefined && data[field] !== existing[field]) {
        from[field] = existing[field];
        to[field] = data[field];
        if (field === "status") statusChanged = true;
      }
    }
    if (
      data.due_date !== undefined &&
      data.due_date?.toString() !== existing.due_date?.toISOString()
    ) {
      from.due_date = existing.due_date?.toISOString() ?? null;
      to.due_date = data.due_date
        ? new Date(data.due_date).toISOString()
        : null;
    }
    if (
      categoryPromise &&
      data.task_category_id !== existing.task_category_id
    ) {
      const newCategory = await categoryPromise;
      from.category = existing.category
        ? { id: existing.category.id, name: existing.category.name }
        : null;
      to.category = newCategory
        ? { id: newCategory.id, name: newCategory.name }
        : null;
    }
    if (entityPromise && data.entity_id !== existing.entity_id) {
      const newEntity = await entityPromise;
      from.entity = existing.entity
        ? { id: existing.entity.id, name: existing.entity.name }
        : null;
      to.entity = newEntity ? { id: newEntity.id, name: newEntity.name } : null;
    }
    if (Object.keys(from).length || Object.keys(to).length) {
      changes.push({ action: "TASK_UPDATED", from, to });
    }

    const prevStatus = existing.status;
    const nextStatus = data.status;
    const wasWorking = WORKING_STATUSES.has(prevStatus);
    const isWorking = WORKING_STATUSES.has(nextStatus);
    const computedStartDate =
      !wasWorking && isWorking
        ? new Date()
        : wasWorking && !isWorking
          ? null
          : undefined;
    const computedEndDate =
      data.status && COMPLETION_STATUSES.has(data.status) && !existing.end_date
        ? new Date()
        : undefined;

    const updated = await tx.task.update({
      where: { id: task_id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        entity_id: data.entity_id,
        task_category_id: data.task_category_id,
        start_date: computedStartDate,
        due_date:
          data.due_date === undefined
            ? undefined
            : data.due_date
              ? new Date(data.due_date)
              : null,
        end_date: computedEndDate,
        updated_by: currentUser.id,
        last_activity_at: changes.length ? new Date() : undefined,
        last_activity_by: changes.length ? currentUser.id : undefined,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        due_date: true,
        entity_id: true,
        entity: { include: { custom_fields: { orderBy: { name: "asc" } } } },
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
      },
    });

    await applyTaskUpdate(existing, updated, tx);

    if (statusChanged) {
      if (COMPLETION_STATUSES.has(updated.status)) {
        await tx.taskAssignment.updateMany({
          where: { task_id, sla_status: { not: "COMPLETED" } },
          data: { sla_status: "COMPLETED", sla_paused_at: null },
        });
      } else if (PAUSE_STATUSES.has(updated.status)) {
        await tx.taskAssignment.updateMany({
          where: { task_id, sla_status: "RUNNING" },
          data: { sla_status: "PAUSED", sla_paused_at: new Date() },
        });
      } else if (RUNNING_STATUSES.has(updated.status)) {
        await tx.taskAssignment.updateMany({
          where: { task_id, sla_status: { in: ["PAUSED", "COMPLETED"] } },
          data: {
            sla_status: "RUNNING",
            sla_paused_at: null,
            sla_breached_at: null,
          },
        });
      }
    }

    if (data.due_date !== undefined) {
      if (data.due_date === null) {
        const assignments = await tx.taskAssignment.findMany({
          where: { task_id, sla_status: { in: ["RUNNING", "PAUSED"] } },
          select: { id: true, assigned_at: true },
        });
        for (const a of assignments) {
          const newSLADue = new Date(a.assigned_at);
          newSLADue.setDate(
            newSLADue.getDate() + DEFAULT_SERVICE_LEVEL_AGREEMENT_DAYS,
          );
          await tx.taskAssignment.update({
            where: { id: a.id },
            data: { due_date: newSLADue },
          });
        }
      } else {
        await tx.taskAssignment.updateMany({
          where: { task_id, sla_status: { in: ["RUNNING", "PAUSED"] } },
          data: { due_date: new Date(data.due_date) },
        });
      }
    }

    return updated;
  });

  if (changes.length > 0) {
    await addTaskActivityLog(task_id, currentUser.id, {
      action: "TASK_UPDATED",
      message: buildActivityMessage(changes),
      meta: { changes },
    }).catch((err) => console.error("Failed to log activity:", err));
  }

  let response = { task: updatedTask };
  if (statusChanged) {
    const visibilityWhere =
      currentUser.admin_role === "SUPER_ADMIN"
        ? {}
        : buildTaskVisibilityWhere(currentUser);
    response.status_counts = { global: await getStatusCounts(visibilityWhere) };
  }

  return response;
};

// ─────────────────────────────────────────────────────────────────────────────

export const deleteTask = async (task_id, currentUser) => {
  const visibilityWhere = buildTaskVisibilityWhere(currentUser);

  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirst({
      where: { AND: [{ id: task_id }, visibilityWhere] },
      select: {
        id: true,
        title: true,
        status: true,
        entity_id: true,
        invoice_internal_number: true,
        invoice: { select: { id: true, status: true, internal_number: true } },
      },
    });

    if (!task) throw new NotFoundError("Task not found");

    if (task.status === "COMPLETED") {
      throw new ValidationError(
        "Completed tasks cannot be deleted. Mark cancelled instead.",
      );
    }
    if (
      task.invoice_internal_number &&
      task.invoice &&
      task.invoice.status !== "CANCELLED"
    ) {
      throw new ValidationError(
        `This Task is Linked to an invoice ${task.invoice.internal_number} with status ${task.invoice.status}`,
      );
    }

    await applyTaskDelete(task, tx);
    await Promise.all([
      tx.task.delete({ where: { id: task_id } }),
      tx.taskAssignment.deleteMany({ where: { task_id } }),
    ]);

    return task;
  });

  const globalCounts =
    currentUser.admin_role === "SUPER_ADMIN"
      ? await getStatusCounts({})
      : await getStatusCounts(visibilityWhere);

  return {
    deleted: true,
    task: { id: result.id, title: result.title, status: result.status },
    status_counts: { global: globalCounts },
  };
};

// ─────────────────────────────────────────────────────────────────────────────

export const getTaskById = async (task_id, currentUser) => {
  const visibilityWhere = buildTaskVisibilityWhere(currentUser);

  const task = await prisma.task.findFirst({
    where: { AND: [{ id: task_id }, visibilityWhere] },
    include: {
      entity: { include: { custom_fields: { orderBy: { name: "asc" } } } },
      category: true,
      assignments: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
      },
      charges: {
        where: { deleted_at: null },
        orderBy: { created_at: "asc" },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          updater: { select: { id: true, name: true, email: true } },
          deleter: { select: { id: true, name: true, email: true } },
          restorer: { select: { id: true, name: true, email: true } },
        },
      },
      checklist_items: true,
      last_activity_admin: {
        select: {
          id: true,
          name: true,
          email: true,
          admin_role: true,
          status: true,
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
      updater: {
        select: {
          id: true,
          name: true,
          email: true,
          admin_role: true,
          status: true,
        },
      },
      invoice: {
        select: {
          id: true,
          internal_number: true,
          external_number: true,
          status: true,
          invoice_date: true,
          issued_at: true,
          paid_at: true,
          created_at: true,
        },
      },
    },
  });

  if (!task) throw new NotFoundError("Task not found");

  return {
    ...task,
    sla_summary: buildSlaSummary(task.assignments),
  };
};

// ─────────────────────────────────────────────────────────────────────────────

export const getUnassignedTasksCount = async () =>
  prisma.task.count({
    where: {
      is_system: false,
      assigned_to_all: false,
      assignments: { every: { assignment_source: "AUTO", sla_status: "NONE" } },
    },
  });

// =============================================================================
// BULK OPERATIONS
// =============================================================================

export const bulkUpdateTaskStatus = async (task_ids, status, currentUser) => {
  const visibilityWhere = buildTaskVisibilityWhere(currentUser);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.task.findMany({
      where: { AND: [{ id: { in: task_ids } }, visibilityWhere] },
      select: {
        id: true,
        status: true,
        entity_id: true,
        invoice_internal_number: true,
        invoice: { select: { id: true, status: true, internal_number: true } },
      },
    });

    const lockedTasks = existing.filter(
      (t) =>
        t.invoice_internal_number &&
        t.invoice &&
        (t.invoice.status === "ISSUED" || t.invoice.status === "PAID") &&
        t.status !== status,
    );
    const validTasks = existing.filter(
      (t) => !lockedTasks.find((lt) => lt.id === t.id),
    );
    const validIds = validTasks.map((t) => t.id);

    if (validIds.length === 0) {
      return {
        validIds: [],
        count: 0,
        skippedIds: task_ids.filter((id) => !validIds.includes(id)),
        lockedTasks: lockedTasks.map((t) => ({
          id: t.id,
          reason: `Task in ${t.invoice.status} invoice (${t.invoice.internal_number})`,
        })),
      };
    }

    const updateResult = await tx.task.updateMany({
      where: { id: { in: validIds } },
      data: {
        status,
        end_date:
          status === "COMPLETED" || status === "CANCELLED"
            ? new Date()
            : undefined,
        updated_by: currentUser.id,
        last_activity_at: new Date(),
      },
    });

    for (const task of validTasks) {
      if (task.status !== status) {
        await applyTaskUpdate({ ...task }, { ...task, status }, tx);
      }
    }

    return {
      validIds,
      count: updateResult.count,
      skippedIds: task_ids.filter((id) => !validIds.includes(id)),
      lockedTasks: lockedTasks.map((t) => ({
        id: t.id,
        reason: `Task in ${t.invoice.status} invoice (${t.invoice.internal_number})`,
      })),
    };
  });

  const globalCounts =
    currentUser.admin_role === "SUPER_ADMIN"
      ? await getStatusCounts({})
      : await getStatusCounts(visibilityWhere);

  return {
    updated_task_ids: result.validIds,
    skipped_task_ids: result.skippedIds,
    locked_tasks: result.lockedTasks,
    updated_count: result.count,
    new_status: status,
    status_counts: { global: globalCounts },
  };
};

// ─────────────────────────────────────────────────────────────────────────────

export const bulkUpdateTaskPriority = async (
  task_ids,
  priority,
  currentUser,
) => {
  const visibilityWhere = buildTaskVisibilityWhere(currentUser);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.task.findMany({
      where: { AND: [{ id: { in: task_ids } }, visibilityWhere] },
      select: { id: true },
    });

    const validIds = existing.map((t) => t.id);
    if (validIds.length === 0)
      return { validIds: [], count: 0, skippedIds: task_ids };

    const updateResult = await tx.task.updateMany({
      where: { id: { in: validIds } },
      data: { priority, updated_by: currentUser.id },
    });

    return {
      validIds,
      count: updateResult.count,
      skippedIds: task_ids.filter((id) => !validIds.includes(id)),
    };
  });

  return {
    updated_task_ids: result.validIds,
    skipped_task_ids: result.skippedIds,
    updated_count: result.count,
    new_priority: priority,
  };
};

// =============================================================================
// SLA SUMMARY DASHBOARD
// =============================================================================

export const getSLASummary = async (currentUser) => {
  const now = new Date();
  const endOfToday = istToday(23, 59, 59, 999);
  const dueSoon = new Date(
    endOfToday.getTime() + ATTENTION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const longPausedThreshold = new Date(
    Date.now() - ATTENTION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const baseWhere =
    currentUser.admin_role === "SUPER_ADMIN"
      ? {}
      : { admin_user_id: currentUser.id };

  const activeTaskFilter = {
    task: { is_system: false, status: { notIn: ["COMPLETED", "CANCELLED"] } },
  };
  const nonSystemTaskFilter = { task: { is_system: false } };

  // Step 1: Task deadline buckets take priority — fetch these first as arrays
  const [taskOverdueAssignments, taskDueTodayAssignments, paused, longPaused] =
    await Promise.all([
      prisma.taskAssignment.findMany({
        where: {
          ...baseWhere,
          sla_status: { in: ["RUNNING", "PAUSED"] },
          task: {
            is_system: false,
            due_date: { lt: now },
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        },
        select: { task_id: true },
      }),
      prisma.taskAssignment.findMany({
        where: {
          ...baseWhere,
          sla_status: { in: ["RUNNING", "PAUSED"] },
          task: {
            is_system: false,
            due_date: { gte: now, lte: endOfToday },
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        },
        select: { task_id: true },
      }),
      prisma.taskAssignment.count({
        where: { ...baseWhere, sla_status: "PAUSED", ...nonSystemTaskFilter },
      }),
      prisma.taskAssignment.count({
        where: {
          ...baseWhere,
          sla_status: "PAUSED",
          sla_paused_at: { lt: longPausedThreshold },
          ...nonSystemTaskFilter,
        },
      }),
    ]);

  // Collect task_ids already claimed by task deadline buckets
  const taskDeadlineTaskIds = new Set([
    ...taskOverdueAssignments.map((a) => a.task_id),
    ...taskDueTodayAssignments.map((a) => a.task_id),
  ]);

  const excludeTaskDeadlineTasks =
    taskDeadlineTaskIds.size > 0
      ? { task_id: { notIn: [...taskDeadlineTaskIds] } }
      : {};

  // Step 2: SLA counts — exclude tasks already claimed by task deadline buckets
  const [overdue, dueToday, dueSoonCount] = await Promise.all([
    prisma.taskAssignment.count({
      where: {
        ...baseWhere,
        ...excludeTaskDeadlineTasks,
        sla_status: "RUNNING",
        due_date: { lt: now },
        ...activeTaskFilter,
      },
    }),
    prisma.taskAssignment.count({
      where: {
        ...baseWhere,
        ...excludeTaskDeadlineTasks,
        sla_status: "RUNNING",
        due_date: { gte: now, lte: endOfToday },
        ...activeTaskFilter,
      },
    }),
    prisma.taskAssignment.count({
      where: {
        ...baseWhere,
        ...excludeTaskDeadlineTasks,
        sla_status: "RUNNING",
        due_date: { gt: endOfToday, lte: dueSoon },
        ...activeTaskFilter,
      },
    }),
  ]);

  return {
    critical: {
      sla_overdue: {
        count: overdue,
        label: "SLA Breached",
        description: "Your deadline to complete this task has passed",
        filters: { sla_status: "RUNNING", sla_due_date_to: now.toISOString() },
      },
      task_deadline_overdue: {
        count: taskOverdueAssignments.length,
        label: "Due Date Passed",
        description: "The client task deadline has passed",
        filters: { due_date_to: now.toISOString() },
      },
    },
    attention: {
      sla_due_today: {
        count: dueToday,
        label: "SLA Due Today",
        filters: {
          sla_status: "RUNNING",
          sla_due_date_from: now.toISOString(),
          sla_due_date_to: endOfToday.toISOString(),
        },
      },
      task_deadline_today: {
        count: taskDueTodayAssignments.length,
        label: "Due Date Today",
        filters: {
          due_date_from: now.toISOString(),
          due_date_to: endOfToday.toISOString(),
        },
      },
      sla_due_soon: {
        count: dueSoonCount,
        label: `SLA Due in ${ATTENTION_WINDOW_DAYS} Days`,
        filters: {
          sla_status: "RUNNING",
          sla_due_date_from: endOfToday.toISOString(),
          sla_due_date_to: dueSoon.toISOString(),
        },
      },
    },
    informational: {
      paused: {
        count: paused,
        label: "On Hold / Awaiting Client",
        filters: { sla_status: "PAUSED" },
      },
      long_paused: {
        count: longPaused,
        label: `Paused Over ${ATTENTION_WINDOW_DAYS} Days`,
        description: "Tasks stuck waiting — may need follow-up",
        filters: {
          sla_status: "PAUSED",
          sla_paused_before: longPausedThreshold.toISOString(),
        },
      },
    },
  };
};

// =============================================================================
// LIST TASKS
// =============================================================================

export const listTasks = async (filters = {}, currentUser) => {
  const page = Number(filters.page) || 1;
  const pageSize = Number(filters.page_size) || 20;

  const visibilityWhere = buildTaskVisibilityWhere(currentUser);
  const where = buildListWhere(filters, visibilityWhere);
  const isMagicSort = filters.is_magic_sort === true;
  const trueGlobalWhere =
    currentUser?.admin_role === "SUPER_ADMIN" ? {} : { AND: [visibilityWhere] };
  const filteredGlobalWhere = {
    AND: where.AND.filter((c) => !("status" in c) && !("priority" in c)),
  };

  let tasks;
  let magicScoreMap = new Map();

  if (isMagicSort) {
    const rawRows = await magicSortQuery(filters, currentUser, pageSize, page);
    const ids = rawRows.map((r) => r.id);
    magicScoreMap = new Map(
      rawRows.map((r, i) => [
        r.id,
        { index: i, urgency_score: Number(r.urgency_score) },
      ]),
    );

    const enriched = await prisma.task.findMany({
      where: { id: { in: ids } },
      select: LIST_TASK_SELECT,
    });
    tasks = enriched.sort(
      (a, b) => magicScoreMap.get(a.id).index - magicScoreMap.get(b.id).index,
    );
  } else {
    tasks = await prisma.task.findMany({
      where,
      select: LIST_TASK_SELECT,
      orderBy: {
        [filters.sort_by || "created_at"]: filters.sort_order || "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  const taskIds = tasks.map((t) => t.id);

  const [total, filteredCounts, globalCounts, docCountMap] = await Promise.all([
    prisma.task.count({ where }),
    getStatusCounts(filteredGlobalWhere),
    getStatusCounts(trueGlobalWhere),
    fetchDocumentCounts(taskIds),
  ]);

  const formattedTasks = tasks.map((task) =>
    formatTask(
      { ...task, document_count: docCountMap.get(task.id) ?? 0 },
      isMagicSort
        ? { urgency_score: magicScoreMap.get(task.id)?.urgency_score }
        : {},
    ),
  );

  return {
    page,
    page_size: pageSize,
    total,
    total_pages: Math.ceil(total / pageSize),
    tasks: formattedTasks,
    is_magic_sort: isMagicSort,
    status_counts: { filtered: filteredCounts, global: globalCounts },
  };
};
