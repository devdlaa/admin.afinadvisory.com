/**
 * reminderUtils.js
 * Utility for greeting text and date info used in the Reminders page
 */
import { Sun, Sunrise, Sunset, Moon } from "lucide-react";
import {
  REMINDER_TAG_COLORS,
  REMINDER_LIST_ICONS,
} from "@/services/reminders/reminder.constants";

export function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      icon: Sunrise,
      greeting: "Good Morning",
      color: "#F59E0B", // warm amber
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      icon: Sun,
      greeting: "Good Afternoon",
      color: "#FBBF24",
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      icon: Sunset,
      greeting: "Good Evening",
      color: "#F97316", // orange
    };
  } else {
    return {
      icon: Moon,
      greeting: "Good Night",
      color: "#6366F1", // indigo
    };
  }
}

/**
 * Returns current date info
 * @returns {{ day: number, dayOfWeek: string, month: string, year: number, full: Date }}
 */
export function getDateInfo() {
  const now = new Date();

  const dayOfWeek = now
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
  const month = now.toLocaleDateString("en-US", { month: "long" });

  return {
    day: now.getDate(),
    dayOfWeek,
    month,
    year: now.getFullYear(),
    full: now,
  };
}

export const REMINDER_TABS = [
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today's Reminders" },
  { id: "all", label: "All" },
];

export function parseArrayParam(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function buildQueryString(tab, buckets, tags) {
  const params = new URLSearchParams();
  if (tab) params.set("tab", tab);
  if (buckets.length) params.set("buckets", buckets.join(","));
  if (tags.length) params.set("tags", tags.join(","));
  return params.toString();
}

export function getRecurringLabel(reminder) {
  if (!reminder.is_recurring) return null;

  const type = reminder.recurrence_type?.toLowerCase();
  const every = reminder.recurrence_every || 1;

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  switch (type) {
    case "daily":
      return every === 1 ? "Every day" : `Every ${every} days`;

    case "weekly":
      if (reminder.week_days?.length) {
        return `Every ${reminder.week_days.join(", ")}`;
      }
      return every === 1 ? "Every week" : `Every ${every} weeks`;

    case "monthly":
      if (reminder.repeat_by === "day_of_month" && reminder.due_at) {
        const d = new Date(reminder.due_at);
        return `Every ${every > 1 ? every + " months" : "month"} on ${d.getDate()}th`;
      }
      return `Every ${every > 1 ? every + " months" : "month"}`;

    case "yearly":
      return every === 1 ? "Every year" : `Every ${every} years`;

    default:
      return cap(type || "Recurring");
  }
}

// utils/reminderDisplay.js

export function formatDateTime(dateStr) {
  if (!dateStr) return null;

  const d = new Date(dateStr);

  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getSnoozedLabel(reminder) {
  if (!reminder.snoozed_until) return null;

  const snooze = new Date(reminder.snoozed_until);
  if (snooze <= new Date()) return null;

  return `Snoozed until ${formatDateTime(reminder.snoozed_until)}`;
}

export function getDueLabel(reminder) {
  if (!reminder.due_at) return null;

  return `Due ${formatDateTime(reminder.due_at)}`;
}

// ─── Status tag builder ───────────────────────────────────────────────────────

function buildStatusTags(raw) {
  const tags = [];

  if (raw.completed_at) {
    tags.push({
      label: "Completed",
      bg: "#D1FAE5",
      color: "#065F46",
      dot: "#10B981",
    });
    return tags;
  }

  if (raw.snoozed_until && new Date(raw.snoozed_until) > new Date()) {
    tags.push({
      label: "Snoozed",
      bg: "#F3E8FF",
      color: "#6B21A8",
      dot: "#A855F7",
    });
  }

  if (raw.is_time_sensitive) {
    tags.push({
      label: "Time Sensitive",
      bg: "#FEF3C7",
      color: "#92400E",
      dot: "#F59E0B",
    });
  }

  const statusMap = {
    pending: {
      label: "Pending",
      bg: "#FEF9C3",
      color: "#854D0E",
      dot: "#EAB308",
    },
    in_progress: {
      label: "In Progress",
      bg: "#DBEAFE",
      color: "#1E40AF",
      dot: "#3B82F6",
    },
    overdue: {
      label: "Overdue",
      bg: "#FEE2E2",
      color: "#991B1B",
      dot: "#EF4444",
    },
    cancelled: {
      label: "Cancelled",
      bg: "#F3F4F6",
      color: "#374151",
      dot: "#9CA3AF",
    },
  };

  // Derive overdue from due_at if status doesn't say so already
  const isOverdue =
    raw.due_at &&
    new Date(raw.due_at) < new Date() &&
    !raw.completed_at &&
    raw.status !== "cancelled";

  const resolvedStatus = isOverdue ? "overdue" : raw.status;

  if (resolvedStatus && statusMap[resolvedStatus]) {
    tags.push(statusMap[resolvedStatus]);
  }

  if (raw.is_recurring) {
    tags.push({
      label: "Recurring",
      bg: "#E0E7FF",
      color: "#3730A3",
      dot: "#6366F1",
    });
  }

  return tags;
}

// ─── reminderConfig builder ───────────────────────────────────────────────────
// Reconstructs the shape RemindMeDialog / buildReminderPayload expects.

function buildReminderConfig(raw) {
  if (!raw.due_at) return null;

  const d = new Date(raw.due_at);

  return {
    date: raw.due_at,
    isRecurring: raw.is_recurring ?? false,
    h: d.getHours(),
    m: d.getMinutes(),
    ...(raw.is_recurring && {
      recurrence_type: raw.recurrence_type ?? null,
      recurrence_every: raw.recurrence_every ?? 1,
      recurrence_end: raw.recurrence_end ?? null,
      recurrence_ends_after: raw.recurrence_ends_after ?? null,
      week_days: raw.week_days ?? [],
      repeat_by: raw.repeat_by ?? null,
    }),
  };
}

// ─── bucket normaliser ────────────────────────────────────────────────────────
// API returns { id, name, icon } where icon is a REMINDER_LIST_ICONS key.
// The dialog pill also needs icon_bg and icon_stroke.

function normaliseBucket(rawBucket) {
  if (!rawBucket) return null;

  const iconDef =
    REMINDER_LIST_ICONS[rawBucket.icon] ?? REMINDER_LIST_ICONS.HASH;

  return {
    id: rawBucket.id,
    name: rawBucket.name,
    icon: iconDef.icon, // string key used by REMINDER_ICON_COMPONENTS
    icon_bg: iconDef.bg,
    icon_stroke: iconDef.stroke,
  };
}

// ─── tag normaliser ───────────────────────────────────────────────────────────
// API returns { id, name, color } — dialog expects color_code.
// color may be a REMINDER_TAG_COLORS key ("RED") or already a hex string.

function normaliseTag(t) {
  const hex =
    REMINDER_TAG_COLORS[t.color] ?? // key lookup  e.g. "RED" → "#EF4444"
    t.color ?? // raw hex from DB
    t.color_code ?? // already normalised
    "#6B7280"; // fallback gray

  return { id: t.id, name: t.name, color_code: hex };
}

// ─── checklist normaliser ─────────────────────────────────────────────────────
// API: { id, title, is_done, order } → dialog: { id, text, done, order }

function normaliseChecklist(items = []) {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    is_done: item.done,
    order: item.order,
  }));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function transformReminderDetail(raw) {
  if (!raw) return null;

  return {
    id: raw.id,

    // pre-computed for the dialog header
    statusTags: buildStatusTags(raw),

    // form fields
    title: raw.title ?? "",
    description: raw.description ?? "",
    tags: (raw.tags ?? []).map(normaliseTag),
    bucket: normaliseBucket(raw.bucket),
    assignee: raw.assignee ?? null,
    task: raw.task ?? null,
    checklist: normaliseChecklist(raw.checklist_items),
    reminderConfig: buildReminderConfig(raw),
  };
}
