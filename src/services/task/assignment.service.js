import { prisma } from "@/utils/server/db.js";
import { NotFoundError, ValidationError } from "../../utils/server/errors.js";
import { notify } from "../shared/notifications.service.js";
export const syncTaskAssignments = async (
  task_id,
  user_ids,
  assigned_to_all,
  updated_by
) => {
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: task_id },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    if (!task) throw new NotFoundError("Task not found");

    // ------------------------------ VALIDATIONS ------------------------------

    if (
      assigned_to_all === true &&
      Array.isArray(user_ids) &&
      user_ids.length > 0
    ) {
      throw new ValidationError(
        "Cannot provide specific assignees when assigned_to_all is true"
      );
    }

    if (assigned_to_all !== true) {
      if (!Array.isArray(user_ids)) {
        throw new ValidationError(
          "user_ids must be provided when not assigned to all"
        );
      }

      user_ids = [...new Set(user_ids)];

      if (user_ids.length === 0) {
        throw new ValidationError(
          "At least one user must be assigned when not assigned to all"
        );
      }

      if (user_ids.length > 5) {
        throw new ValidationError(
          "A maximum of 5 assignees is allowed per task"
        );
      }
    }

    // ------------------------------ UPDATE TASK FLAGS ------------------------------

    await tx.task.update({
      where: { id: task_id },
      data: {
        is_assigned_to_all: assigned_to_all === true,
        updated_by,
        last_activity_at: new Date(),
        last_activity_by: updated_by,
      },
    });

    // ------------------------------ ASSIGNED TO ALL CASE ------------------------------

    if (assigned_to_all === true) {
      await tx.taskAssignment.deleteMany({ where: { task_id } });

      const assignments = []; // none in this mode

      return {
        assigned_to_all: true,
        toAdd: [],
        task,
        assignments,
      };
    }

    // ------------------------------ SYNC SPECIFIC ASSIGNEES ------------------------------

    const current = await tx.taskAssignment.findMany({
      where: { task_id },
      select: { admin_user_id: true },
    });

    const currentIds = current.map((a) => a.admin_user_id);

    const newSet = new Set(user_ids);
    const oldSet = new Set(currentIds);

    const toAdd = [...newSet].filter((id) => !oldSet.has(id));
    const toRemove = [...oldSet].filter((id) => !newSet.has(id));

    if (toRemove.length > 0) {
      await tx.taskAssignment.deleteMany({
        where: { task_id, admin_user_id: { in: toRemove } },
      });
    }

    if (toAdd.length > 0) {
      await tx.taskAssignment.createMany({
        data: toAdd.map((admin_user_id) => ({
          task_id,
          admin_user_id,
          assigned_by: updated_by,
          assignment_source: "MANUAL",
        })),
        skipDuplicates: true,
      });
    }

    // ------------------------------ HYDRATED ASSIGNMENT LIST RETURN ------------------------------

    const assignments = await tx.taskAssignment.findMany({
      where: { task_id },
      orderBy: { assigned_at: "asc" },
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
      },
    });

    return {
      assigned_to_all: false,
      toAdd,
      task,
      assignments,
    };
  });

  // ------------------------------ POST-COMMIT NOTIFICATIONS ------------------------------

  try {
    if (!result.assigned_to_all && result.toAdd.length > 0) {
      await notify(result.toAdd, {
        type: "TASK_ASSIGNED",
        title: "You were assigned a task",
        body: `Task: ${result.task.title}`,
        task_id: result.task.id,
        entity_id: result.task.entity_id ?? "",
        actor_id: result.task.updated_by,
        actor_name: result.task.creator?.name ?? null,
        link: `/dashboard/task-managment/tasks/${result.task.id}`,
      });
    }
  } catch (err) {
    console.error("Assignment notification failed:", err);
  }

  // ------------------------------ FINAL API RESPONSE ------------------------------

  return {
    task_id: task_id,
    message: "Assignments synced successfully",
    assigned_to_all: result.assigned_to_all,
    assignments: result.assignments.map((a) => ({
      user: a.assignee,
      assigned_by: a.assigner,
    })),
  };
};

/**
 * NEW: Safe bulk assignment
 * Only affects:
 *  - tasks with NO assignees
 *  - tasks with is_assigned_to_all = true
 */

export const bulkAssignUnownedTasks = async (
  task_ids,
  user_ids,
  assigned_by
) => {
  return prisma.$transaction(async (tx) => {
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      throw new ValidationError("At least one user must be provided");
    }

    user_ids = [...new Set(user_ids)];

    if (user_ids.length > 5) {
      throw new ValidationError(
        "A maximum of 5 assignees is allowed per task in bulk assignment"
      );
    }

    const tasks = await tx.task.findMany({
      where: { id: { in: task_ids } },
      select: { id: true, title: true, is_assigned_to_all: true },
    });

    if (tasks.length === 0) {
      throw new NotFoundError("No tasks found for given IDs");
    }

    const existingAssignments = await tx.taskAssignment.findMany({
      where: { task_id: { in: task_ids } },
      select: { task_id: true },
    });

    const alreadyAssigned = new Set(existingAssignments.map((a) => a.task_id));

    const eligibleTaskIds = tasks
      .filter(
        (t) => t.is_assigned_to_all === true || !alreadyAssigned.has(t.id)
      )
      .map((t) => t.id);

    const skippedTaskIds = task_ids.filter(
      (id) => !eligibleTaskIds.includes(id)
    );

    if (eligibleTaskIds.length === 0) {
      return {
        updated_task_ids: [],
        skipped_task_ids: skippedTaskIds,
        message: "No eligible tasks for assignment",
      };
    }

    await tx.taskAssignment.deleteMany({
      where: { task_id: { in: eligibleTaskIds } },
    });

    const now = new Date();

    await tx.task.updateMany({
      where: { id: { in: eligibleTaskIds } },
      data: {
        is_assigned_to_all: false,
        updated_by: assigned_by,
        last_activity_at: now,
        last_activity_by: assigned_by,
      },
    });

    await tx.taskAssignment.createMany({
      data: eligibleTaskIds.flatMap((task_id) =>
        user_ids.map((admin_user_id) => ({
          task_id,
          admin_user_id,
          assigned_by,
          assigned_at: now,
          assignment_source: "BULK_ASSIGNMENT",
        }))
      ),
      skipDuplicates: true,
    });

    // ------------------------------
    // PUSH NOTIFICATIONS TO USERS
    // ------------------------------
    await notifyMany(user_ids, {
      type: "TASK_ASSIGNED_BULK",
      task_ids: eligibleTaskIds,
      count: eligibleTaskIds.length,
      title: "You were assigned new tasks",
      body:
        eligibleTaskIds.length === 1
          ? "A new task has been assigned to you."
          : `${eligibleTaskIds.length} new tasks have been assigned to you.`,
    });

    return {
      updated_task_ids: eligibleTaskIds,
      skipped_task_ids: skippedTaskIds,
      message: "Bulk assignment completed",
    };
  });
};

/**
 * Get all assignments for a task
 */
export const getAssignmentsByTaskId = async (task_id) => {
  return prisma.taskAssignment.findMany({
    where: { task_id },
    include: {
      assignee: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { created_at: "asc" },
  });
};

/**
 * Reporting
 */
export const getAssignmentCountsPerUser = async () => {
  const rows = await prisma.taskAssignment.groupBy({
    by: ["admin_user_id"],
    _count: { admin_user_id: true },
  });

  const userIds = rows.map((r) => r.admin_user_id);

  const users = await prisma.adminUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });

  const map = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => ({
    admin_user_id: r.admin_user_id,
    name: map.get(r.admin_user_id)?.name ?? "Unknown",
    email: map.get(r.admin_user_id)?.email ?? null,
    assignment_count: r._count.admin_user_id,
  }));
};
