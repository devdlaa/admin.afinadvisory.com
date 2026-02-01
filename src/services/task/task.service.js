import { prisma } from "@/utils/server/db.js";
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

// ==================== INVOICE LOCK HELPER ====================

/**
 * Check if critical invoice-locked fields are being modified
 * LOCKS: title, status, entity_id, task_category_id, is_billable,
 * ALLOWS: priority, description, due_date, start_date, end_date, assignments
 */
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
      invoice: {
        select: {
          id: true,
          status: true,
          internal_number: true,
        },
      },
    },
  });

  if (!task) {
    throw new NotFoundError("Task not found");
  }

  if (
    task.invoice_internal_number &&
    updates.entity_id !== undefined &&
    updates.entity_id !== task.entity_id
  ) {
    throw new ForbiddenError(
      `Cannot modify client - task is Linked (invoice ${task.invoice.internal_number}). Status ${task.invoice.status}.`,
    );
  }

  // If task is in ISSUED or PAID invoice, lock critical fields
  if (
    task.invoice_internal_number &&
    task.invoice &&
    (task.invoice.status !== "CANCELLED")
  ) {
    const criticalFields = {
      title: "title",
      status: "status",
      task_category_id: "task category",
      is_billable: "billable status",
    };

    const lockedChanges = [];

    for (const [field, label] of Object.entries(criticalFields)) {
      if (updates[field] !== undefined && updates[field] !== task[field]) {
        lockedChanges.push(label);
      }
    }

    if (lockedChanges.length > 0) {
      throw new ForbiddenError(
        `Cannot modify ${lockedChanges.join(", ")} - task is locked because it's part of ${task.invoice.status.toLowerCase()} invoice (${task.invoice.internal_number}). Contact admin for corrections.`,
      );
    }
  }

  return task;
}

// ==================== VISIBILITY HELPER ====================

export function buildTaskVisibilityWhere(user) {
  if (user.admin_role === "SUPER_ADMIN") {
    return {};
  }
  return {
    OR: [
      { assigned_to_all: true },
      { assignments: { some: { admin_user_id: user.id } } },
    ],
  };
}

// ==================== STATUS COUNTS HELPER ====================

/**
 * Helper to get status counts - OPTIMIZED VERSION
 * Uses groupBy instead of 6 separate count queries
 */
const getStatusCounts = async (where = {}, db = prisma) => {
  const statuses = [
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "ON_HOLD",
    "PENDING_CLIENT_INPUT",
  ];

  const groupedCounts = await db.task.groupBy({
    by: ["status"],
    where,
    _count: { status: true },
  });

  const result = {};
  statuses.forEach((s) => (result[s] = 0));
  groupedCounts.forEach((item) => {
    if (result[item.status] !== undefined) {
      result[item.status] = item._count.status;
    }
  });

  return result;
};

// ==================== CREATE TASK ====================

/**
 * Create a task - BLAZING FAST VERSION
 * - Parallel validations
 * - Single task creation with minimal select
 * - No redundant fetches
 * - Status counts fetched outside transaction
 */
export const createTask = async (data, created_by) => {
  // Pre-validate due date (no DB call needed)
  if (data.due_date && new Date(data.due_date) < new Date()) {
    throw new ValidationError("Due date cannot be in the past");
  }

  const result = await prisma.$transaction(async (tx) => {
    //  PARALLEL VALIDATIONS - Run simultaneously
    const validations = [];

    if (data.entity_id) {
      validations.push(
        tx.entity.findUnique({
          where: { id: data.entity_id },
          select: { id: true },
        }),
      );
    } else {
      validations.push(Promise.resolve(null));
    }

    if (data.task_category_id) {
      validations.push(
        tx.taskCategory.findUnique({
          where: { id: data.task_category_id },
          select: { id: true },
        }),
      );
    } else {
      validations.push(Promise.resolve(null));
    }

    const [entity, category] = await Promise.all(validations);

    if (data.entity_id && !entity) {
      throw new NotFoundError("Entity not found");
    }
    if (data.task_category_id && !category) {
      throw new NotFoundError("Task category not found or inactive");
    }

    //  CREATE TASK - Single query with minimal necessary data
    const task = await tx.task.create({
      data: {
        entity_id: data.entity_id ?? null,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? "PENDING",
        priority: data.priority ?? "NORMAL",
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
        due_date: data.due_date ? new Date(data.due_date) : null,
        task_category_id: data.task_category_id ?? null,
        is_billable: true,

        created_by,
        updated_by: created_by,
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

    //  APPLY DELTA - Update entity task stats
    await applyTaskCreate(task, tx);

    //  CREATE AUTO-ASSIGNMENT - Single insert
    await tx.taskAssignment.create({
      data: {
        task_id: task.id,
        admin_user_id: created_by,
        assigned_by: created_by,
        assignment_source: "AUTO",
      },
    });

    return task;
  });

  //  FETCH ENRICHED TASK DATA - Outside transaction to avoid lock contention
  const freshTask = await prisma.task.findUnique({
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
        select: {
          id: true,
          task_id: true,
          admin_user_id: true,
          assigned_at: true,
          assigned_by: true,
          assignment_source: true,
          assignee: {
            select: { id: true, name: true },
          },
        },
        orderBy: { assigned_at: "asc" },
        take: 3,
      },
      _count: {
        select: { assignments: true, charges: true },
      },
    },
  });

  const globalCounts = await getStatusCounts({});

  const formattedTask = {
    ...freshTask,
    is_billable: freshTask._count.charges > 0,
    assignments: freshTask.assignments.map((a) => ({
      id: a.id,
      task_id: a.task_id,
      admin_user_id: a.admin_user_id,
      assigned_at: a.assigned_at,
      assigned_by: a.assigned_by,
      assignment_source: a.assignment_source,
      assignee: a.assignee,
    })),
    remaining_assignee_count:
      freshTask._count.assignments > freshTask.assignments.length
        ? freshTask._count.assignments - freshTask.assignments.length
        : 0,
  };

  return {
    task: formattedTask,
    status_counts: {
      global: globalCounts,
      filtered: null,
    },
  };
};

// ==================== UPDATE TASK ====================

/**
 * Update a task - WITH INVOICE LOCK PROTECTION
 * - Checks critical fields against invoice lock
 * - Optimized validations (parallel + conditional)
 * - Minimal queries inside transaction
 * - Activity log outside transaction
 * - Status counts only when needed
 */
export const updateTask = async (task_id, data, currentUser) => {
  // Pre-validate due date (no DB call)
  if (data.due_date && new Date(data.due_date) < new Date()) {
    throw new ValidationError("Due date cannot be in the past");
  }

  const changes = [];
  let statusChanged = false;

  const updatedTask = await prisma.$transaction(async (tx) => {
    const visibilityWhere = buildTaskVisibilityWhere(currentUser);

    // ✅ CHECK CRITICAL FIELDS LOCK FIRST
    await ensureTaskCriticalFieldsEditable(task_id, data, tx);

    //  FETCH EXISTING TASK - Minimal select for change detection
    const existing = await tx.task.findFirst({
      where: {
        AND: [{ id: task_id }, visibilityWhere],
      },
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

    if (!existing) {
      throw new NotFoundError("Task not found");
    }

    //  PARALLEL VALIDATIONS - Only run what's needed
    const validations = [];
    let categoryPromise = null;
    let entityPromise = null;

    if (
      data.task_category_id !== undefined &&
      data.task_category_id !== existing.task_category_id
    ) {
      categoryPromise = data.task_category_id
        ? tx.taskCategory.findUnique({
            where: { id: data.task_category_id },
            select: { id: true, name: true },
          })
        : Promise.resolve(null);
      validations.push(categoryPromise);
    }

    if (data.entity_id !== undefined && data.entity_id !== existing.entity_id) {
      entityPromise = data.entity_id
        ? tx.entity.findUnique({
            where: { id: data.entity_id },
            select: { id: true, name: true, status: true },
          })
        : Promise.resolve(null);
      validations.push(entityPromise);
    }

    // Run all validations in parallel
    await Promise.all(validations);

    // Check validation results
    if (categoryPromise) {
      const category = await categoryPromise;
      if (data.task_category_id && !category) {
        throw new NotFoundError("Task category not found");
      }
    }

    if (entityPromise) {
      const entity = await entityPromise;
      if (data.entity_id && !entity) {
        throw new NotFoundError("Entity not found");
      }
      if (entity && entity.status !== "ACTIVE") {
        throw new ValidationError("Only ACTIVE entities can be assigned");
      }
    }

    //  CHANGE COLLECTION - Build change log
    const from = {};
    const to = {};
    const simpleFields = ["title", "description", "status", "priority"];

    for (const field of simpleFields) {
      if (data[field] !== undefined && data[field] !== existing[field]) {
        from[field] = existing[field];
        to[field] = data[field];
        if (field === "status") {
          statusChanged = true;
        }
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
      data.task_category_id !== undefined &&
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

    if (data.entity_id !== undefined && data.entity_id !== existing.entity_id) {
      const newEntity = await entityPromise;
      from.entity = existing.entity
        ? { id: existing.entity.id, name: existing.entity.name }
        : null;
      to.entity = newEntity ? { id: newEntity.id, name: newEntity.name } : null;
    }

    let computedEndDate = undefined;
    if (
      data.status &&
      (data.status === "COMPLETED" || data.status === "CANCELLED") &&
      !existing.end_date
    ) {
      computedEndDate = new Date();
    }

    if (Object.keys(from).length || Object.keys(to).length) {
      changes.push({
        action: "TASK_UPDATED",
        from,
        to,
      });
    }

    //  UPDATE TASK - Single update query
    const updated = await tx.task.update({
      where: { id: task_id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        entity_id: data.entity_id,
        task_category_id: data.task_category_id,
        start_date:
          data.start_date === undefined
            ? undefined
            : data.start_date
              ? new Date(data.start_date)
              : null,
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
        entity: {
          include: {
            custom_fields: { orderBy: { name: "asc" } },
          },
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
      },
    });

    // ✅ APPLY DELTA - Update entity task stats
    await applyTaskUpdate(existing, updated, tx);

    return updated;
  });

  // ✅ ACTIVITY LOG - Outside transaction to avoid holding locks
  if (changes.length > 0) {
    await addTaskActivityLog(task_id, currentUser.id, {
      action: "TASK_UPDATED",
      message: buildActivityMessage(changes),
      meta: { changes },
    }).catch((err) => {
      console.error("Failed to log activity:", err);
    });
  }

  // ✅ STATUS COUNTS - Only fetch when status changed, outside transaction
  let response = { task: updatedTask };
  if (statusChanged) {
    const visibilityWhere =
      currentUser.admin_role === "SUPER_ADMIN"
        ? {}
        : buildTaskVisibilityWhere(currentUser);
    const globalCounts = await getStatusCounts(visibilityWhere);
    response.status_counts = { global: globalCounts };
  }

  return response;
};

// ==================== DELETE TASK ====================

/**
 * Delete task - BLAZING FAST VERSION
 * - Minimal queries
 * - Status counts outside transaction
 */
export const deleteTask = async (task_id, currentUser) => {
  const visibilityWhere = buildTaskVisibilityWhere(currentUser);

  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirst({
      where: {
        AND: [{ id: task_id }, visibilityWhere],
      },
      select: {
        id: true,
        title: true,
        status: true,

        entity_id: true,
        invoice_internal_number: true,
        invoice: {
          select: {
            id: true,
            status: true,
            internal_number: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundError("Task not found");
    }

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
        `This Task is Linked to an invoice ${task?.invoice?.internal_number} with status ${task.invoice?.status}`,
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
    task: {
      id: result.id,
      title: result.title,
      status: result.status,
    },
    status_counts: {
      global: globalCounts,
    },
  };
};

// ==================== GET TASK BY ID ====================

export const getTaskById = async (task_id, currentUser) => {
  const visibilityWhere = buildTaskVisibilityWhere(currentUser);

  const task = await prisma.task.findFirst({
    where: {
      AND: [{ id: task_id }, visibilityWhere],
    },
    include: {
      entity: {
        include: {
          custom_fields: { orderBy: { name: "asc" } },
        },
      },
      category: true,
      assignments: {
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
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
    },
  });

  if (!task) {
    throw new NotFoundError("Task not found");
  }

  return task;
};

// ==================== LIST TASKS ====================

export const listTasks = async (filters = {}, currentUser) => {
  const page = Number(filters.page) || 1;
  const pageSize = Number(filters.page_size) || 20;

  const visibilityWhere = buildTaskVisibilityWhere(currentUser);

  const andConditions = [visibilityWhere];
  andConditions.push({ is_system: { not: true } });
  if (filters.entity_id) andConditions.push({ entity_id: filters.entity_id });
  if (filters.status) andConditions.push({ status: filters.status });
  if (filters.priority) andConditions.push({ priority: filters.priority });
  if (filters.task_category_id)
    andConditions.push({ task_category_id: filters.task_category_id });
  if (filters.created_by)
    andConditions.push({ created_by: filters.created_by });
  if (filters.assigned_to) {
    andConditions.push({
      assignments: { some: { admin_user_id: filters.assigned_to } },
    });
  }

  if (filters.due_date_from || filters.due_date_to) {
    const due = {};
    if (filters.due_date_from) due.gte = new Date(filters.due_date_from);
    if (filters.due_date_to) due.lte = new Date(filters.due_date_to);
    andConditions.push({ due_date: due });
  }
  if (filters.search) {
    if (filters.search.length < 3) {
      throw new ValidationError("Search must be at least 3 characters");
    }
    andConditions.push({
      OR: [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ],
    });
  }

  const where = { AND: andConditions };
  const trueGlobalWhere =
    currentUser?.admin_role === "SUPER_ADMIN" ? {} : { AND: [visibilityWhere] };
  const filteredGlobalWhere = {
    AND: andConditions.filter((c) => !("status" in c) && !("priority" in c)),
  };

  const [tasks, total, filteredCounts, globalCounts] = await Promise.all([
    prisma.task.findMany({
      where,
      select: {
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
          select: {
            id: true,
            task_id: true,
            admin_user_id: true,
            assigned_at: true,
            assigned_by: true,
            assignment_source: true,
            assignee: { select: { id: true, name: true } },
          },
          orderBy: { assigned_at: "asc" },
          take: 3,
        },
        _count: { select: { assignments: true, charges: true } },
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.task.count({ where }),
    getStatusCounts(filteredGlobalWhere),
    getStatusCounts(trueGlobalWhere),
  ]);

  const formattedTasks = tasks.map((task) => ({
    ...task,
    is_billable: task._count.charges > 0,
    assignments: task.assignments.map((a) => ({
      id: a.id,
      task_id: a.task_id,
      admin_user_id: a.admin_user_id,
      assigned_at: a.assigned_at,
      assigned_by: a.assigned_by,
      assignment_source: a.assignment_source,
      assignee: a.assignee,
    })),
    remaining_assignee_count:
      task._count.assignments > task.assignments.length
        ? task._count.assignments - task.assignments.length
        : 0,
  }));

  return {
    page,
    page_size: pageSize,
    total,
    total_pages: Math.ceil(total / pageSize),
    tasks: formattedTasks,
    status_counts: {
      filtered: filteredCounts,
      global: globalCounts,
    },
  };
};

// ==================== BULK UPDATE STATUS - WITH INVOICE LOCK ====================

/**
 * Bulk status update - WITH INVOICE LOCK PROTECTION
 * - Filters out tasks in ISSUED/PAID invoices
 * - Batch update for valid tasks
 * - Delta sync
 * - Returns locked tasks info
 */
export const bulkUpdateTaskStatus = async (task_ids, status, currentUser) => {
  const visibilityWhere = buildTaskVisibilityWhere(currentUser);

  const result = await prisma.$transaction(async (tx) => {
    // ✅ FETCH TASKS - Check invoice status
    const existing = await tx.task.findMany({
      where: {
        AND: [{ id: { in: task_ids } }, visibilityWhere],
      },
      select: {
        id: true,
        status: true,
        entity_id: true,
        invoice_internal_number: true,
        invoice: {
          select: {
            id: true,
            status: true,
            internal_number: true,
          },
        },
      },
    });

    // ✅ FILTER OUT LOCKED TASKS (in ISSUED/PAID invoices)
    const lockedTasks = existing.filter(
      (t) =>
        t.invoice_internal_number &&
        t.invoice &&
        (t.invoice.status === "ISSUED" || t.invoice.status === "PAID") &&
        t.status !== status, // Only if status would change
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

    // ✅ BATCH UPDATE - Only valid tasks
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

    // ✅ APPLY DELTA SYNC
    for (const task of validTasks) {
      if (task.status !== status) {
        const oldTask = { ...task };
        const newTask = { ...task, status };
        await applyTaskUpdate(oldTask, newTask, tx);
      }
    }

    const skippedIds = task_ids.filter((id) => !validIds.includes(id));

    return {
      validIds,
      count: updateResult.count,
      skippedIds,
      lockedTasks: lockedTasks.map((t) => ({
        id: t.id,
        reason: `Task in ${t.invoice.status} invoice (${t.invoice.internal_number})`,
      })),
    };
  });

  // ✅ FETCH COUNTS - Outside transaction
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
    status_counts: {
      global: globalCounts,
    },
  };
};

// ==================== BULK UPDATE PRIORITY ====================

/**
 * Bulk priority update - NO LOCK (priority is always editable)
 */
export const bulkUpdateTaskPriority = async (
  task_ids,
  priority,
  currentUser,
) => {
  const visibilityWhere = buildTaskVisibilityWhere(currentUser);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.task.findMany({
      where: {
        AND: [{ id: { in: task_ids } }, visibilityWhere],
      },
      select: { id: true },
    });

    const validIds = existing.map((t) => t.id);

    if (validIds.length === 0) {
      return {
        validIds: [],
        count: 0,
        skippedIds: task_ids,
      };
    }

    const updateResult = await tx.task.updateMany({
      where: { id: { in: validIds } },
      data: {
        priority,
        updated_by: currentUser.id,
      },
    });

    const skippedIds = task_ids.filter((id) => !validIds.includes(id));

    return {
      validIds,
      count: updateResult.count,
      skippedIds,
    };
  });

  return {
    updated_task_ids: result.validIds,
    skipped_task_ids: result.skippedIds,
    updated_count: result.count,
    new_priority: priority,
  };
};
