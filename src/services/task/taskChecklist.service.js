import { prisma } from "@/utils/server/db";
import { NotFoundError } from "@/utils/errors";

export const syncTaskChecklist = async (task_id, items, user_id) => {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: task_id },
    });

    if (!task) throw new NotFoundError("Task not found");

    const existing = await tx.taskChecklistItem.findMany({
      where: { task_id },
    });

    const existingIds = new Set(existing.map((i) => i.id));
    const incomingIds = new Set(items.filter((i) => i.id).map((i) => i.id));

    // ids to delete
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
            updated_by: user_id,
          },
        });
      } else {
        await tx.taskChecklistItem.create({
          data: {
            task_id,
            title: item.title,
            is_done: item.is_done ?? false,
            order: item.order ?? 0,
            created_by: user_id,
            updated_by: user_id,
          },
        });
      }
    }

    // return final sorted list
    const updated = await tx.taskChecklistItem.findMany({
      where: { task_id },
      orderBy: [{ order: "asc" }, { created_at: "asc" }],
    });

    return {
      task_id : task_id,
      updated : updated
    };
  });
};
