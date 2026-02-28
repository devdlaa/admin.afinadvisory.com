"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  AlertOctagon,
  Hourglass,
  TrendingUp,
  Clock,
  PauseCircle,
  ChevronRight,
  XCircle,
  BellOff,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { setFilters, setPage, fetchTasks } from "@/store/slices/taskSlice";
import styles from "./AgingBoard.module.scss";

// ─────────────────────────────────────────────
// Suppress helpers
// ─────────────────────────────────────────────
const LS_AGING_SUPPRESS_KEY = "aging_board_suppress_date";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const todayIST = () => {
  const istDate = new Date(new Date().getTime() + IST_OFFSET_MS);
  return istDate.toISOString().slice(0, 10);
};

const nextMidnightIST = () => {
  const istNow = new Date(new Date().getTime() + IST_OFFSET_MS);
  const next = new Date(istNow);
  next.setUTCHours(0, 0, 0, 0);
  next.setUTCDate(next.getUTCDate() + 1);
  return new Date(next.getTime() - IST_OFFSET_MS);
};

export const readAgingSuppress = () => {
  try {
    return localStorage.getItem(LS_AGING_SUPPRESS_KEY) === todayIST();
  } catch {
    return false;
  }
};

const writeAgingSuppress = () => {
  try {
    localStorage.setItem(LS_AGING_SUPPRESS_KEY, todayIST());
  } catch {}
};

const clearAgingSuppress = () => {
  try {
    localStorage.removeItem(LS_AGING_SUPPRESS_KEY);
  } catch {}
};

// ─────────────────────────────────────────────
// Filter helpers — exported so page.jsx + ActionBar can use them
// ─────────────────────────────────────────────

/**
 * The sentinel that marks "aging owns the created_date_* keys".
 * Lives only in Redux — never sent to the API (excluded in taskSlice).
 */
export const AGING_SENTINEL = "aging_active";

/**
 * Returns true when the aging sentinel is set — meaning AgingBoard
 * applied a filter, not the DateRangeFilter component.
 */
export const hasAnyAgingFilter = (currentFilters) =>
  currentFilters?.[AGING_SENTINEL] === true;

/**
 * Full reset: clears every field AgingBoard might have touched,
 * including the sentinel.
 */
export const buildAgingReset = () => ({
  // API filter fields
  sla_status: null,
  sla_due_date_from: null,
  sla_due_date_to: null,
  sla_paused_before: null,
  due_date_from: null,
  due_date_to: null,
  status: null,
  created_date_from: null,
  created_date_to: null,
  // Sentinel
  [AGING_SENTINEL]: null,
});

/**
 * Check whether a specific aging row is currently the active filter.
 */
const isAgingRowActive = (currentFilters, bucketFilters) => {
  if (!bucketFilters?.status || !bucketFilters?.created_before) return false;
  return (
    currentFilters[AGING_SENTINEL] === true &&
    currentFilters.status === bucketFilters.status &&
    currentFilters.created_date_to === bucketFilters.created_before
  );
};

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
export const AGING_WINDOW_MAP = {
  PENDING: [7, 15, 30],
  IN_PROGRESS: [10, 20, 40],
  PENDING_CLIENT_INPUT: [15, 30, 60],
  ON_HOLD: [15, 30, 45],
};

const STATUS_CONFIG = {
  PENDING: { icon: Hourglass, colorKey: "amber", label: "Pending" },
  IN_PROGRESS: { icon: TrendingUp, colorKey: "blue", label: "In Progress" },
  PENDING_CLIENT_INPUT: {
    icon: Clock,
    colorKey: "violet",
    label: "Awaiting Client Response",
  },
  ON_HOLD: { icon: PauseCircle, colorKey: "slate", label: "On Hold" },
};

const getSeverityVariant = (days) => {
  if (days >= 45) return "critical";
  if (days >= 30) return "serious";
  if (days >= 20) return "high";
  if (days >= 15) return "medium";
  if (days >= 10) return "low";
  return "watch";
};

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────
const SkeletonSection = () => (
  <div className={styles.section}>
    <div className={`${styles.section__header} ${styles["section--skeleton"]}`}>
      <div className={styles.skeleton__title} />
    </div>
    <div className={styles.section__body}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.skeleton__row}>
          <div className={styles.skeleton__pill} />
          <div className={styles.skeleton__line} />
          <div className={styles.skeleton__badge} />
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Row
// ─────────────────────────────────────────────
const AgingRow = ({ days, bucket, onApply, currentFilters }) => {
  const count = bucket?.count ?? 0;
  const bucketFilters = bucket?.filters ?? {};
  const hasCount = count > 0;
  const isActive = hasCount && isAgingRowActive(currentFilters, bucketFilters);
  const variant = getSeverityVariant(days);

  return (
    <div
      className={`${styles.row} ${isActive ? styles["row--active"] : ""} ${
        !hasCount ? styles["row--zero"] : ""
      }`}
    >
      <div className={styles.row__left}>
        <span
          className={`${styles.row__pill} ${
            hasCount
              ? styles[`row__pill--${variant}`]
              : styles["row__pill--zero"]
          }`}
        >
          {days}d
        </span>
        <span
          className={`${styles.row__label} ${
            !hasCount ? styles["row__label--zero"] : ""
          }`}
        >
          Older than {days} days
        </span>
      </div>

      <span
        className={`${styles.row__count} ${
          hasCount
            ? styles[`row__count--${variant}`]
            : styles["row__count--zero"]
        }`}
      >
        {count}
      </span>

      {hasCount ? (
        <button
          className={`${styles.row__btn} ${
            isActive ? styles["row__btn--active"] : ""
          }`}
          onClick={() => onApply(bucketFilters, isActive)}
        >
          {isActive ? (
            <>
              <XCircle size={12} /> Clear
            </>
          ) : (
            <>
              <ChevronRight size={12} /> View
            </>
          )}
        </button>
      ) : (
        <span className={styles.row__btnGhost} />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Status section
// ─────────────────────────────────────────────
const AgingSection = ({ status, data, windows, onApply, currentFilters }) => {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  const Icon = config.icon;

  const worstWindow = windows[windows.length - 1];
  const worstCount = data?.[`older_than_${worstWindow}`]?.count || 0;

  return (
    <div
      className={`${styles.section} ${styles[`section--${config.colorKey}`]}`}
    >
      <div className={styles.section__header}>
        <div className={styles.section__titleRow}>
          <Icon size={24} />
          <span className={styles.section__title}>{config.label}</span>
        </div>
        {worstCount > 0 && (
          <span
            className={`${styles.section__badge} ${
              styles[`section__badge--${config.colorKey}`]
            }`}
          >
            {worstCount} over {worstWindow}d
          </span>
        )}
      </div>
      <div className={styles.section__body}>
        {windows.map((w) => (
          <AgingRow
            key={w}
            days={w}
            bucket={data?.[`older_than_${w}`]}
            onApply={onApply}
            currentFilters={currentFilters}
          />
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
const AgingBoard = ({
  isOpen,
  onClose,
  agingData,
  isLoading,
  currentFilters,
}) => {
  const dispatch = useDispatch();
  const [doNotShow, setDoNotShow] = useState(false);

  const nextResetLabel = nextMidnightIST().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "short",
  });

  useEffect(() => {
    if (isOpen) setDoNotShow(readAgingSuppress());
  }, [isOpen]);

  const handleDoNotShowChange = (e) => {
    const checked = e.target.checked;
    setDoNotShow(checked);
    if (checked) writeAgingSuppress();
    else clearAgingSuppress();
  };

  const agingFilterActive = hasAnyAgingFilter(currentFilters);

  const handleApply = useCallback(
    (bucketFilters, isActive) => {
      if (isActive) {
        // Toggle off — clear aging fields + sentinel
        dispatch(
          setFilters({
            status: null,
            created_date_from: null,
            created_date_to: null,
            [AGING_SENTINEL]: null, // ← clear sentinel so DateRange is no longer locked
          }),
        );
      } else {
        // Apply aging filter:
        //  • Reset all conflicting filters first
        //  • Set the actual API params: status + created_date_to (= created_before from bucket)
        //  • Set sentinel so the rest of the UI knows aging owns created_date_*
        dispatch(
          setFilters({
            ...buildAgingReset(), // clears everything including old sentinel
            status: bucketFilters.status,
            created_date_to: bucketFilters.created_before, // the ISO string from the API response
            [AGING_SENTINEL]: true, // ← marks aging as the owner of created_date keys
          }),
        );
      }
      dispatch(setPage(1));
      dispatch(fetchTasks(true));
      onClose();
    },
    [dispatch, onClose],
  );

  const handleClearAgingFilters = useCallback(() => {
    dispatch(setFilters(buildAgingReset())); // includes [AGING_SENTINEL]: null
    dispatch(setPage(1));
    dispatch(fetchTasks(true));
    onClose();
  }, [dispatch, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.dialog}>
        {/* Header */}
        <div className={styles.dialog__header}>
          <div className={styles.dialog__titleRow}>
            <div className={styles.dialog__titleIcon}>
              <AlertOctagon size={22} />
            </div>
            <div>
              <h2 className={styles.dialog__title}>Aging Tasks</h2>
              <p className={styles.dialog__subtitle}>
                Tasks sitting too long — grouped by status &amp; age
              </p>
            </div>
          </div>
          <button className={styles.dialog__closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.dialog__body}>
          {isLoading ? (
            <>
              <SkeletonSection />
              <SkeletonSection />
              <SkeletonSection />
              <SkeletonSection />
            </>
          ) : (
            Object.entries(AGING_WINDOW_MAP).map(([status, windows]) => (
              <AgingSection
                key={status}
                status={status}
                data={agingData?.[status]}
                windows={windows}
                onApply={handleApply}
                currentFilters={currentFilters}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className={styles.dialog__footer}>
          <div className={styles.dialog__footerLeft}>
            <label className={styles.suppress}>
              <input
                type="checkbox"
                checked={doNotShow}
                onChange={handleDoNotShowChange}
              />
              <BellOff size={12} />
              <span>Don't show automatically today</span>
            </label>
            {doNotShow && (
              <span className={styles.dialog__hint}>
                Resumes tomorrow · {nextResetLabel} IST
              </span>
            )}
          </div>

          <div className={styles.dialog__footerRight}>
            {agingFilterActive && (
              <button
                className={styles.dialog__clearFiltersBtn}
                onClick={handleClearAgingFilters}
              >
                <XCircle size={13} />
                Clear Aging Filters
              </button>
            )}
            <button className={styles.dialog__footerCloseBtn} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AgingBoard;
