import { prisma } from "@/utils/server/db.js";
import { NotFoundError, ValidationError } from "../../utils/server/errors.js";
import { addTaskActivityLog } from "./taskComment.service.js";
import { buildActivityMessage } from "@/utils/server/activityBulder.js";

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

/**
 * Create a task (manual only, no compliance/cycles)
 * NOW RETURNS GLOBAL STATUS COUNTS
 */
export const createTask = async (data, created_by) => {
  return prisma.$transaction(async (tx) => {
    if (data.entity_id) {
      const entity = await tx.entity.findFirst({
        where: { id: data.entity_id },
      });

      if (!entity) throw new NotFoundError("Entity not found");
    }

    // validate task category if provided
    if (data.task_category_id) {
      const category = await tx.taskCategory.findFirst({
        where: { id: data.task_category_id },
      });

      if (!category) {
        throw new NotFoundError("Task category not found or inactive");
      }
    }

    // due date sanity check
    if (data.due_date && new Date(data.due_date) < new Date()) {
      throw new ValidationError("Due date cannot be in the past");
    }

    // create task
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

        is_billable: data.is_billable ?? false,
        invoice_number: data.invoice_number ?? null,
        billed_from_firm: data.billed_from_firm ?? null,

        created_by,
        updated_by: created_by,
      },
      include: {
        entity: {
          include: {
            custom_fields: {
              orderBy: { name: "asc" },
            },
          },
        },
        category: true,
        last_activity_admin: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        updater: { select: { id: true, name: true, email: true } },

        charges: {
          where: {
            deleted_at: null,
          },
          orderBy: {
            created_at: "asc",
          },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            updater: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        checklist_items: true,
      },
    });

    await tx.taskAssignment.create({
      data: {
        task_id: task.id,
        admin_user_id: created_by,
        assigned_by: created_by,
        assignment_source: "AUTO",
      },
    });

    // Get updated global counts after creation
    const globalCounts = await getStatusCounts({}, tx);

    return {
      task,
      status_counts: {
        global: globalCounts,
        filtered: null,
      },
    };
  });
};

/**
 * Update a task (final semantic activity version)
 * NOW RETURNS GLOBAL STATUS COUNTS WHEN STATUS CHANGES
 */

export const updateTask = async (task_id, data, updated_by) => {
  const changes = [];
  let updatedTask;
  let statusChanged = false;

  updatedTask = await prisma.$transaction(async (tx) => {
    const existing = await tx.task.findUnique({
      where: { id: task_id },
      include: {
        entity: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError("Task not found");
    }

    // ---------- VALIDATIONS ----------

    if (data.due_date && new Date(data.due_date) < new Date()) {
      throw new ValidationError("Due date cannot be in the past");
    }

    if (data.task_category_id) {
      const category = await tx.taskCategory.findUnique({
        where: { id: data.task_category_id },
      });
      if (!category) throw new NotFoundError("Task category not found");
    }

    if (data.entity_id !== undefined && data.entity_id !== null) {
      const entity = await tx.entity.findUnique({
        where: { id: data.entity_id },
        select: { id: true, name: true, status: true },
      });

      if (!entity) throw new NotFoundError("Entity not found");
      if (entity.status !== "ACTIVE") {
        throw new ValidationError("Only ACTIVE entities can be assigned");
      }
    }

    // ---------- CHANGE COLLECTION ----------

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

    // due_date
    if (
      data.due_date !== undefined &&
      data.due_date?.toString() !== existing.due_date?.toISOString()
    ) {
      from.due_date = existing.due_date?.toISOString() ?? null;
      to.due_date = data.due_date
        ? new Date(data.due_date).toISOString()
        : null;
    }

    // category
    if (
      data.task_category_id !== undefined &&
      data.task_category_id !== existing.task_category_id
    ) {
      const newCategory = data.task_category_id
        ? await tx.taskCategory.findUnique({
            where: { id: data.task_category_id },
          })
        : null;

      from.category = existing.category
        ? { id: existing.category.id, name: existing.category.name }
        : null;

      to.category = newCategory
        ? { id: newCategory.id, name: newCategory.name }
        : null;
    }

    // entity
    if (data.entity_id !== undefined && data.entity_id !== existing.entity_id) {
      const newEntity =
        data.entity_id !== null
          ? await tx.entity.findUnique({
              where: { id: data.entity_id },
              select: { id: true, name: true },
            })
          : null;

      from.entity = existing.entity
        ? { id: existing.entity.id, name: existing.entity.name }
        : null;

      to.entity = newEntity ? { id: newEntity.id, name: newEntity.name } : null;
    }

    // status → completed / cancelled end_date logic
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

    // ---------- UPDATE TASK ----------

    return tx.task.update({
      where: { id: task_id },
      data: {
        title: data.title === undefined ? undefined : data.title,
        description:
          data.description === undefined ? undefined : data.description,
        status: data.status === undefined ? undefined : data.status,
        priority: data.priority === undefined ? undefined : data.priority,

        // allow null to clear
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

        updated_by,

        last_activity_at: changes.length
          ? new Date()
          : existing.last_activity_at,

        last_activity_by: changes.length
          ? updated_by
          : existing.last_activity_by,
      },
      include: {
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
  });

  // ---------- ACTIVITY LOG ----------

  if (changes.length > 0) {
    await addTaskActivityLog(task_id, updated_by, {
      action: "TASK_UPDATED",
      message: buildActivityMessage(changes),
      meta: { changes },
    });
  }

  // ---------- GLOBAL COUNTS ----------

  let response = { task: updatedTask };

  if (statusChanged) {
    const globalCounts = await getStatusCounts();
    response.status_counts = { global: globalCounts };
  }

  return response;
};

/**
 * Soft delete task
 * FIXED: Properly returns task data and accurate counts
 */
export const deleteTask = async (task_id, deleted_by) => {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: task_id },
    });

    if (!task) throw new NotFoundError("Task not found");

    if (task.status === "COMPLETED") {
      throw new ValidationError(
        "Completed tasks cannot be deleted. Mark cancelled instead."
      );
    }

    // Delete the task (use delete, not deleteMany)
    await tx.task.delete({
      where: { id: task_id },
    });

    // Delete assignments
    await tx.taskAssignment.deleteMany({ where: { task_id } });

    // Get ACCURATE global counts AFTER deletion
    const globalCounts = await getStatusCounts({}, tx);

    return {
      deleted: true,
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
      },
      status_counts: {
        global: globalCounts,
      },
    };
  });
};

/**
 * Get task details
 */
export const getTaskById = async (task_id) => {
  const task = await prisma.task.findUnique({
    where: { id: task_id },
    include: {
      entity: {
        include: {
          custom_fields: {
            orderBy: { name: "asc" },
          },
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
        where: {
          deleted_at: null,
        },
        orderBy: {
          created_at: "asc",
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          updater: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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

  if (!task) throw new NotFoundError("Task not found");

  return task;
};

/**
 * List tasks with filters
 */
export const listTasks = async (filters = {}) => {
  const page = Number(filters.page) || 1;
  const pageSize = Number(filters.page_size) || 20;

  const where = {};

  if (filters.entity_id) where.entity_id = filters.entity_id;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.task_category_id)
    where.task_category_id = filters.task_category_id;
  if (filters.created_by) where.created_by = filters.created_by;

  if (filters.assigned_to) {
    where.assignments = {
      some: { admin_user_id: filters.assigned_to },
    };
  }

  if (filters.is_billable === true) {
    where.charges = { some: { deleted_at: null } };
  }

  if (filters.is_billable === false) {
    where.charges = { none: { deleted_at: null } };
  }

  if (filters.billed_from_firm)
    where.billed_from_firm = filters.billed_from_firm;

  if (filters.due_date_from || filters.due_date_to) {
    where.due_date = {};
    if (filters.due_date_from)
      where.due_date.gte = new Date(filters.due_date_from);
    if (filters.due_date_to) where.due_date.lte = new Date(filters.due_date_to);
  }

  if (filters.search && filters.search.length < 3) {
    throw new ValidationError("Search must be at least 3 characters");
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Build base where for global counts (NO filters at all - true global)
  const trueGlobalWhere = {};

  // Build where for filtered-but-all-statuses (current filters minus status/priority)
  const filteredGlobalWhere = { ...where };
  delete filteredGlobalWhere.status;
  delete filteredGlobalWhere.priority;

  // Single query with all relationships included
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
        entity: {
          select: {
            id: true,
            name: true,
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
        assignments: {
          select: {
            id: true,
            task_id: true,
            admin_user_id: true,
            assigned_at: true,
            assigned_by: true,
            assignment_source: true,
            assignee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            assigned_at: "asc",
          },
          take: 3,
        },
        _count: {
          select: {
            assignments: true,
            charges: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
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
    assigned_to_all: task.assigned_to_all,
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

/**
 * Bulk status update
 * NOW RETURNS GLOBAL STATUS COUNTS
 */
export const bulkUpdateTaskStatus = async (task_ids, status, updated_by) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.task.findMany({
      where: {
        id: { in: task_ids },
      },
      select: { id: true },
    });

    const validIds = existing.map((t) => t.id);

    const result = await tx.task.updateMany({
      where: { id: { in: validIds } },
      data: {
        status,
        end_date:
          status === "COMPLETED" || status === "CANCELLED"
            ? new Date()
            : undefined,
        updated_by,
        last_activity_at: new Date(),
        last_activity_by: updated_by,
      },
    });

    // Calculate skipped IDs
    const skippedIds = task_ids.filter((id) => !validIds.includes(id));

    // Get updated global counts after bulk update
    const globalCounts = await getStatusCounts({}, tx);

    return {
      updated_task_ids: validIds,
      skipped_task_ids: skippedIds,
      updated_count: result.count,
      new_status: status,
      status_counts: {
        global: globalCounts,
      },
    };
  });
};

/**
 * Bulk priority update
 */
export const bulkUpdateTaskPriority = async (
  task_ids,
  priority,
  updated_by
) => {
  return prisma.$transaction(async (tx) => {
    // Find valid IDs
    const existing = await tx.task.findMany({
      where: {
        id: { in: task_ids },
      },
      select: { id: true },
    });

    const validIds = existing.map((t) => t.id);

    // Update only valid ones
    const result = await tx.task.updateMany({
      where: { id: { in: validIds } },
      data: {
        priority,
        updated_by,
        last_activity_at: new Date(),
        last_activity_by: updated_by,
      },
    });

    // Whatever was requested but not valid
    const skippedIds = task_ids.filter((id) => !validIds.includes(id));

    return {
      updated_task_ids: validIds,
      skipped_task_ids: skippedIds,
      updated_count: result.count,
      new_priority: priority,
    };
  });
};
