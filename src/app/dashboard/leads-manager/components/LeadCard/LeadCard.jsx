import { useState } from "react";
import {
  Calendar,
  User,
  Clock,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  X,
  Dot,
  Flame,
  Waves,
  ArrowUp,
  RefreshCcw,
  AlertTriangle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import styles from "./LeadCard.module.scss";
import { truncateText } from "@/utils/client/cutils";

const PRIORITY_CONFIG = {
  NORMAL: { label: "Normal", cls: "normal", icon: <Waves color="#3b4ba5" /> },
  HIGH: { label: "High", cls: "high", icon: <ArrowUp color="#c2410c" /> },
  URGENT: { label: "Urgent", cls: "urgent", icon: <Flame color="#9d1111" /> },
};

const ACTIVITY_LABEL = {
  CALL: "Call",
  EMAIL: "Email",
  WHATSAPP: "Message",
  VIDEO_CALL: "Video Call",
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTs(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LeadCard({ lead, onClick, dragHandlers, isDragging }) {
  const [aiOpen, setAiOpen] = useState(false);

  const {
    id,
    title,
    description,
    priority,
    expected_close_date,
    created_by,
    ai_summary,
    ai_summary_generated_at,
    active_activities_count,
    assigned_users_count,
    latest_activity,
  } = lead;

  const pcfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.NORMAL;

  const hasActivity = !!latest_activity;
  const hasFollowUp = active_activities_count > 0;
  const actLabel = latest_activity
    ? (ACTIVITY_LABEL[latest_activity.activity_type] ??
      latest_activity.activity_type)
    : null;

  return (
    <div
      className={`${styles.card} ${isDragging ? styles.cardDragging : ""}`}
      onClick={() => onClick?.(id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(id)}
      {...(dragHandlers ?? {})}
    >
      <div className={`${styles.stripe} ${styles[`stripe_${pcfg.cls}`]}`} />

      <div className={styles.inner}>
        <div className={styles.priorityRow}>
          <span className={`${styles.pPill} ${styles[`p_${pcfg.cls}`]}`}>
            {pcfg.icon} {`${pcfg.label} Priority`}
          </span>
        </div>
        {/* Title */}
        <h4 className={styles.title}>{truncateText(title, 75)}</h4>

        {/* Description — 2-line clamp */}
        {description && (
          <p className={styles.desc}>{truncateText(description, 80)}</p>
        )}

        {/* AI Summary — collapsible, full text, timestamp */}
        {ai_summary && (
          <div className={styles.aiSection}>
            <button
              className={styles.aiHeader}
              onClick={(e) => {
                e.stopPropagation();
                setAiOpen((v) => !v);
              }}
              type="button"
            >
              <Sparkles size={15} className={styles.aiStar} />
              <span className={styles.aiLabel}>AI Summary</span>
              {aiOpen ? (
                <ChevronUp size={14} className={styles.aiChevron} />
              ) : (
                <ChevronDown size={14} className={styles.aiChevron} />
              )}
            </button>
            {aiOpen && (
              <div className={styles.aiBody}>
                <p className={styles.aiText}>{ai_summary}</p>
                {ai_summary_generated_at && (
                  <span className={styles.aiTs}>
                    Generated {formatTs(ai_summary_generated_at)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className={styles.spacer} />

        {/* Meta row */}
        {(created_by?.name || expected_close_date) && (
          <div className={styles.meta}>
            {created_by?.name && (
              <div className={styles.metaItem}>
                <User size={14} />
                <span>{created_by.name}</span>
              </div>
            )}
            {expected_close_date && (
              <div className={styles.metaItem}>
                <Calendar size={14} />
                <span>{formatDate(expected_close_date)}</span>
              </div>
            )}
          </div>
        )}

        <div className={styles.divider} />

        {/* Footer */}
        <div className={styles.footer}>
          {/* Status pills */}
          <div className={styles.pillsWrap}>
            {hasActivity && (
              <span
                className={`${styles.pill} ${
                  latest_activity?.status === "ACTIVE"
                    ? latest_activity?.scheduled_at &&
                      new Date(latest_activity.scheduled_at) < new Date()
                      ? styles.pillOverdue
                      : styles.pillActive
                    : latest_activity?.status === "COMPLETED"
                      ? styles.pillCompleted
                      : latest_activity?.status === "CANCELLED"
                        ? styles.pillCancelled
                        : styles.pillMissed
                }`}
              >
                {latest_activity?.status === "ACTIVE" ? (
                  latest_activity?.scheduled_at &&
                  new Date(latest_activity.scheduled_at) < new Date() ? (
                    <AlertCircle size={14} />
                  ) : (
                    <RefreshCcw size={14} />
                  )
                ) : latest_activity?.status === "COMPLETED" ? (
                  <CheckCircle2 size={14} />
                ) : latest_activity?.status === "CANCELLED" ? (
                  <XCircle size={14} />
                ) : (
                  <AlertTriangle size={14} />
                )}
                {latest_activity?.status === "ACTIVE"
                  ? latest_activity?.scheduled_at &&
                    new Date(latest_activity.scheduled_at) < new Date()
                    ? "OVERDUE"
                    : "ACTIVE"
                  : latest_activity?.status}
                : {actLabel}
              </span>
            )}
            {!hasFollowUp && (
              <span className={styles.pillNo}>
                <X size={14} />
                <span>No follow-ups</span>
              </span>
            )}
          </div>

          {(assigned_users_count ?? 0) > 0 && (
            <span className={styles.members}>
              {assigned_users_count}{" "}
              {assigned_users_count === 1 ? "member" : "members"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
