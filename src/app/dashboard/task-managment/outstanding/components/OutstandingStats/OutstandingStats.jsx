import React from "react";
import { Wallet, CirclePercent, Info, Landmark } from "lucide-react";
import styles from "./OutstandingStats.module.scss";
import { formatCurrency } from "@/utils/client/cutils";
const OutstandingStats = ({ cards, loading = false, selectedChargeType }) => {
  const activeCardIdMap = {
    SERVICE_FEE: "service_charge",
    GOVERNMENT_FEE: "government_fee",
    EXTERNAL_CHARGE: "other_charges",
  };
  const activeCardId = activeCardIdMap[selectedChargeType];



  const statsConfig = [
    {
      id: "total_recoverable",
      label: "Total Recoverable",
      value: cards?.total_pending || 0,
      icon: Wallet,
      color: "red",
    },
    {
      id: "service_charge",
      label: "Service Charge",
      value: cards?.service_fee_pending || 0,
      icon: CirclePercent,
      color: "green",
    },
    {
      id: "government_fee",
      label: "Government Fee",
      value: cards?.government_fee_pending || 0,
      icon: Landmark,
      color: "orange",
    },
    {
      id: "other_charges",
      label: "Other Charges",
      value: cards?.external_charges_pending || 0,
      icon: Info,
      color: "blue",
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
    ${
      activeCardId === stat.id
        ? styles.outstandingStats__card__active
        : selectedChargeType
          ? styles.outstandingStats__card__dimmed
          : ""
    }
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
