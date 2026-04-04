import React from "react";
import { Globe2, Phone, Mail } from "lucide-react";
import styles from "../LeadDetailsDrawer.module.scss";

const REF_TYPE_LABELS = {
  lead_contact: "LEAD CONTACT",
  influencer: "INFLUENCER",
  external: "EXTERNAL CONTACT",
};

export default function LeadReferenceSection({ reference, onUpdateReference }) {
  const name = reference?.contact_person || reference?.name || null;

  const phone = reference?.primary_phone || reference?.phone || null;

  const email = reference?.primary_email || reference?.email || null;

  return (
    <section className={styles.lead_reference}>
      {/* HEADER */}
      <div className={styles.refHeader}>
        <div className={styles.refHeaderLeft}>
          <Globe2 size={20} strokeWidth={1.8} />
          <div>
            <p className={styles.refLabel}>LEAD REFERENCE</p>

            <p className={styles.refName}>
              {name ? (
                name
              ) : (
                <span className={styles.refEmpty}>No reference linked</span>
              )}
            </p>
          </div>
        </div>

        <div className={styles.refHeaderActions}>
          {reference && (
            <span className={styles.refTypeBadge}>
              {REF_TYPE_LABELS?.[reference.type] || reference.type}
            </span>
          )}

          <button className={styles.refUpdateBtn} onClick={onUpdateReference}>
            {reference ? "UPDATE REFERENCE" : "LINK REFERENCE"}
          </button>
        </div>
      </div>

      {/* BODY */}
      {reference && (
        <div className={styles.refBody}>
          {phone && (
            <div className={styles.refRow}>
              <Phone size={20} />
              <div className={styles.refRowContent}>
                <span className={styles.refRowLabel}>PHONE NUMBER</span>
                <span className={styles.refRowValue}>{phone}</span>
              </div>
            </div>
          )}

          {email && (
            <div className={styles.refRow}>
              <Mail size={20} />
              <div className={styles.refRowContent}>
                <span className={styles.refRowLabel}>EMAIL ADDRESS</span>
                <span className={styles.refRowValue}>{email}</span>
              </div>
            </div>
          )}

          {/* FOOTER */}
          {reference.linkedBy && (
            <p className={styles.refLinkedBy}>
              Reference Linked By <strong>{reference.linkedBy}</strong>{" "}
              {reference.linkedOn && <>On {reference.linkedOn}</>}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
