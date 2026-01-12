import { useState, useEffect } from "react";
import { Save, Loader2, ChevronDown } from "lucide-react";
import styles from "./ChargesSummary.module.scss";
import { formatCurrency } from "@/utils/server/utils";

const practiceFirmOptions = [
  { value: "DLAA_CA_FIRM", label: "DLAA CA Firm" },
  { value: "AFIN_ADVISORY_PVT_LTD", label: "Afin Advisory Pvt Ltd" },
  { value: "MUTUAL_FUND_ADVISORY", label: "Other" },
];

const ChargesSummary = ({
  summary = {
    totalBilled: 0,
    writtenOff: 0,
    prepaidByClient: 0,
    totalRecoverable: 0,
    breakdown: {
      firmsFee: 0,
      firmsFeePercentage: 0,
      externalExpenses: 0,
      externalExpensesPercentage: 0,
      writtenOff: 0,
      writtenOffPercentage: 0,
    },
  },
  initialInvoiceNumber = "",
  initialPracticeFirm = null,
  onSaveInvoiceDetails = () => {},
  isSavingInvoiceDetails = false,
}) => {
  const [localInvoiceNumber, setLocalInvoiceNumber] =
    useState(initialInvoiceNumber);
  const [localPracticeFirm, setLocalPracticeFirm] =
    useState(initialPracticeFirm);

  // Track original values for change detection
  const [originalInvoiceNumber, setOriginalInvoiceNumber] =
    useState(initialInvoiceNumber);
  const [originalPracticeFirm, setOriginalPracticeFirm] =
    useState(initialPracticeFirm);

  // Sync with props when they change
  useEffect(() => {
    setLocalInvoiceNumber(initialInvoiceNumber);
    setOriginalInvoiceNumber(initialInvoiceNumber);
  }, [initialInvoiceNumber]);

  useEffect(() => {
    setLocalPracticeFirm(initialPracticeFirm);
    setOriginalPracticeFirm(initialPracticeFirm);
  }, [initialPracticeFirm]);

  // Check if there are unsaved changes
  const hasChanges = () => {
    return (
      localInvoiceNumber !== originalInvoiceNumber ||
      localPracticeFirm !== originalPracticeFirm
    );
  };

  const handleSave = async () => {
    if (!hasChanges()) return;

    const success = await onSaveInvoiceDetails({
      invoice_number: localInvoiceNumber || null,
      practice_firm: localPracticeFirm || null,
    });

    // Update original values after successful save
    if (success) {
      setOriginalInvoiceNumber(localInvoiceNumber);
      setOriginalPracticeFirm(localPracticeFirm);
    }
  };

  return (
    <div className={styles.summaryContainer}>
      <div className={styles.summaryCard}>
        <div className={styles.mainContent}>
          <div className={styles.calculations}>
            <div className={styles.summaryRow}>
              <div className={styles.labelSection}>
                <h3 className={styles.label}>Total Billed Amount :</h3>
                <p className={styles.subLabel}>
                  (Service Fee + External Charges)
                </p>
              </div>
              <div className={styles.amount}>
                {formatCurrency(summary.totalBilled)}
              </div>
            </div>

            {/* Written-off by Firm */}
            <div className={styles.summaryRow}>
              <div className={styles.labelSection}>
                <h3 className={styles.label}>Written-off by Firm</h3>
                <p className={styles.subLabel}>
                  (Expenses Written-off by firm)
                </p>
              </div>
              <div className={`${styles.amount} ${styles.deduction}`}>
                (-) {formatCurrency(summary.writtenOff)}
              </div>
            </div>

            {/* Prepaid By Client */}
            <div className={styles.summaryRow}>
              <div className={styles.labelSection}>
                <h3 className={styles.label}>Prepaid By Client</h3>
                <p className={styles.subLabel}>
                  (Charges Already Paid By Client)
                </p>
              </div>
              <div className={`${styles.amount} ${styles.deduction}`}>
                (-) {formatCurrency(summary.prepaidByClient)}
              </div>
            </div>

            {/* Divider */}
            <div className={styles.divider}></div>

            {/* Total Recoverable */}
            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
              <div className={styles.labelSection}>
                <h3 className={styles.totalLabel}>Total Recoverable</h3>
                <p className={styles.subLabel}>
                  (Final Amount client needs to pay)
                </p>
              </div>
              <div className={`${styles.amount} ${styles.totalAmount}`}>
                {formatCurrency(summary.totalRecoverable)}
              </div>
            </div>
          </div>

          {/* Right Side - Breakdown */}
          <div className={styles.sidebar}>
            {/* Breakdown */}
            <div className={styles.breakdown}>
              <h4 className={styles.breakdownTitle}>Charges Breakdown</h4>

              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>Firm's Fee</span>
                <span className={styles.breakdownAmount}>
                  {formatCurrency(summary.breakdown.firmsFee)}
                </span>
              </div>

              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>
                  External Expenses{" "}
                </span>
                <span className={styles.breakdownAmount}>
                  {formatCurrency(summary.breakdown.externalExpenses)}
                </span>
              </div>

              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>Written-off</span>
                <span
                  className={`${styles.breakdownAmount} ${styles.writtenOffAmount}`}
                >
                  {formatCurrency(summary.breakdown.writtenOff)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Details Section - Separate Row */}
      <div className={styles.invoiceDetailsCard}>
        <h4 className={styles.invoiceDetailsTitle}>Invoice Details</h4>

        <div className={styles.invoiceDetailsForm}>
          {/* Practice Firm Dropdown */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Bill From</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.selectInput}
                value={localPracticeFirm || ""}
                onChange={(e) => setLocalPracticeFirm(e.target.value || null)}
              >
                <option value="">Select Practice Firm</option>
                {practiceFirmOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className={styles.selectIcon} size={18} />
            </div>
          </div>

          {/* Invoice Number Input */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Invoice Number</label>
            <input
              type="text"
              className={styles.textInput}
              value={localInvoiceNumber}
              onChange={(e) => setLocalInvoiceNumber(e.target.value)}
              placeholder="Enter invoice number (e.g., INV-2024-001)"
            />
          </div>

          {/* Save Button - Only show if there are changes */}
          {hasChanges() && (
            <button
              className={styles.saveButton}
              onClick={handleSave}
              disabled={isSavingInvoiceDetails}
            >
              {isSavingInvoiceDetails ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Invoice Details</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChargesSummary;
