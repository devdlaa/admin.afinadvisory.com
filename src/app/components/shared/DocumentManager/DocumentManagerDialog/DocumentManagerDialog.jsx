"use client";
import React, { useEffect, useCallback } from "react";
import { X, FolderOpen } from "lucide-react";

import DocumentManager from "../DocumentManager";
import styles from "./DocumentManagerDialog.module.scss";

const DocumentManagerDialog = ({
  isOpen,
  onClose,
  scope,
  scopeId,
  title = "Documents",
}) => {
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
      aria-label={title}
    >
      <div className={styles.dialog}>
        {/* Dialog Header */}
        <div className={styles.dialogHeader}>
          <div className={styles.dialogTitleRow}>
            <FolderOpen size={18} className={styles.dialogTitleIcon} />
            <h2 className={styles.dialogTitle}>{title}</h2>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body — DocumentManager is untouched */}
        <div className={styles.dialogBody}>
          <DocumentManager scope={scope} scopeId={scopeId} />
        </div>
      </div>
    </div>
  );
};

export default DocumentManagerDialog;
