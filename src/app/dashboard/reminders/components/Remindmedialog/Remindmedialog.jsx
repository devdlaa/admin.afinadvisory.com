"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  ArrowLeft,
  Clock,
  Sun,
  Calendar,
  CalendarDays,
  CalendarClock,
} from "lucide-react";
import styles from "./RemindMeDialog.module.scss";
import {
  DAYS,
  MONTHS,
  MSHORT,
  TIME_OPTS,
  REPEAT_OPTS,
  todayMidnight,
  addDays,
  nextMonday,
  isSameDay,
  fmtShort,
  fmtTime,
  fmtDMY,
  fmtFull,
  buildGrid,
  defaultRec,
} from "./remindMe.utils";

/* ─── STATIC DATA (UI-only, not shared with parent) ─────────── */

const REC_TYPES = [
  { id: "DAILY", icon: Sun, label: "Daily" },
  { id: "WEEKLY", icon: CalendarDays, label: "Weekly" },
  { id: "MONTHLY", icon: Calendar, label: "Monthly" },
  { id: "YEARLY", icon: CalendarClock, label: "Yearly" },
];

/* ─── CALENDAR ──────────────────────────────────────────────── */

function CalendarFun({ value, onChange, minDate }) {
  const ref = value || todayMidnight();
  const [vy, setVy] = useState(ref.getFullYear());
  const [vm, setVm] = useState(ref.getMonth());

  const prev = () =>
    vm === 0 ? (setVy((y) => y - 1), setVm(11)) : setVm((m) => m - 1);
  const next = () =>
    vm === 11 ? (setVy((y) => y + 1), setVm(0)) : setVm((m) => m + 1);

  return (
    <div className={styles.cal}>
      <div className={styles.calHead}>
        <button className={styles.calNav} onClick={prev} type="button">
          <ChevronLeft size={18} />
        </button>
        <span className={styles.calTitle}>
          {MONTHS[vm]} {vy}
        </span>
        <button className={styles.calNav} onClick={next} type="button">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className={styles.calGrid}>
        {DAYS.map((d) => (
          <span key={d} className={styles.calLabel}>
            {d}
          </span>
        ))}
        {buildGrid(vy, vm).map((cell, i) => {
          const cd = cell.cur ? new Date(vy, vm, cell.day) : null;
          const dis = cd && minDate && cd < minDate;
          const sel = cd && value && isSameDay(cd, value);
          const tod = cd && isSameDay(cd, todayMidnight());
          return (
            <button
              key={i}
              type="button"
              className={[
                styles.calCell,
                !cell.cur && styles.calOther,
                sel && styles.calSel,
                tod && !sel && styles.calToday,
                dis && styles.calDis,
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (!cell.cur || dis) return;
                onChange(new Date(vy, vm, cell.day));
              }}
              disabled={!cell.cur || !!dis}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── TIME LIST ─────────────────────────────────────────────── */

function TimeList({ h, m, onChange }) {
  const listRef = useRef(null);
  const selIdx = TIME_OPTS.findIndex((o) => o.h === h && o.m === m);
  useEffect(() => {
    if (listRef.current && selIdx >= 0)
      listRef.current.children[selIdx]?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
  }, []);
  return (
    <ul ref={listRef} className={styles.timeList}>
      {TIME_OPTS.map((opt, i) => (
        <li
          key={i}
          className={[
            styles.timeItem,
            opt.h === h && opt.m === m && styles.timeItemSel,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onChange(opt.h, opt.m)}
        >
          {opt.label}
        </li>
      ))}
    </ul>
  );
}

/* ─── TIME DROPDOWN (once mode) ─────────────────────────────── */

function TimeDropdown({ h, m, onChange, onClose }) {
  const ref = useRef(null);
  const listRef = useRef(null);
  const selIdx = TIME_OPTS.findIndex((o) => o.h === h && o.m === m);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    if (listRef.current && selIdx >= 0)
      listRef.current.children[selIdx]?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
  }, []);

  return (
    <div ref={ref} className={styles.timeDropdown}>
      <div className={styles.timeDropdownHeader}>
        <Clock size={13} />
        <span>Select time</span>
      </div>
      <ul ref={listRef} className={styles.timeDropdownList}>
        {TIME_OPTS.map((opt, i) => (
          <li
            key={i}
            className={[
              styles.timeDropdownItem,
              opt.h === h && opt.m === m && styles.timeDropdownItemSel,
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              onChange(opt.h, opt.m);
              onClose();
            }}
          >
            {opt.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── REPEAT DROPDOWN ───────────────────────────────────────── */

function RepeatDropdown({ options, value, onChange, onClose }) {
  const ref = useRef(null);
  const selIdx = options.findIndex((o) => o.val === value);
  useEffect(() => {
    if (ref.current && selIdx >= 0)
      ref.current.children[selIdx]?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
  }, []);
  return (
    <div className={styles.repeatDrop}>
      <ul ref={ref} className={styles.repeatList}>
        {options.map((opt) => (
          <li
            key={opt.val}
            className={[
              styles.repeatItem,
              opt.val === value && styles.repeatItemSel,
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              onChange(opt.val);
              onClose();
            }}
          >
            {opt.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── DATE+TIME PICKER (sub-view, recurring only) ────────────── */

function DateTimePicker({
  value,
  h,
  m,
  minDate,
  onConfirm,
  onBack,
  title,
  hideTime,
}) {
  const [localDate, setLocalDate] = useState(
    value || addDays(todayMidnight(), 1),
  );
  const [localH, setLocalH] = useState(h ?? null);
  const [localM, setLocalM] = useState(m ?? null);
  const [view, setView] = useState("date");

  const hasTime = localH !== null && localM !== null;

  return (
    <div className={styles.subView}>
      <div className={styles.subViewHeader}>
        <button className={styles.subViewBack} onClick={onBack} type="button">
          <ArrowLeft size={16} />
        </button>
        <span className={styles.subViewTitle}>{title}</span>
        <div style={{ width: 32 }} />
      </div>

      {!hideTime && (
        <div className={styles.subTabs}>
          <button
            className={[styles.subTab, view === "date" && styles.subTabActive]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setView("date")}
            type="button"
          >
            <span className={styles.subTabLabel}>DATE</span>
            <span className={styles.subTabVal}>{fmtDMY(localDate)}</span>
          </button>
          <button
            className={[styles.subTab, view === "time" && styles.subTabActive]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              setView("time");
              if (!hasTime) {
                setLocalH(9);
                setLocalM(0);
              }
            }}
            type="button"
          >
            <span className={styles.subTabLabel}>
              TIME
              {hasTime && (
                <span
                  className={styles.subTabClear}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocalH(null);
                    setLocalM(null);
                    setView("date");
                  }}
                >
                  ✕
                </span>
              )}
            </span>
            <span
              className={hasTime ? styles.subTabVal : styles.subTabValMuted}
            >
              {hasTime ? fmtTime(localH, localM) : "Add time"}
            </span>
          </button>
        </div>
      )}

      <div className={styles.subBody}>
        {(view === "date" || hideTime) && (
          <CalendarFun
            value={localDate}
            onChange={setLocalDate}
            minDate={minDate}
          />
        )}
        {view === "time" && !hideTime && hasTime && (
          <TimeList
            h={localH}
            m={localM}
            onChange={(nh, nm) => {
              setLocalH(nh);
              setLocalM(nm);
            }}
          />
        )}
      </div>

      <div className={styles.subFooter}>
        <button
          className={styles.subConfirm}
          type="button"
          onClick={() => onConfirm(localDate, localH, localM)}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

/* ─── RECURRING PANEL ───────────────────────────────────────── */

function RecurringPanel({ rec, onChange, onShowDatePicker }) {
  const [showRepeat, setShowRepeat] = useState(false);
  const [showRepeatBy, setShowRepeatBy] = useState(false);

  const upd = (patch) => onChange({ ...rec, ...patch });
  const curDayNum = (((rec.startsOn?.getDay() || 0) + 6) % 7) + 1;

  return (
    <div className={styles.recBody}>
      {/* Type grid */}
      <div className={styles.typeGrid}>
        {REC_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={[styles.typeBtn, rec.type === t.id && styles.typeBtnOn]
              .filter(Boolean)
              .join(" ")}
            onClick={() =>
              upd({ type: t.id, repeatEvery: 1, weekDays: [curDayNum] })
            }
          >
            <span className={styles.typeIcon}>
              <t.icon size={16} strokeWidth={2} />
            </span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Starts On */}
      <div className={styles.recRow}>
        <span className={styles.recLabel}>Starts On</span>
        <button
          className={styles.recValBtn}
          type="button"
          onClick={() => onShowDatePicker("starts")}
        >
          {fmtFull(rec.startsOn, rec.startsH, rec.startsM)}
          <ChevronDown size={13} />
        </button>
      </div>

      {/* Repeat Every */}
      <div className={styles.recRow} style={{ position: "relative" }}>
        <span className={styles.recLabel}>Repeat Every</span>
        <button
          className={[styles.recValBtn, showRepeat && styles.recValBtnOn]
            .filter(Boolean)
            .join(" ")}
          type="button"
          onClick={() => {
            setShowRepeat((p) => !p);
            setShowRepeatBy(false);
          }}
        >
          {REPEAT_OPTS[rec.type].find((o) => o.val === rec.repeatEvery)?.label}
          <ChevronDown size={13} />
        </button>
        {showRepeat && (
          <RepeatDropdown
            options={REPEAT_OPTS[rec.type]}
            value={rec.repeatEvery}
            onChange={(v) => upd({ repeatEvery: v })}
            onClose={() => setShowRepeat(false)}
          />
        )}
      </div>

      {/* Repeats On — weekly */}
      {rec.type === "WEEKLY" && (
        <div className={styles.recRowCol}>
          <span className={styles.recLabel}>Repeats On</span>
          <div className={styles.dayRow}>
            {DAYS.map((d, i) => {
              const n = i + 1;
              const on = rec.weekDays.includes(n);
              return (
                <button
                  key={d}
                  type="button"
                  className={[styles.dayBtn, on && styles.dayBtnOn]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    const next = on
                      ? rec.weekDays.filter((x) => x !== n)
                      : [...rec.weekDays, n];
                    if (next.length > 0) upd({ weekDays: next });
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Repeat By — monthly */}
      {rec.type === "MONTHLY" && (
        <div className={styles.recRow} style={{ position: "relative" }}>
          <span className={styles.recLabel}>Repeat By</span>
          <button
            className={[styles.recValBtn, showRepeatBy && styles.recValBtnOn]
              .filter(Boolean)
              .join(" ")}
            type="button"
            onClick={() => {
              setShowRepeatBy((p) => !p);
              setShowRepeat(false);
            }}
          >
            {rec.repeatBy}
            <ChevronDown size={13} />
          </button>
          {showRepeatBy && (
            <div className={styles.repeatDrop} style={{ width: 200 }}>
              <ul className={styles.repeatList}>
                {["Day of the month", "Day of the week"].map((opt) => (
                  <li
                    key={opt}
                    className={[
                      styles.repeatItem,
                      rec.repeatBy === opt && styles.repeatItemSel,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      upd({ repeatBy: opt });
                      setShowRepeatBy(false);
                    }}
                  >
                    {opt}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Never ends */}
      <div className={styles.recRow}>
        <span className={styles.recLabel}>Task never ends</span>
        <button
          type="button"
          className={[styles.toggle, rec.neverEnds && styles.toggleOn]
            .filter(Boolean)
            .join(" ")}
          onClick={() =>
            upd({
              neverEnds: !rec.neverEnds,
              endsOnDate: null,
              endsAfter: null,
            })
          }
        >
          <span className={styles.thumb} />
        </button>
      </div>

      {/* Ends on / after */}
      {!rec.neverEnds && (
        <>
          <div className={styles.recRow}>
            <span className={styles.recLabel}>Ends on</span>
            <div className={styles.recRowRight}>
              <button
                className={styles.recValBtn}
                type="button"
                onClick={() => onShowDatePicker("ends")}
              >
                {rec.endsOnDate ? fmtShort(rec.endsOnDate) : "Pick date"}
                <ChevronDown size={13} />
              </button>
              <button
                type="button"
                className={[styles.radio, !rec.endsAfter && styles.radioOn]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  upd({
                    endsOnDate: rec.endsOnDate || addDays(rec.startsOn, 7),
                    endsAfter: null,
                  })
                }
              >
                <span className={styles.radioDot} />
              </button>
            </div>
          </div>
          <div className={styles.recRow}>
            <span
              className={[
                styles.recLabel,
                rec.endsAfter === null && styles.recLabelDim,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              Ends after
            </span>
            <div className={styles.recRowRight}>
              <input
                className={[
                  styles.occInput,
                  rec.endsAfter === null && styles.occDim,
                ]
                  .filter(Boolean)
                  .join(" ")}
                type="number"
                min={1}
                max={999}
                value={rec.endsAfter || ""}
                placeholder="1 occurrence"
                disabled={rec.endsAfter === null && !!rec.endsOnDate}
                onChange={(e) =>
                  upd({
                    endsAfter: Math.max(1, parseInt(e.target.value) || 1),
                    endsOnDate: null,
                  })
                }
                onClick={() => {
                  if (rec.endsAfter === null)
                    upd({ endsAfter: 1, endsOnDate: null });
                }}
              />
              <button
                type="button"
                className={[
                  styles.radio,
                  rec.endsAfter !== null && styles.radioOn,
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  upd({ endsAfter: rec.endsAfter || 1, endsOnDate: null })
                }
              >
                <span className={styles.radioDot} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── MAIN COMPONENT ────────────────────────────────────────── */

/**
 * RemindMeDialog
 *
 * Props
 *   initialValue  – the config object previously returned by `onSet`, or null.
 *                   Shape must match the `onSet` output exactly (see below).
 *   onClose       – () => void
 *   onSet         – (config) => void
 *
 * `onSet` emits:
 *   {
 *     isRecurring:           boolean,
 *     date:                  ISO string,      // for once: the chosen day; for recurring: startsOn
 *     h:                     number | null,
 *     m:                     number | null,
 *     recurrence_type:       string | null,
 *     recurrence_every:      number | null,
 *     recurrence_end:        ISO string | null,
 *     recurrence_ends_after: number | null,
 *     week_days:             number[] | null,
 *     repeat_by:             string | null,
 *   }
 *
 * To get the human-readable label in a parent component:
 *   import { buildReminderLabel } from "./remindMe.utils";
 *   const label = buildReminderLabel(configFromServer);
 */
export default function RemindMeDialog({
  initialValue = null,
  onClose,
  onSet,
}) {
  const [mode, setMode] = useState(
    initialValue?.isRecurring ? "recurring" : "once",
  );
  const [date, setDate] = useState(
    initialValue?.date
      ? new Date(initialValue.date)
      : addDays(todayMidnight(), 1),
  );
  const [h, setH] = useState(initialValue?.h ?? null);
  const [m, setM] = useState(initialValue?.m ?? null);
  const [rec, setRec] = useState(() => {
    if (!initialValue?.isRecurring) return defaultRec();
    // Rehydrate Date objects from ISO strings coming off the server
    return {
      ...defaultRec(),
      type: initialValue.recurrence_type ?? "DAILY",
      repeatEvery: initialValue.recurrence_every ?? 1,
      weekDays: initialValue.week_days ?? [5],
      repeatBy: initialValue.repeat_by ?? "Day of the month",
      neverEnds:
        !initialValue.recurrence_end && !initialValue.recurrence_ends_after,
      endsOnDate: initialValue.recurrence_end
        ? new Date(initialValue.recurrence_end)
        : null,
      endsAfter: initialValue.recurrence_ends_after ?? null,
      startsOn: initialValue.date
        ? new Date(initialValue.date)
        : todayMidnight(),
      startsH: initialValue.h ?? null,
      startsM: initialValue.m ?? null,
    };
  });

  const [error, setError] = useState("");
  const [subView, setSubView] = useState(null);
  const [showTimeDrop, setShowTimeDrop] = useState(false);

  const hasTime = h !== null && m !== null;

  /* ── Validation ── */
  const validate = () => {
    if (mode === "once") {
      if (hasTime) {
        const dt = new Date(date);
        dt.setHours(h, m, 0, 0);
        if (dt <= new Date()) {
          setError("Date & time must be in the future");
          return false;
        }
      } else {
        if (date <= todayMidnight()) {
          setError("Date must be in the future");
          return false;
        }
      }
    } else {
      const hasRecTime = rec.startsH !== null && rec.startsM !== null;
      if (hasRecTime) {
        const s = new Date(rec.startsOn);
        s.setHours(rec.startsH, rec.startsM, 0, 0);
        if (s <= new Date()) {
          setError("Start time must be in the future");
          return false;
        }
      } else {
        if (rec.startsOn <= todayMidnight()) {
          setError("Start date must be in the future");
          return false;
        }
      }
      if (!rec.neverEnds && rec.endsOnDate && rec.endsOnDate <= rec.startsOn) {
        setError("End date must be after start");
        return false;
      }
      if (rec.type === "WEEKLY" && rec.weekDays.length === 0) {
        setError("Pick at least one day");
        return false;
      }
    }
    setError("");
    return true;
  };

  /* ── Emit (no label — computed by parent via buildReminderLabel) ── */
  const handleSet = () => {
    if (!validate()) return;

    if (mode === "once") {
      const dt = new Date(date);
      if (hasTime) dt.setHours(h, m, 0, 0);
      onSet?.({
        isRecurring: false,
        date: dt.toISOString(),
        h,
        m,
        recurrence_type: null,
        recurrence_every: null,
        recurrence_end: null,
        recurrence_ends_after: null,
        week_days: null,
        repeat_by: null,
      });
    } else {
      const dt = new Date(rec.startsOn);

      if (rec.startsH !== null && rec.startsM !== null) {
        dt.setHours(rec.startsH, rec.startsM, 0, 0);
      }

      onSet?.({
        isRecurring: true,
        date: dt.toISOString(),
        h: rec.startsH,
        m: rec.startsM,
        recurrence_type: rec.type,
        recurrence_every: rec.repeatEvery,
        recurrence_end: rec.neverEnds
          ? null
          : (rec.endsOnDate?.toISOString() ?? null),
        recurrence_ends_after: rec.endsAfter ?? null,
        week_days: rec.type === "WEEKLY" ? rec.weekDays : null,
        repeat_by: rec.type === "MONTHLY" ? rec.repeatBy : null,
      });
    }
    onClose?.();
  };

  /* ── Quick picks ── */
  const quickPick = (type) => {
    if (type === "tomorrow") {
      setDate(addDays(todayMidnight(), 1));
      setH(null);
      setM(null);
      setMode("once");
    }
    if (type === "nextweek") {
      setDate(nextMonday(todayMidnight()));
      setH(null);
      setM(null);
      setMode("once");
    }
    if (type === "recurring") {
      setMode("recurring");
    }
  };

  /* ── Sub-view (date/time pickers for recurring fields) ── */
  const handleSubConfirm = (d, nh, nm) => {
    if (subView === "starts")
      setRec((r) => ({ ...r, startsOn: d, startsH: nh, startsM: nm }));
    if (subView === "ends")
      setRec((r) => ({ ...r, endsOnDate: d, endsAfter: null }));
    setSubView(null);
  };

  const subTitle = subView === "starts" ? "Starts On" : "Ends On";
  const subValue = subView === "starts" ? rec.startsOn : rec.endsOnDate;
  const subH = subView === "starts" ? rec.startsH : null;
  const subM = subView === "starts" ? rec.startsM : null;
  const subMin =
    subView === "ends" ? addDays(rec.startsOn, 1) : todayMidnight();
  const subHideTime = subView === "ends";

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className={styles.dialog}>
        {/* Sub-view */}
        {subView && (
          <DateTimePicker
            title={subTitle}
            value={subValue}
            h={subH}
            m={subM}
            minDate={subMin}
            hideTime={subHideTime}
            onBack={() => setSubView(null)}
            onConfirm={handleSubConfirm}
          />
        )}

        {/* Main view */}
        {!subView && (
          <>
            <div className={styles.header}>
              <span className={styles.title}>
                {mode === "recurring" ? "Recurring" : "Reminder"}
              </span>
              <button
                className={styles.closeBtn}
                onClick={onClose}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            {/* Once mode */}
            {mode === "once" && (
              <div className={styles.onceBody}>
                <div className={styles.dtRow}>
                  {/* Date — static display */}
                  <div className={styles.dtPillStatic}>
                    <span className={styles.dtPillLabel}>DATE</span>
                    <span className={styles.dtPillVal}>{fmtDMY(date)}</span>
                  </div>

                  <div className={styles.dtDivider} />

                  {/* Time — optional */}
                  <div style={{ position: "relative", flex: 1 }}>
                    {!hasTime ? (
                      <button
                        className={styles.dtPill}
                        type="button"
                        onClick={() => {
                          setH(9);
                          setM(0);
                          setShowTimeDrop(true);
                        }}
                      >
                        <span className={styles.dtPillLabel}>TIME</span>
                        <span className={styles.dtPillValMuted}>Add time</span>
                      </button>
                    ) : (
                      <button
                        className={[
                          styles.dtPill,
                          showTimeDrop && styles.dtPillActive,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        type="button"
                        onClick={() => setShowTimeDrop((p) => !p)}
                      >
                        <span className={styles.dtPillLabel}>
                          TIME
                          <span
                            className={styles.dtPillClear}
                            onClick={(e) => {
                              e.stopPropagation();
                              setH(null);
                              setM(null);
                              setShowTimeDrop(false);
                            }}
                          >
                            ✕
                          </span>
                        </span>
                        <span className={styles.dtPillVal}>
                          {fmtTime(h, m)}
                        </span>
                      </button>
                    )}
                    {showTimeDrop && hasTime && (
                      <TimeDropdown
                        h={h}
                        m={m}
                        onChange={(nh, nm) => {
                          setH(nh);
                          setM(nm);
                        }}
                        onClose={() => setShowTimeDrop(false)}
                      />
                    )}
                  </div>
                </div>

                <CalendarFun
                  value={date}
                  onChange={(d) => setDate(d)}
                  minDate={todayMidnight()}
                />

                <div className={styles.quickRow}>
                  <button
                    className={styles.quickBtn}
                    type="button"
                    onClick={() => quickPick("tomorrow")}
                  >
                    Tomorrow
                  </button>
                  <button
                    className={styles.quickBtn}
                    type="button"
                    onClick={() => quickPick("nextweek")}
                  >
                    Next week
                  </button>
                  <button
                    className={`${styles.quickBtn} ${styles.quickBtnRec}`}
                    type="button"
                    onClick={() => quickPick("recurring")}
                  >
                    <RotateCcw size={14} /> Recurring
                  </button>
                </div>
              </div>
            )}

            {/* Recurring mode */}
            {mode === "recurring" && (
              <RecurringPanel
                rec={rec}
                onChange={setRec}
                onShowDatePicker={setSubView}
              />
            )}

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.footer}>
              <button
                className={styles.btnCancel}
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <div className={styles.footerDiv} />
              <button
                className={styles.btnSet}
                onClick={handleSet}
                type="button"
              >
                Set
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
