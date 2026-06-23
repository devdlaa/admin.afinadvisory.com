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
  AtSign,
  Bot,
  Trash2,
  X,
  AlertCircle,
  Check,
  CheckCircle2,
  X as Ban,
} from "lucide-react";

import styles from "./CreateActivityDialog.module.scss";
import EmailComposer from "../EmailComposer/EmailComposer";

import {
  ACTIVITY_TYPES,
  ACTIVITY_NATURE,
  ACTIVITY_STATUS,
  validateForm,
  buildPayload,
  todayISO,
  formatDisplayDate,
  formatDisplayTime,
} from "./Createactivityutils";

const TYPE_ICONS = {
  CALL: Phone,
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  VIDEO_CALL: Video,
};

const INITIAL_FORM = {
  activity_type: null,
  title: "",
  description: "",
  nature: null,
  status: null,
  completion_note: "",
  missed_reason: "",
  scheduled_at: null,
  // NOTE: no `email` key here at all — it's added conditionally in buildPayload
};

// ── Payload builder (replaces the one in utils for email logic) ───────────────
// Call the imported buildPayload but strip email unless conditions are met.
// If your buildPayload already handles this, remove this wrapper and use it directly.
function buildSafePayload(form) {
  const payload = buildPayload(form);

  // Only include email if: EMAIL type + SCHEDULED nature + user explicitly linked one
  if (
    form.activity_type !== "EMAIL" ||
    form.nature !== ACTIVITY_NATURE.SCHEDULED ||
    !form.email
  ) {
    delete payload.email;
  }

  return payload;
}

export default function CreateActivityDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  leadId,
  toEmails,
  fromEmail,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);

  const [pickerDate, setPickerDate] = useState("");
  const [pickerTime, setPickerTime] = useState("");

  const titleInputRef = useRef(null);
  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);
  const typePickerRef = useRef(null);

  // ── Full reset whenever the dialog opens ─────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setForm(INITIAL_FORM);
    setErrors({});
    setPickerDate("");
    setPickerTime("");
    setTypePickerOpen(false);
    setEmailComposerOpen(false); // FIX: was never reset on re-open
    const t = setTimeout(() => titleInputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open]);

  // ── Close type picker on outside click ───────────────────────────────────
  useEffect(() => {
    if (!typePickerOpen) return;
    const handler = (e) => {
      if (typePickerRef.current && !typePickerRef.current.contains(e.target)) {
        setTypePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [typePickerOpen]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        if (typePickerOpen) {
          setTypePickerOpen(false);
          return;
        }
        if (!isSubmitting) onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, typePickerOpen, isSubmitting, onClose]);

  if (!open) return null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const clearErr = (field) =>
    setErrors((p) => {
      const n = { ...p };
      delete n[field];
      return n;
    });

  const isLog = form.nature === ACTIVITY_NATURE.LOG;
  const isScheduled = form.nature === ACTIVITY_NATURE.SCHEDULED;
  const isEmail = form.activity_type === "EMAIL";
  const isVideo = form.activity_type === "VIDEO_CALL";

  const TypeIcon = form.activity_type
    ? TYPE_ICONS[form.activity_type]
    : Activity;

  // ── Nature change — full wipe of nature-dependent state ──────────────────
  const handleNatureChange = (nature) => {
    setForm((p) => ({
      ...p,
      nature,
      status: null,
      completion_note: "",
      missed_reason: "",
      scheduled_at: null,
      // FIX: always clear email when nature changes; user must re-link
      ...(p.activity_type === "EMAIL" ? { email: null } : {}),
    }));
    setPickerDate("");
    setPickerTime("");
    setErrors({});
  };

  // ── Activity type change — clear email if switching away from EMAIL ───────
  const handleTypeChange = (value) => {
    set("activity_type", value);
    clearErr("activity_type");
    // FIX: if user had linked an email and now switches type away, discard it
    if (value !== "EMAIL") {
      setForm((p) => {
        const next = { ...p, activity_type: value };
        delete next.email;
        return next;
      });
    }
    setTypePickerOpen(false);
    titleInputRef.current?.focus();
  };

  // ── Status change ─────────────────────────────────────────────────────────
  const handleStatusChange = (status) => {
    setForm((p) => ({ ...p, status, completion_note: "", missed_reason: "" }));
    clearErr("status");
    clearErr("completion_note");
    clearErr("missed_reason");
  };

  // ── Date/time → scheduled_at ──────────────────────────────────────────────
  const handleDateChange = (val) => {
    setPickerDate(val);
    clearErr("scheduled_at");
    const time = pickerTime || "00:00";
    set(
      "scheduled_at",
      val ? new Date(`${val}T${time}:00`).toISOString() : null,
    );
  };

  const handleTimeChange = (val) => {
    setPickerTime(val);
    clearErr("scheduled_at");
    if (pickerDate) {
      set("scheduled_at", new Date(`${pickerDate}T${val}:00`).toISOString());
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit(buildSafePayload(form));
  };

  // ── Email composer ────────────────────────────────────────────────────────
  const handleEmailSubmit = (emailData) => {
    set("email", emailData);
    setEmailComposerOpen(false);
  };

  // ── Derived submit-button disabled state ──────────────────────────────────
  const isSubmitDisabled =
    isSubmitting ||
    !form.activity_type ||
    !form.title.trim() ||
    !form.nature || // FIX: nature must be chosen
    (isLog && !form.status) ||
    (isLog &&
      form.status === ACTIVITY_STATUS.COMPLETED &&
      !form.completion_note.trim()) ||
    (isLog &&
      form.status === ACTIVITY_STATUS.MISSED &&
      !form.missed_reason.trim()) ||
    (isScheduled && !form.scheduled_at);

  // ─────────────────────────────────────────────────────────────────────────
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
        aria-labelledby="cad-title"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerInner}>
            <div className={styles.headerLeft}>
              <Activity
                className={styles.headerIcon}
                size={25}
                strokeWidth={2.4}
                aria-hidden="true"
              />
              <div className={styles.headerText}>
                <h2 id="cad-title">Create New Activity</h2>
                <p className={styles.subText}>
                  Log a task, schedule a follow-up
                </p>
              </div>
            </div>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close dialog"
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className={styles.body} role="region" aria-label="Activity form">
          {/* Activity Title */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cad-title-input">
              Activity Title{" "}
              <span className={styles.req} aria-hidden="true">
                *
              </span>
            </label>

            <div style={{ position: "relative" }} ref={typePickerRef}>
              <div
                className={`${styles.titleWrap} ${errors.title || errors.activity_type ? styles.error : ""}`}
              >
                <button
                  type="button"
                  className={`${styles.typeBtn} ${!form.activity_type ? styles.typeBtnEmpty : ""}`}
                  onClick={() => setTypePickerOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={typePickerOpen}
                  aria-label={`Activity type: ${form.activity_type ?? "not selected"}. Click to change.`}
                >
                  <TypeIcon size={24} aria-hidden="true" />
                </button>

                <input
                  ref={titleInputRef}
                  id="cad-title-input"
                  type="text"
                  className={styles.titleInput}
                  placeholder="What is this all about?"
                  value={form.title}
                  maxLength={120}
                  autoComplete="off"
                  aria-required="true"
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? "cad-title-err" : undefined}
                  onChange={(e) => {
                    set("title", e.target.value);
                    clearErr("title");
                  }}
                />
              </div>

              {typePickerOpen && (
                <div
                  className={styles.typeDropdown}
                  role="listbox"
                  aria-label="Select activity type"
                >
                  {ACTIVITY_TYPES.map(({ value, label }) => {
                    const Icon = TYPE_ICONS[value];
                    return (
                      <div
                        key={value}
                        role="option"
                        aria-selected={form.activity_type === value}
                        className={`${styles.typeOption} ${form.activity_type === value ? styles.active : ""}`}
                        onClick={() => handleTypeChange(value)} // FIX: use handleTypeChange
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleTypeChange(value);
                          }
                        }}
                        tabIndex={0}
                      >
                        <Icon size={20} aria-hidden="true" />
                        {label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {errors.activity_type && (
              <p id="cad-type-err" className={styles.errText} role="alert">
                <AlertCircle size={12} aria-hidden="true" />{" "}
                {errors.activity_type}
              </p>
            )}
            {errors.title && (
              <p id="cad-title-err" className={styles.errText} role="alert">
                <AlertCircle size={12} aria-hidden="true" /> {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cad-desc">
              Description
            </label>
            <textarea
              id="cad-desc"
              className={`${styles.textarea} ${errors.description ? styles.error : ""}`}
              placeholder="More info about this would be great."
              value={form.description}
              maxLength={300}
              aria-invalid={!!errors.description}
              aria-describedby={
                errors.description ? "cad-desc-err" : "cad-desc-count"
              }
              onChange={(e) => {
                set("description", e.target.value);
                clearErr("description");
              }}
            />
            {errors.description && (
              <p id="cad-desc-err" className={styles.errText} role="alert">
                <AlertCircle size={12} aria-hidden="true" />{" "}
                {errors.description}
              </p>
            )}
          </div>

          {/* Nature */}
          <div className={styles.field}>
            <p className={styles.sectionLabel} id="cad-nature-label">
              What is the nature of this activity?
            </p>
            <div
              className={styles.natureGrid}
              role="radiogroup"
              aria-labelledby="cad-nature-label"
            >
              <div
                className={`${styles.natureCard} ${isLog ? styles.selected : ""}`}
                role="radio"
                aria-checked={isLog}
                tabIndex={0}
                onClick={() => handleNatureChange(ACTIVITY_NATURE.LOG)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNatureChange(ACTIVITY_NATURE.LOG);
                  }
                }}
              >
                <History
                  className={styles.natureIcon}
                  size={28}
                  aria-hidden="true"
                />
                <div>
                  <p className={styles.natureTitle}>It's Just a Log</p>
                  <p className={styles.natureDesc}>
                    Activity already happened.
                  </p>
                </div>
              </div>

              <div
                className={`${styles.natureCard} ${isScheduled ? styles.selected : ""}`}
                role="radio"
                aria-checked={isScheduled}
                tabIndex={0}
                onClick={() => handleNatureChange(ACTIVITY_NATURE.SCHEDULED)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNatureChange(ACTIVITY_NATURE.SCHEDULED);
                  }
                }}
              >
                <CalendarClock
                  className={styles.natureIcon}
                  size={28}
                  aria-hidden="true"
                />
                <div>
                  <p className={styles.natureTitle}>Scheduled for Future</p>
                  <p className={styles.natureDesc}>
                    I am planning to take this in Later.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── LOG: Status ───────────────────────────────────────────────── */}
          {isLog && (
            <div className={styles.field}>
              <p className={styles.sectionLabel} id="cad-status-label">
                Status for this log. <span className={styles.req}>*</span>
              </p>
              <div
                className={styles.statusGrid}
                role="radiogroup"
                aria-labelledby="cad-status-label"
                aria-required="true"
              >
                <div
                  className={`${styles.statusCard} ${styles.completed} ${form.status === ACTIVITY_STATUS.COMPLETED ? styles.selected : ""}`}
                  role="radio"
                  aria-checked={form.status === ACTIVITY_STATUS.COMPLETED}
                  tabIndex={0}
                  onClick={() => handleStatusChange(ACTIVITY_STATUS.COMPLETED)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleStatusChange(ACTIVITY_STATUS.COMPLETED);
                    }
                  }}
                >
                  <CheckCircle2
                    className={styles.statusIcon}
                    size={26}
                    aria-hidden="true"
                  />
                  <div>
                    <p className={styles.statusTitle}>Completed</p>
                    <p className={styles.statusDesc}>
                      Activity was completed successfully.
                    </p>
                  </div>
                </div>

                <div
                  className={`${styles.statusCard} ${styles.missed} ${form.status === ACTIVITY_STATUS.MISSED ? styles.selected : ""}`}
                  role="radio"
                  aria-checked={form.status === ACTIVITY_STATUS.MISSED}
                  tabIndex={0}
                  onClick={() => handleStatusChange(ACTIVITY_STATUS.MISSED)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleStatusChange(ACTIVITY_STATUS.MISSED);
                    }
                  }}
                >
                  <Ban
                    className={styles.statusIcon}
                    size={26}
                    aria-hidden="true"
                  />
                  <div>
                    <p className={styles.statusTitle}>Missed</p>
                    <p className={styles.statusDesc}>Activity was Missed.</p>
                  </div>
                </div>
              </div>
              {errors.status && (
                <p className={styles.errText} role="alert">
                  <AlertCircle size={12} aria-hidden="true" /> {errors.status}
                </p>
              )}
            </div>
          )}

          {/* ── LOG COMPLETED: Completion Note ────────────────────────────── */}
          {isLog && form.status === ACTIVITY_STATUS.COMPLETED && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cad-completion-note">
                Completion Note{" "}
                <span className={styles.req} aria-hidden="true">
                  *
                </span>
              </label>
              <textarea
                id="cad-completion-note"
                className={`${styles.textarea} ${errors.completion_note ? styles.error : ""}`}
                placeholder="Anything you would like to share about this?"
                value={form.completion_note}
                aria-required="true"
                aria-invalid={!!errors.completion_note}
                aria-describedby={
                  errors.completion_note ? "cad-cn-err" : undefined
                }
                onChange={(e) => {
                  set("completion_note", e.target.value);
                  clearErr("completion_note");
                }}
              />
              {errors.completion_note && (
                <p id="cad-cn-err" className={styles.errText} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />{" "}
                  {errors.completion_note}
                </p>
              )}
            </div>
          )}

          {/* ── LOG MISSED: Missed Reason ──────────────────────────────────── */}
          {isLog && form.status === ACTIVITY_STATUS.MISSED && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cad-missed-reason">
                Reason for Missing{" "}
                <span className={styles.req} aria-hidden="true">
                  *
                </span>
              </label>
              <textarea
                id="cad-missed-reason"
                className={`${styles.textarea} ${errors.missed_reason ? styles.error : ""}`}
                placeholder="What happened? Why was this missed?"
                value={form.missed_reason}
                aria-required="true"
                aria-invalid={!!errors.missed_reason}
                aria-describedby={
                  errors.missed_reason ? "cad-mr-err" : undefined
                }
                onChange={(e) => {
                  set("missed_reason", e.target.value);
                  clearErr("missed_reason");
                }}
              />
              {errors.missed_reason && (
                <p id="cad-mr-err" className={styles.errText} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />{" "}
                  {errors.missed_reason}
                </p>
              )}
            </div>
          )}

          {/* ── SCHEDULED: Date + Time ─────────────────────────────────────── */}
          {isScheduled && (
            <div className={styles.field}>
              <p className={styles.sectionLabel} id="cad-dt-label">
                Please specify the exact time and date.
              </p>
              <div
                className={styles.dateTimeRow}
                aria-labelledby="cad-dt-label"
              >
                {/* Date pill */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    className={`${styles.pill} ${pickerDate ? styles.filled : ""} ${errors.scheduled_at && !pickerDate ? styles.error : ""}`}
                    aria-label={
                      pickerDate
                        ? `Date: ${formatDisplayDate(pickerDate)}. Click to change.`
                        : "Select date (required)"
                    }
                    onClick={() => dateInputRef.current?.showPicker?.()}
                  >
                    <CalendarDays size={18} aria-hidden="true" />
                    {pickerDate ? formatDisplayDate(pickerDate) : "Select Date"}
                  </button>
                  <input
                    ref={dateInputRef}
                    type="date"
                    className={styles.hiddenInput}
                    min={todayISO()}
                    value={pickerDate}
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                </div>

                {/* Time pill — FIX: error highlight whenever date is set but time isn't, not just today */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    className={`${styles.pill} ${pickerTime ? styles.filled : ""} ${errors.scheduled_at && pickerDate && !pickerTime ? styles.error : ""}`}
                    aria-label={
                      pickerTime
                        ? `Time: ${formatDisplayTime(pickerTime)}. Click to change.`
                        : "Time"
                    }
                    onClick={() => timeInputRef.current?.showPicker?.()}
                  >
                    <Clock3 size={18} aria-hidden="true" />
                    {pickerTime ? formatDisplayTime(pickerTime) : "Time"}
                  </button>
                  <input
                    ref={timeInputRef}
                    type="time"
                    className={styles.hiddenInput}
                    value={pickerTime}
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={(e) => handleTimeChange(e.target.value)}
                  />
                </div>
              </div>

              {errors.scheduled_at && (
                <p className={styles.errText} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />{" "}
                  {errors.scheduled_at}
                </p>
              )}
            </div>
          )}

          {/* ── SCHEDULED + EMAIL: Auto-email banner ──────────────────────── */}
          {isScheduled && isEmail && (
            <div
              className={styles.banner}
              role="region"
              aria-label="Auto email option"
            >
              <AtSign
                className={styles.bannerIcon}
                size={28}
                aria-hidden="true"
              />
              <div>
                {form.email ? (
                  <>
                    <p className={styles.bannerTitle}>
                      Your email will be sent to the intended recipient.
                    </p>
                    <p className={styles.bannerDesc}>
                      Auto email is scheduled
                      {pickerDate
                        ? ` for ${formatDisplayDate(pickerDate)}${pickerTime ? ` @ ${formatDisplayTime(pickerTime)}` : ""}`
                        : ""}
                      .
                    </p>
                  </>
                ) : (
                  <>
                    <p className={styles.bannerTitle}>
                      Would you like us to send this email for you?
                    </p>
                    <p className={styles.bannerDesc}>
                      Just provide the email content and it will be sent
                      automatically.
                    </p>
                  </>
                )}
                <div className={styles.bannerActions}>
                  <button
                    type="button"
                    className={styles.writeEmailBtn}
                    onClick={() => setEmailComposerOpen(true)}
                  >
                    <Bot size={18} aria-hidden="true" />
                    {form.email
                      ? "Update Email Content"
                      : "Write Email Content"}
                  </button>
                  {form.email && (
                    <button
                      type="button"
                      className={styles.removeEmailBtn}
                      onClick={() => set("email", null)}
                      aria-label="Remove automatic email"
                    >
                      <Trash2 size={18} aria-hidden="true" />
                      Remove Auto-email
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X size={20} aria-hidden="true" />
            Cancel
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                Creating…
              </>
            ) : (
              <>
                <Check size={20} aria-hidden="true" />
                Create Activity
              </>
            )}
          </button>
        </div>

        <EmailComposer
          open={emailComposerOpen}
          onClose={() => setEmailComposerOpen(false)}
          onSubmit={handleEmailSubmit}
          mode={form.email ? "update" : "compose"}
          leadId={leadId}
          toEmails={toEmails}
          fromEmail={fromEmail}
          initialData={form.email || undefined}
        />
      </div>
    </div>
  );
}
