"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, UserX, UserCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

import Button from "@/app/components/shared/Button/Button";
import {
  markTasksNonBillable,
  restoreTasksBillable,
  selectLoading,
  selectError,
} from "@/store/slices/reconcileSlice";

import styles from "./BulkActionDialog.module.scss";

export default function BulkActionDialog({ type, selectedTaskIds, onClose }) {
  const dispatch = useDispatch();

  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const isMarkNonBillable = type === "mark-non-billable";
  const isRestoreBillable = type === "restore-billable";

  const title = isMarkNonBillable
    ? "Mark as Non-Billable"
    : "Restore to Billable";

  const description = isMarkNonBillable
    ? "These tasks will be moved to the non-billable tab and won't appear in invoices."
    : "These tasks will be restored to the unreconciled tab and can be invoiced again.";

  const icon = isMarkNonBillable ? UserX : UserCheck;
  const Icon = icon;

  const handleSubmit = async () => {
    setIsProcessing(true);

    try {
      let response;

      if (isMarkNonBillable) {
        response = await dispatch(
          markTasksNonBillable(selectedTaskIds)
        ).unwrap();
      } else {
        response = await dispatch(
          restoreTasksBillable(selectedTaskIds)
        ).unwrap();
      }

      setResult(response);
    } catch (err) {
      console.error("Bulk action failed:", err);
      setResult({
        updated: [],
        restored: [],
        rejected: [{ message: err.message || "Operation failed" }],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const successCount = result
    ? (result.updated?.length || 0) + (result.restored?.length || 0)
    : 0;
  const failedCount = result ? result.rejected?.length || 0 : 0;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div
              className={`${styles.headerIcon} ${result && successCount > 0 ? styles.success : ""}`}
            >
              {result && successCount > 0 ? (
                <CheckCircle2 size={20} />
              ) : (
                <Icon size={20} />
              )}
            </div>
            <div>
              <h2 className={styles.title}>
                {result
                  ? successCount > 0
                    ? "Action Completed"
                    : "Action Failed"
                  : title}
              </h2>
              <p className={styles.subtitle}>
                {result
                  ? `${successCount} of ${selectedTaskIds.length} tasks processed successfully`
                  : description}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {!result && (
            <div className={styles.confirmation}>
              <div className={styles.warningBox}>
                <AlertTriangle size={20} />
                <div>
                  <p className={styles.warningTitle}>Confirm Action</p>
                  <p className={styles.warningText}>
                    You are about to{" "}
                    {isMarkNonBillable
                      ? "mark as non-billable"
                      : "restore to billable"}{" "}
                    <strong>{selectedTaskIds.length}</strong>{" "}
                    {selectedTaskIds.length === 1 ? "task" : "tasks"}.
                  </p>
                </div>
              </div>

              <div className={styles.taskCount}>
                <span className={styles.label}>Selected Tasks:</span>
                <span className={styles.count}>{selectedTaskIds.length}</span>
              </div>
            </div>
          )}

          {result && (
            <div className={styles.result}>
              {successCount > 0 && (
                <div className={styles.resultSection}>
                  <div className={styles.resultHeader}>
                    <CheckCircle2 size={16} className={styles.successIcon} />
                    <span className={styles.resultTitle}>
                      Successfully Processed ({successCount})
                    </span>
                  </div>
                  <p className={styles.resultText}>
                    {successCount} {successCount === 1 ? "task" : "tasks"}{" "}
                    {isMarkNonBillable
                      ? "marked as non-billable"
                      : "restored to billable"}
                    .
                  </p>
                </div>
              )}

              {failedCount > 0 && (
                <div className={styles.resultSection}>
                  <div className={styles.resultHeader}>
                    <AlertTriangle size={16} className={styles.errorIcon} />
                    <span className={styles.resultTitle}>
                      Failed ({failedCount})
                    </span>
                  </div>
                  <div className={styles.errorList}>
                    {result.rejected.map((item, idx) => (
                      <div key={idx} className={styles.errorItem}>
                        <span className={styles.errorReason}>
                          {item.reason || item.message || "Unknown error"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {!result ? (
            <>
              <Button
                variant="outline"
                size="md"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>

              <Button
                variant={isMarkNonBillable ? "danger" : "primary"}
                size="md"
                onClick={handleSubmit}
                loading={isProcessing}
              >
                {isMarkNonBillable ? "Mark Non-Billable" : "Restore Billable"}
              </Button>
            </>
          ) : (
            <Button variant="primary" size="md" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}