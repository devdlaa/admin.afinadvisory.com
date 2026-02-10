"use client";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createComment } from "@/store/slices/taskTimelineSlice";
import { Loader2, X } from "lucide-react";
import styles from "./TaskStatusReasonDialog.module.scss";

const STATUS_COPY = {
  ON_HOLD: {
    title: "Task marked as On Hold",
    subtitle: "Would you like to add a reason?",
    placeholder: "e.g. Client is out of station, will resume next month",
  },
  PENDING_CLIENT_INPUT: {
    title: "Waiting for client input",
    subtitle: "What input is pending from the client?",
    placeholder: "e.g. Awaiting signed documents from client",
  },
  CANCELLED: {
    title: "Task cancelled",
    subtitle: "Please share why this task was cancelled",
    placeholder: "e.g. Task no longer required by client",
  },
};

const TaskStatusReasonDialog = ({ isOpen, taskId, status, onSkip, onDone }) => {
  const dispatch = useDispatch();
  const textareaRef = useRef(null);

  const isCreating = useSelector((state) => state.taskTimeline.loading.create);

  const [reason, setReason] = useState("");

  // Auto-focus textarea on open
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen && !isCreating) {
        onSkip();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, isCreating, onSkip]);

  const handleSubmit = async () => {
    if (reason.trim()) {
      await dispatch(
        createComment({
          taskId,
          message: reason.trim(),
          mentions: [],
        }),
      ).unwrap();
    }

    onDone();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isCreating) {
      onSkip();
    }
  };

  if (!isOpen || !status) return null;

  const cfg = STATUS_COPY[status];

  return (
    <div
      className={styles.taskStatusReason__overlay}
      onClick={handleOverlayClick}
    >
      <div className={styles.taskStatusReason__dialog}>
        {/* Header */}
        <div className={styles.taskStatusReason__header}>
          <div className={styles.taskStatusReason__headerText}>
            <h3> {cfg.subtitle}</h3>
            <p className={styles.taskStatusReason__subtitle}>{cfg.title}</p>
          </div>

          <button
            className={styles.taskStatusReason__close}
            onClick={onSkip}
            disabled={isCreating}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.taskStatusReason__body}>
          <textarea
            ref={textareaRef}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={cfg.placeholder}
            disabled={isCreating}
            className={styles.taskStatusReason__textarea}
          />
        </div>

        {/* Actions */}
        <div className={styles.taskStatusReason__actions}>
          <button
            className={styles.btnSecondary}
            onClick={onSkip}
            disabled={isCreating}
          >
            Skip & Close
          </button>

          <button
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={isCreating || !reason.trim()}
          >
            {isCreating ? (
              <>
                <Loader2 size={16} className={styles.spin} />
                Adding...
              </>
            ) : (
              "Add & Close"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskStatusReasonDialog;
