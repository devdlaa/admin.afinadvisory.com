export function shouldSync(reminder) {
  if (!reminder) return false;

  const offsetMs = new Date().getTimezoneOffset() * -60 * 1000;

  const nowLocal = Date.now() + offsetMs;
  const DAY_MS = 24 * 60 * 60 * 1000;

  const startOfDayLocal = nowLocal - (nowLocal % DAY_MS);
  const endOfDayLocal = startOfDayLocal + DAY_MS - 1;

  const rawTime = reminder.snoozed_until
    ? new Date(reminder.snoozed_until).getTime()
    : new Date(reminder.due_at).getTime();

  const timeLocal = rawTime + offsetMs;

  return timeLocal >= startOfDayLocal && timeLocal <= endOfDayLocal;
}

export function syncToExtension({ action, payload }) {
  console.log("SENT TO EXTENTION", action, payload);
  try {
    window.postMessage(
      {
        type: "REMINDER_SYNC",
        action, // CREATED | UPDATED | REMOVE | ACKNOWLEDGE | SNOOZE
        payload,
      },
      window.location.origin,
    );
  } catch (err) {
    console.error("[Sync] Failed:", err);
  }
}
