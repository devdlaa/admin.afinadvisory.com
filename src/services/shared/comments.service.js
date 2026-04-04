import { prisma } from "@/utils/server/db.js";
import admin from "@/lib/firebase-admin";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/utils/server/errors";
import { safeForFirestore } from "@/utils/server/utils";

import { notify } from "./notifications.service";

const db = admin.firestore();

const COMMENTS_COLLECTION = "task_comments";
const COMMENTS_SUBCOLLECTION = "comments";

const EDIT_WINDOW_HOURS = 48;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

async function ensureUserCanAccessTask(task_id, user) {
  const where =
    user.admin_role === "SUPER_ADMIN"
      ? { id: task_id }
      : {
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
        };

  const task = await prisma.task.findFirst({
    where,
    select: {
      id: true,
      title: true,
      created_by: true,
      assigned_to_all: true,
      deleted_at: true,
    },
  });

  if (!task) {
    throw new ForbiddenError("You do not have access to this task");
  }

  if (task.deleted_at) {
    throw new ForbiddenError(
      "Comments cannot be modified because the task is deleted",
    );
  }

  return task;
}

async function ensureUserCanViewTask(task_id, user) {
  if (user.admin_role === "SUPER_ADMIN") {
    const task = await prisma.task.findUnique({
      where: { id: task_id },
      select: { id: true },
    });

    if (!task) throw new NotFoundError("Task not found");
    return task;
  }

  const task = await prisma.task.findFirst({
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

export async function ensureUserCanAccessLead(lead_id, user) {
  if (user.admin_role === "SUPER_ADMIN") {
    const lead = await prisma.lead.findUnique({
      where: { id: lead_id },
      select: {
        id: true,
        title: true,
        deleted_at: true,
      },
    });

    if (!lead) {
      throw new NotFoundError("Lead not found");
    }

    if (lead.deleted_at) {
      throw new ForbiddenError(
        "Comments cannot be modified because the lead is deleted",
      );
    }

    return lead;
  }

  // ONLY assigned users
  const lead = await prisma.lead.findFirst({
    where: {
      id: lead_id,
      deleted_at: null,
      assignments: {
        some: {
          admin_user_id: user.id,
        },
      },
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!lead) {
    throw new ForbiddenError("You do not have access to this lead");
  }

  return lead;
}

async function getValidAdminUser(userId) {
  const user = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      admin_role: true,
      status: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
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

// SCOPES FOR MODULER USE
export const COMMENT_SCOPES = {
  TASK: {
    collection: "task_comments",

    ensureAccess: ensureUserCanAccessTask,

    async onCreate({ scope_id, user, now }) {
      await prisma.task.update({
        where: { id: scope_id },
        data: {
          last_comment_at: now,
          last_commented_by: user.id,
          comment_count: { increment: 1 },
        },
      });
    },

    onDelete: async ({ scope_id }) => {
      await prisma.task.update({
        where: { id: scope_id },
        data: {
          comment_count: { decrement: 1 },
        },
      });

      await prisma.task.updateMany({
        where: {
          id: scope_id,
          comment_count: { lt: 0 },
        },
        data: { comment_count: 0 },
      });
    },

    async getNotificationUsers({ scope_id, user, mentions, entity }) {
      if (entity.assigned_to_all) return [];

      const mentionIds = mentions
        .map((m) => m.id)
        .filter((id) => id !== user.id);

      if (mentionIds.length > 0) return mentionIds;

      const assignees = await prisma.taskAssignment.findMany({
        where: { task_id: scope_id },
        select: { admin_user_id: true },
      });

      return assignees
        .map((a) => a.admin_user_id)
        .filter((id) => id !== user.id);
    },

    buildNotification({ entity, message, scope_id, comment_id, user }) {
      return {
        type: "TASK_COMMENT",
        title: `New comment on ${entity.title}`,
        body:
          message.length > 100 ? `${message.substring(0, 100)}...` : message,
        task_id: scope_id,
        comment_id,
        actor_id: user.id,
        actor_name: user.name,
        link: `/dashboard/task-managment?taskId=${scope_id}&tab=task-activity`,
      };
    },
  },

  LEAD: {
    collection: "lead_comments",

    ensureAccess: ensureUserCanAccessLead,

    async onCreate() {
      // no-op for now
    },

    async getNotificationUsers({ scope_id, user, mentions }) {
      const mentionIds = mentions
        .map((m) => m.id)
        .filter((id) => id !== user.id);

      if (mentionIds.length > 0) return mentionIds;

      const assignees = await prisma.leadAssignment.findMany({
        where: { lead_id: scope_id },
        select: { admin_user_id: true },
      });

      return assignees
        .map((a) => a.admin_user_id)
        .filter((id) => id !== user.id);
    },

    buildNotification({ entity, message, scope_id, comment_id, user }) {
      return {
        type: "LEAD_COMMENT",
        title: `New comment on ${entity.title}`,
        body:
          message.length > 100 ? `${message.substring(0, 100)}...` : message,
        lead_id: scope_id,
        comment_id,
        actor_id: user.id,
        actor_name: user.name,
        link: `/dashboard/leads?leadId=${scope_id}`,
      };
    },
  },
};

// ------------------------------------------------------------------
// CREATE COMMENT
// ------------------------------------------------------------------

export const createComment = async (
  scope,
  scope_id,
  userId,
  rawMessage,
  mentions = [],
  isPrivate = false,
) => {
  const config = COMMENT_SCOPES[scope];

  if (!config) {
    throw new ValidationError("Invalid comment scope");
  }

  const user = await getValidAdminUser(userId);

  const entity = await config.ensureAccess(scope_id, user);

  const cleanedMessage = stripMentionsFromMessage(
    (rawMessage || "").trim(),
    mentions,
  );

  if (!cleanedMessage) {
    throw new ValidationError("Message cannot be empty");
  }

  const commentRef = db
    .collection(config.collection)
    .doc(scope_id)
    .collection("comments")
    .doc();

  const now = new Date();
  const editedUntil = new Date(
    now.getTime() + EDIT_WINDOW_HOURS * 60 * 60 * 1000,
  );

  const payload = {
    id: commentRef.id,
    scope,
    scope_id,
    type: "COMMENT",
    message: cleanedMessage,
    activity: null,
    user_id: user.id,
    user_name: user.name,
    is_private: Boolean(isPrivate),
    is_pinned: false,

    mentions: Array.isArray(mentions)
      ? mentions.map((m) => ({ id: m.id, name: m.name }))
      : [],

    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    edited_until: editedUntil.toISOString(),
    deleted: false,
  };

  await commentRef.set(safeForFirestore(payload));

  // scope-specific DB updates
  if (config.onCreate) {
    await config.onCreate({ scope_id, user, now });
  }

  // skip notifications if private
  if (!isPrivate && config.getNotificationUsers) {
    const notifyUserIds = await config.getNotificationUsers({
      scope_id,
      user,
      mentions: payload.mentions,
      entity,
    });

    if (notifyUserIds.length > 0 && config.buildNotification) {
      await notify(
        notifyUserIds,
        config.buildNotification({
          entity,
          message: cleanedMessage,
          scope_id,
          comment_id: payload.id,
          user,
        }),
      );
    }
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
  const HAS_STATUS_TIMELINE_UPDATED =
    [
      "TASK_CREATED",
      "TASK_DELETED",
      "TASK_RESTORED",
      "TASK_ASSIGNMENT_UPDATED",
    ].includes(activity.action) ||
    (activity.meta?.changes ?? []).some((c) => c.from?.status || c.to?.status);
  const now = new Date();
  const payload = {
    id: docRef.id,
    task_id,
    type: "ACTIVITY",
    timeline_type: HAS_STATUS_TIMELINE_UPDATED ? "STATUS_TIMELINE" : null,
    user_id: user.id,
    user_name: user.name,
    user_email: user.email,
    message: activity.message,
    activity: { action: activity.action, meta: activity.meta ?? null },
    created_at: now.toISOString(),
    deleted: false,
  };
  await docRef.set(safeForFirestore(payload));
  await prisma.task.update({
    where: { id: task_id },
    data: { last_activity_at: now, last_activity_by: user.id },
  });
  return payload;
};

export const addLeadActivityLog = async (lead_id, actor_id, activity) => {
  const user = await getValidAdminUser(actor_id);

  const config = COMMENT_SCOPES.LEAD;

  const docRef = db
    .collection(config.collection)
    .doc(lead_id)
    .collection(COMMENTS_SUBCOLLECTION)
    .doc();

  const now = new Date();

  const payload = {
    id: docRef.id,
    lead_id,
    scope: "LEAD",

    type: "ACTIVITY",

    user_id: user.id,
    user_name: user.name,
    user_email: user.email,

    message: activity.message,

    activity: {
      action: activity.action,
      meta: activity.meta ?? null,
    },

    created_at: now.toISOString(),
    deleted: false,
  };

  await docRef.set(safeForFirestore(payload));

  await prisma.lead.update({
    where: { id: lead_id },
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

export const listTimeline = async (
  scope,
  scope_id,
  { limit = 20, cursor = null, type = "ALL", user_id = null } = {},
  currentUser,
) => {
  const config = COMMENT_SCOPES[scope];

  if (!config) {
    throw new ValidationError("Invalid comment scope");
  }

  await config.ensureAccess(scope_id, currentUser);

  if (limit <= 0 || limit > 100) {
    throw new ValidationError("Invalid pagination limit");
  }

  let ref = db
    .collection(config.collection)
    .doc(scope_id)
    .collection("comments")
    .where("deleted", "==", false);

  if (user_id) {
    ref = ref.where("user_id", "==", user_id);
  }

  if (type === "COMMENT") {
    ref = ref.where("type", "==", "COMMENT");
  } else if (type === "ACTIVITY") {
    ref = ref.where("type", "==", "ACTIVITY");
  }

  if (scope === "LEAD" && type === "COMMENT") {
    ref = ref
      .orderBy("is_pinned", "desc")
      .orderBy("created_at", "desc")
      .limit(limit);
  } else {
    ref = ref.orderBy("created_at", "desc").limit(limit);
  }

  if (cursor) {
    const cursorDoc = await db
      .collection(config.collection)
      .doc(scope_id)
      .collection("comments")
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

    if (
      scope === "LEAD" &&
      data.is_private === true &&
      data.user_id !== currentUser.id
    ) {
      return;
    }

    // normalize mentions
    if (Array.isArray(data.mentions)) {
      data.mentions = data.mentions.map((m) => {
        if (typeof m === "string") {
          return { id: m, name: "Unknown" };
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

// INTERNAL USE ONLY
export const listPinnedLeadComments = async (lead_id, currentUser) => {
  const config = COMMENT_SCOPES["LEAD"];

  if (!config) {
    throw new ValidationError("Invalid comment scope");
  }

  let ref = db
    .collection(config.collection)
    .doc(lead_id)
    .collection("comments")
    .where("deleted", "==", false)
    .where("type", "==", "COMMENT")
    .where("is_pinned", "==", true)
    .where("is_private", "==", false)
    .orderBy("created_at", "desc")
    .limit(5);

  const snapshot = await ref.get();

  const items = [];

  snapshot.forEach((doc) => {
    const data = doc.data();

    // privacy rule (same as listTimeline)
    if (data.is_private === true && data.user_id !== currentUser.id) {
      return;
    }

    // normalize mentions (same logic)
    if (Array.isArray(data.mentions)) {
      data.mentions = data.mentions.map((m) => {
        if (typeof m === "string") {
          return { id: m, name: "Unknown" };
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

export const updateComment = async (
  scope, // "TASK" | "LEAD"
  scope_id,
  comment_id,
  user_id,
  rawMessage,
  mentions = [],
  isPrivate, // optional toggle
  isPinned,
) => {
  const config = COMMENT_SCOPES[scope];

  if (!config) {
    throw new ValidationError("Invalid comment scope");
  }

  const user = await getValidAdminUser(user_id);

  await config.ensureAccess(scope_id, user);

  const commentRef = db
    .collection(config.collection)
    .doc(scope_id)
    .collection("comments")
    .doc(comment_id);

  const doc = await commentRef.get();

  if (!doc.exists) throw new NotFoundError("Comment not found");

  const data = doc.data();

  const isOwner = data.user_id === user.id;
  const isAdmin = user.admin_role === "SUPER_ADMIN";

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError("You may only edit your own comments");
  }

  // keep for future activity logs
  if (data.type === "ACTIVITY") {
    throw new ForbiddenError("Activity entries cannot be edited");
  }

  if (data.deleted) {
    throw new ValidationError("Comment has been deleted");
  }

  const now = new Date();

  if (scope != "LEAD" && now > new Date(data.edited_until)) {
    throw new ValidationError("Edit window has expired");
  }

  // sanitize message
  const cleanedMessage = stripMentionsFromMessage(
    (rawMessage || "").trim(),
    mentions,
  );

  const updatePayload = {
    updated_at: now.toISOString(),
    ...(cleanedMessage && { message: cleanedMessage }),
    ...(mentions.length > 0 && {
      mentions: mentions.map((m) => ({ id: m.id, name: m.name })),
    }),
  };
  if (scope === "LEAD" && typeof isPrivate === "boolean") {
    updatePayload.is_private = isPrivate;
  }
  // add right after
  if (typeof isPinned === "boolean") {
    updatePayload.is_pinned = isPinned;
  }

  await commentRef.update(safeForFirestore(updatePayload));

  return {
    ...data,
    ...updatePayload,
  };
};

// ------------------------------------------------------------------
// DELETE COMMENT (soft delete)
// ------------------------------------------------------------------

export const deleteComment = async (
  scope, // "TASK" | "LEAD"
  scope_id,
  comment_id,
  user_id,
) => {
  const config = COMMENT_SCOPES[scope];

  if (!config) {
    throw new ValidationError("Invalid comment scope");
  }

  const user = await getValidAdminUser(user_id);

  await config.ensureAccess(scope_id, user);

  const commentRef = db
    .collection(config.collection)
    .doc(scope_id)
    .collection("comments")
    .doc(comment_id);

  const doc = await commentRef.get();

  if (!doc.exists) throw new NotFoundError("Comment not found");

  const data = doc.data();

  // prevent deleting activity logs
  if (data.type === "ACTIVITY") {
    throw new ForbiddenError("Activity entries cannot be deleted");
  }

  const isOwner = data.user_id === user.id;
  const isAdmin = user.admin_role === "SUPER_ADMIN";

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError("You cannot delete this comment");
  }

  // already deleted → idempotent
  if (data.deleted === true) {
    return true;
  }

  const now = new Date();

  const deletePayload = {
    deleted: true,
    updated_at: now.toISOString(),
  };

  await commentRef.update(safeForFirestore(deletePayload));

  if (config.onDelete) {
    await config.onDelete({ scope_id });
  }

  return true;
};

// TAKS STATUS BASED TIMELINE
const STATUS_META = {
  PENDING: { label: "Pending" },
  IN_PROGRESS: { label: "In Progress" },
  ON_HOLD: { label: "On Hold" },
  PENDING_CLIENT_INPUT: { label: "Pending Client Input" },
  COMPLETED: { label: "Completed" },
  CANCELLED: { label: "Cancelled" },
};

const ACTION_META = {
  TASK_CREATED: { label: "Task Created", description: "Task was created" },
  TASK_DELETED: { label: "Task Deleted", description: "Task was deleted" },
  TASK_RESTORED: { label: "Task Restored", description: "Task was restored" },
};

export const getTaskStatusTimeline = async (task_id, currentUser) => {
  await ensureUserCanViewTask(task_id, currentUser);

  const snapshot = await db
    .collection(COMMENTS_COLLECTION)
    .doc(task_id)
    .collection(COMMENTS_SUBCOLLECTION)
    .where("deleted", "==", false)
    .where("timeline_type", "==", "STATUS_TIMELINE")
    .orderBy("created_at", "asc")
    .get();

  const timeline = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const action = data.activity?.action;
    const changes = data.activity?.meta?.changes ?? [];
    const reason = data.activity?.meta?.reason ?? null;

    // ── Lifecycle events ──────────────────────────────────────────
    if (["TASK_CREATED", "TASK_DELETED", "TASK_RESTORED"].includes(action)) {
      const meta = ACTION_META[action];
      timeline.push({
        id: data.id,
        type: action,
        label: meta.label,
        description: meta.description,
        by: { id: data.user_id, name: data.user_name },
        at: data.created_at,
        reason: null,
        status: null,
        previous_status: null,
      });
      return;
    }

    // ── Status change ─────────────────────────────────────────────
    if (action === "TASK_UPDATED") {
      const statusChange = changes.find((c) => c.from?.status || c.to?.status);
      if (!statusChange) return;

      const toStatus = statusChange.to?.status ?? null;
      const fromStatus = statusChange.from?.status ?? null;
      const toMeta = STATUS_META[toStatus] ?? { label: toStatus };
      const fromMeta = STATUS_META[fromStatus] ?? { label: fromStatus };

      timeline.push({
        id: data.id,
        type: "STATUS_CHANGED",
        label: toMeta.label,
        description: `Changed from ${fromMeta.label} to ${toMeta.label}`,
        by: { id: data.user_id, name: data.user_name },
        at: data.created_at,
        reason,
        status: { value: toStatus, label: toMeta.label },
        previous_status: { value: fromStatus, label: fromMeta.label },
      });
      return;
    }

    // ── Assignment events ─────────────────────────────────────────
    if (action === "TASK_ASSIGNMENT_UPDATED") {
      if (!changes.length) return;

      const assignedToAll = changes.find((c) => c.action === "ASSIGNED_TO_ALL");

      if (assignedToAll) {
        timeline.push({
          id: data.id,
          type: "ASSIGNED_TO_ALL",
          label: "Assigned to all members",
          description: "Task was assigned to all team members",
          by: { id: data.user_id, name: data.user_name },
          at: data.created_at,
          reason: null,
          status: null,
          previous_status: null,
          assignmentChanges: changes,
        });
        return;
      }

      // Individual add/remove changes — group them into one entry per activity log
      const added = changes
        .filter((c) => c.action === "ASSIGNEE_ADDED")
        .map((c) => c.to)
        .filter(Boolean);

      const removed = changes
        .filter((c) => c.action === "ASSIGNEE_REMOVED")
        .map((c) => c.from)
        .filter(Boolean);

      timeline.push({
        id: data.id,
        type: "ASSIGNMENT_CHANGED",
        label: "Assignments updated",
        description: data.activity?.message ?? "Assignments updated",
        by: { id: data.user_id, name: data.user_name },
        at: data.created_at,
        reason: null,
        status: null,
        previous_status: null,
        assignmentChanges: { added, removed },
      });
    }
  });

  return { timeline };
};
