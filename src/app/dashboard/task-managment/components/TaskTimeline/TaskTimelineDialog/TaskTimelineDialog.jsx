"use client";
import React, { useEffect, useCallback } from "react";
import { X, MessageSquare } from "lucide-react";

import TaskTimeline from "../TaskTimeline";
import styles from "./TaskTimelineDialog.module.scss";

const TaskTimelineDialog = ({ isOpen, onClose, taskId, task, title }) => {
  const resolvedTitle = title || task?.title || "Timeline";

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={resolvedTitle}
    >
      <div className={styles.dialog}>
        {/* Dialog Header */}
        <div className={styles.dialogHeader}>
          <div className={styles.dialogTitleRow}>
            <MessageSquare size={18} className={styles.dialogTitleIcon} />
            <h2 className={styles.dialogTitle}>{resolvedTitle}</h2>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* TaskTimeline fills the body, scrolls inside itself */}
        <div className={styles.dialogBody}>
          <TaskTimeline taskId={taskId} task={task} />
        </div>
      </div>
    </div>
  );
};

export default TaskTimelineDialog;
