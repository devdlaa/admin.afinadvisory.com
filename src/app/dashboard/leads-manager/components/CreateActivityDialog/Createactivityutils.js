// ─── Activity Type Config ────────────────────────────────────────────────────

export const ACTIVITY_TYPES = [
  { value: "CALL", label: "Call", icon: "Phone" },
  { value: "EMAIL", label: "Email", icon: "Mail" },
  { value: "WHATSAPP", label: "WhatsApp", icon: "MessageCircle" },
  { value: "VIDEO_CALL", label: "Video Call", icon: "Video" },
];

export const ACTIVITY_NATURE = {
  LOG: "LOG",
  SCHEDULED: "SCHEDULED",
};

export const ACTIVITY_STATUS = {
  COMPLETED: "COMPLETED",
  MISSED: "MISSED",
};

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateForm(form) {
  const errors = {};

  if (!form.activity_type) {
    errors.activity_type = "Please select an activity type.";
  }

  if (!form.title || !form.title.trim()) {
    errors.title = "Activity title is required.";
  } else if (form.title.trim().length > 120) {
    errors.title = "Title cannot exceed 120 characters.";
  }

  if (form.description && form.description.trim().length > 300) {
    errors.description = "Description cannot exceed 300 characters.";
  }

  const isLog = form.nature === ACTIVITY_NATURE.LOG;
  const isScheduled = form.nature === ACTIVITY_NATURE.SCHEDULED;

  if (isLog) {
    if (!form.status) {
      errors.status = "Please select a status for this log.";
    }
    if (
      form.status === ACTIVITY_STATUS.COMPLETED &&
      !form.completion_note?.trim()
    ) {
      errors.completion_note = "Please provide a completion note.";
    }
    if (form.status === ACTIVITY_STATUS.MISSED && !form.missed_reason?.trim()) {
      errors.missed_reason =
        "Please provide a reason for missing this activity.";
    }
  }

  if (isScheduled) {
    if (!form.scheduled_at) {
      errors.scheduled_at = "Please select a date for this activity.";
    } else {
      const selected = new Date(form.scheduled_at);
      const now = new Date();

      if (selected < now) {
        errors.scheduled_at = "Scheduled time cannot be in the past.";
      }

      // If scheduled for today, time component must be intentional (not midnight default)
      const todayStr = todayISO();
      const selDate = form.scheduled_at.split("T")[0];
      if (selDate === todayStr) {
        const selHour = selected.getHours();
        const selMin = selected.getMinutes();
        if (selHour === 0 && selMin === 0) {
          errors.scheduled_at =
            "Please also specify a time when scheduling for today.";
        }
      }
    }
  }

  return errors;
}

// ─── Payload Builder ─────────────────────────────────────────────────────────

export function buildPayload(form) {
  const isLog = form.nature === ACTIVITY_NATURE.LOG;
  const isScheduled = form.nature === ACTIVITY_NATURE.SCHEDULED;

  const payload = {
    activity_type: form.activity_type,
    title: form.title.trim(),
  };

  if (form.description?.trim()) {
    payload.description = form.description.trim();
  }

  if (isLog) {
    payload.status = form.status;

    if (form.status === ACTIVITY_STATUS.COMPLETED) {
      payload.completion_note = form.completion_note.trim();
    }

    if (form.status === ACTIVITY_STATUS.MISSED) {
      payload.missed_reason = form.missed_reason.trim();
      payload.missed_by = "CLIENT";
    }
  }

  if (isScheduled) {
    payload.scheduled_at = form.scheduled_at; // already a valid ISO string

    if (form.activity_type === "EMAIL" && form.email) {
      payload.email = form.email;
    }
  }

  return payload;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export function formatDisplayDate(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDisplayTime(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour} : ${String(m).padStart(2, "0")} ${ampm}`;
}
