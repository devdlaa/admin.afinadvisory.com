import { prisma } from "@/utils/server/db";

import { NotFoundError } from "@/utils/server/errors";

async function ensureUserCanAccessTask(tx, task_id, user) {
  if (user.role === "SUPER_ADMIN") {
    const task = await tx.task.findUnique({
      where: { id: task_id },
      select: { id: true },
    });
    if (!task) throw new NotFoundError("Task not found");
    return task;
  }

  const task = await tx.task.findFirst({
    where: {
      id: task_id,
      OR: [
        { created_by: user.id },
        { assigned_to_all: true },
        {
          assignments: {
            some: { admin_user_id: user.id },
          },
        },
      ],
    },
    select: { id: true },
  });

  if (!task) {
    throw new ForbiddenError("You do not have access to this task");
  }

  return task;
}

export const syncTaskChecklist = async (task_id, items, currentUser) => {
  return prisma.$transaction(async (tx) => {
    // 🔐 Enforce task visibility
    await ensureUserCanAccessTask(tx, task_id, currentUser);

    const existing = await tx.taskChecklistItem.findMany({
      where: { task_id },
    });

    const existingIds = new Set(existing.map((i) => i.id));
    const incomingIds = new Set(items.filter((i) => i.id).map((i) => i.id));

    // hard delete removed items (allowed by your rules)
    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

    if (toDelete.length > 0) {
      await tx.taskChecklistItem.deleteMany({
        where: {
          task_id,
          id: { in: toDelete },
        },
      });
    }

    // upsert incoming
    for (const item of items) {
      if (item.id) {
        await tx.taskChecklistItem.update({
          where: { id: item.id },
          data: {
            title: item.title,
            is_done: item.is_done,
            order: item.order ?? 0,
            updated_by: currentUser.id,
          },
        });
      } else {
        await tx.taskChecklistItem.create({
          data: {
            task_id,
            title: item.title,
            is_done: item.is_done ?? false,
            order: item.order ?? 0,
            created_by: currentUser.id,
            updated_by: currentUser.id,
          },
        });
      }
    }

    const updated = await tx.taskChecklistItem.findMany({
      where: { task_id },
      orderBy: [{ order: "asc" }, { created_at: "asc" }],
    });

    return {
      task_id,
      updated,
    };
  });
};
