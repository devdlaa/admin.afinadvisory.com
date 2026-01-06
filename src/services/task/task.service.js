import { prisma } from "@/utils/server/db.js";
import { NotFoundError, ValidationError } from "../../utils/server/errors.js";
import { addTaskActivityLog } from "./taskComment.service.js";

/**
 * Create a task (manual only, no compliance/cycles)
 */
export const createTask = async (data, created_by) => {
  return prisma.$transaction(async (tx) => {
    if (data.entity_id) {
      const entity = await tx.entity.findFirst({
        where: { id: data.entity_id, deleted_at: null },
      });

      if (!entity) throw new NotFoundError("Entity not found");
    }

    // validate task category if provided
    if (data.task_category_id) {
      const category = await tx.taskCategory.findFirst({
        where: { id: data.task_category_id, is_active: true },
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
        entity: true,
        category: true,
        last_activity_admin: { select: { id, name, email } },
        creator: { select: { id: true, name: true, email: true } },
        updator: { select: { id: true, name: true, email: true } },

        // NEW
        charges: true,
        checklist_items: true,
      },
    });

    return task;
  });
};

/**
 * Update a task
 */
export const updateTask = async (task_id, data, updated_by) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.task.findUnique({
      where: { id: task_id },
    });

    if (!existing) throw new NotFoundError("Task not found");

    // due date validation
    if (data.due_date && new Date(data.due_date) < new Date()) {
      throw new ValidationError("Due date cannot be in the past");
    }

    // task category validation (exists check only)
    if (data.task_category_id) {
      const category = await tx.taskCategory.findUnique({
        where: { id: data.task_category_id },
      });

      if (!category) {
        throw new NotFoundError("Task category not found");
      }
    }

    // compute field-level diffs for activity
    const activities = [];

    const addIfChanged = (field, oldVal, newVal) => {
      if (newVal !== undefined && newVal !== oldVal) {
        activities.push({
          field,
          from: oldVal,
          to: newVal,
        });
      }
    };

    addIfChanged("title", existing.title, data.title);
    addIfChanged("description", existing.description, data.description);
    addIfChanged("status", existing.status, data.status);
    addIfChanged("priority", existing.priority, data.priority);
    addIfChanged("due_date", existing.due_date?.toISOString(), data.due_date);
    addIfChanged(
      "task_category_id",
      existing.task_category_id,
      data.task_category_id
    );
    addIfChanged("is_billable", existing.is_billable, data.is_billable);
    addIfChanged(
      "invoice_number",
      existing.invoice_number,
      data.invoice_number
    );
    addIfChanged(
      "billed_from_firm",
      existing.billed_from_firm,
      data.billed_from_firm
    );

    let computedEndDate = undefined;
    if (data.status === "COMPLETED") {
      computedEndDate = new Date();
      addIfChanged(
        "end_date",
        existing.end_date?.toISOString(),
        computedEndDate.toISOString()
      );
    } else if (data.end_date) {
      computedEndDate = new Date(data.end_date);
      addIfChanged(
        "end_date",
        existing.end_date?.toISOString(),
        computedEndDate.toISOString()
      );
    }

    const updatedTask = await tx.task.update({
      where: { id: task_id },
      data: {
        title: data.title ?? undefined,
        description: data.description ?? undefined,

        status: data.status ?? undefined,
        priority: data.priority ?? undefined,

        start_date: data.start_date ? new Date(data.start_date) : undefined,

        end_date: computedEndDate,

        due_date: data.due_date ? new Date(data.due_date) : undefined,

        task_category_id: data.task_category_id ?? undefined,

        is_billable: data.is_billable ?? undefined,
        invoice_number: data.invoice_number ?? undefined,
        billed_from_firm: data.billed_from_firm ?? undefined,

        updated_by,

        last_activity_at:
          activities.length > 0 ? new Date() : existing.last_activity_at,
        last_activity_by:
          activities.length > 0 ? updated_by : existing.last_activity_by,
      },
      include: {
        entity: true,
        category: true,

        last_activity_admin: {
          select: { id: true, name: true, email: true },
        },

        creator: { select: { id: true, name: true, email: true } },
        updator: { select: { id: true, name: true, email: true } },

        charges: true,
        checklist_items: true,
      },
    });

    // write activity items into Firestore
    if (activities.length > 0) {
      await Promise.all(
        activities.map((activity) =>
          addTaskActivityLog(task_id, updated_by, activity)
        )
      );
    }

    return updatedTask;
  });
};

/**
 * Soft delete task
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

    const deletedTask = await tx.task.update({
      where: { id: task_id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by,
        status: "CANCELLED",
      },
    });

    await tx.taskAssignment.deleteMany({ where: { task_id } });

    return {
      deleted: true,
      task: {
        id: deletedTask.id,
        title: deletedTask.title,
        status: deletedTask.status,
        deleted_at: deletedTask.deleted_at,
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
      entity: true,
      category: true,

      assignments: {
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          assigner: {
            select: { id: true, name: true, email: true },
          },
        },
      },

      charges: true,
      checklist_items: true,
      last_activity_admin: { select: { id, name, email } },
      creator: { select: { id: true, name: true, email: true } },
      updator: { select: { id: true, name: true, email: true } },
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

  const where = {
    is_deleted: false,
  };

  if (filters.entity_id) where.entity_id = filters.entity_id;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.task_category_id)
    where.task_category_id = filters.task_category_id;
  if (filters.created_by) where.created_by = filters.created_by;
  if (filters.assigned_to) {
    where.assignments = { some: { admin_user_id: filters.assigned_to } };
  }
  if (filters.is_billable !== undefined)
    where.is_billable = filters.is_billable;
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

  // Single query with all relationships included
  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        due_date: true,
        is_assigned_to_all: true,
        entity: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        // Include assignments directly with ordering and limit
        assignments: {
          select: {
            assignee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { assigned_at: "asc" },
          take: 3,
        },
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  // Transform the data (no additional queries needed)
  const enriched = tasks.map((task) => {
    const { assignments, _count, ...taskData } = task;

    if (task.is_assigned_to_all) {
      return {
        ...taskData,
        assignees_preview: [],
        remaining_assignee_count: null,
      };
    }

    const assignees_preview = assignments.map((a) => a.assignee);
    const remaining_assignee_count = Math.max(
      0,
      _count.assignments - assignees_preview.length
    );

    return {
      ...taskData,
      assignees_preview,
      remaining_assignee_count,
    };
  });

  return {
    page,
    page_size: pageSize,
    total,
    total_pages: Math.ceil(total / pageSize),
    tasks: enriched,
  };
};

/**
 * Bulk status update
 */
export const bulkUpdateTaskStatus = async (task_ids, status, updated_by) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.task.findMany({
      where: {
        id: { in: task_ids },
        is_deleted: false,
      },
      select: { id: true },
    });

    const validIds = existing.map((t) => t.id);

    const result = await tx.task.updateMany({
      where: { id: { in: validIds } },
      data: {
        status,
        end_date: status === "COMPLETED" ? new Date() : undefined,
        updated_by,
        last_activity_at: new Date(),
        last_activity_by: updated_by,
      },
    });

    // 3) Calculate skipped IDs
    const skippedIds = task_ids.filter((id) => !validIds.includes(id));

    return {
      updated_task_ids: validIds,
      skipped_task_ids: skippedIds,
      updated_count: result.count,
      new_status: status,
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
    // 1) Find valid IDs
    const existing = await tx.task.findMany({
      where: {
        id: { in: task_ids },
        is_deleted: false,
      },
      select: { id: true },
    });

    const validIds = existing.map((t) => t.id);

    // 2) Update only valid ones
    const result = await tx.task.updateMany({
      where: { id: { in: validIds } },
      data: {
        priority,
        updated_by,
        last_activity_at: new Date(),
        last_activity_by: updated_by,
      },
    });

    // 3) Whatever was requested but not valid
    const skippedIds = task_ids.filter((id) => !validIds.includes(id));

    return {
      updated_task_ids: validIds,
      skipped_task_ids: skippedIds,
      updated_count: result.count,
      new_priority: priority,
    };
  });
};
