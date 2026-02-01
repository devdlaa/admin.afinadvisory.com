import { prisma } from "@/utils/server/db";

/* ---------------- Status mapping ---------------- */

function statusField(status) {
  switch (status) {
    case "PENDING":
      return "pending";
    case "IN_PROGRESS":
      return "in_progress";
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "ON_HOLD":
      return "on_hold";
    case "PENDING_CLIENT_INPUT":
      return "pending_client_input";
    default:
      throw new Error(`Unknown task status: ${status}`);
  }
}

/* ---------------- Delta helpers ---------------- */

function zeroTaskDelta() {
  return {
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    on_hold: 0,
    pending_client_input: 0,
    total_tasks: 0,
  };
}

function computeTaskContribution(task) {
  if (!task || task.deleted_at) return zeroTaskDelta();

  const delta = zeroTaskDelta();
  const field = statusField(task.status);

  delta[field] = 1;
  delta.total_tasks = 1;

  return delta;
}

function negateTaskDelta(delta) {
  const neg = {};
  for (const k in delta) neg[k] = -delta[k];
  return neg;
}

function diffTaskDelta(oldDelta, newDelta) {
  const diff = {};
  for (const k in oldDelta) diff[k] = newDelta[k] - oldDelta[k];
  return diff;
}

/* ---------------- DB apply ---------------- */

async function applyTaskDelta(entityId, delta, tx = prisma) {
  if (!entityId) return;

  await tx.entityTaskStats.upsert({
    where: { entity_id: entityId },
    create: {
      entity_id: entityId,
      ...delta,
    },
    update: {
      pending: { increment: delta.pending },
      in_progress: { increment: delta.in_progress },
      completed: { increment: delta.completed },
      cancelled: { increment: delta.cancelled },
      on_hold: { increment: delta.on_hold },
      pending_client_input: { increment: delta.pending_client_input },
      total_tasks: { increment: delta.total_tasks },
    },
  });
}

/* ---------------- Public API ---------------- */

export async function applyTaskCreate(task, tx = prisma) {
  const delta = computeTaskContribution(task);
  await applyTaskDelta(task.entity_id, delta, tx);
}

export async function applyTaskRestore(task, tx = prisma) {
  const delta = computeTaskContribution(task);
  await applyTaskDelta(task.entity_id, delta, tx);
}

export async function applyTaskDelete(task, tx = prisma) {
  const before = computeTaskContribution(task);
  const delta = negateTaskDelta(before);
  await applyTaskDelta(task.entity_id, delta, tx);
}

export async function applyTaskUpdate(oldTask, newTask, tx = prisma) {
  const before = computeTaskContribution(oldTask);
  const after = computeTaskContribution(newTask);
  console.log(before)
  console.log(after)
  // same entity
  if (oldTask.entity_id === newTask.entity_id) {
    const delta = diffTaskDelta(before, after);
    await applyTaskDelta(newTask.entity_id, delta, tx);
    return;
  }

  // entity changed
  await applyTaskDelta(oldTask.entity_id, negateTaskDelta(before), tx);
  await applyTaskDelta(newTask.entity_id, after, tx);
}
