import { prisma } from "@/utils/server/db";
import { NotFoundError, ForbiddenError } from "@/utils/server/errors";

import { addTaskActivityLog } from "../task/taskComment.service";
import { buildActivityMessage } from "@/utils/server/activityBulder";

import {
  applyChargeCreate,
  applyChargeUpdate,
  applyChargeDelete,
  applyChargeRestore,
} from "../task/reconcile.service";

// Fetch charge with task entity_id included
const getChargeWithId = async (chargeId) => {
  return prisma.taskCharge.findUnique({
    where: { id: chargeId },
    include: {
      task: {
        select: { entity_id: true },
      },
    },
  });
};

// List charges for reuse
export const fetchChargesForTask = async (taskId, compact = false) => {
  const res = await prisma.taskCharge.findMany({
    where: {
      task_id: taskId,
      deleted_at: null,
    },
    orderBy: { created_at: "asc" },

    ...(compact
      ? {}
      : {
          include: {
            creator: {
              select: { id: true, name: true, email: true },
            },
            updater: {
              select: { id: true, name: true, email: true },
            },
            deleter: {
              select: { id: true, name: true, email: true },
            },
            restorer: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
  });

  return res;
};

// ==================== CREATE CHARGE ====================
export const createTaskChargeLib = async (
  taskId,
  data,
  currentUser,
  chargesModifyValidationCheck,
) => {
  // Single call does everything: permission + assignment + invoice check
  await chargesModifyValidationCheck(taskId, currentUser);

  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { id: true, entity_id: true, is_billable: true },
    });

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    if (!task?.entity_id) {
      throw new NotFoundError("Client Not Found Linked to this task");
    }

    const charge = await tx.taskCharge.create({
      data: {
        task_id: taskId,
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

    if (!task.is_billable) {
      await tx.task.update({
        where: { id: taskId },
        data: { is_billable: true },
      });
    }

    await applyChargeCreate(task.entity_id, charge, tx);

    return { charge, taskId };
  });

  const changes = [
    {
      action: "CHARGE_CREATED",
      from: null,
      to: {
        title: result.charge.title,
        amount: result.charge.amount.toString(),
        charge_type: result.charge.charge_type,
        bearer: result.charge.bearer,
        status: result.charge.status,
        remark: result.charge.remark,
      },
    },
  ];

  await addTaskActivityLog(taskId, currentUser.id, {
    action: "TASK_UPDATED",
    message: buildActivityMessage(changes),
    meta: { changes },
  }).catch((err) => console.error("Activity log failed:", err));

  const charges = await fetchChargesForTask(taskId);

  return { task_id: taskId, charges };
};

// ==================== UPDATE CHARGE ====================
export const updateTaskChargeLib = async (
  id,
  data,
  currentUser,
  chargesModifyValidationCheck,
) => {
  const previous = await getChargeWithId(id);
  if (!previous) throw new NotFoundError("Charge not found");

  // Single call does everything: permission + assignment + invoice check
  await chargesModifyValidationCheck(previous.task_id, currentUser);

  const result = await prisma.$transaction(async (tx) => {
    const updateData = {
      ...data,
      updated_by: currentUser.id,
    };

    if (data.status === "PAID") {
      updateData.paid_via_invoice_id = null;
    }

    const updated = await tx.taskCharge.update({
      where: { id },
      data: updateData,
    });

    await applyChargeUpdate(previous.task.entity_id, previous, updated, tx);

    return { updated, taskId: previous.task_id };
  });

  const from = {};
  const to = {};

  const fields = [
    "title",
    "amount",
    "charge_type",
    "bearer",
    "status",
    "remark",
  ];

  for (const field of fields) {
    if (data[field] !== undefined && data[field] !== previous[field]) {
      from[field] = previous[field];
      to[field] = result.updated[field];
    }
  }

  if (Object.keys(from).length > 0) {
    const titleChanged = "title" in from;

    if (!titleChanged) {
      from.title = previous.title;
      to.title = data.title ?? previous.title;
    }

    const changes = [
      {
        action: "CHARGE_UPDATED",
        from,
        to,
      },
    ];

    await addTaskActivityLog(previous.task_id, currentUser.id, {
      action: "TASK_UPDATED",
      message: buildActivityMessage(changes),
      meta: { changes },
    }).catch((err) => console.error("Activity log failed:", err));
  }

  const charges = await fetchChargesForTask(previous.task_id);

  return {
    task_id: previous.task_id,
    charges,
  };
};

// ==================== DELETE CHARGE ====================
export const deleteTaskChargeLib = async (
  id,
  currentUser,
  chargesModifyValidationCheck,
) => {
  const charge = await getChargeWithId(id);
  if (!charge) throw new NotFoundError("Charge not found");

  // Single call does everything: permission + assignment + invoice check
  await chargesModifyValidationCheck(charge.task_id, currentUser);

  await prisma.$transaction(async (tx) => {
    await tx.taskCharge.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: currentUser.id,
      },
    });

    await applyChargeDelete(charge.task.entity_id, charge, tx);
  });

  const changes = [
    {
      action: "CHARGE_DELETED",
      from: {
        title: charge.title,
        amount: charge.amount.toString(),
        charge_type: charge.charge_type,
        bearer: charge.bearer,
        status: charge.status,
        remark: charge.remark,
      },
      to: null,
    },
  ];

  await addTaskActivityLog(charge.task_id, currentUser.id, {
    action: "TASK_UPDATED",
    message: buildActivityMessage(changes),
    meta: { changes },
  }).catch((err) => console.error("Activity log failed:", err));

  const charges = await fetchChargesForTask(charge.task_id);

  return { task_id: charge.task_id, charges };
};

// ==================== FETCH DELETED CHARGES ====================
export const fetchDeletedTaskChargesLib = async (taskId) => {
  const deleted_charges = await prisma.taskCharge.findMany({
    where: {
      task_id: taskId,
      deleted_at: { not: null },
    },
    orderBy: { deleted_at: "desc" },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      updater: { select: { id: true, name: true, email: true } },
      deleter: { select: { id: true, name: true, email: true } },
      restorer: { select: { id: true, name: true, email: true } },
    },
  });

  return {
    task_id: taskId,
    deleted_charges,
  };
};

// ==================== RESTORE CHARGE ====================
export const restoreTaskChargeLib = async (
  id,
  user,
  chargesModifyValidationCheck,
) => {
  const charge = await getChargeWithId(id);
  if (!charge) throw new NotFoundError("Charge not found");

  // Single call does everything: permission + assignment + invoice check
  await chargesModifyValidationCheck(charge.task_id, user);

  await prisma.$transaction(async (tx) => {
    await tx.taskCharge.update({
      where: { id },
      data: {
        restored_by: user.id,
        deleted_at: null,
        deleted_by: null,
        updated_by: user.id,
      },
    });

    await applyChargeRestore(charge.task.entity_id, charge, tx);
  });

  const changes = [
    {
      action: "CHARGE_RESTORED",
      from: null,
      to: {
        title: charge.title,
        amount: charge.amount.toString(),
        charge_type: charge.charge_type,
        bearer: charge.bearer,
        status: charge.status,
        remark: charge.remark,
      },
    },
  ];

  await addTaskActivityLog(charge.task_id, user.id, {
    action: "TASK_UPDATED",
    message: buildActivityMessage(changes),
    meta: { changes },
  }).catch((err) => console.error("Activity log failed:", err));

  const [charges, deleted_charges] = await Promise.all([
    fetchChargesForTask(charge.task_id),
    prisma.taskCharge.findMany({
      where: {
        task_id: charge.task_id,
        deleted_at: { not: null },
      },
      orderBy: { deleted_at: "desc" },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        updater: { select: { id: true, name: true, email: true } },
        deleter: { select: { id: true, name: true, email: true } },
        restorer: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    task_id: charge.task_id,
    charges,
    deleted_charges,
  };
};

// ==================== HARD DELETE CHARGE ====================
export const hardDeleteTaskChargeLib = async (
  id,
  user,
  chargesModifyValidationCheck,
) => {
  if (user.admin_role !== "SUPER_ADMIN") {
    throw new ForbiddenError(
      "Only super admins can permanently delete charges",
    );
  }

  const charge = await getChargeWithId(id);
  if (!charge) throw new NotFoundError("Charge not found");

  // Single call does everything: permission + assignment + invoice check
  await chargesModifyValidationCheck(charge.task_id, user);

  await prisma.$transaction(async (tx) => {
    await applyChargeDelete(charge.task.entity_id, charge, tx);
    await tx.taskCharge.delete({ where: { id } });
  });

  const changes = [
    {
      action: "CHARGE_HARD_DELETED",
      from: {
        title: charge.title,
        amount: charge.amount.toString(),
        charge_type: charge.charge_type,
        bearer: charge.bearer,
        status: charge.status,
        remark: charge.remark,
      },
      to: null,
    },
  ];

  await addTaskActivityLog(charge.task_id, user.id, {
    action: "TASK_UPDATED",
    message: buildActivityMessage(changes),
    meta: { changes },
  }).catch((err) => console.error("Activity log failed:", err));

  const [charges, deleted_charges] = await Promise.all([
    fetchChargesForTask(charge.task_id),
    prisma.taskCharge.findMany({
      where: {
        task_id: charge.task_id,
        deleted_at: { not: null },
      },
    }),
  ]);

  return {
    task_id: charge.task_id,
    charges,
    deleted_charges,
  };
};

export const listTaskChargesLib = async (
  taskId,
  currentUser,
  ensureUserCanViewCharges,
) => {
  await ensureUserCanViewCharges(taskId, currentUser);
  return fetchChargesForTask(taskId);
};
