import { prisma } from "@/utils/server/db";
import { NotFoundError } from "@/utils/server/errors";
import { addTaskActivityLog } from "./taskComment.service";
import { buildActivityMessage } from "@/utils/server/activityBulder";

// helpers
export async function ensureUserCanAccessTask(taskId, user) {
  if (user.admin_role === "SUPER_ADMIN") return true;

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      OR: [
        { created_by: user.id },
        { assigned_to_all: true },
        { assignments: { some: { admin_user_id: user.id } } },
      ],
    },
    select: { id: true },
  });

  if (!task) {
    throw new ForbiddenError("You do not have access to this task");
  }

  return true;
}

const chargeExists = async (chargeId) => {
  return prisma.taskCharge.findUnique({
    where: { id: chargeId },
  });
};

// list charges for reuse
const fetchChargesForTask = async (taskId) => {
  const res = await prisma.taskCharge.findMany({
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
  return res;
};

// CREATE charge
export const createTaskCharge = async (taskId, data, currentUser) => {
  await ensureUserCanAccessTask(taskId, currentUser);

  const charge = await prisma.taskCharge.create({
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

  const charges = await fetchChargesForTask(taskId);

  const changes = [
    {
      action: "CHARGE_CREATED",
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

  await addTaskActivityLog(taskId, currentUser.id, {
    action: "TASK_UPDATED",
    message: buildActivityMessage(changes),
    meta: { changes },
  });

  return { task_id: taskId, charges };
};

// UPDATE charge
export const updateTaskCharge = async (id, data, currentUser) => {
  const previous = await chargeExists(id);
  if (!previous) throw new NotFoundError("Charge not found");

  await ensureUserCanAccessTask(previous.task_id, currentUser);

  const updated = await prisma.taskCharge.update({
    where: { id },
    data: {
      ...data,
      updated_by: currentUser.id,
    },
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
      to[field] = updated[field];
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
    });
  }

  const charges = await fetchChargesForTask(previous.task_id);
  return {
    task_id: previous.task_id,
    charges,
  };
};

// DELETE charge (soft delete)
export const deleteTaskCharge = async (id, currentUser) => {
  const charge = await chargeExists(id);
  if (!charge) throw new NotFoundError("Charge not found");

  await ensureUserCanAccessTask(charge.task_id, currentUser);

  await prisma.taskCharge.update({
    where: { id },
    data: {
      deleted_at: new Date(),
      deleted_by: currentUser.id,
    },
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
  });

  const charges = await fetchChargesForTask(charge.task_id);

  return { task_id: charge.task_id, charges };
};

// LIST charges
export const listTaskCharges = async (taskId, currentUser) => {
  await ensureUserCanAccessTask(taskId, currentUser);
  return fetchChargesForTask(taskId);
};
