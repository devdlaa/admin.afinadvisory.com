import { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "../../utils/server/errors.js";

const prisma = new PrismaClient();

export const syncTaskAssignments = async (
  task_id,
  user_ids,
  assigned_to_all,
  updated_by
) => {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: task_id },
    });

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    // update task flags
    await tx.task.update({
      where: { id: task_id },
      data: {
        is_assigned_to_all: assigned_to_all ?? false,
        updated_by,
        last_activity_at: new Date(),
        last_activity_by: updated_by,
        has_activity: true,
      },
    });

    // if assigned to all -> clear assignments and return immediately
    if (assigned_to_all === true) {
      await tx.taskAssignment.deleteMany({
        where: { task_id },
      });

      return {
        message: "Task set to assigned-to-all",
        assigned_to_all: true,
        assignments: [],
      };
    }

    // fetch current assignees
    const current = await tx.taskAssignment.findMany({
      where: { task_id },
      select: { admin_user_id: true },
    });

    const currentIds = current.map((a) => a.admin_user_id);

    const newSet = new Set(user_ids);
    const oldSet = new Set(currentIds);

    const toAdd = [...newSet].filter((id) => !oldSet.has(id));
    const toRemove = [...oldSet].filter((id) => !newSet.has(id));

    // delete removed users
    if (toRemove.length > 0) {
      await tx.taskAssignment.deleteMany({
        where: {
          task_id,
          admin_user_id: { in: toRemove },
        },
      });
    }

    // add new users
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

    // reload final assignments with user + assigned_by details
    const assignments = await tx.taskAssignment.findMany({
      where: { task_id },
      orderBy: { created_at: "asc" },
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
    });

    return {
      message: "Assignments synced successfully",
      assigned_to_all: false,
      assignments: assignments.map((a) => ({
        user: a.assignee,
        assigned_by: a.assigner,
      })),
    };
  });
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
  updated_by
) => {
  return prisma.$transaction(async (tx) => {
    const tasks = await tx.task.findMany({
      where: {
        id: { in: task_ids },
      },
      select: {
        id: true,
        is_assigned_to_all: true,
      },
    });

    if (tasks.length === 0) {
      throw new NotFoundError("No tasks found for given IDs");
    }

    // find tasks that already have assignments
    const assigned = await tx.taskAssignment.findMany({
      where: {
        task_id: { in: task_ids },
      },
      select: { task_id: true },
    });

    const alreadyAssignedTaskIds = new Set(assigned.map((a) => a.task_id));

    const eligibleTaskIds = tasks
      .filter(
        (t) =>
          t.is_assigned_to_all === true || !alreadyAssignedTaskIds.has(t.id)
      )
      .map((t) => t.id);

    const skippedTaskIds = task_ids.filter(
      (id) => !eligibleTaskIds.includes(id)
    );

    // bulk assign eligible
    for (const taskId of eligibleTaskIds) {
      await syncTaskAssignments(taskId, user_ids, false, updated_by);
    }

    return {
      updated_task_ids: eligibleTaskIds,
      skipped_task_ids: skippedTaskIds,
      message: "Bulk assignment completed with safe rules",
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
      assigner: {
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

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return rows.map((r) => ({
    admin_user_id: r.admin_user_id,
    name: userMap[r.admin_user_id]?.name ?? "Unknown",
    email: userMap[r.admin_user_id]?.email ?? null,
    assignment_count: r._count.admin_user_id,
  }));
};
