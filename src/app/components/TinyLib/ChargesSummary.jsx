import { useState } from "react";
import styles from "./ChargesSummary.module.scss";
import { formatCurrency } from "@/utils/utils";
import CustomInput from "./CustomInput";

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
  invoiceNumber = "",
  onInvoiceNumberChange = () => {},
}) => {
  const [localInvoiceNumber, setLocalInvoiceNumber] = useState(invoiceNumber);

  const handleInvoiceNumberChange = (value) => {
    setLocalInvoiceNumber(value);
    onInvoiceNumberChange(value);
  };

  return (
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
              <p className={styles.subLabel}>(Expenses Written-off by firm)</p>
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
            <h4 className={styles.breakdownTitle}>Breakdown</h4>
            
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>
                Firm's Fee ({summary.breakdown.firmsFeePercentage}% of total)
              </span>
              <span className={styles.breakdownAmount}>
                {formatCurrency(summary.breakdown.firmsFee)}
              </span>
            </div>

            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>
                External Expenses (
                {summary.breakdown.externalExpensesPercentage}% of total)
              </span>
              <span className={styles.breakdownAmount}>
                {formatCurrency(summary.breakdown.externalExpenses)}
              </span>
            </div>

            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>
                Written-off ({summary.breakdown.writtenOffPercentage}% of total)
              </span>
              <span className={`${styles.breakdownAmount} ${styles.writtenOffAmount}`}>
                {formatCurrency(summary.breakdown.writtenOff)}
              </span>
            </div>
          </div>

          {/* Invoice Number Input */}
          <div className={styles.invoiceNumberSection}>
            <CustomInput
              value={localInvoiceNumber}
              onChange={handleInvoiceNumberChange}
              label="Invoice Number"
              placeholder="Enter invoice number (e.g., INV-2024-001)"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChargesSummary;