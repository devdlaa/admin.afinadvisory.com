import { useState, useRef, useEffect } from "react";
import {
  Activity,
  Phone,
  Mail,
  MessageCircle,
  Video,
  History,
  CalendarClock,
  CalendarDays,
  Clock3,
  X,
  AlertCircle,
  Check,
  CheckCircle2,
  RefreshCw,
  Info,
  ExternalLink,
  CheckCircle,
  XCircle,
  ShieldAlert,
  ChevronDown,
  Loader2,
} from "lucide-react";

import styles from "./ViewActivityDialog.module.scss";

import {
  ACTIVITY_TYPES,
  ACTIVITY_NATURE,
  ACTIVITY_STATUS,
  todayISO,
  formatDisplayDate,
  formatDisplayTime,
} from "../CreateActivityDialog/Createactivityutils";

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_ICONS = {
  CALL: Phone,
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  VIDEO_CALL: Video,
};

const STATUS_CONFIG = {
  active: { label: "Active", colorClass: styles.statusActive },
  completed: { label: "Completed", colorClass: styles.statusCompleted },
  missed: { label: "Missed", colorClass: styles.statusMissed },
  cancelled: { label: "Cancelled", colorClass: styles.statusCancelled },
  overdue: { label: "Overdue", colorClass: styles.statusOverdue },
};

const LIFECYCLE_STATUS_OPTIONS = [
  { value: ACTIVITY_STATUS.COMPLETED, label: "Completed" },
  { value: ACTIVITY_STATUS.MISSED, label: "Missed" },
  { value: "CANCELLED", label: "Cancelled" },
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

const buildBase = (data = {}) => ({
  activity_type: data.activity_type ?? null,
  title: data.title ?? "",
  description: data.description ?? "",
  nature: data.nature ?? null,
  status: data.status ?? null,
  completion_note: data.completion_note ?? "",
  missed_reason: data.missed_reason ?? "",
  scheduled_at: data.scheduled_at ?? null,
  email: data.email ?? null,
});

// ── Main Component ────────────────────────────────────────────────────────────

export default function ViewActivityDialog({
  open,
  onClose,
  onUpdateActivity,
  isUpdatingActivity = false,
  canUpdateStatus = false,
  onLifecycleSubmit,
  isSubmittingLifecycle = false,
  abruption = null,
  editableFields = {},
  initialData = {},
  leadStatus,
  tags = [],
  leadDetails,
  leadLink,
  timestamps = [],
  banner,
  completionNote,
}) {
  // ── Details form state ────────────────────────────────────────────────────
  const [form, setForm] = useState(() => buildBase(initialData));
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState("");
  const [pickerTime, setPickerTime] = useState("");

  // ── Lifecycle panel state ─────────────────────────────────────────────────
  const [lifecycleMode, setLifecycleMode] = useState(false);
  const [lcStatus, setLcStatus] = useState("");
  const [lcReason, setLcReason] = useState("");
  const [lcErrors, setLcErrors] = useState({});
  const [lcDropdownOpen, setLcDropdownOpen] = useState(false);
  const [isOverride, setIsOverride] = useState(false);

  const titleInputRef = useRef(null);
  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);
  const typePickerRef = useRef(null);
  const lcDropdownRef = useRef(null);

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setForm(buildBase(initialData));
    setIsDirty(false);
    setErrors({});
    setTypePickerOpen(false);
    setLifecycleMode(false);
    setLcStatus("");
    setLcReason("");
    setLcErrors({});
    setIsOverride(false);

    if (initialData.scheduled_at) {
      const d = new Date(initialData.scheduled_at);
      const pad = (n) => String(n).padStart(2, "0");
      setPickerDate(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      );
      setPickerTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    } else {
      setPickerDate("");
      setPickerTime("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset override when abruption changes ─────────────────────────────────
  useEffect(() => {
    if (abruption) setIsOverride(false);
  }, [abruption]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") {
        if (typePickerOpen) {
          setTypePickerOpen(false);
          return;
        }
        if (lcDropdownOpen) {
          setLcDropdownOpen(false);
          return;
        }
        if (lifecycleMode) {
          setLifecycleMode(false);
          return;
        }
        if (!isUpdatingActivity && !isSubmittingLifecycle) onClose();
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [
    open,
    typePickerOpen,
    lcDropdownOpen,
    lifecycleMode,
    isUpdatingActivity,
    isSubmittingLifecycle,
    onClose,
  ]);

  // ── Lifecycle dropdown outside click ──────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (lcDropdownRef.current && !lcDropdownRef.current.contains(e.target))
        setLcDropdownOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!open) return null;

  // ── Details helpers ───────────────────────────────────────────────────────
  const setField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      setIsDirty(detectChanges(next));
      return next;
    });
  };

  const clearErr = (field) =>
    setErrors((p) => {
      const n = { ...p };
      delete n[field];
      return n;
    });

  const detectChanges = (current) => {
    const b = initialData;
    return (
      current.title !== (b.title ?? "") ||
      current.description !== (b.description ?? "") ||
      current.activity_type !== (b.activity_type ?? null) ||
      current.nature !== (b.nature ?? null) ||
      current.scheduled_at !== (b.scheduled_at ?? null) ||
      current.completion_note !== (b.completion_note ?? "") ||
      current.missed_reason !== (b.missed_reason ?? "") ||
      current.email !== (b.email ?? null)
    );
  };

  const isLog = form.nature === ACTIVITY_NATURE.LOG;
  const isScheduled = form.nature === ACTIVITY_NATURE.SCHEDULED;
  const canEdit = (f) => !!editableFields[f];
  const TypeIcon = TYPE_ICONS[form.activity_type] ?? Phone;

  const handleDateChange = (val) => {
    if (!canEdit("scheduled_at")) return;
    setPickerDate(val);
    clearErr("scheduled_at");
    const time = pickerTime || "00:00";
    setField(
      "scheduled_at",
      val ? new Date(`${val}T${time}:00`).toISOString() : null,
    );
  };

  const handleTimeChange = (val) => {
    if (!canEdit("scheduled_at")) return;
    setPickerTime(val);
    clearErr("scheduled_at");
    if (pickerDate)
      setField(
        "scheduled_at",
        new Date(`${pickerDate}T${val}:00`).toISOString(),
      );
  };

  const handleUpdate = () => {
    const b = initialData;
    const changed = {};

    // Only include fields that actually changed
    if (form.title.trim() !== (b.title ?? "").trim())
      changed.title = form.title.trim();
    if ((form.description ?? "").trim() !== (b.description ?? "").trim())
      changed.description = form.description?.trim() ?? "";
    if (form.scheduled_at !== (b.scheduled_at ?? null))
      changed.scheduled_at = form.scheduled_at;

    if (!Object.keys(changed).length) return;

    // Validate only what is actually being sent
    const errs = {};

    if ("title" in changed) {
      if (!changed.title) errs.title = "Activity title is required.";
      else if (changed.title.length > 120)
        errs.title = "Title cannot exceed 120 characters.";
    }

    if ("description" in changed && changed.description.length > 300) {
      errs.description = "Description cannot exceed 300 characters.";
    }

    if ("scheduled_at" in changed) {
      if (!changed.scheduled_at) {
        errs.scheduled_at = "Please select a date and time.";
      } else {
        const selected = new Date(changed.scheduled_at);
        if (selected < new Date()) {
          errs.scheduled_at = "Scheduled time cannot be in the past.";
        } else {
          const todayStr = todayISO();
          const selDate = changed.scheduled_at.split("T")[0];
          if (
            selDate === todayStr &&
            selected.getHours() === 0 &&
            selected.getMinutes() === 0
          ) {
            errs.scheduled_at =
              "Please also specify a time when scheduling for today.";
          }
        }
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    onUpdateActivity(changed);
  };

  // ── Lifecycle helpers ─────────────────────────────────────────────────────
  const clearLcErr = (field) =>
    setLcErrors((p) => {
      const n = { ...p };
      delete n[field];
      return n;
    });

  const handleLifecycleSubmit = () => {
    const errs = {};
    if (!lcStatus) errs.status = "Please select a status.";
    if (!lcReason.trim()) errs.reason = "This field is required.";
    if (Object.keys(errs).length > 0) {
      setLcErrors(errs);
      return;
    }
    onLifecycleSubmit?.({
      status: lcStatus,
      reason: lcReason.trim(),
      ...(isOverride ? { override_activity: true } : {}),
    });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const statusCfg = STATUS_CONFIG[leadStatus] ?? STATUS_CONFIG.active;
  const isBlocked = abruption && !isOverride;

  const lcSubmitLabel = isSubmittingLifecycle
    ? "Updating…"
    : lcStatus === ACTIVITY_STATUS.COMPLETED
      ? "Mark Completed"
      : lcStatus === ACTIVITY_STATUS.MISSED
        ? "Mark Missed"
        : lcStatus === "CANCELLED"
          ? "Mark Cancelled"
          : "Submit";

  const lcSubmitBtnClass =
    lcStatus === ACTIVITY_STATUS.COMPLETED
      ? styles.lcBtnCompleted
      : lcStatus === ACTIVITY_STATUS.MISSED
        ? styles.lcBtnMissed
        : lcStatus === "CANCELLED"
          ? styles.lcBtnCancelled
          : styles.lcBtnDefault;

  const lcSelectTintClass =
    lcStatus === ACTIVITY_STATUS.COMPLETED
      ? styles.lcCompletedSelected
      : lcStatus === ACTIVITY_STATUS.MISSED
        ? styles.lcMissedSelected
        : lcStatus === "CANCELLED"
          ? styles.lcCancelledSelected
          : "";

  const lcIsDisabled =
    isSubmittingLifecycle || isBlocked || !lcStatus || !lcReason.trim();

  // ─────────────────────────────────────────────────────────────────────────
  // ── LIFECYCLE MODE — narrow standalone dialog ─────────────────────────────
  if (lifecycleMode) {
    return (
      <div
        className={styles.overlay}
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !isSubmittingLifecycle) onClose();
        }}
      >
        <div
          className={styles.lcDialog}
          role="dialog"
          aria-modal="true"
          aria-label="Update Activity Status"
        >
          {/* Header */}
          <div className={styles.lcDialogHeader}>
            <div className={styles.lcDialogHeaderLeft}>
              <Activity
                className={styles.headerIcon}
                size={20}
                strokeWidth={2.4}
                aria-hidden
              />
              <h2 className={styles.headerTitle}>Activity Overview</h2>
            </div>
            <div className={styles.headerRight}>
              <button
                type="button"
                className={styles.cancelLifecycleBtn}
                onClick={() => setLifecycleMode(false)}
                disabled={isSubmittingLifecycle}
              >
                Cancel Update
              </button>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                disabled={isSubmittingLifecycle}
                aria-label="Close"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
          </div>

          {/* Pills */}
          {(leadStatus || isOverride) && (
            <div className={styles.lcDialogPills}>
              {leadStatus && (
                <span
                  className={`${styles.statusPill} ${statusCfg.colorClass}`}
                >
                  {statusCfg.label}
                </span>
              )}
              {isOverride && (
                <span className={styles.overrideChip}>Override</span>
              )}
            </div>
          )}

          {/* Body */}
          <div className={styles.lcDialogBody}>
            {isBlocked ? (
              <div className={styles.lcAbruption} role="alert">
                <ShieldAlert
                  className={styles.lcAbruptionIcon}
                  size={20}
                  aria-hidden
                />
                <div className={styles.lcAbruptionContent}>
                  <p className={styles.lcAbruptionTitle}>{abruption.title}</p>
                  <p className={styles.lcAbruptionDesc}>{abruption.desc}</p>
                  {(abruption.links?.length > 0 ||
                    abruption.isOverridePossible) && (
                    <div className={styles.lcAbruptionActions}>
                      {abruption.links?.map((link, i) => (
                        <a
                          key={i}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.lcAbruptionBtnSecondary}
                        >
                          <ExternalLink size={12} /> {link.label}
                        </a>
                      ))}
                      {abruption.isOverridePossible && (
                        <button
                          type="button"
                          className={styles.lcAbruptionBtnPrimary}
                          onClick={() => setIsOverride(true)}
                        >
                          I want to still update
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Status dropdown */}
                <div className={styles.field}>
                  <p className={styles.sectionLabel}>
                    New Status <span className={styles.req}>*</span>
                  </p>
                  <div className={styles.lcDropdownWrap} ref={lcDropdownRef}>
                    <button
                      type="button"
                      className={`${styles.lcDropdownTrigger} ${lcDropdownOpen ? styles.open : ""} ${!lcStatus ? styles.placeholder : ""} ${lcSelectTintClass} ${lcErrors.status ? styles.error : ""}`}
                      onClick={() =>
                        !isSubmittingLifecycle && setLcDropdownOpen((v) => !v)
                      }
                      disabled={isSubmittingLifecycle}
                    >
                      <span className={styles.lcDropdownTriggerText}>
                        {lcStatus
                          ? LIFECYCLE_STATUS_OPTIONS.find(
                              (o) => o.value === lcStatus,
                            )?.label
                          : "Select a status…"}
                      </span>
                      <ChevronDown
                        size={15}
                        className={`${styles.chevron} ${lcDropdownOpen ? styles.chevronOpen : ""}`}
                      />
                    </button>
                    {lcDropdownOpen && (
                      <div className={styles.lcDropdownMenu}>
                        {LIFECYCLE_STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className={`${styles.lcDropdownItem} ${opt.value === lcStatus ? styles.selected : ""}`}
                            onClick={() => {
                              setLcStatus(opt.value);
                              setLcReason("");
                              clearLcErr("status");
                              clearLcErr("reason");
                              setLcDropdownOpen(false);
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {lcErrors.status && (
                    <p className={styles.errText} role="alert">
                      <AlertCircle size={12} /> {lcErrors.status}
                    </p>
                  )}
                </div>

                {/* Reason */}
                {lcStatus && (
                  <div className={styles.field}>
                    <p className={styles.sectionLabel}>
                      {REASON_LABELS[lcStatus]}{" "}
                      <span className={styles.req}>*</span>
                    </p>
                    <textarea
                      className={`${styles.lcTextarea} ${lcErrors.reason ? styles.error : ""}`}
                      placeholder={REASON_PLACEHOLDERS[lcStatus]}
                      value={lcReason}
                      disabled={isSubmittingLifecycle}
                      onChange={(e) => {
                        setLcReason(e.target.value);
                        clearLcErr("reason");
                      }}
                    />
                    {lcErrors.reason && (
                      <p className={styles.errText} role="alert">
                        <AlertCircle size={12} /> {lcErrors.reason}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className={styles.lcDialogFooter}>
            <button
              type="button"
              className={styles.lcCancelBtn}
              onClick={() => setLifecycleMode(false)}
              disabled={isSubmittingLifecycle}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.lcSubmitBtn} ${lcSubmitBtnClass}`}
              onClick={handleLifecycleSubmit}
              disabled={lcIsDisabled}
              aria-busy={isSubmittingLifecycle}
            >
              {isSubmittingLifecycle ? (
                <>
                  <Loader2 size={14} className={styles.lcSpinner} />{" "}
                  {lcSubmitLabel}
                </>
              ) : (
                <>
                  <Check size={14} /> {lcSubmitLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── NORMAL MODE — full two-panel dialog ───────────────────────────────────
  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isUpdatingActivity) onClose();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="View Activity"
      >
        {/* ── HEADER ───────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerInner}>
            <div className={styles.headerLeft}>
              <Activity
                className={styles.headerIcon}
                size={22}
                strokeWidth={2.4}
                aria-hidden
              />
              <h2 className={styles.headerTitle}>Activity Overview</h2>
            </div>

            <div className={styles.headerRight}>
              {canUpdateStatus && (
                <button
                  type="button"
                  className={styles.updateStatusBtn}
                  onClick={() => setLifecycleMode(true)}
                  disabled={isUpdatingActivity}
                >
                  <RefreshCw size={15} aria-hidden />
                  <span>Update Status</span>
                </button>
              )}
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                disabled={isUpdatingActivity}
                aria-label="Close"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
          </div>

          <div className={styles.headerTags}>
            {leadStatus && (
              <span className={`${styles.statusPill} ${statusCfg.colorClass}`}>
                {statusCfg.label}
              </span>
            )}
            {tags.map((tag, i) => (
              <span key={i} className={styles.tagPill}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* ── BODY ─────────────────────────────────────────────────────── */}
        <div className={styles.body}>
          {/* ══ LEFT PANEL — always visible ══ */}
          <div className={styles.leftPanel}>
            {/* Title */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="vad-title-input">
                Activity Title{" "}
                <span className={styles.req} aria-hidden>
                  *
                </span>
              </label>
              <div style={{ position: "relative" }} ref={typePickerRef}>
                <div
                  className={`${styles.titleWrap} ${errors.title || errors.activity_type ? styles.error : ""} ${!canEdit("title") && !canEdit("activity_type") ? styles.readOnly : ""}`}
                >
                  <button
                    type="button"
                    className={`${styles.typeBtn} ${!canEdit("activity_type") ? styles.disabled : ""}`}
                    aria-haspopup="listbox"
                    aria-expanded={typePickerOpen}
                    disabled={!canEdit("activity_type")}
                    onClick={() =>
                      canEdit("activity_type") && setTypePickerOpen((v) => !v)
                    }
                  >
                    <TypeIcon size={22} aria-hidden />
                  </button>
                  <input
                    ref={titleInputRef}
                    id="vad-title-input"
                    type="text"
                    className={styles.titleInput}
                    placeholder="What is this all about?"
                    value={form.title}
                    maxLength={120}
                    autoComplete="off"
                    readOnly={!canEdit("title")}
                    disabled={isUpdatingActivity}
                    aria-required
                    aria-invalid={!!errors.title}
                    onChange={(e) => {
                      if (!canEdit("title")) return;
                      setField("title", e.target.value);
                      clearErr("title");
                    }}
                  />
                </div>
                {typePickerOpen && canEdit("activity_type") && (
                  <div className={styles.typeDropdown} role="listbox">
                    {ACTIVITY_TYPES.map(({ value, label }) => {
                      const Icon = TYPE_ICONS[value];
                      return (
                        <div
                          key={value}
                          role="option"
                          aria-selected={form.activity_type === value}
                          className={`${styles.typeOption} ${form.activity_type === value ? styles.active : ""}`}
                          tabIndex={0}
                          onClick={() => {
                            setField("activity_type", value);
                            clearErr("activity_type");
                            setTypePickerOpen(false);
                            titleInputRef.current?.focus();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setField("activity_type", value);
                              clearErr("activity_type");
                              setTypePickerOpen(false);
                            }
                          }}
                        >
                          <Icon size={18} aria-hidden /> {label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {errors.activity_type && (
                <p className={styles.errText} role="alert">
                  <AlertCircle size={12} aria-hidden /> {errors.activity_type}
                </p>
              )}
              {errors.title && (
                <p className={styles.errText} role="alert">
                  <AlertCircle size={12} aria-hidden /> {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="vad-desc">
                Description
              </label>
              <textarea
                id="vad-desc"
                className={`${styles.textarea} ${errors.description ? styles.error : ""} ${!canEdit("description") ? styles.readOnly : ""}`}
                placeholder="More info about this would be great."
                value={form.description}
                maxLength={300}
                readOnly={!canEdit("description")}
                disabled={isUpdatingActivity}
                onChange={(e) => {
                  if (!canEdit("description")) return;
                  setField("description", e.target.value);
                  clearErr("description");
                }}
              />
            </div>

            {/* Nature */}
            <div className={styles.field}>
              <p className={styles.sectionLabel} id="vad-nature-label">
                What is the nature of this activity?
              </p>
              <div
                className={`${styles.natureGrid} ${!canEdit("nature") ? styles.disabledGrid : ""}`}
                role="radiogroup"
                aria-labelledby="vad-nature-label"
              >
                {[
                  {
                    val: ACTIVITY_NATURE.LOG,
                    Icon: History,
                    title: "It's Just a Log",
                    desc: "Activity already happened.",
                  },
                  {
                    val: ACTIVITY_NATURE.SCHEDULED,
                    Icon: CalendarClock,
                    title: "Scheduled for Future",
                    desc: "Planning to take this later.",
                  },
                ].map(({ val, Icon, title, desc }) => (
                  <div
                    key={val}
                    className={`${styles.natureCard} ${form.nature === val ? styles.selected : ""} ${!canEdit("nature") ? styles.notClickable : ""}`}
                    role="radio"
                    aria-checked={form.nature === val}
                    tabIndex={canEdit("nature") ? 0 : -1}
                  >
                    <Icon className={styles.natureIcon} size={26} aria-hidden />
                    <div>
                      <p className={styles.natureTitle}>{title}</p>
                      <p className={styles.natureDesc}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LOG: Status */}
            {isLog && (
              <div className={styles.field}>
                <p className={styles.sectionLabel} id="vad-status-label">
                  Status for this log.{" "}
                  {canEdit("status") && <span className={styles.req}>*</span>}
                </p>
                <div
                  className={`${styles.statusGrid} ${!canEdit("status") ? styles.disabledGrid : ""}`}
                  role="radiogroup"
                  aria-labelledby="vad-status-label"
                >
                  {[
                    {
                      key: ACTIVITY_STATUS.COMPLETED,
                      label: "Completed",
                      desc: "Activity completed successfully.",
                      Icon: CheckCircle2,
                      mod: styles.completed,
                    },
                    {
                      key: ACTIVITY_STATUS.MISSED,
                      label: "Missed",
                      desc: "Activity was missed.",
                      Icon: X,
                      mod: styles.missed,
                    },
                  ].map(({ key, label, desc, Icon, mod }) => (
                    <div
                      key={key}
                      className={`${styles.statusCard} ${mod} ${form.status === key ? styles.selected : ""} ${!canEdit("status") ? styles.notClickable : ""}`}
                      role="radio"
                      aria-checked={form.status === key}
                      tabIndex={canEdit("status") ? 0 : -1}
                    >
                      <Icon
                        className={styles.statusIcon}
                        size={24}
                        aria-hidden
                      />
                      <div>
                        <p className={styles.statusTitle}>{label}</p>
                        <p className={styles.statusDesc}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.status && (
                  <p className={styles.errText} role="alert">
                    <AlertCircle size={12} aria-hidden /> {errors.status}
                  </p>
                )}
              </div>
            )}

            {/* SCHEDULED: Date + Time */}
            {isScheduled && (
              <div className={styles.field}>
                <p className={styles.sectionLabel} id="vad-dt-label">
                  Please specify the exact time and date.
                </p>
                <div
                  className={styles.dateTimeRow}
                  aria-labelledby="vad-dt-label"
                >
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      className={`${styles.pill} ${pickerDate ? styles.filled : ""} ${errors.scheduled_at && !pickerDate ? styles.error : ""} ${!canEdit("scheduled_at") ? styles.disabledPill : ""}`}
                      onClick={() =>
                        canEdit("scheduled_at") &&
                        dateInputRef.current?.showPicker?.()
                      }
                      disabled={!canEdit("scheduled_at") || isUpdatingActivity}
                    >
                      <CalendarDays size={16} aria-hidden />
                      {pickerDate
                        ? formatDisplayDate(pickerDate)
                        : "Select Date"}
                    </button>
                    <input
                      ref={dateInputRef}
                      type="date"
                      className={styles.hiddenInput}
                      min={todayISO()}
                      value={pickerDate}
                      aria-hidden
                      tabIndex={-1}
                      onChange={(e) => handleDateChange(e.target.value)}
                    />
                  </div>
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      className={`${styles.pill} ${pickerTime ? styles.filled : ""} ${!canEdit("scheduled_at") ? styles.disabledPill : ""}`}
                      onClick={() =>
                        canEdit("scheduled_at") &&
                        timeInputRef.current?.showPicker?.()
                      }
                      disabled={!canEdit("scheduled_at") || isUpdatingActivity}
                    >
                      <Clock3 size={16} aria-hidden />
                      {pickerTime ? formatDisplayTime(pickerTime) : "Time"}
                    </button>
                    <input
                      ref={timeInputRef}
                      type="time"
                      className={styles.hiddenInput}
                      value={pickerTime}
                      aria-hidden
                      tabIndex={-1}
                      onChange={(e) => handleTimeChange(e.target.value)}
                    />
                  </div>
                </div>
                {errors.scheduled_at && (
                  <p className={styles.errText} role="alert">
                    <AlertCircle size={12} aria-hidden /> {errors.scheduled_at}
                  </p>
                )}
              </div>
            )}

            {/* Banner */}
            {banner && (
              <div className={styles.banner}>
                <div className={styles.bannerIconWrap}>{banner.icon}</div>
                <div className={styles.bannerBody}>
                  <p className={styles.bannerTitle}>{banner.title}</p>
                  <p className={styles.bannerDesc}>{banner.description}</p>
                  {banner.actions?.length > 0 && (
                    <div className={styles.bannerActions}>
                      {banner.actions.map((action, i) => (
                        <button
                          key={i}
                          type="button"
                          className={styles.bannerActionBtn}
                          style={{
                            backgroundColor: action.bgColor,
                            color: action.textColor,
                            borderColor: action.textColor
                              ? `${action.textColor}40`
                              : undefined,
                          }}
                          onClick={action.handler}
                        >
                          {action.icon && (
                            <span aria-hidden>{action.icon}</span>
                          )}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Completion Note */}
            {completionNote && (
              <div className={styles.field}>
                <label className={styles.label}>Completion Note</label>
                <textarea
                  className={`${styles.textarea} ${styles.readOnly}`}
                  value={completionNote}
                  readOnly
                  aria-label="Completion note"
                />
              </div>
            )}
          </div>

          {/* ── DIVIDER ─────────────────────────────────────────────────── */}
          <div className={styles.divider} aria-hidden />

          {/* ══ RIGHT PANEL ══ */}
          <div className={styles.rightPanel}>
            <>
              {leadDetails && (
                <div className={styles.rightSection}>
                  <div className={styles.rightSectionHeader}>
                    <Info size={18} aria-hidden />
                    <span>Lead Details</span>
                    {leadLink && (
                      <a
                        href={leadLink}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.viewLeadLink}
                      >
                        <ExternalLink size={15} aria-hidden /> View Lead
                      </a>
                    )}
                  </div>
                  <div className={styles.leadCard}>
                    {leadDetails.title && (
                      <>
                        <p className={styles.leadMetaLabel}>LEAD TITLE</p>
                        <p className={styles.leadMetaValue}>
                          {leadDetails.title}
                        </p>
                      </>
                    )}
                    {leadDetails.description && (
                      <>
                        <p
                          className={styles.leadMetaLabel}
                          style={{ marginTop: 10 }}
                        >
                          LEAD DESCRIPTION
                        </p>
                        <p className={styles.leadMetaValue}>
                          {leadDetails.description}
                        </p>
                      </>
                    )}
                    {leadDetails.chips?.length > 0 && (
                      <div className={styles.leadChips}>
                        {leadDetails.chips.map((chip, i) => {
                          const Icon = chip.icon;
                          return (
                            <span
                              key={i}
                              className={styles.leadChip}
                              style={{
                                borderColor: chip.color,
                                color: chip.color,
                                backgroundColor: `${chip.color}12`,
                              }}
                            >
                              {Icon && (
                                <Icon
                                  size={24}
                                  strokeWidth={2.2}
                                  className={styles.leadChipIcon}
                                />
                              )}
                              <span className={styles.leadChipValue}>
                                {chip.value}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {timestamps.length > 0 && (
                <div className={styles.rightSection}>
                  <div className={styles.rightSectionHeader}>
                    <Info size={18} aria-hidden />
                    <span>Activity Meta Details</span>
                  </div>
                  <div className={styles.timestampsList}>
                    {timestamps.map((ts, i) => (
                      <p key={i} className={styles.timestampRow}>
                        <span className={styles.timestampLabel}>
                          {ts.label} :
                        </span>
                        <span className={styles.timestampValue}>
                          {ts.value}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {isDirty && (
                <div className={styles.rightFooter}>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    onClick={handleUpdate}
                    disabled={isUpdatingActivity}
                  >
                    {isUpdatingActivity ? (
                      <>
                        <span className={styles.spinner} /> Updating…
                      </>
                    ) : (
                      <>
                        <Check size={18} /> Update Activity
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          </div>
        </div>
      </div>
    </div>
  );
}
