import { prisma } from "@/utils/server/db.js";
import admin from "@/lib/firebase-admin";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/utils/server/errors";
import { safeForFirestore } from "@/utils/server/utils";

import { notify } from "../shared/notifications.service";

const db = admin.firestore();

const COMMENTS_COLLECTION = "task_comments";
const COMMENTS_SUBCOLLECTION = "comments";

const EDIT_WINDOW_HOURS = 48;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

async function getValidAdminUser(user_id) {
  const user = await prisma.adminUser.findFirst({
    where: {
      id: user_id,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      admin_role: true,
    },
  });

  if (!user) {
    throw new ForbiddenError("User inactive or not found");
  }

  return user;
}

function stripMentionsFromMessage(message, mentions) {
  if (!Array.isArray(mentions)) return message;

  let clean = message;

  for (const m of mentions) {
    if (!m?.name) continue;

    const escaped = m.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`@${escaped}`, "gi");
    clean = clean.replace(regex, "");
  }

  return clean.replace(/\s+/g, " ").trim();
}

async function getTaskOrFail(task_id) {
  const task = await prisma.task.findFirst({
    where: {
      id: task_id,
    },
    select: {
      id: true,
      title: true,
      created_by: true,
      assigned_to_all: true,
    },
  });

  if (!task) throw new NotFoundError("Task not found");

  return task;
}

/**
 * Ensure user is allowed to interact with task comments
 */
export const ensureUserCanComment = async (task, user_id) => {
  // creator always allowed
  if (task.created_by === user_id) return true;

  // assigned to all
  if (task.assigned_to_all === true) return true;

  // otherwise must be explicitly assigned
  const assignment = await prisma.taskAssignment.findFirst({
    where: {
      task_id: task.id,
      admin_user_id: user_id,
    },
  });

  if (!assignment) {
    throw new ForbiddenError("You are not assigned to this task");
  }

  return true;
};

// ------------------------------------------------------------------
// CREATE COMMENT
// ------------------------------------------------------------------

export const createTaskComment = async (
  task_id,
  user_id,
  rawMessage,
  mentions = []
) => {
  const task = await getTaskOrFail(task_id);
  const user = await getValidAdminUser(user_id);

  await ensureUserCanComment(task, user.id);

  // ✅ sanitize message
  const cleanedMessage = stripMentionsFromMessage(
    (rawMessage || "").trim(),
    mentions
  );

  if (!cleanedMessage) {
    throw new ValidationError("Message cannot be empty");
  }

  const commentRef = db
    .collection(COMMENTS_COLLECTION)
    .doc(task_id)
    .collection(COMMENTS_SUBCOLLECTION)
    .doc();

  const now = new Date();
  const editedUntil = new Date(
    now.getTime() + EDIT_WINDOW_HOURS * 60 * 60 * 1000
  );

  const payload = {
    id: commentRef.id,
    task_id,
    type: "COMMENT",
    message: cleanedMessage, // ✅ no mentions inside
    activity: null,
    user_id: user.id,
    user_name: user.name,

    // ✅ only id + name
    mentions: Array.isArray(mentions)
      ? mentions.map((m) => ({ id: m.id, name: m.name }))
      : [],

    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    edited_until: editedUntil.toISOString(),
    deleted: false,
  };

  await commentRef.set(safeForFirestore(payload));

  // sync task metadata
  await prisma.task.update({
    where: { id: task_id },
    data: {
      last_comment_at: now,
      last_commented_by: user.id,
      comment_count: { increment: 1 },
    },
  });

  // -------------------------------------------------
  // NOTIFICATIONS
  // -------------------------------------------------

  if (task.assigned_to_all) return payload;

  const cleanMentionIds = payload.mentions
    .map((m) => m.id)
    .filter((id) => id !== user.id);

  let notifyUserIds = [];

  if (cleanMentionIds.length > 0) {
    notifyUserIds = cleanMentionIds;
  } else {
    const assignees = await prisma.taskAssignment.findMany({
      where: { task_id },
      select: { admin_user_id: true },
    });

    notifyUserIds = assignees
      .map((a) => a.admin_user_id)
      .filter((id) => id !== user.id);
  }

  if (notifyUserIds.length > 0) {
    await notify(notifyUserIds, {
      type: "TASK_COMMENT",
      title: `New comment on ${task.title}`,
      body:
        cleanedMessage.length > 100
          ? `${cleanedMessage.substring(0, 100)}...`
          : cleanedMessage,
      task_id,
      comment_id: payload.id,
      actor_id: user.id,
      actor_name: user.name,
      link: `/dashboard/task-managment?taskId=${task_id}&tab=task-activity`,
    });
  }

  return payload;
};

// ------------------------------------------------------------------
// CREATE ACTIVITY ENTRY (backend/internal only) do not touch this
// ------------------------------------------------------------------

export const addTaskActivityLog = async (task_id, actor_id, activity) => {
  const user = await getValidAdminUser(actor_id);

  const docRef = db
    .collection(COMMENTS_COLLECTION)
    .doc(task_id)
    .collection(COMMENTS_SUBCOLLECTION)
    .doc();

  const now = new Date();

  const payload = {
    id: docRef.id,
    task_id,
    type: "ACTIVITY",
    user_id: user.id,
    user_name: user.name,
    message: activity.message, 
    activity: {
      action: activity.action,
      meta: activity.meta ?? null,
    },
    created_at: now.toISOString(),
    deleted: false,
  };

  await docRef.set(safeForFirestore(payload));

  await prisma.task.update({
    where: { id: task_id },
    data: {
      last_activity_at: now,
      last_activity_by: user.id,
    },
  });

  return payload;
};

// ------------------------------------------------------------------
// LIST COMMENTS
// ------------------------------------------------------------------

export const listTaskTimeline = async (
  task_id,
  {
    limit = 20,
    cursor = null,
    type = "ALL", // COMMENT | ACTIVITY | ALL
  } = {}
) => {
  await getTaskOrFail(task_id);

  if (limit <= 0 || limit > 100) {
    throw new ValidationError("Invalid pagination limit");
  }

  let ref = db
    .collection(COMMENTS_COLLECTION)
    .doc(task_id)
    .collection(COMMENTS_SUBCOLLECTION)
    .where("deleted", "==", false)
    .orderBy("created_at", "desc")
    .limit(limit);

  // filter by entry type if requested
  if (type === "COMMENT") {
    ref = ref.where("type", "==", "COMMENT");
  } else if (type === "ACTIVITY") {
    ref = ref.where("type", "==", "ACTIVITY");
  }

  // cursor pagination
  if (cursor) {
    const cursorDoc = await db
      .collection(COMMENTS_COLLECTION)
      .doc(task_id)
      .collection(COMMENTS_SUBCOLLECTION)
      .doc(cursor)
      .get();

    if (cursorDoc.exists) {
      ref = ref.startAfter(cursorDoc);
    }
  }

  const snapshot = await ref.get();

  const items = [];

  snapshot.forEach((doc) => {
    const data = doc.data();

    // ✅ normalize mentions (old + new format safe)
    if (Array.isArray(data.mentions)) {
      data.mentions = data.mentions.map((m) => {
        if (typeof m === "string") {
          return { id: m, name: "Unknown" }; // backward compatibility
        }
        return {
          id: m.id,
          name: m.name,
        };
      });
    } else {
      data.mentions = [];
    }

    items.push(data);
  });

  const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

  return {
    items,
    next_cursor: nextCursor,
  };
};

// ------------------------------------------------------------------
// UPDATE COMMENT
// ------------------------------------------------------------------

export const updateTaskComment = async (
  task_id,
  comment_id,
  user_id,
  rawMessage,
  mentions = []
) => {
  const user = await getValidAdminUser(user_id);

  const commentRef = db
    .collection(COMMENTS_COLLECTION)
    .doc(task_id)
    .collection(COMMENTS_SUBCOLLECTION)
    .doc(comment_id);

  const doc = await commentRef.get();

  if (!doc.exists) throw new NotFoundError("Comment not found");

  const data = doc.data();

  if (data.type === "ACTIVITY") {
    throw new ForbiddenError("Activity entries cannot be edited");
  }

  if (data.deleted) {
    throw new ValidationError("Comment has been deleted");
  }

  // Only author can edit
  if (data.user_id !== user.id) {
    throw new ForbiddenError("You may only edit your own comments");
  }

  const now = new Date();

  if (now > new Date(data.edited_until)) {
    throw new ValidationError("Edit window has expired");
  }

  // sanitize message
  const cleanedMessage = stripMentionsFromMessage(
    (rawMessage || "").trim(),
    mentions
  );

  if (!cleanedMessage) {
    throw new ValidationError("Message cannot be empty");
  }

  const updatePayload = {
    message: cleanedMessage,
    mentions: Array.isArray(mentions)
      ? mentions.map((m) => ({ id: m.id, name: m.name }))
      : [],
    updated_at: now.toISOString(),
  };

  await commentRef.update(safeForFirestore(updatePayload));

  return {
    ...data,
    ...updatePayload,
  };
};

// ------------------------------------------------------------------
// DELETE COMMENT (soft delete)
// ------------------------------------------------------------------

export const deleteTaskComment = async (task_id, comment_id, user_id) => {
  const user = await getValidAdminUser(user_id);

  const commentRef = db
    .collection(COMMENTS_COLLECTION)
    .doc(task_id)
    .collection(COMMENTS_SUBCOLLECTION)
    .doc(comment_id);

  const doc = await commentRef.get();

  if (!doc.exists) throw new NotFoundError("Comment not found");

  const data = doc.data();

  // ❌ Activity entries cannot be deleted
  if (data.type === "ACTIVITY") {
    throw new ForbiddenError("Activity entries cannot be deleted");
  }

  const isOwner = data.user_id === user.id;
  const isAdmin = user.admin_role === "SUPER_ADMIN";

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError("You cannot delete this comment");
  }

  const now = new Date();

  // already deleted → idempotent success
  if (data.deleted === true) {
    return true;
  }

  const deletePayload = {
    deleted: true,
    updated_at: now.toISOString(),
  };

  await commentRef.update(safeForFirestore(deletePayload));

  // keep comment_count non-negative
  await prisma.task.update({
    where: { id: task_id },
    data: {
      comment_count: { decrement: 1 },
    },
  });

  await prisma.task.updateMany({
    where: {
      id: task_id,
      comment_count: { lt: 0 },
    },
    data: { comment_count: 0 },
  });

  return true;
};
