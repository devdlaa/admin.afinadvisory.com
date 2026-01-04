import { prisma } from "@/lib/prisma";
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
    where: { task_id: taskId },
    orderBy: { created_at: "asc" },
  });
};

// CREATE charge
export const createTaskCharge = async (taskId, data) => {
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
    },
  });

  return fetchChargesForTask(taskId);
};

// LIST charges
export const listTaskCharges = async (taskId) => {
  const exists = await taskExists(taskId);
  if (!exists) throw new NotFoundError("Task not found");

  return fetchChargesForTask(taskId);
};

// UPDATE charge
export const updateTaskCharge = async (id, data) => {
  const charge = await chargeExists(id);
  if (!charge) throw new NotFoundError("Charge not found");

  await prisma.taskCharge.update({
    where: { id },
    data,
  });

  return fetchChargesForTask(charge.task_id);
};

// DELETE charge
export const deleteTaskCharge = async (id) => {
  const charge = await chargeExists(id);
  if (!charge) throw new NotFoundError("Charge not found");

  await prisma.taskCharge.delete({
    where: { id },
  });

  return fetchChargesForTask(charge.task_id);
};
