import React from "react";
import { Globe2, Phone, Mail } from "lucide-react";
import styles from "../LeadDetailsDrawer.module.scss";

/*
  Props
  ─────
  reference       normalized object or null
                  { displayName, displayMeta?, typeLabel?, phone?, email?, linkedBy?, linkedOn? }

  onUpdate        () => void

  sectionLabel    string  — e.g. "LEAD REFERENCE" or "TASK REFERENCE"
                  default: "REFERENCE"

  updateLabel     string  — e.g. "UPDATE REFERENCE" or "LINK REFERENCE"
                  computed automatically if not passed
*/
export default function ReferenceSection({
  reference,
  onUpdate,
  sectionLabel = "REFERENCE",
  updateLabel,
}) {
  const btnLabel = updateLabel
    ? updateLabel
    : reference
      ? "UPDATE"
      : "LINK REFERENCE";

  return (
    <section className={styles.lead_reference}>
      {/* HEADER */}
      <div className={styles.refHeader}>
        <div className={styles.refHeaderLeft}>
          <Globe2 size={20} strokeWidth={1.8} />
          <div>
            <p className={styles.refLabel}>{sectionLabel}</p>
            <p className={styles.refName}>
              {reference?.displayName ?? (
                <span className={styles.refEmpty}>No reference linked</span>
              )}
            </p>
          </div>
        </div>

        <div className={styles.refHeaderActions}>
          {reference?.typeLabel && (
            <span className={styles.refTypeBadge}>{reference.typeLabel}</span>
          )}
          <button className={styles.refUpdateBtn} onClick={onUpdate}>
            {btnLabel}
          </button>
        </div>
      </div>

      {/* BODY */}
      {reference && (
        <div className={styles.refBody}>
          {reference.phone && (
            <div className={styles.refRow}>
              <Phone size={20} />
              <div className={styles.refRowContent}>
                <span className={styles.refRowLabel}>PHONE NUMBER</span>
                <span className={styles.refRowValue}>{reference.phone}</span>
              </div>
            </div>
          )}

          {reference.email && (
            <div className={styles.refRow}>
              <Mail size={20} />
              <div className={styles.refRowContent}>
                <span className={styles.refRowLabel}>EMAIL ADDRESS</span>
                <span className={styles.refRowValue}>{reference.email}</span>
              </div>
            </div>
          )}

          {reference.linkedBy && (
            <p className={styles.refLinkedBy}>
              Reference Linked By <strong>{reference.linkedBy}</strong>
              {reference.linkedOn && <> On {reference.linkedOn}</>}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
