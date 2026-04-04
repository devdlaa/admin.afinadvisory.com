"use client";
import React from "react";
import { X, FileText } from "lucide-react";
import { CircularProgress } from "@mui/material";
import styles from "./MarkIssuedDialog.module.scss";

const MarkIssuedDialog = ({
  selectedInvoices,
  externalInvoiceNumbers,
  onExternalInvoiceNumberChange,
  onClose,
  onConfirm,
  isLoading,
}) => {
  // Check if all inputs are filled and valid
  const allFilled = selectedInvoices.every((invoice) =>
    externalInvoiceNumbers[invoice.id]?.trim(),
  );

  // Check for duplicate invoice numbers
  const hasDuplicates = () => {
    const numbers = Object.values(externalInvoiceNumbers).filter((n) =>
      n?.trim(),
    );
    return numbers.length !== new Set(numbers).size;
  };

  const canSubmit = allFilled && !hasDuplicates();

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div>
              <h2 className={styles.title}>
                External Invoice Numbers Required
              </h2>
              <p className={styles.subtitle}>{selectedInvoices.length} Items</p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.scrollableContent}>
          {selectedInvoices.map((invoice) => (
            <div key={invoice.id} className={styles.invoiceRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Internal Invoice Number</label>
                <input
                  type="text"
                  value={invoice.internal_number}
                  disabled
                  className={styles.disabledInput}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>
                  External Invoice Number *
                </label>
                <input
                  type="text"
                  placeholder="Enter external invoice number"
                  value={externalInvoiceNumbers[invoice.id] || ""}
                  onChange={(e) =>
                    onExternalInvoiceNumberChange(invoice.id, e.target.value)
                  }
                  className={styles.input}
                />
              </div>
            </div>
          ))}

          {hasDuplicates() && (
            <div className={styles.errorMessage}>
              ⚠️ Duplicate invoice numbers detected. Each invoice must have a
              unique external number.
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            className={styles.closeSelectionButton}
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={styles.markIssuedButton}
            onClick={onConfirm}
            disabled={!canSubmit || isLoading}
          >
            {isLoading && (
              <CircularProgress
                size={16}
                style={{ marginRight: 8, color: "white" }}
              />
            )}
            <FileText size={16} />
            Mark as Issued
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarkIssuedDialog;
