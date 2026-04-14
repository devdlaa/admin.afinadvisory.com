/**
 * ReminderDialogSkeleton
 *
 * Shown inside the left card while `loadingInitialData` is true (update mode).
 * Matches the card's real layout so there's no layout shift when data arrives.
 * Uses a shimmer animation that fits the white card aesthetic.
 */

import React from "react";
import styles from "./ReminderDialogSkeleton.module.scss";

export default function ReminderDialogSkeleton() {
  return (
    <div className={styles.root}>
      {/* Header row */}
      <div className={styles.header}>
        <div className={styles.row}>
          <div className={`${styles.block} ${styles.pill}`} />
          <div className={`${styles.block} ${styles.pill}`} style={{ width: 90 }} />
        </div>
        <div className={styles.row}>
          <div className={`${styles.block} ${styles.circle}`} />
          <div className={`${styles.block} ${styles.circle}`} />
        </div>
      </div>

      {/* Title */}
      <div className={`${styles.block} ${styles.title}`} />

      {/* Description box */}
      <div className={`${styles.block} ${styles.desc}`} />

      {/* Tags row */}
      <div className={styles.tagsRow}>
        <div className={`${styles.block} ${styles.tag}`} />
        <div className={`${styles.block} ${styles.tag}`} style={{ width: 88 }} />
        <div className={`${styles.block} ${styles.tag}`} style={{ width: 64 }} />
      </div>

      {/* Pills row */}
      <div className={styles.pillsRow}>
        <div className={`${styles.block} ${styles.pillSk}`} />
        <div className={`${styles.block} ${styles.pillSk}`} style={{ width: 110 }} />
        <div className={`${styles.block} ${styles.pillSk}`} style={{ width: 120 }} />
      </div>

      <div className={styles.divider} />

      {/* Checklist header */}
      <div className={styles.checkHeader}>
        <div className={`${styles.block} ${styles.checkLabel}`} />
        <div className={`${styles.block} ${styles.checkBadge}`} />
      </div>

      {/* Checklist items */}
      <div className={styles.checkItems}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={`${styles.block} ${styles.checkItem}`} />
        ))}
      </div>
    </div>
  );
}