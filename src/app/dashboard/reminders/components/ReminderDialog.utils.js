/**
 * ReminderDialog.utils.js
 *
 * Pure helpers — no component code, no dummy data, no side effects.
 */

// ─── Payload builders ────────────────────────────────────────────────────────

/**
 * Builds the reminder payload to send to the API (create or update).
 * Keeps bucket as its raw form — the parent/API layer normalises as needed.
 */
export function buildReminderPayload(form) {
  // bucket is always a plain object (or null) — normalised in handleListDone
  const bucket = Array.isArray(form.bucket) ? form.bucket[0] : form.bucket;
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    tag_ids: form.tags.map((t) => t.id),
    bucket_id: bucket?.id ?? null,
    assigned_to: form.assignee?.id ?? null,
    reminder_config: form.reminderConfig ?? null,
  };
}

/**
 * Builds the checklist payload for onSyncChecklist.
 */
export function buildChecklistPayload(checklist) {
  return checklist.map((item) => ({
    id: item.id,
    text: item.text,
    done: item.done,
  }));
}

// ─── Pill label ──────────────────────────────────────────────────────────────

/**
 * Returns the display label for the Remind Me pill.
 * `config` shape is whatever RemindMeDialog produces — adjust as needed.
 */
export function getReminderPillLabel(config) {
  if (!config) return "Remind Me *";

  // date-only
  if (config.date && !config.time) {
    return formatDate(config.date);
  }

  // date + time
  if (config.date && config.time) {
    return `${formatDate(config.date)} ${config.time}`;
  }

  // recurring
  if (config.recurring) {
    return config.recurring;
  }

  return "Remind Me";
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}
