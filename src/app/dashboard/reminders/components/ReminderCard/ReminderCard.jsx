"use client";

import React from "react";
import { Clock, Inbox, RefreshCw, BellOff } from "lucide-react";
import styles from "./ReminderCard.module.scss";
import { truncateText } from "@/utils/client/cutils";
import {
  getSnoozedLabel,
  getDueLabel,
  getRecurringLabel,
} from "../reminderUtils";

function isOverdue(due_at) {
  return due_at ? new Date(due_at) < new Date() : false;
}

// ─── Status badge meta ────────────────────────────────────────────────────────

function getStatusMeta(reminder) {
  if (reminder.status === "COMPLETED")
    return { label: "Completed", cls: styles.statusCompleted };
  if (isOverdue(reminder.due_at))
    return { label: "Overdue", cls: styles.statusOverdue };
  return { label: "Pending", cls: styles.statusPending };
}

// ─── ReminderCard ─────────────────────────────────────────────────────────────

export default function ReminderCard({ reminder, handleReminderClick }) {
  const snoozedLabel = getSnoozedLabel(reminder);
  const dueLabel = getDueLabel(reminder);
  const recurringLabel = getRecurringLabel(reminder);

  const isPending = reminder.status === "PENDING";
  const over = isOverdue(reminder.due_at);

  const statusMeta = getStatusMeta(reminder);

  const MAX_TAGS = 4;
  const visibleTags = reminder.tags?.slice(0, MAX_TAGS) || [];
  const extraTags = (reminder.tags?.length || 0) - MAX_TAGS;

  const cardCls = [
    styles.card,
    over && isPending ? styles.overdue : "",
    reminder.status === "COMPLETED" ? styles.completed : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardCls} onClick={handleReminderClick}>
      <div className={styles.cardBody}>
        <div className={styles.topRow}>
          {/* Status */}
          <span className={`${styles.statusBadge} ${statusMeta.cls}`}>
            {statusMeta.label}
          </span>

          {/* Snoozed */}
          {snoozedLabel && (
            <span className={styles.snoozedPill}>
              <BellOff size={12} />
              {snoozedLabel}
            </span>
          )}

          {/* Recurring OR Due */}
          {recurringLabel ? (
            <span className={styles.schedulePill}>
              <RefreshCw size={12} />
              {recurringLabel}
            </span>
          ) : (
            dueLabel && (
              <span className={styles.schedulePill}>
                <Clock size={12} />
                {dueLabel}
              </span>
            )
          )}
        </div>

        <h3 className={styles.title}>{truncateText(reminder.title, 50)}</h3>

        {reminder.description && (
          <p className={styles.desc}>
            {truncateText(reminder.description, 75)}
          </p>
        )}

        {(reminder.bucket || visibleTags.length > 0) && (
          <div className={styles.metaRow}>
            {reminder.bucket && (
              <span className={styles.bucketPill}>
                <Inbox size={10} />
                {reminder.bucket.name}
              </span>
            )}

            {visibleTags.map((tag) => (
              <span
                key={tag.id}
                className={styles.tagPill}
                style={{ "--tag-color": tag.color || "#94a3b8" }}
              >
                {tag.name}
              </span>
            ))}

            {extraTags > 0 && (
              <span className={styles.tagMore}>+{extraTags}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
