import React from "react";
import styles from "./LeadCardSkeleton.module.scss";

export default function LeadCardSkeleton({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.sk_card}>


          <div className={styles.sk_inner}>
            {/* priority */}
            <div className={styles.sk_pill} />

            {/* title */}
            <div className={styles.sk_title} />
            <div className={`${styles.stylessk_title} ${styles.stylesshort}`} />

            {/* description */}
            <div className={styles.sk_desc} />
            <div className={`${styles.stylessk_desc} ${styles.stylesshort}`} />

            {/* meta */}
            <div className={styles.sk_meta}>
              <div className={styles.sk_metaItem} />
              <div className={styles.sk_metaItem} />
            </div>

            {/* divider */}
            <div className={styles.sk_divider} />

            {/* footer */}
            <div className={styles.sk_footer}>
              <div className={styles.sk_pill_small} />
              <div className={styles.sk_pill_small} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
