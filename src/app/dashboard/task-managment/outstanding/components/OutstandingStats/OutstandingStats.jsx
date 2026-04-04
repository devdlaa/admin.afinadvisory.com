import React from "react";
import { Wallet, FileMinus, FileEdit, FileCheck } from "lucide-react";
import styles from "./OutstandingStats.module.scss";
import { formatCurrency } from "@/utils/client/cutils";

const OutstandingStats = ({ cards, loading = false }) => {
  const statsConfig = [
    {
      id: "total_recoverable",
      label: "Total Recoverable",
      value: cards?.total_recoverable || 0,
      icon: Wallet,
      color: "red",
    },
    {
      id: "uninvoiced",
      label: "Un-Reconciled",
      value: cards?.uninvoiced || 0,
      icon: FileMinus,
      color: "orange",
    },
    {
      id: "draft_invoices",
      label: "Draft Invoices",
      value: cards?.draft_invoices || 0,
      icon: FileEdit,
      color: "blue",
    },
    {
      id: "issued_pending",
      label: "Issued Invoices",
      value: cards?.issued_pending || 0,
      icon: FileCheck,
      color: "green",
    },
  ];

  if (loading) {
    return (
      <div className={styles.outstandingStats}>
        {statsConfig.map((stat) => (
          <div key={stat.id} className={styles.outstandingStats__card}>
            <div className={styles.outstandingStats__cardHeader}>
              <div className={styles.outstandingStats__iconSkeleton} />
              <div className={styles.outstandingStats__labelSkeleton} />
            </div>
            <div className={styles.outstandingStats__valueSkeleton} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.outstandingStats}>
      {statsConfig.map((stat) => {
        const IconComponent = stat.icon;

        return (
          <div
            key={stat.id}
            className={`
              ${styles.outstandingStats__card}
              ${styles[`outstandingStats__card--${stat.color}`]}
            `}
          >
            <div className={styles.outstandingStats__cardHeader}>
              <div
                className={`${styles.outstandingStats__icon} ${styles[`outstandingStats__icon--${stat.color}`]}`}
              >
                <IconComponent size={20} />
              </div>
              <span className={styles.outstandingStats__label}>
                {stat.label}
              </span>
            </div>
            <div className={styles.outstandingStats__value}>
              {formatCurrency(stat.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OutstandingStats;
