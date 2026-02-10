import { prisma } from "@/utils/server/db.js";
import { NotFoundError, ValidationError } from "../../utils/server/errors.js";
import { notify } from "../shared/notifications.service.js";
import { addTaskActivityLog } from "./taskComment.service.js";
import { buildActivityMessage } from "@/utils/server/activityBulder.js";
export const syncTaskAssignments = async (
  task_id,
  user_ids,
  assigned_to_all,
  updated_by,
) => {
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: task_id },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    if (!task) throw new NotFoundError("Task not found");

    // ---------------- VALIDATIONS ----------------

    if (
      assigned_to_all === true &&
      Array.isArray(user_ids) &&
      user_ids.length
    ) {
      throw new ValidationError(
        "Cannot provide specific assignees when assigned_to_all is true",
      );
    }

    if (assigned_to_all !== true) {
      if (!Array.isArray(user_ids)) {
        throw new ValidationError("user_ids must be provided");
      }

      user_ids = [...new Set(user_ids)];

      if (user_ids.length === 0) {
        throw new ValidationError("At least one user must be assigned");
      }

      if (user_ids.length > 5) {
        throw new ValidationError("Maximum 5 assignees allowed");
      }
    }

    // ---------------- UPDATE TASK FLAGS ----------------

    await tx.task.update({
      where: { id: task_id },
      data: {
        assigned_to_all: assigned_to_all === true,
        updated_by,
        last_activity_at: new Date(),
        last_activity_by: updated_by,
      },
    });

    const changes = [];

    // ---------------- ASSIGNED TO ALL ----------------

    if (assigned_to_all === true) {
      await tx.taskAssignment.deleteMany({ where: { task_id } });

      changes.push({
        action: "ASSIGNED_TO_ALL",
        from: false,
        to: true,
      });

      return {
        assigned_to_all: true,
        toAdd: [],
        task,
        assignments: [],
        changes,
      };
    }

    // ---------------- SPECIFIC ASSIGNMENTS ----------------

    const current = await tx.taskAssignment.findMany({
      where: { task_id },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    const currentIds = current.map((a) => a.admin_user_id);

    const newSet = new Set(user_ids);
    const oldSet = new Set(currentIds);

    const toAdd = [...newSet].filter((id) => !oldSet.has(id));
    const toRemove = [...oldSet].filter((id) => !newSet.has(id));

    if (toRemove.length) {
      await tx.taskAssignment.deleteMany({
        where: { task_id, admin_user_id: { in: toRemove } },
      });
    }

    if (toAdd.length) {
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

    const assignments = await tx.taskAssignment.findMany({
      where: { task_id },
      orderBy: { assigned_at: "asc" },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // additions
    for (const id of toAdd) {
      const user = assignments.find((a) => a.admin_user_id === id)?.assignee;
      changes.push({
        action: "ASSIGNEE_ADDED",
        from: null,
        to: user ? { id: user.id, name: user.name } : null,
      });
    }

    // removals
    for (const id of toRemove) {
      const old = current.find((a) => a.admin_user_id === id);
      changes.push({
        action: "ASSIGNEE_REMOVED",
        from: old?.assignee
          ? { id: old.assignee.id, name: old.assignee.name }
          : null,
        to: null,
      });
    }

    return {
      assigned_to_all: false,
      toAdd,
      task,
      assignments,
      changes,
    };
  });

  // ---------------- NOTIFICATIONS ----------------

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
        link: `/dashboard/task-managment?taskId=${result.task.id}`,
      });
    }
  } catch (err) {
    console.error("Assignment notification failed:", err);
  }

  // ---------------- ACTIVITY LOG ----------------

  if (result.changes.length > 0) {
    await addTaskActivityLog(task_id, updated_by, {
      action: "TASK_UPDATED",
      message: buildActivityMessage(result.changes),
      meta: { changes: result.changes },
    });
  }

  // ---------------- RESPONSE ----------------

  return {
    task_id,
    assigned_to_all: result.assigned_to_all,
    assignments: result.assignments.map((a) => ({
      id: a.id,
      task_id: a.task_id,
      admin_user_id: a.admin_user_id,
      assigned_at: a.assigned_at,
      assigned_by: a.assigned_by,
      assignment_source: a.assignment_source,
      assignee: a.assignee,
    })),
  };
};

/**
 * NEW: Safe bulk assignment
 * Only affects:
 *  - tasks with NO assignees
 *  - tasks with assigned_to_all = true
 */

export const bulkAssignUnownedTasks = async (
  task_ids,
  user_ids,
  assigned_by,
) => {
  return prisma.$transaction(async (tx) => {
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      throw new ValidationError("At least one user must be provided");
    }

    user_ids = [...new Set(user_ids)];

    if (user_ids.length > 5) {
      throw new ValidationError(
        "A maximum of 5 assignees is allowed per task in bulk assignment",
      );
    }

    const tasks = await tx.task.findMany({
      where: { id: { in: task_ids } },
      select: { id: true, title: true, assigned_to_all: true },
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
      .filter((t) => t.assigned_to_all === true || !alreadyAssigned.has(t.id))
      .map((t) => t.id);

    const skippedTaskIds = task_ids.filter(
      (id) => !eligibleTaskIds.includes(id),
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
        assigned_to_all: false,
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
        })),
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
/**
 * Reporting - Get assignment counts per user with status breakdown
 */
export const getAssignmentCountsPerUser = async () => {
  // Get all assignments with task status
  const assignments = await prisma.taskAssignment.findMany({
    select: {
      admin_user_id: true,
      task: {
        select: {
          status: true,
        },
      },
    },
  });

  // Group by user and count statuses
  const userStatsMap = new Map();

  assignments.forEach((assignment) => {
    const userId = assignment.admin_user_id;
    const status = assignment.task.status;

    if (!userStatsMap.has(userId)) {
      userStatsMap.set(userId, {
        admin_user_id: userId,
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        on_hold: 0,
        pending_client_input: 0,
        cancelled: 0,
      });
    }

    const stats = userStatsMap.get(userId);
    stats.total++;

    // Count by status
    switch (status) {
      case "PENDING":
        stats.pending++;
        break;
      case "IN_PROGRESS":
        stats.in_progress++;
        break;
      case "COMPLETED":
        stats.completed++;
        break;
      case "ON_HOLD":
        stats.on_hold++;
        break;

      case "PENDING_CLIENT_INPUT":
        stats.pending_client_input++;
        break;
      case "CANCELLED":
        stats.cancelled++;
        break;
    }
  });

  // Get user details
  const userIds = Array.from(userStatsMap.keys());

  const users = await prisma.adminUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  // Combine stats with user details
  return Array.from(userStatsMap.values()).map((stats) => ({
    admin_user_id: stats.admin_user_id,
    name: userMap.get(stats.admin_user_id)?.name ?? "Unknown",
    email: userMap.get(stats.admin_user_id)?.email ?? null,
    total: stats.total,
    pending: stats.pending,
    in_progress: stats.in_progress,
    completed: stats.completed,
    pending_client_input: stats.pending_client_input,
    on_hold: stats.on_hold,
    cancelled: stats.cancelled,
  }));
};
