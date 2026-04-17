import { prisma } from "@/utils/server/db.js";
import { NotFoundError, ValidationError } from "../../utils/server/errors.js";
import { notify } from "../shared/notifications.service.js";
import { addTaskActivityLog } from "../shared/comments.service.js";
import { buildActivityMessage } from "@/utils/server/activityBulder.js";
const DEFAULT_SLA_DAYS = 7;

export const syncTaskAssignments = async (
  task_id,
  user_ids,
  assigned_to_all,
  updated_by,
  sla_days,
) => {
  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();

    const task = await tx.task.findUnique({
      where: { id: task_id },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    if (!task) throw new NotFoundError("Task not found");

    if (task.deleted_at) {
      throw new ValidationError(
        "Assignments cannot be modified because the task is deleted",
      );
    }

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
        last_activity_at: now,
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

    // ---------------- CURRENT ASSIGNMENTS ----------------

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

    // ---------------- REMOVE ASSIGNEES ----------------

    if (toRemove.length) {
      await tx.taskAssignment.deleteMany({
        where: { task_id, admin_user_id: { in: toRemove } },
      });
    }

    // ---------------- ADD ASSIGNEES ( SLA ENGINE) ----------------

    if (toAdd.length) {
      const assignmentsData = toAdd.map((admin_user_id) => {
        const effectiveSLADays =
          sla_days && sla_days > 0 ? sla_days : DEFAULT_SLA_DAYS;

        let slaDue = new Date(now);
        slaDue.setDate(slaDue.getDate() + effectiveSLADays);

        if (task.due_date) {
          const complianceDue = new Date(task.due_date);

          if (slaDue > complianceDue) {
            slaDue = complianceDue;
          }
        }

        return {
          task_id,
          admin_user_id,
          assigned_by: updated_by,
          assignment_source: "MANUAL",

          assigned_at: now,
          due_date: slaDue,

          sla_days: effectiveSLADays,
          sla_status: "RUNNING",
          sla_paused_at: null,
          sla_breached_at: null,
        };
      });

      await tx.taskAssignment.createMany({
        data: assignmentsData,
        skipDuplicates: true,
      });
    }

    // ---------------- FETCH UPDATED ASSIGNMENTS ----------------

    const assignments = await tx.taskAssignment.findMany({
      where: { task_id },
      orderBy: { assigned_at: "asc" },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // ---------------- CHANGE LOG ----------------

    for (const id of toAdd) {
      const user = assignments.find((a) => a.admin_user_id === id)?.assignee;

      changes.push({
        action: "ASSIGNEE_ADDED",
        from: null,
        to: user ? { id: user.id, name: user.name } : null,
      });
    }

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

  // ---------------- ACTIVITY LOG ----------------
  let ACTIVITY_LOG_ = null;
  if (result.changes.length > 0) {
    ACTIVITY_LOG_ = await addTaskActivityLog(task_id, updated_by, {
      action: "TASK_ASSIGNMENT_UPDATED",
      message: buildActivityMessage(result.changes),
      meta: { changes: result.changes },
    });
  }

  // ---------------- NOTIFICATIONS ----------------

  try {
    if (!result.assigned_to_all && result.toAdd.length > 0) {
      await notify(result.toAdd, ACTIVITY_LOG_.id, {
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
      due_date: a.due_date,
      sla_days: a.sla_days,
      sla_status: a.sla_status,
      sla_breached_at: a.sla_breached_at,
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
  const rows = await prisma.$queryRaw`
    SELECT
      u.id                                                          AS admin_user_id,
      u.name,
      u.email,

      COUNT(DISTINCT ta.task_id)                                    AS total,

      COUNT(DISTINCT CASE WHEN t.status = 'PENDING'              THEN ta.task_id END) AS pending,
      COUNT(DISTINCT CASE WHEN t.status = 'IN_PROGRESS'          THEN ta.task_id END) AS in_progress,
      COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED'            THEN ta.task_id END) AS completed,
      COUNT(DISTINCT CASE WHEN t.status = 'ON_HOLD'              THEN ta.task_id END) AS on_hold,
      COUNT(DISTINCT CASE WHEN t.status = 'PENDING_CLIENT_INPUT' THEN ta.task_id END) AS pending_client_input,
      COUNT(DISTINCT CASE WHEN t.status = 'CANCELLED'            THEN ta.task_id END) AS cancelled

    FROM "TaskAssignment" ta
    JOIN "Task"      t ON t.id = ta.task_id
    JOIN "AdminUser" u ON u.id = ta.admin_user_id

    WHERE
      t.deleted_at IS NULL
      AND t.invoice_internal_number IS NULL
      AND (
        u.admin_role != 'SUPER_ADMIN'
        OR (
          SELECT COUNT(*) FROM "TaskAssignment" ta2
          WHERE ta2.task_id = ta.task_id
        ) = 1
      )

    GROUP BY u.id, u.name, u.email
    ORDER BY total DESC
  `;

  return rows.map((row) => ({
    admin_user_id: row.admin_user_id,
    name: row.name,
    email: row.email,
    total: Number(row.total),
    pending: Number(row.pending),
    in_progress: Number(row.in_progress),
    completed: Number(row.completed),
    on_hold: Number(row.on_hold),
    pending_client_input: Number(row.pending_client_input),
    cancelled: Number(row.cancelled),
  }));
};
