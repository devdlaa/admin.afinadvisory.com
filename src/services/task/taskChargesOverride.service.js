import { prisma } from "@/utils/server/db";
import { NotFoundError, ForbiddenError } from "@/utils/server/errors";

import { buildUnreconciledItem } from "./reconcile.service";
import {
  applyChargeCreate,
  applyChargeUpdate,
  applyChargeDelete,
} from "./reconcile.service";

import { fetchChargesForTask } from "../shared/taskChargeslib";
import {
  createTaskChargeLib,
  deleteTaskChargeLib,
} from "../shared/taskChargeslib";

// ==================== ULTIMATE CONSOLIDATED VALIDATOR ====================

/**
 * ONE FUNCTION TO RULE THEM ALL
 * Handles: permissions, assignment, invoice locking, and not-found checks
 * Returns: task/charge data so you never need separate lookups
 */
async function ensureBillingChargeEditable(input, user) {
  if (typeof input === "string") {
    const task = await prisma.task.findUnique({
      where: { id: input },
      select: {
        id: true,
        entity_id: true,
        invoice_internal_number: true,
        invoice: { select: { status: true } },
      },
    });

    if (!task) throw new NotFoundError("Task not found");

    if (
      task.invoice_internal_number &&
      task.invoice &&
      (task.invoice.status === "ISSUED" || task.invoice.status === "PAID")
    ) {
      throw new ForbiddenError(
        "Charges are locked because invoice is issued or paid",
      );
    }

    return task;
  }

  if (input.invoice) {
    if (input.invoice.status === "ISSUED" || input.invoice.status === "PAID") {
      throw new ForbiddenError(
        "Charge is locked because invoice is issued or paid",
      );
    }
    return input;
  }

  if (input.task_id) {
    return ensureBillingChargeEditable(input.task_id, user);
  }

  return input;
}

export async function ensureUserCanManageEntityCharges(entityId, user) {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { id: true },
  });

  if (!entity) {
    throw new NotFoundError("Entity not found");
  }

  return true;
}

export const createTaskChargeOverride = async (taskId, data, currentUser) => {
  return await createTaskChargeLib(
    taskId,
    data,
    currentUser,
    ensureBillingChargeEditable,
  );
};

export const deleteTaskChargeOverride = async (id, currentUser) => {
  return await deleteTaskChargeLib(
    id,
    currentUser,
    ensureBillingChargeEditable,
  );
};

// ==================== BULK UPDATE TASK CHARGES ====================
export const bulkUpdateTaskCharges = async (taskId, updates, user) => {
  // Single call does everything: permission + assignment + invoice check
  await ensureBillingChargeEditable(taskId, user);

  await prisma.$transaction(async (tx) => {
    const chargeIds = updates.map((u) => u.id);

    const existingCharges = await tx.taskCharge.findMany({
      where: {
        id: { in: chargeIds },
        task_id: taskId,
      },
      include: {
        task: { select: { entity_id: true } },
      },
    });

    if (existingCharges.length !== updates.length) {
      throw new NotFoundError("Some charges not found for this task");
    }

    const chargeMap = new Map(existingCharges.map((c) => [c.id, c]));

    for (const { id, fields } of updates) {
      const oldCharge = chargeMap.get(id);

      const updateData = {
        ...fields,
        updated_by: user.id,
      };

      if (fields.status === "PAID") {
        updateData.paid_via_invoice_id = null;
      }

      const updatedCharge = await tx.taskCharge.update({
        where: { id },
        data: updateData,
      });

      const relevantFields = ["amount", "charge_type", "status"];
      const hasRelevantChange = relevantFields.some(
        (field) => fields[field] !== undefined,
      );

      if (hasRelevantChange) {
        await applyChargeUpdate(
          oldCharge.task.entity_id,
          oldCharge,
          updatedCharge,
          tx,
        );
      }
    }
  });

  const charges = await fetchChargesForTask(taskId);

  return {
    operation: "BULK_FIELD_UPDATE",
    task_id: taskId,
    updated_count: updates.length,
    charges,
  };
};

// ==================== BULK UPDATE BY CHARGE IDS ====================
export const bulkUpdateChargesByChargeIds = async (
  chargeIds,
  newStatus,
  user,
) => {
  let taskIds = [];
  let updatedCount = 0;

  await prisma.$transaction(async (tx) => {
    const charges = await tx.taskCharge.findMany({
      where: {
        id: { in: chargeIds },
        deleted_at: null,
      },
      include: {
        task: { select: { id: true, entity_id: true } },
      },
    });

    if (charges.length === 0) {
      return;
    }

    const toUpdate = charges.filter((c) => c.status !== newStatus);

    if (toUpdate.length === 0) {
      return;
    }

    const ids = toUpdate.map((c) => c.id);
    updatedCount = ids.length;

    await tx.taskCharge.updateMany({
      where: { id: { in: ids } },
      data: {
        status: newStatus,
        updated_by: user.id,
        paid_via_invoice_id: newStatus === "PAID" ? null : undefined,
      },
    });

    for (const charge of toUpdate) {
      const newCharge = { ...charge, status: newStatus };
      await applyChargeUpdate(charge.task.entity_id, charge, newCharge, tx);
    }

    taskIds = [...new Set(toUpdate.map((c) => c.task_id))];
  });

  const result = {};
  await Promise.all(
    taskIds.map(async (taskId) => {
      result[taskId] = await fetchChargesForTask(taskId);
    }),
  );

  return {
    operation: "TASK_BULK_STATUS_UPDATE",
    new_status: newStatus,
    updated: updatedCount,
    charge_ids: chargeIds,
    charges_by_task: result,
  };
};

// ==================== AD-HOC CHARGES (ENTITY-LEVEL) ====================

async function createSystemAdhocTask(entityId, userId, title, tx = prisma) {
  const entity = await tx.entity.findUnique({
    where: { id: entityId },
    select: { name: true },
  });

  if (!entity) {
    throw new NotFoundError("Entity not found");
  }

  const task = await tx.task.create({
    data: {
      entity_id: entityId,
      task_type: "SYSTEM_ADHOC",
      is_system: true,
      title: title || `Ad-hoc Charge – ${entity.name}`,
      description: "System-generated task for ad-hoc charge",
      status: "COMPLETED",
      priority: "NORMAL",
      is_billable: true,
      created_by: userId,
      updated_by: userId,
    },
    select: { id: true, entity_id: true },
  });

  return task;
}

export const createEntityCharge = async (entityId, data, currentUser) => {
  await ensureUserCanManageEntityCharges(entityId, currentUser);

  const item = await prisma.$transaction(async (tx) => {
    const systemTask = await createSystemAdhocTask(
      entityId,
      currentUser.id,
      data.title,
      tx,
    );

    const charge = await tx.taskCharge.create({
      data: {
        task_id: systemTask.id,
        entity_id: entityId,
        title: data.title,
        amount: data.amount.toString(),
        charge_type: data.charge_type,
        bearer: data.bearer,
        status: data.status,
        remark: data.remark ?? null,
        created_by: currentUser.id,
        updated_by: currentUser.id,
      },
    });

    await applyChargeCreate(entityId, charge, tx);

    return buildUnreconciledItem(systemTask.id, tx);
  });

  return { item };
};

export const updateEntityCharge = async (id, data, currentUser) => {
  const previous = await prisma.taskCharge.findUnique({
    where: { id },
    include: {
      task: {
        select: {
          id: true,
          entity_id: true,
          task_type: true,
          is_system: true,
        },
      },
    },
  });

  if (!previous) throw new NotFoundError("Charge not found");

  if (
    previous.task?.task_type !== "SYSTEM_ADHOC" ||
    !previous.task?.is_system
  ) {
    throw new ForbiddenError("Not an ad-hoc charge");
  }

  // ✅ Always validate via task
  await ensureBillingChargeEditable(previous.task.id, currentUser);
  await ensureUserCanManageEntityCharges(previous.task.entity_id, currentUser);

  const item = await prisma.$transaction(async (tx) => {
    if (data.title && data.title !== previous.title) {
      await tx.task.update({
        where: { id: previous.task.id },
        data: {
          title: data.title,
          updated_by: currentUser.id,
        },
      });
    }

    const updated = await tx.taskCharge.update({
      where: { id },
      data: {
        title: data.title,
        amount: data.amount,
        charge_type: data.charge_type,
        bearer: data.bearer,
        status: data.status,
        remark: data.remark ?? null,
        updated_by: currentUser.id,
      },
    });

    await applyChargeUpdate(previous.task.entity_id, previous, updated, tx);

    return buildUnreconciledItem(previous.task.id, tx);
  });

  return { item };
};

export const deleteEntityCharge = async (id, currentUser) => {
  const charge = await prisma.taskCharge.findUnique({
    where: { id },
    include: {
      task: {
        select: {
          id: true,
          entity_id: true,
          task_type: true,
          is_system: true,
          invoice: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!charge) throw new NotFoundError("Charge not found");

  if (charge.task?.task_type !== "SYSTEM_ADHOC" || !charge.task?.is_system) {
    throw new ForbiddenError("Not an ad-hoc charge");
  }

  // Single call does invoice check
  await ensureBillingChargeEditable(charge.task.id, currentUser);
  await ensureUserCanManageEntityCharges(charge.task.entity_id, currentUser);

  await prisma.$transaction(async (tx) => {
    await tx.taskCharge.delete({
      where: { id },
    });

    await applyChargeDelete(charge.task.entity_id, charge, tx);

    await tx.task.delete({
      where: { id: charge.task.id },
    });
  });

  return {
    entity_id: charge.task.entity_id,
    task_id: charge.task.id,
    deleted_charge_id: id,
  };
};
