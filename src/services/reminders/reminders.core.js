import { prisma } from "@/utils/server/db";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "@/utils/server/errors";

/* =======================================================================
   CONSTANTS
======================================================================= */

const DEFAULT_LIMIT = 5;

const BOARD_KEYS = [
  "today",
  "tomorrow",
  "day_3",
  "day_4",
  "day_5",
  "day_6",
  "day_7",
];

const BOARD_LABELS = {
  today: "Today",
  tomorrow: "Tomorrow",
  day_3: null,
  day_4: null,
  day_5: null,
  day_6: null,
  day_7: null,
};

/* =======================================================================
   SHARED SELECT
   Used by all read operations — list, getMyDay, lifecycle return
======================================================================= */

const REMINDER_SELECT = {
  id: true,
  title: true,
  description: true,
  due_at: true,
  completed_at: true,
  snoozed_until: true,
  is_recurring: true,
  recurrence_type: true,
  recurrence_every: true,
  recurrence_end: true,
  recurrence_ends_after: true,
  week_days: true,
  repeat_by: true,
  parent_id: true,
  status: true,
  bucket: { select: { name: true, icon: true } },
  tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
  children: { select: { id: true } },
  parent: { select: { id: true, title: true } },
};

// Full include used only by create / update (returns richer detail)
const REMINDER_FULL_INCLUDE = {
  creator: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  updater: { select: { id: true, name: true, email: true } },
  task: { select: { id: true, title: true } },
  bucket: {
    select: { id: true, name: true, icon: true, normalized_name: true },
  },
  tags: {
    include: {
      tag: {
        select: { id: true, name: true, normalized_name: true, color: true },
      },
    },
  },
  checklist_items: {
    orderBy: [{ order: "asc" }, { created_at: "asc" }],
    include: {
      creator: { select: { id: true, name: true } },
      updater: { select: { id: true, name: true } },
    },
  },
};

/* =======================================================================
   SHARED HELPERS
======================================================================= */

/** Flatten ReminderTagMap join → plain tag array */
const flattenTags = (items) =>
  items.map((item) => ({ ...item, tags: item.tags.map((t) => t.tag) }));

const flattenTagsSingle = (item) => ({
  ...item,
  tags: item.tags.map((t) => t.tag),
});

/** Get start/end of a day at offset from a base date */
const getDayRange = (base, offset) => {
  const start = new Date(base);
  start.setDate(start.getDate() + offset);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getStartOfToday = () => {
  const now = new Date();

  // Convert current time to IST
  const istNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );

  // Set IST midnight
  istNow.setHours(0, 0, 0, 0);

  // Convert back to UTC Date object
  return new Date(istNow.toISOString());
};

const getEndOfToday = () => {
  const now = new Date();

  const istNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );

  istNow.setHours(23, 59, 59, 999);

  return new Date(istNow.toISOString());
};

/**
 * Base where clause for reminder list queries.
 * Always scoped to currentUser, always excludes deleted, always PENDING.
 */
const buildListWhere = (currentUser, { bucket_id, tag_ids, due_at }) => {
  const where = {
    deleted_at: null,
    status: "PENDING",
    OR: [{ created_by: currentUser.id }, { assigned_to: currentUser.id }],
  };

  if (due_at) where.due_at = due_at;
  if (bucket_id) where.bucket_id = bucket_id;
  if (tag_ids?.length) where.tags = { some: { tag_id: { in: tag_ids } } };

  return where;
};

/**
 * Calculate next due date for a recurring reminder.
 *
 * WEEKLY recurrence respects week_days (1=Mo … 7=Su):
 *   finds the next selected weekday on or after (current due_at + 1 day).
 *   Falls back to simple +7*every if week_days is empty/null.
 */
const calculateNextDueDate = (reminder) => {
  const base = new Date(reminder.due_at);
  const every = reminder.recurrence_every || 1;

  switch (reminder.recurrence_type) {
    case "DAILY":
      base.setDate(base.getDate() + every);
      return base;

    case "WEEKLY": {
      const days = reminder.week_days?.length
        ? [...reminder.week_days].sort()
        : null;

      if (!days) {
        base.setDate(base.getDate() + 7 * every);
        return base;
      }

      // Step forward one day from current due, then find next matching weekday.
      // JS getDay(): 0=Sun,1=Mon…6=Sat  →  our encoding: 1=Mo…7=Su
      const toOurDay = (jsDay) => (jsDay === 0 ? 7 : jsDay);

      const candidate = new Date(base);
      candidate.setDate(candidate.getDate() + 1);

      for (let i = 0; i < 7 * every; i++) {
        if (days.includes(toOurDay(candidate.getDay()))) return candidate;
        candidate.setDate(candidate.getDate() + 1);
      }

      // Fallback — should not happen with valid week_days
      base.setDate(base.getDate() + 7 * every);
      return base;
    }

    case "MONTHLY":
      base.setMonth(base.getMonth() + every);
      return base;

    case "YEARLY":
      base.setFullYear(base.getFullYear() + every);
      return base;

    default:
      return null;
  }
};

/* =======================================================================
   CREATE REMINDER
======================================================================= */

export const createReminder = async (input, currentUser) => {
  return prisma.$transaction(async (tx) => {
    const dueDate = new Date(input.due_at);
    const title = input.title?.trim();
    const description = input.description?.trim() || null;

    if (!title) throw new ValidationError("Title is required");
    if (isNaN(dueDate.getTime())) throw new ValidationError("Invalid due date");

    const isTimeSensitive =
      dueDate.getHours() !== 0 ||
      dueDate.getMinutes() !== 0 ||
      dueDate.getSeconds() !== 0;

    /* --- Conflict check (time-sensitive only, blocking) --- */
    if (isTimeSensitive && !input.confirmed) {
      const conflict = await tx.reminder.findFirst({
        where: {
          deleted_at: null,
          status: "PENDING",
          is_time_sensitive: true,
          due_at: dueDate,
          OR: [{ created_by: currentUser.id }, { assigned_to: currentUser.id }],
        },
        select: { id: true, title: true, due_at: true },
      });

      if (conflict) {
        return {
          reminder: null,
          conflict: {
            exists: true,
            reminder: conflict,
            suggested_times: [
              new Date(dueDate.getTime() + 5 * 60_000).toISOString(),
              new Date(dueDate.getTime() + 10 * 60_000).toISOString(),
            ],
          },
        };
      }
    }

    /* --- Assignment --- */
    let assignedTo = currentUser.id;

    if (currentUser.admin_role === "SUPER_ADMIN" && input.assigned_to) {
      const assignee = await tx.adminUser.findFirst({
        where: { id: input.assigned_to, deleted_at: null, status: "ACTIVE" },
        select: { id: true },
      });
      if (!assignee) throw new NotFoundError("Assigned user not found");
      assignedTo = assignee.id;
    }

    /* --- Validate bucket --- */
    if (input.bucket_id) {
      const bucket = await tx.reminderBucket.findFirst({
        where: { id: input.bucket_id, user_id: currentUser.id },
        select: { id: true },
      });
      if (!bucket) throw new NotFoundError("Bucket not found");
    }

    /* --- Validate tags --- */
    if (input.tag_ids?.length) {
      const tags = await tx.reminderTag.findMany({
        where: { id: { in: input.tag_ids }, user_id: currentUser.id },
        select: { id: true },
      });
      if (tags.length !== input.tag_ids.length) {
        throw new ValidationError("One or more tags are invalid");
      }
    }

    /* --- Validate task --- */
    if (input.task_id) {
      const task = await tx.task.findUnique({
        where: { id: input.task_id },
        select: { id: true },
      });
      if (!task) throw new NotFoundError("Task not found");
    }

    /* --- Recurrence --- */
    let recurrenceData = {
      is_recurring: false,
      recurrence_type: null,
      recurrence_every: null,
      recurrence_end: null,
      recurrence_ends_after: null,
      week_days: [],
      repeat_by: null,
      parent_id: null,
    };

    if (input.is_recurring) {
      if (!input.recurrence_type)
        throw new ValidationError("Recurrence type is required");
      if (!input.recurrence_every || input.recurrence_every <= 0)
        throw new ValidationError("Invalid recurrence interval");
      if (input.recurrence_type === "WEEKLY" && input.week_days?.length) {
        const valid = input.week_days.every((d) => d >= 1 && d <= 7);
        if (!valid) throw new ValidationError("week_days must be integers 1–7");
      }

      recurrenceData = {
        is_recurring: true,
        recurrence_type: input.recurrence_type,
        recurrence_every: input.recurrence_every,
        recurrence_end: input.recurrence_end
          ? new Date(input.recurrence_end)
          : null,
        recurrence_ends_after: input.recurrence_ends_after ?? null,
        week_days: input.week_days ?? [],
        repeat_by: input.repeat_by ?? null,
        parent_id: null,
      };
    }

    /* --- Create --- */
    const reminder = await tx.reminder.create({
      data: {
        title,
        description,
        created_by: currentUser.id,
        updated_by: currentUser.id,
        assigned_to: assignedTo,
        task_id: input.task_id || null,
        bucket_id: input.bucket_id || null,
        due_at: dueDate,
        is_time_sensitive: isTimeSensitive,
        ...recurrenceData,
      },
    });

    /* --- Tags --- */
    if (input.tag_ids?.length) {
      await tx.reminderTagMap.createMany({
        data: input.tag_ids.map((tag_id) => ({
          reminder_id: reminder.id,
          tag_id,
        })),
      });
    }

    /* --- Checklist --- */
    if (input.checklist?.length) {
      for (const item of input.checklist) {
        if (!item.title?.trim())
          throw new ValidationError("Checklist item title is required");

        await tx.reminderChecklistItem.create({
          data: {
            reminder_id: reminder.id,
            title: item.title.trim(),
            order: item.order ?? 0,
            created_by: currentUser.id,
            updated_by: currentUser.id,
          },
        });
      }
    }

    /* --- Return --- */
    const result = await tx.reminder.findUnique({
      where: { id: reminder.id },
      include: REMINDER_FULL_INCLUDE,
    });

    return {
      reminder: flattenTagsSingle(result),
      conflict: null,
    };
  });
};

/* =======================================================================
   UPDATE REMINDER
======================================================================= */

export const updateReminder = async (reminderId, input, currentUser) => {
  return prisma.$transaction(async (tx) => {
    /* --- Fetch & guard --- */
    const reminder = await tx.reminder.findFirst({
      where: { id: reminderId, deleted_at: null },
    });

    if (!reminder) throw new NotFoundError("Reminder not found");

    if (
      reminder.created_by !== currentUser.id &&
      reminder.assigned_to !== currentUser.id
    ) {
      throw new ForbiddenError("You do not have access to this reminder");
    }

    if (reminder.status === "COMPLETED") {
      throw new ValidationError("Completed reminders cannot be updated");
    }

    const rootId = reminder.parent_id ?? reminder.id;
    const scope = input.update_scope ?? "INSTANCE";

    /* --- Normalize scalar updates --- */
    const updates = {};

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) throw new ValidationError("Reminder title cannot be empty");
      updates.title = title;
    }

    if (input.description !== undefined) {
      updates.description = input.description?.trim() || null;
    }

    if (input.due_at !== undefined) {
      const due = new Date(input.due_at);
      if (isNaN(due.getTime())) throw new ValidationError("Invalid due date");
      updates.due_at = due;
      updates.snoozed_until = null;
      updates.is_time_sensitive =
        due.getHours() !== 0 ||
        due.getMinutes() !== 0 ||
        due.getSeconds() !== 0;
    }

    updates.updated_by = currentUser.id;

    /* --- Assignment --- */
    if (input.assigned_to !== undefined) {
      if (currentUser.admin_role !== "SUPER_ADMIN") {
        throw new ForbiddenError("Only super admin can reassign reminders");
      }

      const user = await tx.adminUser.findFirst({
        where: { id: input.assigned_to, deleted_at: null, status: "ACTIVE" },
        select: { id: true },
      });
      if (!user) throw new NotFoundError("Assigned user not found");
      updates.assigned_to = user.id;
    }

    /* --- Task --- */
    if (input.task_id !== undefined) {
      if (input.task_id === null) {
        updates.task_id = null;
      } else {
        const task = await tx.task.findUnique({
          where: { id: input.task_id },
          select: { id: true },
        });
        if (!task) throw new NotFoundError("Task not found");
        updates.task_id = task.id;
      }
    }

    /* --- Bucket --- */
    if (input.bucket_id !== undefined) {
      if (input.bucket_id === null) {
        updates.bucket_id = null;
      } else {
        const bucket = await tx.reminderBucket.findFirst({
          where: { id: input.bucket_id, user_id: currentUser.id },
          select: { id: true },
        });
        if (!bucket) throw new NotFoundError("Bucket not found");
        updates.bucket_id = bucket.id;
      }
    }

    /* --- Recurrence (parent-level only) --- */
    const parentRecurrence = {};

    if (input.is_recurring !== undefined) {
      if (input.is_recurring === false) {
        Object.assign(parentRecurrence, {
          is_recurring: false,
          recurrence_type: null,
          recurrence_every: null,
          recurrence_end: null,
          recurrence_ends_after: null,
          week_days: [],
          repeat_by: null,
        });
      } else {
        if (!input.recurrence_type)
          throw new ValidationError("Recurrence type required");
        if (!input.recurrence_every || input.recurrence_every <= 0)
          throw new ValidationError("Invalid recurrence interval");
        if (input.recurrence_type === "WEEKLY" && input.week_days?.length) {
          const valid = input.week_days.every((d) => d >= 1 && d <= 7);
          if (!valid)
            throw new ValidationError("week_days must be integers 1–7");
        }

        Object.assign(parentRecurrence, {
          is_recurring: true,
          recurrence_type: input.recurrence_type,
          recurrence_every: input.recurrence_every,
          recurrence_end: input.recurrence_end
            ? new Date(input.recurrence_end)
            : null,
          recurrence_ends_after: input.recurrence_ends_after ?? null,
          week_days: input.week_days ?? [],
          repeat_by: input.repeat_by ?? null,
        });
      }
      parentRecurrence.updated_by = currentUser.id;
    }

    /* --- Apply updates --- */
    if (Object.keys(updates).length > 1) {
      await tx.reminder.update({ where: { id: reminder.id }, data: updates });
    }

    if (scope === "INSTANCE_AND_FUTURE") {
      const parentUpdates = { ...updates, ...parentRecurrence };
      if (Object.keys(parentUpdates).length > 1) {
        await tx.reminder.update({
          where: { id: rootId },
          data: parentUpdates,
        });
      }
    }

    /* --- Tags --- */
    if (input.tag_ids !== undefined) {
      if (input.tag_ids.length) {
        const tags = await tx.reminderTag.findMany({
          where: { id: { in: input.tag_ids }, user_id: currentUser.id },
          select: { id: true },
        });
        if (tags.length !== input.tag_ids.length)
          throw new ValidationError("Invalid tags");
      }

      await tx.reminderTagMap.deleteMany({
        where: { reminder_id: reminder.id },
      });

      if (input.tag_ids.length) {
        await tx.reminderTagMap.createMany({
          data: input.tag_ids.map((tag_id) => ({
            reminder_id: reminder.id,
            tag_id,
          })),
        });
      }

      if (scope === "INSTANCE_AND_FUTURE") {
        await tx.reminderTagMap.deleteMany({ where: { reminder_id: rootId } });

        if (input.tag_ids.length) {
          await tx.reminderTagMap.createMany({
            data: input.tag_ids.map((tag_id) => ({
              reminder_id: rootId,
              tag_id,
            })),
          });
        }
      }
    }

    /* --- Return --- */
    const result = await tx.reminder.findUnique({
      where: { id: reminder.id },
      include: REMINDER_FULL_INCLUDE,
    });

    return flattenTagsSingle(result);
  });
};

/* =======================================================================
   UPDATE REMINDER LIFECYCLE  (snooze / acknowledge)
======================================================================= */

export const updateReminderLifecycle = async (
  reminderId,
  input,
  currentUser,
) => {
  return prisma.$transaction(async (tx) => {
    /* --- Fetch & guard --- */
    const reminder = await tx.reminder.findFirst({
      where: { id: reminderId, deleted_at: null },
    });

    if (!reminder) throw new NotFoundError("Reminder not found");

    if (
      reminder.created_by !== currentUser.id &&
      reminder.assigned_to !== currentUser.id
    ) {
      throw new ForbiddenError("You do not have access to this reminder");
    }

    if (reminder.status !== "PENDING") {
      throw new ConflictError("Reminder already processed");
    }

    const action = input.action;
    if (!action) throw new ValidationError("Lifecycle action required");

    /* --- SNOOZE --- */
    if (action === "SNOOZE") {
      if (!input.duration_minutes && !input.snoozed_until) {
        throw new ValidationError("Provide snooze duration or snoozed_until");
      }

      const baseTime =
        reminder.snoozed_until && new Date(reminder.snoozed_until) > new Date()
          ? new Date(reminder.snoozed_until)
          : new Date(reminder.due_at);

      const snoozeTime = input.snoozed_until
        ? new Date(input.snoozed_until)
        : new Date(baseTime.getTime() + input.duration_minutes * 60_000);

      if (snoozeTime <= new Date()) {
        throw new ValidationError("Snooze time must be in the future");
      }

      const withinToday = snoozeTime <= getEndOfToday();

      await tx.reminder.update({
        where: { id: reminder.id },
        data: withinToday
          ? { snoozed_until: snoozeTime, updated_by: currentUser.id }
          : {
              due_at: snoozeTime,
              snoozed_until: null,
              updated_by: currentUser.id,
            },
      });
    }

    /* --- ACKNOWLEDGE --- */
    if (action === "ACKNOWLEDGE") {
      await tx.reminder.update({
        where: { id: reminder.id },
        data: {
          status: "COMPLETED",
          completed_at: new Date(),
          updated_by: currentUser.id,
        },
      });

      if (reminder.is_recurring) {
        const rootId = reminder.parent_id ?? reminder.id;

        if (input.stop_recurring) {
          await tx.reminder.update({
            where: { id: rootId },
            data: {
              is_recurring: false,
              recurrence_type: null,
              recurrence_every: null,
              recurrence_end: null,
              recurrence_ends_after: null,
              week_days: [],
              repeat_by: null,
              updated_by: currentUser.id,
            },
          });
        } else {
          const nextDue = calculateNextDueDate(reminder);

          // Check recurrence_ends_after: count completed siblings under same root
          let endsAfterExhausted = false;
          if (reminder.recurrence_ends_after) {
            const completedCount = await tx.reminder.count({
              where: {
                parent_id: rootId,
                status: "COMPLETED",
                deleted_at: null,
              },
            });
            // +1 because the current instance is being completed right now
            if (completedCount + 1 >= reminder.recurrence_ends_after) {
              endsAfterExhausted = true;
            }
          }

          if (
            nextDue &&
            !endsAfterExhausted &&
            (!reminder.recurrence_end || nextDue <= reminder.recurrence_end)
          ) {
            await tx.reminder.create({
              data: {
                title: reminder.title,
                description: reminder.description,
                created_by: reminder.created_by,
                updated_by: currentUser.id,
                assigned_to: reminder.assigned_to,
                task_id: reminder.task_id,
                bucket_id: reminder.bucket_id,
                due_at: nextDue,
                is_time_sensitive: reminder.is_time_sensitive,
                is_recurring: reminder.is_recurring,
                recurrence_type: reminder.recurrence_type,
                recurrence_every: reminder.recurrence_every,
                recurrence_end: reminder.recurrence_end,
                recurrence_ends_after: reminder.recurrence_ends_after,
                week_days: reminder.week_days ?? [],
                repeat_by: reminder.repeat_by,
                parent_id: rootId,
              },
            });
          }
        }
      }
    }

    /* --- Return --- */
    const result = await tx.reminder.findUnique({
      where: { id: reminder.id },
      select: REMINDER_SELECT,
    });

    return flattenTagsSingle(result);
  });
};

/* =======================================================================
   LIST REMINDER WEEK BOARDS

   Pattern mirrors listPipelineLeads:
   - Caller passes `board_keys` (array) — only requested boards are fetched.
   - Global filters (bucket_id, tag_ids) apply uniformly across all boards.
   - Cursor-based pagination per board, encoded as base64 JSON map keyed by
     board key  →  { cursor_due_at, cursor_id }.
   - Each board result carries its own next_cursor and has_more flag.
   - All boards are fetched in parallel (Promise.all).
======================================================================= */

export const listReminderWeekBoards = async (input, currentUser) => {
  const {
    bucket_id = null,
    tag_ids = null,
    board_keys = BOARD_KEYS, // caller can pass a subset e.g. ["today","tomorrow"]
    limit = DEFAULT_LIMIT,
    cursor = null,
  } = input || {};

  /* --- Decode global cursor map --- */
  let parsedCursor = {};
  if (cursor) {
    try {
      parsedCursor = JSON.parse(
        Buffer.from(cursor, "base64").toString("utf-8"),
      );
    } catch {
      // malformed cursor → start from beginning
    }
  }

  /* --- Only process requested & valid board keys --- */
  const requestedKeys = board_keys.filter((k) => BOARD_KEYS.includes(k));

  if (requestedKeys.length === 0) {
    return { boards: [], next_cursor: null };
  }

  const startOfToday = getStartOfToday();

  /* --- Fetch all requested boards in parallel --- */
  const boardResults = await Promise.all(
    requestedKeys.map(async (key) => {
      const offset = BOARD_KEYS.indexOf(key); // 0 = today, 1 = tomorrow, etc.
      const { start, end } = getDayRange(startOfToday, offset);

      /* Build cursor clause for this board */
      const boardCursor = parsedCursor[key];
      let cursorClause = {};

      if (boardCursor) {
        cursorClause = {
          OR: [
            { due_at: { gt: new Date(boardCursor.cursor_due_at) } },
            {
              due_at: new Date(boardCursor.cursor_due_at),
              id: { gt: boardCursor.cursor_id },
            },
          ],
        };
      }

      /* Base where — global filters only, no per-board overrides */
      const where = {
        ...buildListWhere(currentUser, {
          bucket_id,
          tag_ids,
          due_at: { gte: start, lte: end },
        }),
        ...cursorClause,
      };

      const rows = await prisma.reminder.findMany({
        where,
        orderBy: [{ due_at: "asc" }, { id: "asc" }],
        take: limit + 1, // fetch one extra to detect has_more
        select: REMINDER_SELECT,
      });

      let next_cursor = null;

      if (rows.length > limit) {
        rows.pop(); // remove the sentinel row
        const last = rows[rows.length - 1];
        next_cursor = {
          cursor_due_at: last.due_at,
          cursor_id: last.id,
        };
      }

      return {
        key,
        label: BOARD_LABELS[key],
        date: start.toISOString().split("T")[0],
        limit,
        has_more: Boolean(next_cursor),
        next_cursor,
        items: flattenTags(rows),
      };
    }),
  );

  /* --- Build global cursor map (only boards that still have more pages) --- */
  const nextCursorPayload = {};
  for (const board of boardResults) {
    if (board.next_cursor) {
      nextCursorPayload[board.key] = board.next_cursor;
    }
  }

  const next_cursor =
    Object.keys(nextCursorPayload).length > 0
      ? Buffer.from(JSON.stringify(nextCursorPayload)).toString("base64")
      : null;

  return { boards: boardResults, next_cursor };
};

/* =======================================================================
   GET REMINDER DETAIL
======================================================================= */

export const getReminderDetail = async (reminderId, currentUser) => {
  const reminder = await prisma.reminder.findFirst({
    where: {
      id: reminderId,
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      due_at: true,
      completed_at: true,
      snoozed_until: true,
      status: true,
      is_time_sensitive: true,

      // recurrence
      is_recurring: true,
      recurrence_type: true,
      recurrence_every: true,
      recurrence_end: true,
      recurrence_ends_after: true,
      week_days: true,
      repeat_by: true,
      parent_id: true,

      // timestamps
      created_at: true,
      updated_at: true,

      // relations
      creator: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      task: { select: { id: true, title: true } },
      bucket: { select: { id: true, name: true, icon: true } },

      tags: {
        select: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },

      checklist_items: {
        where: {},
        orderBy: [{ order: "asc" }, { created_at: "asc" }],
        take: 50,
        select: {
          id: true,
          title: true,
          is_done: true,
          order: true,
          created_at: true,
        },
      },

      parent: {
        select: {
          id: true,
          title: true,
          due_at: true,
          is_recurring: true,
          recurrence_type: true,
          recurrence_every: true,
          recurrence_end: true,
          recurrence_ends_after: true,
          week_days: true,
          repeat_by: true,
          status: true,
        },
      },

      _count: {
        select: { children: true },
      },
    },
  });

  if (!reminder) throw new NotFoundError("Reminder not found");

  if (
    reminder.creator.id !== currentUser.id &&
    reminder.assignee.id !== currentUser.id
  ) {
    throw new ForbiddenError("You do not have access to this reminder");
  }

  return {
    ...reminder,
    checklist_items: reminder?.checklist_items?.map((item) => ({
      id: item.id,
      title: item.title,
      done: item.is_done,
      order: item.order,
      created_at: item.created_at,
    })),
    tags: reminder.tags.map((t) => t.tag),
    parent: reminder.parent ?? null,
    children_count: reminder._count.children,
    _count: undefined,
  };
};

/* =======================================================================
   GET TODAY TRIGGERS
======================================================================= */

export const getTodayTriggers = async (currentUser) => {
  const startOfToday = getStartOfToday();
  const endOfToday = getEndOfToday();
  const now = new Date();

  const reminders = await prisma.reminder.findMany({
    where: {
      deleted_at: null,
      status: "PENDING",
      is_time_sensitive: true,
      due_at: { gte: startOfToday, lte: endOfToday },
      OR: [{ created_by: currentUser.id }, { assigned_to: currentUser.id }],
    },
    orderBy: { due_at: "asc" },
    select: {
      id: true,
      title: true,
      due_at: true,
      snoozed_until: true,
      bucket: { select: { name: true, icon: true } },
    },
  });

  const triggers = reminders.map((r) => ({
    id: r.id,
    title: r.title,
    due_at: r.due_at,
    due_at_ms: r.due_at.getTime(),
    bucket: r.bucket ?? null,
    is_snoozed: !!r.snoozed_until && r.snoozed_until > now,
    snoozed_until: r.snoozed_until ?? null,
    snoozed_until_ms: r.snoozed_until ? r.snoozed_until.getTime() : null,
  }));

  return {
    fetched_at: now.toISOString(),
    fetched_at_ms: now.getTime(),
    count: triggers.length,
    triggers,
  };
};

/* =======================================================================
   CHECK ALIVE
======================================================================= */

export const checkAlive = async (reminderIds, currentUser) => {
  const now = new Date();
  const startOfToday = getStartOfToday();
  const endOfToday = getEndOfToday();

  const ids = Array.isArray(reminderIds) ? reminderIds : [reminderIds];

  const reminders = await prisma.reminder.findMany({
    where: { id: { in: ids }, deleted_at: null },
    select: {
      id: true,
      title: true,
      due_at: true,
      status: true,
      snoozed_until: true,
      created_by: true,
      assigned_to: true,
      bucket: { select: { name: true, icon: true } },
    },
  });

  console.log("reminders", reminders);

  const reminderMap = new Map(reminders.map((r) => [r.id, r]));

  const results = ids.map((id) => {
    const reminder = reminderMap.get(id);

    if (!reminder) return { id, alive: false, reason: "NOT_FOUND" };

    if (
      reminder.created_by !== currentUser.id &&
      reminder.assigned_to !== currentUser.id
    ) {
      return { id, alive: false, reason: "NO_ACCESS" };
    }

    if (reminder.status !== "PENDING") {
      return { id, alive: false, reason: "ALREADY_COMPLETED" };
    }

    if (reminder.snoozed_until && reminder.snoozed_until > now) {
      return {
        id,
        alive: false,
        reason: "SNOOZED",
        snoozed_until: reminder.snoozed_until,
        snoozed_until_ms: reminder.snoozed_until.getTime(),
      };
    }

    if (reminder.due_at < startOfToday || reminder.due_at > endOfToday) {
      return { id, alive: false, reason: "OUT_OF_WINDOW" };
    }

    return {
      id,
      alive: true,
      reminder: {
        id: reminder.id,
        title: reminder.title,
        due_at: reminder.due_at,
        due_at_ms: reminder.due_at.getTime(),
        bucket: reminder.bucket ?? null,
      },
    };
  });

  console.log("results", results);
  return { results };
};

/* =======================================================================
   GET MY DAY
======================================================================= */

export const getMyDay = async (input, currentUser) => {
  const {
    bucket_id = null,
    tag_ids = null,
    tab = "today",
    page = 1,
    limit = DEFAULT_LIMIT,
    is_overview = false,
    ignore_date_filter = false,
  } = input || {};

  const startOfToday = getStartOfToday();
  const endOfToday = getEndOfToday();
  const skip = (page - 1) * limit;

  const buckets = [];

  const transform = (item) => ({
    id: item.id,
    title: item.title ?? "",
    description: item.description ?? null,

    due_at: item.due_at,
    completed_at: item.completed_at ?? null,
    snoozed_until: item.snoozed_until ?? null,
    status: item.status,
    is_time_sensitive: item.is_time_sensitive ?? false,

    is_recurring: item.is_recurring,
    recurrence_type: item.recurrence_type,
    recurrence_every: item.recurrence_every,
    recurrence_end: item.recurrence_end,
    recurrence_ends_after: item.recurrence_ends_after,
    week_days: item.week_days ?? [],
    repeat_by: item.repeat_by ?? null,
    parent_id: item.parent_id ?? null,

    created_at: item.created_at ?? null,
    updated_at: item.updated_at ?? null,

    creator: item.creator ?? null,
    assignee: item.assignee ?? null,
    task: item.task ?? null,

    bucket: item.bucket
      ? {
          id: item.bucket.id,
          name: item.bucket.name,
          icon: item.bucket.icon,
        }
      : null,

    tags: item.tags.map((t) => t.tag),

    checklist_items: (item.checklist_items || []).map((c) => ({
      id: c.id,
      title: c.title,
      done: c.is_done,
      order: c.order,
      created_at: c.created_at,
    })),

    parent: null,
    children_count: 0,

    is_overview: true,
  });

  const queryConfig = is_overview
    ? { include: REMINDER_FULL_INCLUDE }
    : { select: REMINDER_SELECT };

  /* =========================
     OVERDUE
  ========================= */
  if (tab === "overdue" || !tab) {
    const where = buildListWhere(currentUser, {
      bucket_id,
      tag_ids,
      due_at:
        ignore_date_filter && bucket_id ? undefined : { lt: startOfToday },
    });

    const [items, total] = await Promise.all([
      prisma.reminder.findMany({
        where,
        orderBy: { due_at: "asc" },
        take: limit,
        skip,
        ...queryConfig,
      }),
      prisma.reminder.count({ where }),
    ]);

    buckets.push({
      key: "overdue",
      label: "Overdue",
      date: null,
      page,
      limit,
      total,
      has_more: page * limit < total,
      items: is_overview ? items.map(transform) : flattenTags(items),
    });
  }

  /* =========================
     TODAY
  ========================= */
  if (tab === "today" || !tab) {
    const where = buildListWhere(currentUser, {
      bucket_id,
      tag_ids,
      due_at:
        ignore_date_filter && bucket_id
          ? undefined
          : { gte: startOfToday, lte: endOfToday },
    });

    const [items, total] = await Promise.all([
      prisma.reminder.findMany({
        where,
        orderBy: { due_at: "asc" },
        take: limit,
        skip,
        ...queryConfig,
      }),
      prisma.reminder.count({ where }),
    ]);

    buckets.push({
      key: "today",
      label: "Today",
      date: startOfToday.toISOString().split("T")[0],
      page,
      limit,
      total,
      has_more: page * limit < total,
      items: is_overview ? items.map(transform) : flattenTags(items),
    });
  }

  return { buckets };
};
