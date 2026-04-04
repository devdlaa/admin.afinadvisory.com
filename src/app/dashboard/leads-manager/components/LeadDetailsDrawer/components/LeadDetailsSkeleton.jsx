import styles from "./LeadDetailsSkeleton.module.scss";

export default function LeadDetailsSkeleton() {
  return (
    <div className={styles.body}>
      {/* LEFT PANEL */}
      <div className={styles.leftPanel}>
        {/* Header block: title + description area */}
        <div className={styles.sk_header} />

        {/* One solid block for the meta/pills/tags zone */}
        <div className={styles.sk_metaBlock} />

        {/* Contact card */}
        <div className={styles.sk_card} />

    
      </div>

      <div className={styles.divider} />

      {/* RIGHT PANEL */}
      <div className={styles.rightPanel}>
        {/* Stage bar */}
        <div className={styles.sk_stageBar} />

        {/* Tab strip */}

        {/* Activity cards */}
        <div className={styles.sk_activities}>
          <div className={styles.sk_actCard} />
          <div className={styles.sk_actCard} />
        </div>
      </div>
    </div>
  );
}
