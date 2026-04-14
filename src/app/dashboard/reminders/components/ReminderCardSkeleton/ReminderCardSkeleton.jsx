import styles from "./ReminderCardSkeleton.module.scss";

export default function ReminderCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.cardBody}>
        <div className={styles.topRow}>
          <span
            className={styles.shimmer}
            style={{ width: 68, height: 20, borderRadius: 6 }}
          />
          <span
            className={styles.shimmer}
            style={{ width: 90, height: 20, borderRadius: 6 }}
          />
        </div>
        <div
          className={styles.shimmer}
          style={{ width: "70%", height: 18, borderRadius: 5, marginTop: 10 }}
        />
        <div
          className={styles.shimmer}
          style={{ width: "45%", height: 14, borderRadius: 5, marginTop: 8 }}
        />
        <div className={styles.metaRow}>
          <span
            className={styles.shimmer}
            style={{ width: 64, height: 20, borderRadius: 20 }}
          />
          <span
            className={styles.shimmer}
            style={{ width: 48, height: 20, borderRadius: 20 }}
          />
          <span
            className={styles.shimmer}
            style={{ width: 48, height: 20, borderRadius: 20 }}
          />
        </div>
      </div>
    </div>
  );
}
