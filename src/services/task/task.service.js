import { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../utils/server/errors.js";

const prisma = new PrismaClient();

/**
 * Create a manual task
 */
export const createTask = async (data, created_by) => {
  return prisma.$transaction(async (tx) => {
    // entity exists
    const entity = await tx.entity.findFirst({
      where: { id: data.entity_id, deleted_at: null },
    });

    if (!entity) {
      throw new NotFoundError("Entity not found");
    }

    // validate entity registration if provided
    if (data.entity_registration_id) {
      const reg = await tx.entityRegistration.findFirst({
        where: {
          id: data.entity_registration_id,
          entity_id: data.entity_id,
          deleted_at: null,
        },
      });

      if (!reg) {
        throw new ValidationError(
          "Entity registration does not belong to this entity or is inactive"
        );
      }
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

    // validate compliance rule if provided
    if (data.compliance_rule_id) {
      const rule = await tx.complianceRule.findFirst({
        where: { id: data.compliance_rule_id, is_active: true },
      });

      if (!rule) {
        throw new NotFoundError("Compliance rule not found or inactive");
      }
    }

    // due date sanity check
    if (data.due_date && new Date(data.due_date) < new Date()) {
      throw new ValidationError("Due date cannot be in the past");
    }

    // create task (no billing fields anymore)
    const task = await tx.task.create({
      data: {
        entity_id: data.entity_id,
        entity_registration_id: data.entity_registration_id ?? null,

        title: data.title,
        description: data.description ?? null,

        status: data.status ?? "PENDING",
        priority: data.priority ?? "LOW",

        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
        due_date: data.due_date ? new Date(data.due_date) : null,

        task_category_id: data.task_category_id ?? null,
        compliance_rule_id: data.compliance_rule_id ?? null,

        task_source: "MANUAL",

        period_start: data.period_start ? new Date(data.period_start) : null,
        period_end: data.period_end ? new Date(data.period_end) : null,

        financial_year: data.financial_year ?? null,
        period_label: data.period_label ?? null,

        is_assigned_to_all: false,

        created_by,
        updated_by: created_by,
      },
      include: {
        entity: true,
        category: true,
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    return task;
  });
};

/**
 * Update a task (non-billing)
 */
export const updateTask = async (task_id, data, updated_by) => {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: task_id },
    });

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    // validate status if provided (but allow free changes)
    if (data.status) {
      const validStatuses = [
        "PENDING",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "ON_HOLD",
        "PENDING_CLIENT_INPUT",
      ];

      if (!validStatuses.includes(data.status)) {
        throw new ValidationError("Invalid task status");
      }
    }

    // entity registration ownership validation
    if (
      data.entity_registration_id &&
      data.entity_registration_id !== task.entity_registration_id
    ) {
      const reg = await tx.entityRegistration.findFirst({
        where: {
          id: data.entity_registration_id,
          entity_id: task.entity_id,
          deleted_at: null,
        },
      });

      if (!reg) {
        throw new ValidationError(
          "Entity registration does not belong to this entity or is inactive"
        );
      }
    }

    // category validation
    if (
      data.task_category_id &&
      data.task_category_id !== task.task_category_id
    ) {
      const category = await tx.taskCategory.findFirst({
        where: { id: data.task_category_id, is_active: true },
      });

      if (!category) {
        throw new NotFoundError("Task category not found or inactive");
      }
    }

    // due date validation
    if (data.due_date && new Date(data.due_date) < new Date()) {
      throw new ValidationError("Due date cannot be in the past");
    }

    // compliance source rules (same as before)
    if (task.task_source === "COMPLIANCE") {
      if (
        data.period_start ||
        data.period_end ||
        data.period_label ||
        data.financial_year
      ) {
        throw new ValidationError(
          "Period fields of compliance tasks cannot be edited manually"
        );
      }

      if (data.compliance_rule_id) {
        throw new ValidationError(
          "Compliance rule of a compliance task cannot be changed"
        );
      }
    }

    // perform update
    const updatedTask = await tx.task.update({
      where: { id: task_id },
      data: {
        title: data.title ?? undefined,
        description: data.description ?? undefined,
        priority: data.priority ?? undefined,

        // status handled here
        status: data.status ?? undefined,

        // auto end date if newly completed
        end_date:
          data.status === "COMPLETED"
            ? new Date()
            : data.end_date
            ? new Date(data.end_date)
            : undefined,

        start_date: data.start_date ? new Date(data.start_date) : undefined,
        due_date: data.due_date ? new Date(data.due_date) : undefined,

        task_category_id: data.task_category_id ?? undefined,
        entity_registration_id: data.entity_registration_id ?? undefined,

        ...(task.task_source !== "COMPLIANCE" && {
          period_start: data.period_start
            ? new Date(data.period_start)
            : undefined,
          period_end: data.period_end ? new Date(data.period_end) : undefined,
          financial_year: data.financial_year ?? undefined,
          period_label: data.period_label ?? undefined,
        }),

        updated_by,
      },
      include: {
        entity: true,
        category: true,
        creator: { select: { id: true, name: true, email: true } },
        updator: { select: { id: true, name: true, email: true } },
      },
    });

    return updatedTask;
  });
};

/**
 * Delete a task (no invoice dependency anymore)
 */
export const deleteTask = async (task_id, deleted_by) => {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: task_id },
      include: {
        entity: true,
        category: true,
      },
    });

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    if (task.task_source === "COMPLIANCE") {
      throw new ValidationError(
        "Compliance-generated tasks cannot be deleted. Mark cancelled instead."
      );
    }

    if (task.status === "COMPLETED") {
      throw new ValidationError(
        "Completed tasks cannot be deleted. Cancel instead."
      );
    }

    if (task.is_deleted === true) {
      throw new ValidationError("Task is already deleted");
    }

    // soft delete, not hard delete
    const deletedTask = await tx.task.update({
      where: { id: task_id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by,
        status: "CANCELLED",
      },
    });

    // also cleanup dependent rows if needed (optional)
    await tx.taskAssignment.deleteMany({
      where: { task_id },
    });

    // soft delete task modules
    await tx.taskModule.updateMany({
      where: { task_id },
      data: { is_deleted: true, deleted_by },
    });

    return {
      message: "Task deleted successfully",
      deleted: true,
      task: {
        id: deletedTask.id,
        title: deletedTask.title,
        status: deletedTask.status,
        is_deleted: deletedTask.is_deleted,
        deleted_at: deletedTask.deleted_at,
        deleted_by: deleted_by,
      },
    };
  });
};

/**
 * Get task by ID
 */
export const getTaskById = async (task_id) => {
  const task = await prisma.task.findUnique({
    where: { id: task_id },
    include: {
      entity: true,
      entityRegistration: true,
      complianceRule: true,
      category: true,

      // assignments with user details
      assignments: {
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              user_code: true,
              status: true,
              phone: true,
            },
          },
          assigner: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { created_at: "asc" },
      },
      // task modules (non-deleted only)
      task_modules: {
        where: { is_deleted: false },
        include: {
          billableModule: true,
        },
        orderBy: { created_at: "asc" },
      },

      creator: { select: { id: true, name: true, email: true } },
      updator: { select: { id: true, name: true, email: true } },
      lastActor: { select: { id: true, name: true, email: true } },

      _count: {
        select: {
          assignments: true,
          task_modules: { where: { is_deleted: false } },
        },
      },
    },
  });

  if (!task) throw new NotFoundError("Task not found");

  return task;
};

/**
 * List tasks
 */
export const listTasks = async (filters = {}) => {
  // normalize pagination inputs
  const page =
    Number(filters.page) && Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize =
    Number(filters.page_size) && Number(filters.page_size) > 0
      ? Number(filters.page_size)
      : 20;

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const where = {};

  if (filters.entity_id) where.entity_id = filters.entity_id;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.task_category_id)
    where.task_category_id = filters.task_category_id;
  if (filters.compliance_rule_id)
    where.compliance_rule_id = filters.compliance_rule_id;
  if (filters.created_by) where.created_by = filters.created_by;

  if (filters.registration_type_id) {
    where.entityRegistration = {
      registration_type_id: filters.registration_type_id,
    };
  }

  if (filters.assigned_to) {
    where.assignments = { some: { admin_user_id: filters.assigned_to } };
  }

  if (filters.due_date_from || filters.due_date_to) {
    where.due_date = {};
    if (filters.due_date_from)
      where.due_date.gte = new Date(filters.due_date_from);
    if (filters.due_date_to) where.due_date.lte = new Date(filters.due_date_to);
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const orderBy = [];

  if (filters.sort_by === "due_date") {
    orderBy.push({ due_date: filters.sort_order || "asc" });
  } else if (filters.sort_by === "priority") {
    orderBy.push({ priority: filters.sort_order || "desc" });
  } else {
    orderBy.push({ created_at: "desc" });
  }

  // query rows
  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        entity: { select: { id: true, name: true, pan: true } },
        category: true,
        creator: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            assignments: true,
            task_modules: { where: { is_deleted: false } },
          },
        },
      },
      orderBy,
      skip,
      take,
    }),

    prisma.task.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    page,
    page_size: pageSize,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
    tasks,
  };
};

/**
 * Bulk status update
 */
export const bulkUpdateTaskStatus = async (task_ids, status, updated_by) => {
  return prisma.$transaction(async (tx) => {
    const validStatuses = [
      "PENDING",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "ON_HOLD",
      "PENDING_CLIENT_INPUT",
    ];

    if (!validStatuses.includes(status)) {
      throw new ValidationError("Invalid task status");
    }

    // fetch tasks first
    const tasks = await tx.task.findMany({
      where: { id: { in: task_ids } },
      select: {
        id: true,
        status: true,
        is_deleted: true,
      },
    });

    if (tasks.length === 0) {
      throw new NotFoundError("No tasks found for given IDs");
    }

    // find tasks that should NOT be touched
    const blocked = tasks.filter(
      (t) =>
        t.is_deleted === true ||
        t.status === "CANCELLED" ||
        t.status === "COMPLETED"
    );

    // ids allowed to update
    const allowedIds = tasks
      .filter((t) => !blocked.includes(t))
      .map((t) => t.id);

    // perform update only on allowed ones
    if (allowedIds.length > 0) {
      await tx.task.updateMany({
        where: { id: { in: allowedIds } },
        data: {
          status,
          end_date: status === "COMPLETED" ? new Date() : undefined,
          updated_by,
        },
      });
    }

    // reload updated tasks to return to UI
    const updatedTasks = await tx.task.findMany({
      where: { id: { in: allowedIds } },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
      },
    });

    return {
      message: "Bulk status update completed",
      summary: {
        requested: task_ids.length,
        updated: allowedIds.length,
        skipped: blocked.length,
      },
      skipped_task_ids: blocked.map((t) => t.id),
      updated_tasks: updatedTasks,
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
    // fetch tasks first
    const tasks = await tx.task.findMany({
      where: { id: { in: task_ids } },
      select: {
        id: true,
        status: true,
        is_deleted: true,
      },
    });

    if (tasks.length === 0) {
      throw new NotFoundError("No tasks found for given IDs");
    }

    const blocked = tasks.filter(
      (t) =>
        t.is_deleted === true ||
        t.status === "CANCELLED" ||
        t.status === "COMPLETED"
    );

    const allowed = tasks.filter((t) => !blocked.includes(t)).map((t) => t.id);

    // update allowed tasks
    if (allowed.length > 0) {
      await tx.task.updateMany({
        where: { id: { in: allowed } },
        data: {
          priority,
          updated_by,
        },
      });
    }

    // reload updated tasks for UI state sync
    const updatedTasks = await tx.task.findMany({
      where: { id: { in: allowed } },
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
      },
    });

    return {
      message: "Bulk priority update completed",
      summary: {
        requested: task_ids.length,
        updated: allowed.length,
        skipped: blocked.length,
      },
      skipped_task_ids: blocked.map((t) => t.id),
      updated_tasks: updatedTasks,
    };
  });
};

export {
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskById,
  listTasks,
};
