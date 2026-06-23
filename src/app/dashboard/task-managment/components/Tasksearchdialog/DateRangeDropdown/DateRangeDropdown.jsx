"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import styles from "./DateRangeDropdown.module.scss";

/**
 * DateRangeDropdown
 * Looks identical to FilterDropdown trigger buttons.
 * Opens a small panel with From / To date inputs + Apply / Clear.
 *
 * Props:
 *   label          string   e.g. "Created"
 *   fromValue      string   ISO date string or ""
 *   toValue        string   ISO date string or ""
 *   onApply        fn({ from, to }) — called when user clicks Apply
 *   onClear        fn()     — called when user clicks Clear or removes via X
 */
export default function DateRangeDropdown({
  label = "Date Range",
  fromValue = "",
  toValue = "",
  onApply,
  onClear,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from: fromValue, to: toValue });
  const wrapRef = useRef(null);

  // Sync external values into draft when closed
  useEffect(() => {
    if (!open) {
      setDraft({ from: fromValue, to: toValue });
    }
  }, [fromValue, toValue, open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isActive = Boolean(fromValue || toValue);

  const handleApply = useCallback(() => {
    onApply?.({ from: draft.from || null, to: draft.to || null });
    setOpen(false);
  }, [draft, onApply]);

  const handleClear = useCallback(() => {
    setDraft({ from: "", to: "" });
    onClear?.();
    setOpen(false);
  }, [onClear]);

  // Build the trigger label
  const triggerLabel = (() => {
    if (fromValue && toValue) return `${fmt(fromValue)} → ${fmt(toValue)}`;
    if (fromValue) return `From ${fmt(fromValue)}`;
    if (toValue) return `To ${fmt(toValue)}`;
    return label;
  })();

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {/* Trigger — same look as FilterDropdown button */}
      <button
        type="button"
        className={`${styles.trigger} ${isActive ? styles.triggerActive : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Calendar size={14} className={styles.triggerIcon} />
        <span className={styles.triggerLabel}>{triggerLabel}</span>
        {isActive ? (
          <span
            className={styles.clearDot}
            role="button"
            tabIndex={0}
            aria-label="Clear date range"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            onKeyDown={(e) => e.key === "Enter" && handleClear()}
          >
            <X size={11} />
          </span>
        ) : (
          <ChevronDown
            size={14}
            className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className={styles.panel}>
          <p className={styles.panelTitle}>Select Date Range</p>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>From Date</label>
            <input
              type="date"
              className={styles.dateInput}
              value={draft.from}
              max={draft.to || undefined}
              onChange={(e) =>
                setDraft((d) => ({ ...d, from: e.target.value }))
              }
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>To Date</label>
            <input
              type="date"
              className={styles.dateInput}
              value={draft.to}
              min={draft.from || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            />
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClear}
            >
              Clear
            </button>
            <button
              type="button"
              className={styles.applyBtn}
              onClick={handleApply}
              disabled={!draft.from && !draft.to}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── util ──────────────────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}
