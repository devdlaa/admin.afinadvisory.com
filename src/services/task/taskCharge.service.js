import { prisma } from "@/utils/server/db";
import { NotFoundError, ForbiddenError } from "@/utils/server/errors";

import {
  createTaskChargeLib,
  deleteTaskChargeLib,
  hardDeleteTaskChargeLib,
  restoreTaskChargeLib,
  updateTaskChargeLib,
} from "../shared/taskChargeslib";

// ==================== ULTIMATE CONSOLIDATED VALIDATOR ====================

/**
 * ONE FUNCTION TO RULE THEM ALL
 * Handles: permissions, assignment, invoice locking, and not-found checks
 * Returns: task/charge data so you never need separate lookups
 */
async function ensureChargeEditable(input, user) {
  // Case 1: TaskId string - full validation (permission + assignment + invoice)
  if (typeof input === "string") {
    const taskId = input;

    // Super admin bypass (but still check invoice lock)
    if (user.admin_role === "SUPER_ADMIN") {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          entity_id: true,
          invoice_internal_number: true,
        },
      });

      if (!task) throw new NotFoundError("Task not found");

      if (task.invoice_internal_number) {
        throw new ForbiddenError(
          "Charges are locked because task is part of  invoice",
        );
      }

      return task;
    }

    // Regular user - check permissions + assignment + invoice
    if (!user.permissions?.includes("tasks.charge.manage")) {
      throw new ForbiddenError("Missing permission: tasks.charge.manage");
    }

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { is_system: true },
          { assigned_to_all: true },
          { assignments: { some: { admin_user_id: user.id } } },
        ],
      },
      select: {
        id: true,
        entity_id: true,
        invoice_internal_number: true,
      },
    });

    if (!task) {
      throw new ForbiddenError("You are not assigned to this task");
    }

    if (task.invoice_internal_number) {
      throw new ForbiddenError(
        "Charges are locked because task is part of an invoice",
      );
    }

    return task;
  }

  return input;
}

// ==================== KEEP FOR READ-ONLY OPERATIONS ====================

export async function ensureUserCanViewCharges(taskId, user) {
  // 1️⃣ Super admin bypass
  if (user.admin_role === "SUPER_ADMIN") {
    return true;
  }

  // 2️⃣ Fetch task with assignment info
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
    },
    select: {
      id: true,
      assigned_to_all: true,
      assignments: {
        where: { admin_user_id: user.id },
        select: { id: true },
      },
    },
  });

  if (!task) {
    throw new NotFoundError("Task not found");
  }

  // 3️⃣ Assigned to all → view allowed
  if (task.assigned_to_all) {
    return true;
  }

  // 4️⃣ Not assigned to all → must be assigned AND have permission
  const isAssigned = task.assignments.length > 0;
  const hasPermission = user.permissions?.includes("tasks.charge.manage");

  if (isAssigned && hasPermission) {
    return true;
  }

  // 5️⃣ Everything else is forbidden
  throw new ForbiddenError("You are not allowed to view charges for this task");
}

// ==================== CREATE CHARGE ====================
export const createTaskCharge = async (taskId, data, currentUser) => {
  return await createTaskChargeLib(
    taskId,
    data,
    currentUser,
    ensureChargeEditable,
  );
};

// ==================== UPDATE CHARGE ====================
export const updateTaskCharge = async (id, data, currentUser) => {
  return await updateTaskChargeLib(id, data, currentUser, ensureChargeEditable);
};

// ==================== DELETE CHARGE ====================
export const deleteTaskCharge = async (id, currentUser) => {
  return await deleteTaskChargeLib(id, currentUser, ensureChargeEditable);
};

// ==================== RESTORE CHARGE ====================
export const restoreTaskCharge = async (id, user) => {
  return await restoreTaskChargeLib(id, user, ensureChargeEditable);
};

// ==================== HARD DELETE CHARGE ====================
export const hardDeleteTaskCharge = async (id, user) => {
  return await hardDeleteTaskChargeLib(id, user, ensureChargeEditable);
};
