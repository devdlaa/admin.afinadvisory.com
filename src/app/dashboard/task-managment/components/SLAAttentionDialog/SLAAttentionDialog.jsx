"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  AlertTriangle,
  Clock,
  Info,
  RefreshCw,
  XCircle,
  ChevronRight,
  ShieldAlert,
  CalendarClock,
  PauseCircle,
  TimerOff,
  Hourglass,
  CalendarX,
  CalendarCheck,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchSLASummary,
  selectSLASummary,
  selectSLASummaryLoading,
  setFilters,
  setPage,
  fetchTasks,
} from "@/store/slices/taskSlice";

import styles from "./SLAAttentionDialog.module.scss";

// ─────────────────────────────────────────────────────────────────────────────
// ALL SLA-RELATED FILTER KEYS — single source of truth.
//
// IMPORTANT: This list must include EVERY key that can appear in any SLA
// summary item's `filters` object. When applying a new SLA filter we null-out
// ALL of these first so filters never bleed across SLA rows.
//
// We also null-out `status` when applying an SLA filter because task status
// and SLA assignment status are orthogonal — combining them (e.g.
// status=PENDING + sla_status=PAUSED) almost always yields 0 results since
// tasks only get PAUSED SLA when their status is ON_HOLD/PENDING_CLIENT_INPUT.
// ─────────────────────────────────────────────────────────────────────────────
const SLA_FILTER_KEYS = [
  "sla_status",
  "sla_due_date_from",
  "sla_due_date_to",
  "sla_paused_before",
  "due_date_from",
  "due_date_to",
];

// ─────────────────────────────────────────────
// IST helpers
// ─────────────────────────────────────────────
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const todayIST = () => {
  const now = new Date();
  const istDate = new Date(now.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().slice(0, 10);
};

const nextMidnightIST = () => {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const nextDay = new Date(istNow);
  nextDay.setUTCHours(0, 0, 0, 0);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return new Date(nextDay.getTime() - IST_OFFSET_MS);
};

const formatIST = (date) => {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "short",
  });
};

// ─────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────
const LS_CACHE_KEY = "sla_summary_cache";
const LS_SUPPRESS_KEY = "sla_suppress_date";
const TTL_MS = 24 * 60 * 60 * 1000;

export const readCache = () => {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > TTL_MS) {
      localStorage.removeItem(LS_CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const writeCache = (data) => {
  try {
    localStorage.setItem(
      LS_CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() }),
    );
  } catch {
    /* quota exceeded — ignore */
  }
};

export const readSuppress = () => {
  try {
    const stored = localStorage.getItem(LS_SUPPRESS_KEY);
    if (!stored) return false;
    return stored === todayIST();
  } catch {
    return false;
  }
};

const writeSuppress = () => {
  try {
    localStorage.setItem(LS_SUPPRESS_KEY, todayIST());
  } catch {
    /* ignore */
  }
};

const clearSuppress = () => {
  try {
    localStorage.removeItem(LS_SUPPRESS_KEY);
  } catch {
    /* ignore */
  }
};

// ─────────────────────────────────────────────
// Filter helpers
// ─────────────────────────────────────────────

/**
 * Returns an object that nulls every SLA filter key.
 * Also nulls `status` because combining task status + SLA assignment status
 * almost always produces 0 results (a PENDING task can't have PAUSED SLA).
 */
const buildSLAReset = () => ({
  ...Object.fromEntries(SLA_FILTER_KEYS.map((k) => [k, null])),
  status: null,
});

/**
 * Checks if the given SLA item's filters are currently active in Redux.
 * Ground-truth — derived from Redux, not from local state.
 */
const isSLAFilterActive = (currentFilters, itemFilters) => {
  if (!itemFilters) return false;
  return Object.entries(itemFilters).every(([k, v]) => currentFilters[k] === v);
};

/**
 * Returns true if any SLA filter key is currently set in Redux.
 */
const hasAnySLAFilter = (currentFilters) =>
  SLA_FILTER_KEYS.some(
    (k) =>
      currentFilters[k] !== null &&
      currentFilters[k] !== undefined &&
      currentFilters[k] !== "",
  );

// ─────────────────────────────────────────────
// Skeleton row
// ─────────────────────────────────────────────
const SkeletonRow = () => (
  <div className={styles.skeletonRow}>
    <div className={styles.skeletonIcon} />
    <div className={styles.skeletonText}>
      <div className={styles.skeletonLine} style={{ width: "60%" }} />
      <div className={styles.skeletonLine} style={{ width: "40%" }} />
    </div>
    <div className={styles.skeletonBadge} />
  </div>
);

// ─────────────────────────────────────────────
// Individual SLA item row
// ─────────────────────────────────────────────
const ICON_MAP = {
  sla_overdue: TimerOff,
  task_deadline_overdue: CalendarX,
  sla_due_today: CalendarCheck,
  task_deadline_today: CalendarClock,
  sla_due_soon: Hourglass,
  paused: PauseCircle,
  long_paused: Clock,
};

const SLAItemRow = ({ itemKey, item, type, onApplyFilter, currentFilters }) => {
  const Icon = ICON_MAP[itemKey] || Clock;
  // Derive active state directly from Redux — never stale local state
  const isActive = isSLAFilterActive(currentFilters, item.filters);
  const hasCount = item.count > 0;

  return (
    <div
      className={`${styles.slaRow} ${styles[`slaRow--${type}`]} ${
        !hasCount ? styles["slaRow--empty"] : ""
      }`}
    >
      <div className={styles.slaRow__icon}>
        <Icon size={16} />
      </div>
      <div className={styles.slaRow__content}>
        <span className={styles.slaRow__label}>{item.label}</span>
        {item.description && (
          <span className={styles.slaRow__desc}>{item.description}</span>
        )}
      </div>
      <div className={styles.slaRow__right}>
        <span
          className={`${styles.slaRow__count} ${styles[`slaRow__count--${type}`]}`}
        >
          {item.count}
        </span>
        {hasCount && item.filters && (
          <button
            className={`${styles.slaRow__filterBtn} ${
              isActive ? styles["slaRow__filterBtn--active"] : ""
            }`}
            onClick={() => onApplyFilter(item.filters, isActive)}
            title={isActive ? "Clear this filter" : "View these tasks"}
          >
            {isActive ? <XCircle size={13} /> : <ChevronRight size={13} />}
            {isActive ? "Clear" : "View"}
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Section block
// ─────────────────────────────────────────────
const SLASection = ({
  title,
  icon: SectionIcon,
  type,
  items,
  onApplyFilter,
  currentFilters,
  isLoading,
}) => {
  const totalCount = isLoading
    ? null
    : Object.values(items || {}).reduce((s, i) => s + (i.count || 0), 0);

  return (
    <div className={`${styles.section} ${styles[`section--${type}`]}`}>
      <div className={styles.section__header}>
        <div className={styles.section__titleRow}>
          <SectionIcon size={15} />
          <span className={styles.section__title}>{title}</span>
        </div>
        {!isLoading && totalCount > 0 && (
          <span
            className={`${styles.section__badge} ${styles[`section__badge--${type}`]}`}
          >
            {totalCount}
          </span>
        )}
      </div>
      <div className={styles.section__body}>
        {isLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : items ? (
          Object.entries(items).map(([key, item]) => (
            <SLAItemRow
              key={key}
              itemKey={key}
              item={item}
              type={type}
              onApplyFilter={onApplyFilter}
              currentFilters={currentFilters}
            />
          ))
        ) : null}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Dialog
// ─────────────────────────────────────────────
const SLAAttentionDialog = ({ isOpen, onClose, currentFilters }) => {
  const dispatch = useDispatch();
  const reduxSLAData = useSelector(selectSLASummary);

  const [localData, setLocalData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [doNotShow, setDoNotShow] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(null);

  const data = localData || reduxSLAData;

  // Derive from Redux — no stale local state
  const anySLAFilterActive = useMemo(
    () => hasAnySLAFilter(currentFilters),
    [currentFilters],
  );

  // Sync checkbox to stored suppress state each time dialog opens
  useEffect(() => {
    if (isOpen) setDoNotShow(readSuppress());
  }, [isOpen]);

  // On open — use cache or fetch
  useEffect(() => {
    if (!isOpen) return;
    const cached = readCache();
    if (cached) {
      setLocalData(cached);
      try {
        const { timestamp } = JSON.parse(localStorage.getItem(LS_CACHE_KEY));
        setFetchedAt(new Date(timestamp));
      } catch {
        /* ignore */
      }
      return;
    }
    fetchData();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await dispatch(fetchSLASummary()).unwrap();
      setLocalData(result);
      writeCache(result);
      setFetchedAt(new Date());
    } catch {
      /* redux handles error state */
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const handleForceRefresh = () => {
    localStorage.removeItem(LS_CACHE_KEY);
    setLocalData(null);
    fetchData();
  };

  const handleDoNotShowChange = (e) => {
    const checked = e.target.checked;
    setDoNotShow(checked);
    if (checked) writeSuppress();
    else clearSuppress();
  };

  /**
   * Apply or clear an SLA filter row.
   *
   * Key behaviours:
   * 1. ALWAYS wipe all SLA filter keys + status before applying a new set.
   *    This prevents filter bleed when switching between SLA rows.
   * 2. Also clears `status` (task-level) because task status and SLA
   *    assignment status are orthogonal — mixing them causes 0 results.
   * 3. If the clicked row is already active, just clear everything (toggle off).
   */
  const handleApplyFilter = useCallback(
    (filters, isActive) => {
      if (isActive) {
        dispatch(setFilters(buildSLAReset()));
      } else {
        dispatch(setFilters({ ...buildSLAReset(), ...filters }));
      }
      dispatch(setPage(1));
      dispatch(fetchTasks(true));
      onClose();
    },
    [dispatch, onClose],
  );

  /**
   * Clear ALL SLA filters at once.
   * Derived from SLA_FILTER_KEYS constant — never from stale local state.
   */
  const handleClearAllSLAFilters = useCallback(() => {
    dispatch(setFilters(buildSLAReset()));
    dispatch(setPage(1));
    dispatch(fetchTasks(true));
    onClose();
  }, [dispatch, onClose]);

  const hasCritical =
    data && Object.values(data.critical || {}).some((i) => i.count > 0);

  const nextReset = nextMidnightIST();
  const nextResetLabel = nextReset.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "short",
  });

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.dialog}>
        {/* Header */}
        <div className={styles.dialog__header}>
          <div className={styles.dialog__titleRow}>
            <div className={styles.dialog__titleIcon}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className={styles.dialog__title}>SLA Attention Summary</h2>
              <p className={styles.dialog__subtitle}>
                Review task deadlines and SLA health
              </p>
            </div>
          </div>

          <div className={styles.dialog__headerActions}>
            <button
              className={styles.dialog__refreshBtn}
              onClick={handleForceRefresh}
              disabled={isLoading}
              title="Force refresh SLA data"
            >
              <RefreshCw
                size={14}
                className={isLoading ? styles.spinning : ""}
              />
              Refresh
            </button>
            <button className={styles.dialog__closeBtn} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Critical banner */}
        {!isLoading && hasCritical && (
          <div className={styles.criticalBanner}>
            <AlertTriangle size={15} />
            <span>
              Immediate attention required — critical SLA items detected
            </span>
          </div>
        )}

        {/* Body */}
        <div className={styles.dialog__body}>
          <SLASection
            title="Critical"
            icon={AlertTriangle}
            type="critical"
            items={data?.critical}
            onApplyFilter={handleApplyFilter}
            currentFilters={currentFilters}
            isLoading={isLoading}
          />
          <SLASection
            title="Needs Attention"
            icon={Clock}
            type="attention"
            items={data?.attention}
            onApplyFilter={handleApplyFilter}
            currentFilters={currentFilters}
            isLoading={isLoading}
          />
          <SLASection
            title="Informational"
            icon={Info}
            type="informational"
            items={data?.informational}
            onApplyFilter={handleApplyFilter}
            currentFilters={currentFilters}
            isLoading={isLoading}
          />
        </div>

        {/* Footer */}
        <div className={styles.dialog__footer}>
          <div className={styles.dialog__footerLeft}>
            <label className={styles.suppressCheck}>
              <input
                type="checkbox"
                checked={doNotShow}
                onChange={handleDoNotShowChange}
              />
              <span>Don't show automatically today</span>
            </label>

            <span className={styles.dialog__fetchedAt}>
              {doNotShow
                ? `Resumes tomorrow · ${nextResetLabel} IST`
                : fetchedAt
                  ? `Updated ${formatIST(fetchedAt)} IST`
                  : null}
            </span>
          </div>

          <div className={styles.dialog__footerRight}>
            {anySLAFilterActive && (
              <button
                className={styles.dialog__clearFiltersBtn}
                onClick={handleClearAllSLAFilters}
              >
                <XCircle size={13} />
                Clear SLA Filters
              </button>
            )}
            <button className={styles.dialog__closeFooterBtn} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export { writeCache };
export default SLAAttentionDialog;
