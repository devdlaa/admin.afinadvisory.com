import React from "react";
import {
  User2,
  Pencil,
  Phone,
  Mail,
  Building2,
  Link,
  Link2,
} from "lucide-react";
import styles from "../LeadDetailsDrawer.module.scss";

const formatAddress = (c) => {
  const parts = [
    c.address_line1,
    c.address_line2,
    c.city,
    c.state_name,
    c.pincode ? `(${c.pincode})` : "",
  ].filter(Boolean);
  return parts.join(", ");
};

// Platform display map
const PLATFORM_LABELS = {
  LINKEDIN: "LinkedIn",
  YOUTUBE: "Youtube",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TWITTER: "Twitter",
  WEBSITE: "Website",
};

export default function LeadContactSection({
  contact,
  onEditContact,
  onChangeContact,
}) {
  if (!contact) return null;

  return (
    <section className={styles.lead_contact_section_outer}>
      <div className={styles.contactSection}>
        {/* HEADER */}
        <div className={styles.contactHeader}>
          <div className={styles.contactHeaderLeft}>
            <User2 size={24} strokeWidth={1.8} />
            <div>
              <p className={styles.contactLabel}>CONTACT PERSON</p>
              <p className={styles.contactName}>{contact.contact_person}</p>
            </div>
          </div>

          <div className={styles.contactHeaderPills}>
            {contact.designation && (
              <span className={styles.contactPill}>{contact.designation}</span>
            )}
          </div>

          <button className={styles.contactEditBtn} onClick={onEditContact}>
            <Pencil size={14} strokeWidth={2} />
            Edit
          </button>
          <button className={styles.contactEditBtn} onClick={onChangeContact}>
            <Link2 size={14} strokeWidth={2} />
            Change
          </button>
        </div>

        {/* BODY */}
        <div className={styles.contactBody}>
          {/* PRIMARY PHONE */}
          {contact.primary_phone && (
            <div className={styles.contactRow}>
              <Phone size={20} />
              <div className={styles.contactRowContent}>
                <span className={styles.contactRowLabel}>PRIMARY PHONE</span>
                <div className={styles.contactRowValue}>
                  <span>{contact.primary_phone}</span>

                  {contact.primary_whatsapp && (
                    <a
                      href={`https://wa.me/${contact.primary_phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.waLink}
                    >
                      <Link size={14} />
                    </a>
                  )}

                  {contact.preferred_language && (
                    <span className={styles.langBadge}>
                      {contact.preferred_language.replace(/_/g, "-")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PRIMARY EMAIL */}
          {contact.primary_email && (
            <div className={styles.contactRow}>
              <Mail size={20} />
              <div className={styles.contactRowContent}>
                <span className={styles.contactRowLabel}>PRIMARY EMAIL</span>
                <span className={styles.contactRowValue}>
                  {contact.primary_email}
                </span>
              </div>
            </div>
          )}

          {/* COMPANY */}
          {contact.company_name && (
            <div className={styles.contactRow}>
              <Building2 size={20} />
              <div className={styles.contactRowContent}>
                <span className={styles.contactRowLabel}>BUSINESS NAME</span>
                <span className={styles.contactRowValue}>
                  {contact.company_name}
                </span>
              </div>
            </div>
          )}

          <div className={styles.contactDivider} />

          {/* SECONDARY */}
          {(contact.secondary_email ||
            contact.secondary_phone ||
            contact.industry ||
            contact.website ||
            formatAddress(contact)) && (
            <>
              <div className={styles.secondaryGrid}>
                {contact.secondary_email && (
                  <div className={styles.secondaryItem}>
                    <span className={styles.contactRowLabel}>
                      SECONDARY EMAIL
                    </span>
                    <span className={styles.secondaryValue}>
                      {contact.secondary_email}
                    </span>
                  </div>
                )}

                {contact.secondary_phone && (
                  <div className={styles.secondaryItem}>
                    <span className={styles.contactRowLabel}>
                      SECONDARY PHONE
                    </span>
                    <div className={styles.contactRowValue}>
                      <span className={styles.secondaryValue}>
                        {contact.secondary_phone}
                      </span>
                      {contact.secondary_whatsapp && (
                        <a
                          href={`https://wa.me/${contact.secondary_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.waLink}
                        >
                          <Link size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {contact.industry && (
                  <div className={styles.secondaryItem}>
                    <span className={styles.contactRowLabel}>INDUSTRY</span>
                    <span className={styles.secondaryValue}>
                      {contact.industry}
                    </span>
                  </div>
                )}

                {contact.website && (
                  <div className={styles.secondaryItem}>
                    <span className={styles.contactRowLabel}>WEBSITE</span>
                    <div className={styles.contactRowValue}>
                      <span className={styles.secondaryValue}>
                        {contact.website}
                      </span>
                      <a
                        href={contact.website}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.waLink}
                      >
                        <Link size={12} />
                      </a>
                    </div>
                  </div>
                )}

                {formatAddress(contact) && (
                  <div
                    className={`${styles.secondaryItem} ${styles.secondaryItemFull}`}
                  >
                    <span className={styles.contactRowLabel}>ADDRESS</span>
                    <span className={styles.secondaryValue}>
                      {formatAddress(contact)}
                    </span>
                  </div>
                )}
              </div>

              {/* SOCIAL */}
              {contact.social_links?.length > 0 && (
                <div className={styles.socialChips}>
                  {contact.social_links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.socialChip}
                    >
                      {PLATFORM_LABELS?.[link.platform] || link.platform}
                      <Link size={11} />
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
