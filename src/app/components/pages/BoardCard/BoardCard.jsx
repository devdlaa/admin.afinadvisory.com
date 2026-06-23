import React from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  PauseCircle,
  MessageSquare,
  Flame,
  TrendingUp,
  GripVertical,
} from "lucide-react";
import styles from "./BoardCard.module.scss";

const STATUS_CONFIG = [
  {
    key: "pending",
    label: "Pending",
    icon: Clock,
    colorClass: styles.statusPending,
    barClass: styles.barPending,
    dotClass: styles.dotPending,
  },
  {
    key: "in_progress",
    label: "In Progress",
    icon: TrendingUp,
    colorClass: styles.statusInProgress,
    barClass: styles.barInProgress,
    dotClass: styles.dotInProgress,
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2,
    colorClass: styles.statusCompleted,
    barClass: styles.barCompleted,
    dotClass: styles.dotCompleted,
  },
  {
    key: "on_hold",
    label: "On Hold",
    icon: PauseCircle,
    colorClass: styles.statusOnHold,
    barClass: styles.barOnHold,
    dotClass: styles.dotOnHold,
  },
  {
    key: "pending_client_input",
    label: "Client Input",
    icon: MessageSquare,
    colorClass: styles.statusClientInput,
    barClass: styles.barClientInput,
    dotClass: styles.dotClientInput,
  },
  {
    key: "cancelled",
    label: "Cancelled",
    icon: XCircle,
    colorClass: styles.statusCancelled,
    barClass: styles.barCancelled,
    dotClass: styles.dotCancelled,
  },
];

const BoardCard = ({ board, onClick, isDragging }) => {
  if (!board) return null;

  const {
    name,
    description,
    total_tasks = 0,
    high_priority_tasks = 0,
    status_counts = {},
  } = board;

  const completed = status_counts.completed ?? 0;
  const progressPercent =
    total_tasks > 0 ? Math.round((completed / total_tasks) * 100) : 0;

  const activeStatuses = STATUS_CONFIG.filter(
    (s) => (status_counts[s.key] ?? 0) > 0,
  );

  return (
    <div
      className={`${styles.card} ${isDragging ? styles.dragging : ""}`}
      onClick={onClick}
    >
      {/* Drag handle */}
      <div className={styles.dragHandle} title="Drag to reorder">
        <GripVertical size={15} />
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.name}>{name}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {high_priority_tasks > 0 && (
          <div className={styles.highPriorityBadge}>
            <Flame size={14} />
            <span>{high_priority_tasks} High Priority</span>
          </div>
        )}
      </div>

      {/* Progress section */}
      <div className={styles.progressSection}>
        <div className={styles.progressMeta}>
          <div className={styles.taskCount}>
            <span className={styles.taskCountDone}>{completed}</span>
            <span className={styles.taskCountSep}>/</span>
            <span className={styles.taskCountTotal}>{total_tasks}</span>
            <span className={styles.taskCountLabel}>Active tasks</span>
          </div>
          <span className={styles.progressPercent}>
            {progressPercent}% Done
          </span>
        </div>
        <div className={styles.progressBarTrack}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Multi-color status bar + always-visible legend */}
      {total_tasks > 0 && (
        <div className={styles.statusBarSection}>
          <div className={styles.statusBar}>
            {STATUS_CONFIG.map((s) => {
              const count = status_counts[s.key] ?? 0;
              if (count === 0) return null;
              const pct = (count / total_tasks) * 100;
              return (
                <div
                  key={s.key}
                  className={`${styles.statusBarSegment} ${s.barClass}`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>

          {/* Legend — always visible, only active statuses */}
          <div className={styles.statusBarLegend}>
            {activeStatuses.map((s) => (
              <div key={s.key} className={styles.legendItem}>
                <div className={`${styles.legendDot} ${s.dotClass}`} />
                <span className={styles.legendCount}>
                  {status_counts[s.key]}
                </span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status grid — all 6 statuses, muted when 0 */}
      <div className={styles.statusGrid}>
        {STATUS_CONFIG.map((s) => {
          const count = status_counts[s.key] ?? 0;
          const Icon = s.icon;
          return (
            <div
              key={s.key}
              className={`${styles.statusPill} ${count === 0 ? styles.statusPillMuted : ""}`}
            >
              <Icon
                size={18}
                className={`${styles.statusIcon} ${count > 0 ? s.colorClass : ""}`}
              />
              <span className={styles.statusCount}>{count}</span>
              <span className={styles.statusLabel}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BoardCard;
