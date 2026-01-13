import { prisma } from "@/utils/server/db.js";
import { NotFoundError, ValidationError } from "../../utils/server/errors.js";
import { addTaskActivityLog } from "./taskComment.service.js";
import { buildActivityMessage } from "@/utils/server/activityBulder.js";

export function buildTaskVisibilityWhere(user) {
  if (user.admin_role === "SUPER_ADMIN") {
    return {}; // no restriction
  }

  return {
    OR: [
      { assigned_to_all: true },
      {
        assignments: {
          some: { admin_user_id: user.id },
        },
      },
    ],
  };
}

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

export const updateTask = async (task_id, data, currentUser) => {
  const changes = [];
  let updatedTask;
  let statusChanged = false;

  updatedTask = await prisma.$transaction(async (tx) => {
    const visibilityWhere = buildTaskVisibilityWhere(currentUser);

    // 🔐 Enforce visibility
    const existing = await tx.task.findFirst({
      where: {
        AND: [{ id: task_id }, visibilityWhere],
      },
      include: {
        entity: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    // Do not leak existence
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

    // ---------- UPDATE ----------

    return tx.task.update({
      where: { id: task_id },
      data: {
        title: data.title === undefined ? undefined : data.title,
        description:
          data.description === undefined ? undefined : data.description,
        status: data.status === undefined ? undefined : data.status,
        priority: data.priority === undefined ? undefined : data.priority,

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

        last_activity_at: changes.length
          ? new Date()
          : existing.last_activity_at,

        last_activity_by: changes.length
          ? currentUser.id
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
    await addTaskActivityLog(task_id, currentUser.id, {
      action: "TASK_UPDATED",
      message: buildActivityMessage(changes),
      meta: { changes },
    });
  }

  // ---------- COUNTS ----------

  let response = { task: updatedTask };

  if (statusChanged) {
    const globalCounts =
      currentUser.admin_role === "SUPER_ADMIN"
        ? await getStatusCounts()
        : await getStatusCounts(buildTaskVisibilityWhere(currentUser));

    response.status_counts = { global: globalCounts };
  }

  return response;
};

/**
 * Soft delete task
 * FIXED: Properly returns task data and accurate counts
 */
export const deleteTask = async (task_id, currentUser) => {
  return prisma.$transaction(async (tx) => {
    const visibilityWhere = buildTaskVisibilityWhere(currentUser);

    // 🔐 Enforce visibility while fetching
    const task = await tx.task.findFirst({
      where: {
        AND: [{ id: task_id }, visibilityWhere],
      },
    });

    // Do not leak whether task exists
    if (!task) {
      throw new NotFoundError("Task not found");
    }

    if (task.status === "COMPLETED") {
      throw new ValidationError(
        "Completed tasks cannot be deleted. Mark cancelled instead."
      );
    }

    // Delete task
    await tx.task.delete({
      where: { id: task_id },
    });

    // Delete assignments
    await tx.taskAssignment.deleteMany({
      where: { task_id },
    });

    // Global counts (respect visibility for non-super-admin)
    const globalCounts =
      currentUser.admin_role === "SUPER_ADMIN"
        ? await getStatusCounts({}, tx)
        : await getStatusCounts(visibilityWhere, tx);

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
export const getTaskById = async (task_id, currentUser) => {
  const visibilityWhere = buildTaskVisibilityWhere(currentUser);

  const task = await prisma.task.findFirst({
    where: {
      AND: [
        { id: task_id },
        visibilityWhere, // 🔐 visibility enforcement
      ],
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

  if (!task) {
    // Do NOT reveal whether it exists or not
    throw new NotFoundError("Task not found");
  }

  return task;
};

/**
 * List tasks with filters
 */
export const listTasks = async (filters = {}, currentUser) => {
  const page = Number(filters.page) || 1;
  const pageSize = Number(filters.page_size) || 20;

  const visibilityWhere = buildTaskVisibilityWhere(currentUser);

  const andConditions = [visibilityWhere];

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

  if (filters.is_billable === true) {
    andConditions.push({ charges: { some: { deleted_at: null } } });
  }

  if (filters.is_billable === false) {
    andConditions.push({ charges: { none: { deleted_at: null } } });
  }

  if (filters.billed_from_firm !== undefined) {
    andConditions.push({ billed_from_firm: filters.billed_from_firm });
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

/**
 * Bulk status update
 * NOW RETURNS GLOBAL STATUS COUNTS
 */
export const bulkUpdateTaskStatus = async (task_ids, status, currentUser) => {
  return prisma.$transaction(async (tx) => {
    const visibilityWhere = buildTaskVisibilityWhere(currentUser);

    // 🔐 Only fetch tasks user is allowed to access
    const existing = await tx.task.findMany({
      where: {
        AND: [{ id: { in: task_ids } }, visibilityWhere],
      },
      select: { id: true },
    });

    const validIds = existing.map((t) => t.id);

    // Update only allowed tasks
    const result = await tx.task.updateMany({
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

    // Tasks that exist but user is not allowed to touch OR do not exist
    const skippedIds = task_ids.filter((id) => !validIds.includes(id));

    // Status counts respecting visibility
    const globalCounts =
      currentUser.admin_role === "SUPER_ADMIN"
        ? await getStatusCounts({}, tx)
        : await getStatusCounts(visibilityWhere, tx);

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
  currentUser
) => {
  return prisma.$transaction(async (tx) => {
    const visibilityWhere = buildTaskVisibilityWhere(currentUser);

    // 🔐 Fetch only tasks user is allowed to access
    const existing = await tx.task.findMany({
      where: {
        AND: [{ id: { in: task_ids } }, visibilityWhere],
      },
      select: { id: true },
    });

    const validIds = existing.map((t) => t.id);

    // Update only allowed ones
    const result = await tx.task.updateMany({
      where: { id: { in: validIds } },
      data: {
        priority,
        updated_by: currentUser.id,
      },
    });

    // Includes both non-existent and unauthorized IDs
    const skippedIds = task_ids.filter((id) => !validIds.includes(id));

    return {
      updated_task_ids: validIds,
      skipped_task_ids: skippedIds,
      updated_count: result.count,
      new_priority: priority,
    };
  });
};
