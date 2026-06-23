import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  X,
  XCircle,
  AlertCircle,
  Check,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  Loader2,
  Activity,
} from "lucide-react";

import styles from "./ActivityLifecycleUpdateDialog.module.scss";
import { ACTIVITY_STATUS } from "../CreateActivityDialog/Createactivityutils";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: ACTIVITY_STATUS.COMPLETED, label: "Completed", icon: CheckCircle2 },
  { value: ACTIVITY_STATUS.MISSED, label: "Missed", icon: X },
  { value: "CANCELLED", label: "Cancelled", icon: XCircle },
];

const REASON_PLACEHOLDERS = {
  [ACTIVITY_STATUS.COMPLETED]: "Briefly describe how it went…",
  [ACTIVITY_STATUS.MISSED]: "What happened? Why was this missed?",
  CANCELLED: "Why is this activity being cancelled?",
};

const REASON_LABELS = {
  [ACTIVITY_STATUS.COMPLETED]: "Completion Note",
  [ACTIVITY_STATUS.MISSED]: "Reason for Missing",
  CANCELLED: "Reason for Cancellation",
};

export default function ActivityLifecycleUpdateDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  abruption = null,
}) {
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isOverride, setIsOverride] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatus("");
    setReason("");
    setErrors({});
    setIsOverride(false);
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    if (abruption) setIsOverride(false);
  }, [abruption]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, isSubmitting, onClose]);

  if (!open) return null;

  const clearErr = (field) =>
    setErrors((prev) => {
      const n = { ...prev };
      delete n[field];
      return n;
    });

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setReason("");
    clearErr("status");
    clearErr("reason");
  };

  const handleSubmit = () => {
    const errs = {};
    if (!status) errs.status = "Please select a status.";
    if (!reason.trim()) errs.reason = "This field is required.";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit({
      status,
      reason: reason.trim(),
      ...(isOverride ? { override_activity: true } : {}),
    });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const isBlocked = abruption && !isOverride;

  const selectedOpt = STATUS_OPTIONS.find((o) => o.value === status);

  const selectTintClass =
    status === ACTIVITY_STATUS.COMPLETED
      ? styles.completedSelected
      : status === ACTIVITY_STATUS.MISSED
        ? styles.missedSelected
        : status === "CANCELLED"
          ? styles.cancelledSelected
          : "";

  const submitLabel = isSubmitting
    ? "Updating…"
    : status === ACTIVITY_STATUS.COMPLETED
      ? "Mark Completed"
      : status === ACTIVITY_STATUS.MISSED
        ? "Mark Missed"
        : status === "CANCELLED"
          ? "Mark Cancelled"
          : "Submit";

  const submitBtnClass =
    status === ACTIVITY_STATUS.COMPLETED
      ? styles.btnCompleted
      : status === ACTIVITY_STATUS.MISSED
        ? styles.btnMissed
        : status === "CANCELLED"
          ? styles.btnCancelled
          : styles.btnDefault;

  const isDisabled = isSubmitting || !status || !reason.trim();
  const showAbruption = abruption && !isOverride;

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alud-title"
      >
        {/* ── Header ── */}
        <div className={styles.header}>
          {/* MAIN CONTENT */}
          <div className={styles.headerIconWrap}>
            <Activity size={22} strokeWidth={2.2} />
          </div>
          <div className={styles.headerContent}>
            {/* TOP ROW */}
            <div className={styles.headerTop}>
              <p className={styles.headerTitle} id="alud-title">
                Activity Status
              </p>

              <div className={styles.headerRight}>
                {status && selectedOpt && (
                  <span
                    className={`${styles.statusBadge} ${
                      status === ACTIVITY_STATUS.COMPLETED
                        ? styles.completed
                        : status === ACTIVITY_STATUS.MISSED
                          ? styles.missed
                          : styles.cancelled
                    }`}
                  >
                    {selectedOpt.label}
                  </span>
                )}

                {isOverride && (
                  <span className={styles.overrideChip}>Override</span>
                )}

                <button
                  className={styles.closeBtn}
                  onClick={onClose}
                  disabled={isSubmitting}
                  aria-label="Close dialog"
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div
          className={styles.body}
          role="region"
          aria-label="Lifecycle update form"
        >
          {isBlocked ? (
            /* ── ONLY ABRUPTION ── */
            <div className={styles.section}>
              <div className={styles.abruption} role="alert">
                <ShieldAlert
                  className={styles.abruptionIcon}
                  size={20}
                  aria-hidden="true"
                />

                <div className={styles.abruptionContent}>
                  <div className={styles.abruptionText}>
                    <p className={styles.abruptionTitle}>{abruption.title}</p>
                    <p className={styles.abruptionDesc}>{abruption.desc}</p>
                  </div>

                  {(abruption.links?.length > 0 ||
                    abruption.isOverridePossible) && (
                    <div className={styles.abruptionActions}>
                      {abruption.links?.map((link, i) => (
                        <a
                          key={i}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.abruptionBtnSecondary}
                        >
                          <ExternalLink size={12} />
                          {link.label}
                        </a>
                      ))}

                      {abruption.isOverridePossible && (
                        <button
                          type="button"
                          className={styles.abruptionBtnPrimary}
                          onClick={() => setIsOverride(true)}
                        >
                          I want to still update
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── NORMAL FORM ── */
            <>
              {/* Status dropdown */}
              <div className={styles.section}>
                <p className={styles.sectionLabel}>
                  New Status <span className={styles.req}>*</span>
                </p>

                <div className={styles.dropdownWrap} ref={dropdownRef}>
                  <button
                    type="button"
                    className={`${styles.dropdownTrigger} ${
                      dropdownOpen ? styles.dropdownTriggerOpen : ""
                    } ${!status ? styles.placeholder : ""} ${selectTintClass} ${
                      errors.status ? styles.error : ""
                    }`}
                    onClick={() => !isSubmitting && setDropdownOpen((v) => !v)}
                    disabled={isSubmitting}
                  >
                    <span className={styles.dropdownTriggerText}>
                      {status
                        ? STATUS_OPTIONS.find((o) => o.value === status)?.label
                        : "Select a status…"}
                    </span>

                    <ChevronDown
                      size={15}
                      className={`${styles.dropdownChevron} ${
                        dropdownOpen ? styles.dropdownChevronOpen : ""
                      }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`${styles.dropdownItem} ${
                            opt.value === status
                              ? styles.dropdownItemSelected
                              : ""
                          }`}
                          onClick={() => {
                            setStatus(opt.value);
                            setReason("");
                            clearErr("status");
                            clearErr("reason");
                            setDropdownOpen(false);
                          }}
                        >
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {errors.status && (
                  <p className={styles.errText} role="alert">
                    <AlertCircle size={12} /> {errors.status}
                  </p>
                )}
              </div>

              {/* Reason textarea */}
              {status && (
                <div className={styles.section}>
                  <p className={styles.sectionLabel}>
                    {REASON_LABELS[status]}{" "}
                    <span className={styles.req}>*</span>
                  </p>

                  <textarea
                    id="alud-reason"
                    className={`${styles.textarea} ${
                      errors.reason ? styles.error : ""
                    }`}
                    placeholder={REASON_PLACEHOLDERS[status]}
                    value={reason}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setReason(e.target.value);
                      clearErr("reason");
                    }}
                  />

                  {errors.reason && (
                    <p className={styles.errText} role="alert">
                      <AlertCircle size={12} /> {errors.reason}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="button"
            className={`${styles.submitBtn} ${submitBtnClass}`}
            onClick={handleSubmit}
            disabled={isSubmitting || isBlocked || !status || !reason.trim()}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className={styles.spinner} /> {submitLabel}
              </>
            ) : (
              <>
                <Check size={14} /> {submitLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
