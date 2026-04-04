"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import styles from "./TaskStatusReasonDialog.module.scss";

const STATUS_COPY = {
  ON_HOLD: {
    title: "Task marked as On Hold",
    subtitle: "Why is this task on hold?",
    placeholder: "e.g. Client is out of station, will resume next month",
  },
  PENDING_CLIENT_INPUT: {
    title: "Waiting for client input",
    subtitle: "What input is pending from the client?",
    placeholder: "e.g. Awaiting signed documents from client",
  },
  CANCELLED: {
    title: "Task cancelled",
    subtitle: "Why is this task being cancelled?",
    placeholder: "e.g. Task no longer required by client",
  },
};

/**
 * Un-skippable reason dialog.
 *
 * Props:
 *   isOpen   {boolean}          - Whether the dialog is visible
 *   status   {string}           - The critical status that triggered it
 *   onDone   {(reason) => void} - Called with the reason string when user confirms
 *   onCancel {() => void}       - Called when user wants to revert the status change
 *
 * Note: There is no "skip" path. The user must either:
 *   1. Submit a reason → onDone(reason) is called → parent saves with reason
 *   2. Cancel          → onCancel() is called     → parent reverts the status
 */
const TaskStatusReasonDialog = ({ isOpen, status, onDone, onCancel }) => {
  const textareaRef = useRef(null);
  const [reason, setReason] = useState("");

  const isUpdating = useSelector((state) => state.task.loading.update);

  // Auto-focus and reset on open
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // No escape-key dismiss — dialog is intentionally blocking

  const handleSubmit = () => {
    if (!reason.trim() || isUpdating) return;
    onDone(reason.trim());
  };

  const handleKeyDown = (e) => {
    // Cmd/Ctrl + Enter submits
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen || !status) return null;

  const cfg = STATUS_COPY[status];
  if (!cfg) return null;

  return (
    // No onClick on overlay — clicking outside does nothing
    <div className={styles.taskStatusReason__overlay}>
      <div className={styles.taskStatusReason__dialog}>
        {/* Header — no close button */}
        <div className={styles.taskStatusReason__header}>
          <div className={styles.taskStatusReason__headerText}>
            <h3>{cfg.subtitle}</h3>
            <p className={styles.taskStatusReason__subtitle}>{cfg.title}</p>
          </div>
        </div>

        {/* Body */}
        <div className={styles.taskStatusReason__body}>
          <textarea
            ref={textareaRef}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={cfg.placeholder}
            disabled={isUpdating}
            className={styles.taskStatusReason__textarea}
          />
          <p className={styles.taskStatusReason__hint}>
            Please add a meaningful reason — this helps the others understand the
            context. Vague entries like <em>"ok"</em>, <em>"done"</em> or{" "}
            <em>"n/a"</em> won't be helpful later.
          </p>
        </div>

        {/* Actions */}
        <div className={styles.taskStatusReason__actions}>
          {/* Cancel reverts the status change */}
          <button
            className={styles.btnSecondary}
            onClick={onCancel}
            disabled={isUpdating}
          >
            Cancel Status Change
          </button>

          <button
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={isUpdating || !reason.trim()}
          >
            {isUpdating ? (
              <>
                <Loader2 size={15} className={styles.spin} />
                Saving...
              </>
            ) : (
              "Confirm & Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskStatusReasonDialog;
