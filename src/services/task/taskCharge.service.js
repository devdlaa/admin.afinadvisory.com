import { prisma } from "@/utils/server/db";
import { NotFoundError } from "@/utils/server/errors";

// helpers
const taskExists = async (taskId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true },
  });
  return !!task;
};

const chargeExists = async (chargeId) => {
  return prisma.taskCharge.findUnique({
    where: { id: chargeId },
  });
};

// list charges for reuse
const fetchChargesForTask = (taskId) => {
  return prisma.taskCharge.findMany({
    where: {
      task_id: taskId,
      deleted_at: null,
    },
    orderBy: { created_at: "asc" },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      updater: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

// CREATE charge
export const createTaskCharge = async (taskId, data, adminUserId) => {
  const exists = await taskExists(taskId);
  if (!exists) throw new NotFoundError("Task not found");

  await prisma.taskCharge.create({
    data: {
      task_id: taskId,
      title: data.title,
      amount: data.amount,
      charge_type: data.charge_type,
      bearer: data.bearer,
      status: data.status,
      remark: data.remark ?? null,
      created_by: adminUserId,
      updated_by: adminUserId,
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      updater: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const charges = await fetchChargesForTask(taskId);

  return {
    task_id: taskId,
    charges,
  };
};

// UPDATE charge
export const updateTaskCharge = async (id, data, adminUserId) => {
  const charge = await chargeExists(id);
  if (!charge) throw new NotFoundError("Charge not found");

  await prisma.taskCharge.update({
    where: { id },
    data: {
      ...data,
      updated_by: adminUserId,
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      updater: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return fetchChargesForTask(charge.task_id);
};

// LIST charges
export const listTaskCharges = async (taskId) => {
  const exists = await taskExists(taskId);
  if (!exists) throw new NotFoundError("Task not found");

  return fetchChargesForTask(taskId);
};

// DELETE charge (soft delete)
export const deleteTaskCharge = async (id, adminUserId) => {
  const charge = await chargeExists(id);
  if (!charge) throw new NotFoundError("Charge not found");

  await prisma.taskCharge.update({
    where: { id },
    data: {
      deleted_at: new Date(),
      deleted_by: adminUserId,
    },
  });

  const charges = await fetchChargesForTask(charge.task_id);

  return {
    task_id: charge.task_id,
    charges,
  };
};
