/* ─── CONSTANTS ─────────────────────────────────────────────── */

export const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MSHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Every 15-minute slot across a 24-hour day. */
export const TIME_OPTS = (() => {
  const o = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 15) {
      const ap = h < 12 ? "AM" : "PM";
      const hh = h % 12 === 0 ? 12 : h % 12;
      o.push({ label: `${hh}:${String(m).padStart(2, "0")} ${ap}`, h, m });
    }
  return o;
})();

export const REPEAT_OPTS = {
  DAILY: Array.from({ length: 30 }, (_, i) => ({
    label: `${i + 1} Day${i ? "s" : ""}`,
    val: i + 1,
  })),
  WEEKLY: Array.from({ length: 20 }, (_, i) => ({
    label: `${i + 1} Week${i ? "s" : ""}`,
    val: i + 1,
  })),
  MONTHLY: Array.from({ length: 20 }, (_, i) => ({
    label: `${i + 1} Month${i ? "s" : ""}`,
    val: i + 1,
  })),
  YEARLY: Array.from({ length: 20 }, (_, i) => ({
    label: `${i + 1} Year${i ? "s" : ""}`,
    val: i + 1,
  })),
};

/* ─── DATE HELPERS ──────────────────────────────────────────── */

/** Returns today at midnight (local time). */
export const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Adds `n` calendar days to date `d` (returns a new Date). */
export const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

/** Returns the next Monday on or after `d`. */
export const nextMonday = (d) => {
  const r = new Date(d);
  const day = r.getDay(); // 0 = Sun
  r.setDate(r.getDate() + (day === 0 ? 1 : (8 - day) % 7 || 7));
  return r;
};

/** True when two Date objects represent the same calendar day. */
export const isSameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/* ─── FORMAT HELPERS ────────────────────────────────────────── */

/** "Jan 07, 2026" */
export const fmtShort = (d) =>
  d
    ? `${MSHORT[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}, ${d.getFullYear()}`
    : "";

/** "9:00 AM" — returns null when h or m is null/undefined. */
export const fmtTime = (h, m) => {
  if (h === null || h === undefined || m === null || m === undefined)
    return null;
  const ap = h < 12 ? "AM" : "PM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
};

/** "7 Jan 2026" */
export const fmtDMY = (d) =>
  d ? `${d.getDate()} ${MSHORT[d.getMonth()]} ${d.getFullYear()}` : "";

/** "Jan 07, 2026, 9:00 AM" (time portion omitted when h/m are null). */
export const fmtFull = (d, h, m) => {
  if (!d) return "";
  const t = fmtTime(h, m);
  return t ? `${fmtShort(d)}, ${t}` : fmtShort(d);
};

/* ─── CALENDAR GRID ─────────────────────────────────────────── */

/**
 * Builds a 42-cell (6-week) calendar grid for the given year/month.
 * Each cell: { day: number, cur: boolean }
 * `cur: false` means the day belongs to the previous or next month.
 */
export const buildGrid = (year, month) => {
  const startDay = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0
  const dim = new Date(year, month + 1, 0).getDate();
  const prev = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = startDay - 1; i >= 0; i--)
    cells.push({ day: prev - i, cur: false });
  for (let i = 1; i <= dim; i++) cells.push({ day: i, cur: true });
  for (let i = 1; cells.length < 42; i++) cells.push({ day: i, cur: false });

  return cells;
};

/* ─── DEFAULT STATE ─────────────────────────────────────────── */

/**
 * Returns a fresh default recurring-config object.
 * Always call as a function so `todayMidnight()` is evaluated at call time.
 */
export const defaultRec = () => ({
  type: "DAILY",
  repeatEvery: 1,
  weekDays: [5], // Friday by default
  repeatBy: "Day of the month",
  neverEnds: true,
  endsOnDate: null,
  endsAfter: null,
  startsOn: todayMidnight(),
  startsH: null,
  startsM: null,
});

/* ─── LABEL BUILDER ─────────────────────────────────────────── */

/**
 * Derives a human-readable reminder label from a saved config object.
 * Safe to call with `null` / `undefined` (returns empty string).
 *
 * The config shape mirrors the object emitted by RemindMeDialog's `onSet`:
 *   {
 *     isRecurring:         boolean,
 *     date:                ISO string,
 *     h:                   number | null,
 *     m:                   number | null,
 *     recurrence_type:     "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | null,
 *     recurrence_every:    number | null,
 *     week_days:           number[] | null,   // 1=Mo … 7=Su
 *     repeat_by:           string | null,
 *     recurrence_end:      ISO string | null,
 *     recurrence_ends_after: number | null,
 *   }
 *
 * Usage in a parent component:
 *   import { buildReminderLabel } from "./remindMe.utils";
 *
 *   const config = await fetchFromServer();      // may be null
 *   const label  = buildReminderLabel(config);   // "Every Week on Mo, We, Fr" etc.
 *   // Show <Pill>{label || "Set reminder"}</Pill>
 */
export const buildReminderLabel = (config) => {
  if (!config) return "";

  if (!config.isRecurring) {
    // One-off reminder
    const d = config.date ? new Date(config.date) : null;
    return fmtFull(d, config.h ?? null, config.m ?? null);
  }

  // Recurring
  const e = config.recurrence_every ?? 1;
  const d = config.date ? new Date(config.date) : null;
  const t = fmtTime(config.h ?? null, config.m ?? null);
  const ts = t ? ` ${t}` : "";

  switch (config.recurrence_type) {
    case "DAILY":
      return e === 1 ? `Every Day${ts}` : `Every ${e} Days${ts}`;

    case "WEEKLY": {
      const sel = [...(config.week_days ?? [])]
        .sort((a, b) => a - b)
        .map((n) => DAYS[n - 1])
        .join(", ");
      return e === 1
        ? `Every Week on ${sel}${ts}`
        : `Every ${e} Weeks on ${sel}`;
    }

    case "MONTHLY":
      return d
        ? e === 1
          ? `Every Month on ${d.getDate()}th${ts}`
          : `Every ${e} Months on ${d.getDate()}th`
        : "Every Month";

    case "YEARLY":
      return d
        ? e === 1
          ? `Every Year on ${MSHORT[d.getMonth()]} ${d.getDate()}${ts}`
          : `Every ${e} Years`
        : "Every Year";

    default:
      return "Recurring";
  }
};
