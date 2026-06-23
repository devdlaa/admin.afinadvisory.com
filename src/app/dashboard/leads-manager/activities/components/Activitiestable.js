"use client";

import React from "react";
import {
  Phone,
  Mail,
  MessageCircle,
  Video,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  AlertCircle,
} from "lucide-react";
import styles from "../activities.module.scss";
import { truncateText } from "@/utils/client/cutils";

/* ── config ──────────────────────────────── */

const TYPE_CFG = {
  CALL: { label: "Call", Icon: Phone, cls: styles.typeCall },
  EMAIL: { label: "Email", Icon: Mail, cls: styles.typeEmail },
  WHATSAPP: {
    label: "WhatsApp",
    Icon: MessageCircle,
    cls: styles.typeWhatsapp,
  },
  VIDEO_CALL: { label: "Video Call", Icon: Video, cls: styles.typeVideo },
};

const STATUS_CFG = {
  ACTIVE: { label: "Active", Icon: Clock, cls: styles.statusActive },
  COMPLETED: {
    label: "Completed",
    Icon: CheckCircle2,
    cls: styles.statusCompleted,
  },
  MISSED: { label: "Missed", Icon: XCircle, cls: styles.statusMissed },
  CANCELLED: { label: "Cancelled", Icon: XCircle, cls: styles.statusCancelled },
};

/* ── helpers ─────────────────────────────── */

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(d) {
  if (!d) return null;
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function overdueDays(scheduledAt) {
  const days = Math.floor((Date.now() - new Date(scheduledAt)) / 86400000);
  if (days <= 0) return "Due today";
  return `${days}d overdue`;
}

/* ── Skeleton row ────────────────────────── */

function SkeletonRow() {
  return (
    <tr className={styles.skeletonRow}>
      <td>
        <div className={styles.skelTypePill} />
      </td>
      <td>
        <div className={styles.skelTitle} />
        <div className={styles.skelSub} />
      </td>
      <td>
        <div className={styles.skelDate} />
        <div className={styles.skelDateSub} />
      </td>
      <td>
        <div className={styles.skelBadge} />
      </td>
      <td>
        <div className={styles.skelUser}>
          <div className={styles.skelAvatar} />
          <div className={styles.skelName} />
        </div>
      </td>
      <td>
        <div className={styles.skelPhone} />
      </td>
    </tr>
  );
}

/* ── Data row ────────────────────────────── */

function Row({ item, onClick }) {
  const type = TYPE_CFG[item.type] ?? TYPE_CFG.CALL;
  const status = STATUS_CFG[item.status] ?? STATUS_CFG.ACTIVE;

  const rowCls = [
    styles.row,
    item.is_overdue ? styles.rowOverdue : "",
    item.is_missed ? styles.rowMissed : "",
    item.is_completed ? styles.rowCompleted : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <tr className={rowCls} onClick={() => onClick(item)}>
      {/* Type */}
      <td>
        <span className={`${styles.typePill} ${type.cls}`}>
          <type.Icon size={18} strokeWidth={2.2} />
          {type.label}
        </span>
      </td>

      {/* Activity / Lead */}
      <td>
        <div className={styles.actTitle}>
          {truncateText(item.title, 35) || "—"}
        </div>
        <div className={styles.actMeta}>
          {item.lead?.contact?.contact_person && (
            <span>{truncateText(item?.description, 70)}</span>
          )}

          {item.email?.sent && (
            <>
              <span className={styles.metaDot} />
              <span className={styles.emailSentTag}>
                <CheckCircle2 size={15} /> Email Sent
              </span>
            </>
          )}
        </div>
      </td>

      {/* Scheduled */}
      <td>
        {item.scheduled_at ? (
          <>
            <div className={styles.dateMain}>{fmtDate(item.scheduled_at)}</div>
            <div className={styles.dateSub}>{fmtTime(item.scheduled_at)}</div>
          </>
        ) : (
          <span className={styles.na}>—</span>
        )}
      </td>

      {/* Status */}
      <td>
        <div className={styles.statusCell}>
          <span className={`${styles.statusBadge} ${status.cls}`}>
            <status.Icon size={18} strokeWidth={2.5} />
            {status.label}
          </span>
          {item.is_overdue && (
            <span className={styles.overdueTag}>
              <AlertCircle size={10} />
              {overdueDays(item.scheduled_at)}
            </span>
          )}
        </div>
      </td>

      {/* Created By */}
      <td>
        {item.created_by ? (
          <div className={styles.userRow}>
            <span className={styles.avatar}>
              {item.created_by.name?.[0] ?? "?"}
            </span>
            <span className={styles.userName}>{item.created_by.name}</span>
          </div>
        ) : (
          <span className={styles.na}>—</span>
        )}
      </td>

      {/* Contact */}
      <td>
        {item.lead?.contact ? (
          <div className={styles.contactCell}>
            <div className={styles.contactName}>
              {item.lead.contact.contact_person || "—"}
            </div>
            <div className={styles.contactSub}>
              {item.lead.contact.primary_phone || "—"} ,{" "}
              {item.lead.contact.primary_email || "—"}
            </div>
          </div>
        ) : (
          <span className={styles.na}>—</span>
        )}
      </td>
    </tr>
  );
}

/* ── Table ───────────────────────────────── */

const SKELETON_COUNT = 8;

export default function ActivitiesTable({
  activities,
  loading,
  nextCursor,
  currentPage,
  totalPages,
  hasPrevPage,
  onNext,
  onPrev,
  onRowClick,
}) {
  const isEmpty = !loading && activities.length === 0;

  return (
    <div className={styles.tableWrapper}>
      {/* scrollable area */}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thType}>Type</th>
              <th className={styles.thMain}>Activity / Lead</th>
              <th className={styles.thDate}>Scheduled</th>
              <th className={styles.thStatus}>Status</th>
              <th className={styles.thUser}>Created By</th>
              <th className={styles.thContact}>Contact</th>
            </tr>
          </thead>

          <tbody>
            {loading &&
              Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}

            {!loading &&
              activities.map((item) => (
                <Row key={item.id} item={item} onClick={onRowClick} />
              ))}
          </tbody>
        </table>

        {/* empty state sits outside table so it can flex-center */}
        {isEmpty && (
          <div className={styles.emptyState}>
            <CalendarClock size={40} strokeWidth={1.2} />
            <p>No activities found</p>
            <span>Try changing the filters above</span>
          </div>
        )}
      </div>

      {/* pagination always pinned at bottom */}
      <div className={styles.pagination}>
        <span className={styles.pageInfo}>
          Page {currentPage + 1} of {Math.max(totalPages, 1)}
        </span>
        <div className={styles.pageButtons}>
          <button
            className={styles.pageBtn}
            onClick={onPrev}
            disabled={!hasPrevPage || loading}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            className={styles.pageBtn}
            onClick={onNext}
            disabled={!nextCursor || loading}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
