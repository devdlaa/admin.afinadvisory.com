/**
 * ReminderDialog.utils.js
 *
 * Pure helpers, validation, and state-building utilities for ReminderDialog.
 * No React imports — safe to use anywhere.
 */

import { buildReminderLabel } from "../Remindmedialog/remindMe.utils";

/* ─────────────────────────────────────────────
   STATUS / LIFECYCLE DISPLAY CONFIG
───────────────────────────────────────────── */

export const STATUS_CFG = {
  draft:  { label: "Draft",  bg: "#F1F5F9", color: "#64748B", dot: "#94A3B8" },
  active: { label: "Active", bg: "#DCFCE7", color: "#15803D", dot: "#22C55E" },
  paused: { label: "Paused", bg: "#FEF9C3", color: "#A16207", dot: "#EAB308" },
};

export const LIFECYCLE_CFG = {
  due: (d) => ({
    label: `Due on ${fmtDate(d.due_at)}, ${d.days_overdue}d`,
    bg: "#FEE2E2", color: "#B91C1C", dot: "#EF4444",
  }),
  upcoming: (d) => ({
    label: fmtDate(d.due_at),
    bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6",
  }),
  snoozed: (d) => ({
    label: `Snoozed until ${fmtTime(d.snoozed_until)}`,
    bg: "#F3E8FF", color: "#7E22CE", dot: "#A855F7",
  }),
  completed: (d) => ({
    label: `Completed on ${fmtDate(d.completed_at)} by ${d.completed_by || "—"}`,
    bg: "#FCE7F3", color: "#BE185D", dot: "#EC4899",
  }),
};

/* ─────────────────────────────────────────────
   DATE / TIME FORMATTERS
───────────────────────────────────────────── */

export function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
  if (!iso.includes("T")) return date;
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
  return `${date} • ${time}`;
}

export function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit",
  });
}

/* ─────────────────────────────────────────────
   REMIND-ME LABEL
   Uses the shared buildReminderLabel util so the
   pill always shows the same text as parent pages.
───────────────────────────────────────────── */

export function getReminderPillLabel(reminderConfig) {
  if (!reminderConfig) return "Remind Me";
  return buildReminderLabel(reminderConfig) || "Remind Me";
}

/* ─────────────────────────────────────────────
   ICON MAP  (bucket / list icon key → lucide)
───────────────────────────────────────────── */

import {
  Hash, Briefcase, Home, ShoppingCart, Calendar, DollarSign,
  Heart, BookOpen, Folder, Star, Bell, Clock, Tag, Flag, Phone,
} from "lucide-react";

export const ICON_MAP = {
  PHONE: Phone,
  BRIEFCASE: Briefcase,
  HOME: Home,
  SHOPPING_CART: ShoppingCart,
  CALENDAR: Calendar,
  DOLLAR_SIGN: DollarSign,
  HEART: Heart,
  BOOK_OPEN: BookOpen,
  FOLDER: Folder,
  STAR: Star,
  CLOCK: Clock,
  HASH: Hash,
  TAG: Tag,
  FLAG: Flag,
  BELL: Bell,
};

export const getIconComponent = (iconKey) => ICON_MAP[iconKey] || Hash;

/* ─────────────────────────────────────────────
   INITIAL FORM STATE BUILDERS
───────────────────────────────────────────── */

/**
 * Build the mutable form state from a server reminder object (detail mode)
 * or from scratch (draft mode).
 */
export function buildInitialState(serverData, isDraft) {
  if (isDraft) {
    return {
      title:          "",
      description:    "",
      tags:           [],          // [{ id, name, color_code }]
      bucket:         null,        // { id, name, icon } — list
      assignee:       null,        // { id, name, email }
      reminderConfig: null,        // RemindMe config object
      checklist:      [],          // [{ id, title, is_done, order }]
    };
  }

  return {
    title:          serverData.title          ?? "",
    description:    serverData.description    ?? "",
    tags:           serverData.tags           ?? [],
    bucket:         serverData.bucket         ?? null,
    assignee:       serverData.assignee       ?? null,
    reminderConfig: buildReminderConfigFromServer(serverData),
    checklist:      serverData.checklist_items ?? [],
  };
}

/**
 * Reconstruct a reminderConfig object (matching RemindMe onSet shape)
 * from flat server reminder fields so the pill label renders correctly.
 */
export function buildReminderConfigFromServer(serverData) {
  if (!serverData?.due_at) return null;
  return {
    isRecurring:           serverData.is_recurring        ?? false,
    date:                  serverData.due_at,
    h:                     serverData.h                   ?? null,
    m:                     serverData.m                   ?? null,
    recurrence_type:       serverData.recurrence_type     ?? null,
    recurrence_every:      serverData.recurrence_every    ?? null,
    recurrence_end:        serverData.recurrence_end      ?? null,
    recurrence_ends_after: serverData.recurrence_ends_after ?? null,
    week_days:             serverData.week_days           ?? null,
    repeat_by:             serverData.repeat_by           ?? null,
  };
}

/* ─────────────────────────────────────────────
   DIRTY CHECK
───────────────────────────────────────────── */

/**
 * Returns true when current form state differs from the last-saved snapshot.
 * Used to show/hide the "Update / Discard" footer bar.
 */
export function isDirty(current, saved) {
  if (!saved) return false; // draft — no saved baseline yet

  return (
    current.title          !== saved.title          ||
    current.description    !== saved.description    ||
    current.bucket?.id     !== saved.bucket?.id     ||
    current.assignee?.id   !== saved.assignee?.id   ||
    JSON.stringify(current.tags)      !== JSON.stringify(saved.tags)      ||
    JSON.stringify(current.checklist) !== JSON.stringify(saved.checklist) ||
    JSON.stringify(current.reminderConfig) !== JSON.stringify(saved.reminderConfig)
  );
}

/* ─────────────────────────────────────────────
   VALIDATION
───────────────────────────────────────────── */

/**
 * Returns an error string or null.
 * Rules:
 *   - title is required
 *   - bucket (list) is required
 */
export function validateForm(state) {
  if (!state.title.trim())   return "Title is required.";
  if (!state.bucket?.id)     return "Please select a list before saving.";
  return null;
}

/* ─────────────────────────────────────────────
   PAYLOAD BUILDERS
───────────────────────────────────────────── */

/**
 * Build the payload for createReminder / updateReminder API calls.
 * Maps internal form state → API shape (matches createReminderSchema).
 */
export function buildReminderPayload(state) {
  const rc = state.reminderConfig;
  return {
    title:       state.title.trim(),
    description: state.description?.trim() || null,
    bucket_id:   state.bucket?.id          || null,
    assigned_to: state.assignee?.id        || null,
    tag_ids:     state.tags.map((t) => t.id),

    // due_at: derive from reminderConfig
    due_at: rc?.date ?? null,

    // recurrence
    is_recurring:           rc?.isRecurring           ?? false,
    recurrence_type:        rc?.recurrence_type        ?? null,
    recurrence_every:       rc?.recurrence_every       ?? null,
    recurrence_end:         rc?.recurrence_end         ?? null,
    recurrence_ends_after:  rc?.recurrence_ends_after  ?? null,
    week_days:              rc?.week_days              ?? null,
    repeat_by:              rc?.repeat_by              ?? null,
  };
}

/**
 * Build the checklist sync payload.
 * Matches the sync-checklist API shape.
 */
export function buildChecklistPayload(checklist) {
  return checklist.map((item, idx) => ({
    id:       item.id?.startsWith("c") ? undefined : item.id, // local temp ids excluded
    title:    item.title.trim(),
    is_done:  item.is_done,
    order:    idx,
  }));
}

/* ─────────────────────────────────────────────
   CHECKLIST HELPERS
───────────────────────────────────────────── */

export function makeChecklistItem(title = "", order = 0) {
  return {
    id:      `c${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    is_done: false,
    order,
  };
}