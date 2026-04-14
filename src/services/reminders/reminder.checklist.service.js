import { prisma } from "@/utils/server/db";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/utils/server/errors";

async function ensureUserCanAccessReminder(tx, reminder_id, user) {
  const reminder = await tx.reminder.findFirst({
    where: {
      id: reminder_id,
      deleted_at: null,
    },
    select: {
      id: true,
      created_by: true,
      assigned_to: true,
    },
  });

  if (!reminder) {
    throw new NotFoundError("Reminder not found");
  }

  const canAccess =
    reminder.created_by === user.id || reminder.assigned_to === user.id;

  if (!canAccess) {
    throw new ForbiddenError("You do not have access to this reminder");
  }

  return reminder;
}

export const syncReminderChecklist = async (
  reminder_id,
  items,
  currentUser,
) => {
  if (!Array.isArray(items)) {
    throw new ValidationError("Checklist must be an array");
  }

  return prisma.$transaction(async (tx) => {
    await ensureUserCanAccessReminder(tx, reminder_id, currentUser);

    const existing = await tx.reminderChecklistItem.findMany({
      where: { reminder_id },
      select: { id: true },
    });

    const existingIds = new Set(existing.map((i) => i.id));
    const incomingIds = new Set(items.filter((i) => i.id).map((i) => i.id));

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

    if (toDelete.length > 0) {
      await tx.reminderChecklistItem.deleteMany({
        where: {
          reminder_id,
          id: { in: toDelete },
        },
      });
    }

    for (const item of items) {
      if (!item.title || !item.title.trim()) {
        throw new ValidationError("Checklist item title cannot be empty");
      }

      if (item.id) {
        await tx.reminderChecklistItem.update({
          where: { id: item.id },
          data: {
            title: item.title.trim(),
            is_done: item.is_done ?? false,
            order: item.order ?? 0,
            updated_by: currentUser.id,
          },
        });
      } else {
        await tx.reminderChecklistItem.create({
          data: {
            reminder_id,
            title: item.title.trim(),
            is_done: item.is_done ?? false,
            order: item.order ?? 0,
            created_by: currentUser.id,
            updated_by: currentUser.id,
          },
        });
      }
    }

    const updated = await tx.reminderChecklistItem.findMany({
      where: { reminder_id },
      orderBy: [{ order: "asc" }, { created_at: "asc" }],
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        updater: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      reminder_id,
      checklist: updated.map((item) => ({
        id: item.id,
        title: item.title,
        done: item.is_done,
        order: item.order,
        created_at: item.created_at,
      })),
    };
  });
};
