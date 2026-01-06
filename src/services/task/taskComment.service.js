import { prisma } from "@/utils/server/db.js";
import admin from "@/lib/firebase-admin";

import { NotFoundError, ValidationError, ForbiddenError } from "@/utils/errors";

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
      deleted_at: null,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      admin_role: true,
      is_super_admin: true,
    },
  });

  if (!user) {
    throw new ForbiddenError("User inactive or not found");
  }

  return user;
}

async function getTaskOrFail(task_id) {
  const task = await prisma.task.findFirst({
    where: {
      id: task_id,
      deleted_at: null,
    },
    select: {
      id: true,
      created_by: true,
      is_assigned_to_all: true,
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
  if (task.is_assigned_to_all === true) return true;

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

  const message = (rawMessage || "").trim();

  if (!message) {
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

    message,
    activity: null,

    user_id: user.id,
    user_name: user.name,

    mentions: Array.isArray(mentions) ? mentions : [],

    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    edited_until: editedUntil.toISOString(),

    deleted: false,
  };

  // persist comment
  await commentRef.set(payload);

  // sync task metadata
  await prisma.task.update({
    where: { id: task_id },
    data: {
      last_comment_at: now,
      last_commented_by: user.id,
      comment_count: {
        increment: 1,
      },
    },
  });

  // -------------------------------------------------
  // NOTIFICATIONS SECTION
  // -------------------------------------------------

  // 1) If assigned-to-all -> do not notify anyone
  if (task.is_assigned_to_all) {
    return payload;
  }

  // 2) Clean mentions
  const cleanMentions = Array.isArray(mentions)
    ? [...new Set(mentions)].filter((id) => id !== user.id)
    : [];

  let notifyUserIds = [];

  if (cleanMentions.length > 0) {
    // notify only the mentioned users
    notifyUserIds = cleanMentions;
  } else {
    // fallback: notify all task assignees
    const assignees = await prisma.taskAssignment.findMany({
      where: { task_id },
      select: { admin_user_id: true },
    });

    notifyUserIds = assignees
      .map((a) => a.admin_user_id)
      .filter((id) => id !== user.id);
  }

  // if still empty no need to notify
  if (notifyUserIds.length > 0) {
    await notifyMany(notifyUserIds, {
      type: "TASK_COMMENT",
      task_id,
      task_title: task.title,
      comment_id: payload.id,
      author_id: user.id,
      author_name: user.name,
      has_mentions: cleanMentions.length > 0,
      body: message,
      created_at: now.toISOString(),
    });
  }

  return payload;
};

// ------------------------------------------------------------------
// CREATE ACTIVITY ENTRY (backend/internal only)
// ------------------------------------------------------------------

export const addTaskActivityLog = async (task_id, actor_id, activity) => {
  const task = await getTaskOrFail(task_id);
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

    message: null,

    user_id: user.id,
    user_name: user.name,

    activity,

    created_at: now.toISOString(),
    deleted: false,
  };

  await docRef.set(payload);

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
  snapshot.forEach((doc) => items.push(doc.data()));

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
  rawMessage
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

  const message = (rawMessage || "").trim();
  if (!message) {
    throw new ValidationError("Message cannot be empty");
  }

  // Only the author may edit, within editable window
  if (data.user_id !== user.id) {
    throw new ForbiddenError("You may only edit your own comments");
  }

  const now = new Date();

  if (now > new Date(data.edited_until)) {
    throw new ValidationError("Edit window has expired");
  }

  await commentRef.update({
    message,
    updated_at: now.toISOString(),
  });

  return {
    ...data,
    message,
    updated_at: now.toISOString(),
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
  const isAdmin = user.admin_role === "ADMIN" || user.is_super_admin === true;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError("You cannot delete this comment");
  }

  const now = new Date();

  // already deleted → idempotent success
  if (data.deleted === true) {
    return true;
  }

  await commentRef.update({
    deleted: true,
    updated_at: now.toISOString(),
  });

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
