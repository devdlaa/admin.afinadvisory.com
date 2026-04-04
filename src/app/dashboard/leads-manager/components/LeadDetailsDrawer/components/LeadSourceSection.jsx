import React from "react";
import { Link } from "lucide-react";
import styles from "../LeadDetailsDrawer.module.scss";

export default function LeadSourceSection({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className={styles.leadSourceSection}>
      <div className={styles.leadSourceGrid}>
        {items.map((item, i) => (
          <div
            key={i}
            className={`${styles.leadSourceItem} ${
              item.full ? styles.leadSourceItemFull : ""
            }`}
          >
            <span className={styles.leadSourceLabel}>{item.label}</span>

            {item.is_link ? (
              <a
                href={item.value}
                target="_blank"
                rel="noreferrer"
                className={styles.leadSourceLinkValue}
                title={item.value}
              >
                <span className={styles.leadSourceLinkText}>{item.value}</span>
                <Link size={12} strokeWidth={2} />
              </a>
            ) : (
              <span className={styles.leadSourceValue}>
                {typeof item.value === "boolean"
                  ? item.value
                    ? "Yes"
                    : "No"
                  : item.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
