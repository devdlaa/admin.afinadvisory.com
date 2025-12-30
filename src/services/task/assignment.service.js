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
  assigned_by
) => {
  return prisma.$transaction(async (tx) => {
    // 1) fetch tasks
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

    // 2) find tasks that already have assignments
    const existingAssignments = await tx.taskAssignment.findMany({
      where: {
        task_id: { in: task_ids },
      },
      select: { task_id: true },
    });

    const alreadyAssigned = new Set(existingAssignments.map((a) => a.task_id));

    // 3) determine eligibility
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

    // 4) hard sync in bulk
    // delete existing assignments for eligible tasks (if any)
    await tx.taskAssignment.deleteMany({
      where: {
        task_id: { in: eligibleTaskIds },
      },
    });

    const now = new Date();

    // 5) create cartesian pairs
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

  const map = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => ({
    admin_user_id: r.admin_user_id,
    name: map.get(r.admin_user_id)?.name ?? "Unknown",
    email: map.get(r.admin_user_id)?.email ?? null,
    assignment_count: r._count.admin_user_id,
  }));
};
