"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Mail,
  Paperclip,
  Plus,
  AlertCircle,
  Send,
  CheckCircle2,
  User,
  Lock,
} from "lucide-react";

import DocumentManagerDialog from "@/app/components/shared/DocumentManager/DocumentManagerDialog/DocumentManagerDialog";
import {
  getMimeIcon,
  getExtension,
  formatFileSize,
  TOOLBAR_ACTIONS,
  validateEmailForm,
  MAX_ATTACHMENTS,
} from "./emailComposerUtils";
import styles from "./EmailComposer.module.scss";

// ── Skeleton primitives ───────────────────────────────────────────────────────
function SkeletonLine({ width = "100%", height = 14, style = {} }) {
  return (
    <div
      className={styles.skeletonLine}
      style={{ width, height, borderRadius: 6, ...style }}
    />
  );
}

function SkeletonBlock({ height = 46, style = {} }) {
  return (
    <div
      className={styles.skeletonBlock}
      style={{ height, borderRadius: 10, ...style }}
    />
  );
}

// ── Skeleton body — mirrors the real form layout ──────────────────────────────
function ComposerSkeleton() {
  return (
    <div className={styles.body}>
      {/* To field */}
      <div className={styles.field}>
        <SkeletonLine width={28} height={11} style={{ marginBottom: 2 }} />
        <SkeletonBlock height={46} />
      </div>

      {/* From field */}
      <div className={styles.field}>
        <SkeletonLine width={36} height={11} style={{ marginBottom: 2 }} />
        <SkeletonBlock height={46} />
      </div>

      {/* Subject */}
      <div className={styles.field}>
        <SkeletonLine width={52} height={11} style={{ marginBottom: 2 }} />
        <SkeletonBlock height={46} />
      </div>

      {/* Editor */}
      <div className={styles.field} style={{ flex: 1 }}>
        <SkeletonBlock height={44} style={{ borderRadius: "10px 10px 0 0" }} />
        <div
          className={styles.skeletonBlock}
          style={{
            height: 260,
            borderRadius: "0 0 10px 10px",
            marginTop: 1,
          }}
        >
          {/* fake text lines inside editor */}
          <div
            style={{
              padding: "18px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <SkeletonLine width="88%" />
            <SkeletonLine width="72%" />
            <SkeletonLine width="95%" />
            <SkeletonLine width="60%" />
            <SkeletonLine width="80%" />
          </div>
        </div>
      </div>

      {/* Attachments */}
      <div className={styles.field}>
        <SkeletonBlock height={72} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const EmailComposer = ({
  open,
  onClose,
  onSubmit,
  mode = "compose",
  leadId,
  toEmails = [],
  fromEmail = "",
  initialData = null,

  // ── NEW props (both optional — fully backward-compatible) ─────────────────
  // Called automatically when mode="update" and initialData is null on open.
  // Your handler should populate initialData via state/redux so the component
  // re-renders with it filled in.
  onFetchInitialData = null,

  loadingWhenInitialData = false,
}) => {
  const isUpdate = mode === "update";
  const isView = mode === "view";

  // ── Form state ────────────────────────────────────────────────────────────
  const [to_email, setToEmail] = useState("");
  const [toDropOpen, setToDropOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [docsOpen, setDocsOpen] = useState(false);
  const [errors, setErrors] = useState({});

  const editorRef = useRef(null);
  const toDropRef = useRef(null);

  // ── On open: seed form or trigger fetch ───────────────────────────────────
  useEffect(() => {
    if (!open) return;

    if ((isUpdate || isView) && !initialData && onFetchInitialData) {
      onFetchInitialData();
      return; // don't seed yet; the effect below handles it once data lands
    }

    seedForm(initialData);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-seed when initialData arrives after async fetch ────────────────────
  useEffect(() => {
    if (!open || (!isUpdate && !isView) || !initialData) return;
    seedForm(initialData);
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  function seedForm(data) {
    setErrors({});
    if ((isUpdate || isView) && data) {
      setToEmail(data.to_email ?? "");
      setSubject(data.subject ?? "");

      setAttachments(
        (data.attachments ?? []).map((a) => ({
          document_id: a.document_id,
          original_name: a.name,
          size_bytes: a.size_bytes,
          mime_type: a.mime_type,
          url: a.url,
        })),
      );
      if (editorRef.current) editorRef.current.innerHTML = data.body ?? "";
    } else if (!isUpdate) {
      setToEmail(toEmails[0] ?? "");
      setSubject("");
      setAttachments([]);
      if (editorRef.current) editorRef.current.innerHTML = "";
    }
  }

  // ── Close to-dropdown on outside click ───────────────────────────────────
  useEffect(() => {
    if (!toDropOpen) return;
    const h = (e) => {
      if (toDropRef.current && !toDropRef.current.contains(e.target))
        setToDropOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [toDropOpen]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") {
        if (docsOpen) return;
        onClose();
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, docsOpen, onClose]);

  // ── Rich text exec ────────────────────────────────────────────────────────
  const exec = useCallback((cmd, value = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  }, []);

  // ── Validate + submit ─────────────────────────────────────────────────────
  const handleSend = () => {
    const errs = validateEmailForm({
      to_email,
      subject,
      bodyText: editorRef.current?.innerText,
    });

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit({
      to_email,
      subject: subject.trim(),
      body: editorRef.current?.innerHTML ?? "",
      attachments,
    });
  };

  // ── Attachments ───────────────────────────────────────────────────────────
  const handleDocsSelect = (selectedDocs) => {
    setDocsOpen(false);
    setAttachments((prev) => {
      const existingIds = new Set(prev.map((a) => a.document_id));
      const fresh = selectedDocs
        .filter((d) => !existingIds.has(d.document_id))
        .slice(0, MAX_ATTACHMENTS - prev.length);
      return [...prev, ...fresh];
    });
  };

  const removeAttachment = (id) =>
    setAttachments((prev) => prev.filter((a) => a.document_id !== id));

  const clearErr = (field) =>
    setErrors((p) => {
      const n = { ...p };
      delete n[field];
      return n;
    });

  if (!open) return null;

  const canAddMore = attachments.length < MAX_ATTACHMENTS;

  // Show skeleton when: update mode AND (explicitly loading OR data not yet arrived)
  const showSkeleton =
    (isUpdate || isView) && (loadingWhenInitialData || !initialData);

  // Show updating spinner on submit button when data is already loaded but request is in-flight
  const isUpdating = isUpdate && !!initialData && loadingWhenInitialData;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={isUpdate ? "Update Email" : "Compose Email"}
        aria-busy={showSkeleton}
      >
        {/* ── Header — always visible ───────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Mail className={styles.headerIcon} size={24} strokeWidth={2.4} />
            <div className={styles.headerText}>
              <h2>{isUpdate ? "Update Email" : "Compose Email"}</h2>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Skeleton OR real body ─────────────────────────────────────── */}
        {showSkeleton ? (
          <ComposerSkeleton />
        ) : (
          <div className={styles.body}>
            {/* To */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>To</label>
              <div
                className={`${styles.toWrap} ${errors.to_email ? styles.fieldError : ""}`}
                ref={toDropRef}
                role="button"
                tabIndex={0}
                aria-haspopup="listbox"
                aria-expanded={toDropOpen}
                onClick={() => {
                  if (toEmails.length > 1 && !isView) setToDropOpen((v) => !v);
                }}
                onKeyDown={(e) => {
                  if (
                    (e.key === "Enter" || e.key === " ") &&
                    toEmails.length > 1 &&
                    !isView
                  ) {
                    e.preventDefault();
                    setToDropOpen((v) => !v);
                  }
                }}
              >
                <div className={styles.toIcon}>
                  <User size={18} />
                </div>

                {to_email ? (
                  <div className={styles.emailChip}>
                    <span>{to_email}</span>
                  </div>
                ) : (
                  <span className={styles.toPlaceholder}>Select recipient</span>
                )}

                {toDropOpen && (
                  <div
                    className={styles.toDropdown}
                    role="listbox"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {toEmails.map((email) => (
                      <div
                        key={email}
                        role="option"
                        aria-selected={email === to_email}
                        className={`${styles.toOption} ${
                          email === to_email ? styles.toOptionActive : ""
                        }`}
                        tabIndex={0}
                        onClick={() => {
                          setToEmail(email);
                          setToDropOpen(false);
                          clearErr("to_email");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setToEmail(email);
                            setToDropOpen(false);
                            clearErr("to_email");
                          }
                        }}
                      >
                        {email}
                        {email === to_email && (
                          <CheckCircle2
                            size={18}
                            className={styles.toOptionCheck}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.to_email && (
                <p className={styles.errText} role="alert">
                  <AlertCircle size={12} /> {errors.to_email}
                </p>
              )}
            </div>

            {/* From */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>From</label>
              <div className={styles.fromWrap}>
                <Lock size={14} className={styles.lockIcon} />
                <span className={styles.fromEmail}>{fromEmail}</span>
              </div>
            </div>

            {/* Subject */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                Subject <span className={styles.req}>*</span>
              </label>
              <input
                type="text"
                className={`${styles.subjectInput} ${errors.subject ? styles.fieldError : ""}`}
                placeholder="What's this email about?"
                value={subject}
                maxLength={200}
                disabled={isView}
                aria-required="true"
                aria-invalid={!!errors.subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  clearErr("subject");
                }}
              />
              {errors.subject && (
                <p className={styles.errText} role="alert">
                  <AlertCircle size={12} /> {errors.subject}
                </p>
              )}
            </div>

            {/* Body */}
            <div
              className={styles.editorWrapper}
              style={{ flex: 1, minHeight: 0 }}
            >
              <div
                className={styles.toolbar}
                role="toolbar"
                aria-label="Formatting"
              >
                {TOOLBAR_ACTIONS.map((action, i) =>
                  action === null ? (
                    <span
                      key={`sep-${i}`}
                      className={styles.toolbarSep}
                      aria-hidden
                    />
                  ) : (
                    <button
                      key={action.cmd + action.title}
                      type="button"
                      className={styles.toolbarBtn}
                      title={action.title}
                      aria-label={action.title}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        exec(action.cmd, action.value ?? null);
                      }}
                    >
                      <action.icon size={18} strokeWidth={2.2} />
                    </button>
                  ),
                )}
              </div>
              <div
                ref={editorRef}
                className={`${styles.editor} ${errors.body ? styles.fieldError : ""}`}
                contentEditable={!isView}
                suppressContentEditableWarning
                aria-label="Email body"
                aria-multiline="true"
                aria-required="true"
                aria-invalid={!!errors.body}
                data-placeholder="Write your message here…"
                onInput={() => clearErr("body")}
              />
              {errors.body && (
                <p className={styles.errText} role="alert">
                  <AlertCircle size={12} /> {errors.body}
                </p>
              )}
            </div>

            {/* Attachments */}
            <div className={styles.attachSection}>
              <div className={styles.attachHeader}>
                <div className={styles.attachTitle}>
                  <Paperclip size={14} />
                  <span>Attachments</span>
                  <span className={styles.attachCount}>
                    {attachments.length}/{MAX_ATTACHMENTS}
                  </span>
                </div>
                {canAddMore && !isView && (
                  <button
                    type="button"
                    className={styles.addAttachBtn}
                    onClick={() => setDocsOpen(true)}
                  >
                    <Plus size={14} />
                    Add File
                  </button>
                )}
              </div>

              {attachments.length > 0 ? (
                <div className={styles.attachList}>
                  {attachments.map((att, idx) => {
                    const Icon = getMimeIcon(att.mime_type);
                    return (
                      <div
                        key={`${att.document_id}-${idx}`}
                        className={styles.attachChip}
                      >
                        <div className={styles.attachChipIcon}>
                          <Icon size={14} />
                        </div>
                        <div className={styles.attachChipInfo}>
                          <span className={styles.attachChipName}>
                            {att.original_name}
                          </span>
                          <span className={styles.attachChipMeta}>
                            {getExtension(att.original_name)} ·{" "}
                            {formatFileSize(att.size_bytes)}
                          </span>
                        </div>
                        {!isView && (
                          <button
                            type="button"
                            className={styles.attachRemove}
                            onClick={() => removeAttachment(att.document_id)}
                            aria-label={`Remove ${att.original_name}`}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.attachEmpty}>No attachments yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Footer — disabled during skeleton ────────────────────────── */}
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            <X size={20} />
            Cancel
          </button>
          {!isView && (
            <button
              type="button"
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={showSkeleton || isUpdating}
              aria-disabled={showSkeleton || isUpdating}
              aria-busy={isUpdating}
            >
              <Send size={20} />
              {isUpdating
                ? "Updating…"
                : isUpdate
                  ? "Update Email"
                  : "Save Email"}
            </button>
          )}
        </div>
      </aside>

      {/* Document picker */}
      <DocumentManagerDialog
        isOpen={docsOpen}
        onClose={() => setDocsOpen(false)}
        scope="TASK"
        scopeId={leadId}
        title="Attach from Documents"
        mode="select"
        selectConfig={{
          maxSelectable: MAX_ATTACHMENTS - attachments.length,
          onSelect: handleDocsSelect,
          onCancel: () => setDocsOpen(false),
          mimeTypes: ["application/pdf", "image/png", "image/jpeg"],
          maxSize: 5 * 1024 * 1024,
        }}
      />
    </>
  );
};

export default EmailComposer;
