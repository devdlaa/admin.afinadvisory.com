import { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "../../utils/server/errors.js";

const prisma = new PrismaClient();

/**
 * Sync task modules to exactly the provided billable_module_ids
 * - purely informational attachments
 * - no pricing, invoices, GST or quantities
 */
export const syncTaskModules = async (
  task_id,
  billable_module_ids,
  admin_id
) => {
  if (!Array.isArray(billable_module_ids)) {
    throw new ValidationError("billable_module_ids must be an array");
  }

  // remove duplicates
  billable_module_ids = [...new Set(billable_module_ids)];

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: task_id },
    });

    if (!task) throw new NotFoundError("Task not found");

    // existing active modules
    const existingModules = await tx.taskModule.findMany({
      where: { task_id, is_deleted: false },
      select: { id: true, billable_module_id: true },
    });

    const existingIds = existingModules.map((m) => m.billable_module_id);

    // diff
    const toAdd = billable_module_ids.filter((id) => !existingIds.includes(id));
    const toRemove = existingModules.filter(
      (m) => !billable_module_ids.includes(m.billable_module_id)
    );

    // soft delete removed ones
    if (toRemove.length > 0) {
      await tx.taskModule.updateMany({
        where: { id: { in: toRemove.map((m) => m.id) } },
        data: {
          is_deleted: true,
          deleted_by: admin_id,
        },
      });
    }

    // add new ones
    if (toAdd.length > 0) {
      const serviceModules = await tx.billableModule.findMany({
        where: {
          id: { in: toAdd },
          is_active: true,
          is_deleted: false,
        },
      });

      if (serviceModules.length !== toAdd.length) {
        throw new ValidationError("One or more service modules are invalid");
      }

      await tx.taskModule.createMany({
        data: serviceModules.map((m) => ({
          task_id,
          billable_module_id: m.id,
          name: m.name,
          remark: null,
          created_by: admin_id,
        })),
      });
    }

    // final list
    const modules = await tx.taskModule.findMany({
      where: { task_id, is_deleted: false },
      include: { billableModule: true },
      orderBy: { created_at: "asc" },
    });

    return {
      added: toAdd,
      removed: toRemove.map((m) => m.billable_module_id),
      modules,
    };
  });
};

/**
 * Update simple metadata on a task module
 * No financial data exists anymore
 */
export const updateTaskModule = async (task_module_id, data, admin_id) => {
  // 1) verify module belongs to same task and is active
  const existing = await prisma.taskModule.findFirst({
    where: {
      id: task_module_id,
      task_id: data.task_id, 
      is_deleted: false,
    },
  });

  if (!existing) {
    throw new NotFoundError("Task module not found for this task");
  }

  // 2) perform update but again scoped by both ids
  const result = await prisma.taskModule.updateMany({
    where: {
      id: task_module_id,
      task_id: data.task_id,
      is_deleted: false,
    },
    data: {
      name: data.name ?? undefined,
      remark: data.remark ?? undefined,
      updated_by: admin_id,
    },
  });

  // 3) updateMany returns count, so refetch if needed
  if (result.count === 0) {
    throw new NotFoundError("Task module update failed");
  }

  // 4) return fresh record
  return prisma.taskModule.findUnique({
    where: { id: task_module_id },
  });
};

/**
 * List active modules for a task
 */
export const listTaskModules = async (task_id) => {
  return prisma.taskModule.findMany({
    where: {
      task_id,
      is_deleted: false,
    },
    include: {
      billableModule: true,
    },
    orderBy: { created_at: "asc" },
  });
};
