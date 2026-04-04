"use client";
import { CircularProgress } from "@mui/material";
import { useState } from "react";
import {
  Phone,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Plus,
  Bot,
  Video 
} from "lucide-react";
import styles from "./ActivityTab.module.scss";

import { NoteCard } from "../LeadNotesTimeline/LeadNotesTimeline";

// ── constants ─────────────────────────────────────────────────────────────────

const TYPE_ICON = {
  CALL: Phone,
  VIDEO_CALL: Video,
  EMAIL: Mail,
  MESSAGE: MessageSquare,
};

const STATUS_CLASS = {
  ACTIVE: "pillActive",
  COMPLETED: "pillCompleted",
  MISSED: "pillMissed",
  OVERDUE: "pillOverdue",
  CANCELLED: "pillCancelled",
};

const STATUS_LABEL = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  MISSED: "Missed",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

function hydrateActivity(activity, handlers) {
  const tags = [];
  const actions = [];

  const isScheduled = activity.is_scheduled && activity.scheduled_at;

  if (isScheduled) {
    // ───────── EMAIL ─────────
    if (activity.type === "EMAIL" && activity.email?.linked) {
      tags.push({
        tags_name: "Auto Email",
        icon: <Bot size={12} />,
        bg_color: "#EEF2FF",
        txt_n_icon_clr: "#4F46E5",
      });

      const isClosed =
        activity.status === "MISSED" || activity.status === "CANCELLED";

      if (isClosed || activity.email.sent) {
        actions.push({
          action_name: "Show Email",
          icon: <Mail size={12} />,
          bg_color: "#F0FDF4",
          txt_n_icon_clr: "#16A34A",
          handler: () => handlers.onShowEmail?.(activity),
        });
      } else {
        actions.push({
          action_name: "Update Email",
          icon: <Mail size={12} />,
          bg_color: "#EFF6FF",
          txt_n_icon_clr: "#2563EB",
          handler: () => handlers.onUpdateEmail?.(activity),
        });
      }
    }
  }

  return {
    activity_id: activity.id,
    activity_type: activity.type,
    activity_status: activity.is_overdue ? "OVERDUE" : activity.status,
    activity_title: activity.title,

    created_on: activity.scheduled_at || activity.created_at,
    completed_on: activity.completed_at,

    created_by: activity.created_by?.name,
    completed_by: activity.closed_by?.name,

    tags,
    actions,

    original_activity: activity,
  };
}

function formatTs(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }) +
    " @ " +
    d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );
}

// ── ActivityCard ──────────────────────────────────────────────────────────────

function ActivityCard({ activity, onActivityClick, isLast }) {
  const {
    activity_type,
    activity_status,
    activity_title,
    activity_id,
    created_on,
    created_by,
    completed_on,
    completed_by,
    tags = [],
    actions = [],
  } = activity;

  const Icon = TYPE_ICON[activity_type] ?? Phone;
  const isDone =
    activity_status === "COMPLETED" || activity_status === "MISSED";
  const timestamp = isDone ? formatTs(completed_on) : formatTs(created_on);
  const metaParts = [created_by, completed_by].filter(Boolean).join(" · ");

  return (
    <div className={styles.tlRow}>
      <div className={styles.tlLeft}>
        <div className={styles.tlIconWrap}>
          <Icon size={16} strokeWidth={1.8} />
        </div>
        {!isLast && <div className={styles.tlLine} />}
      </div>

      <div
        className={styles.tlCard}
        onClick={() =>
          onActivityClick?.(activity_id, activity, activity.original_activity)
        }
        role="button"
        tabIndex={0}
        onKeyDown={(e) =>
          e.key === "Enter" &&
          onActivityClick?.(activity_id, activity, activity.original_activity)
        }
      >
        <p className={styles.cardTitle}>{activity_title}</p>

        <div className={styles.metaRow}>
          <span
            className={`${styles.pill} ${styles[STATUS_CLASS[activity_status]]}`}
          >
            {STATUS_LABEL[activity_status] ?? activity_status}
          </span>
          {tags.length > 0 && (
            <div className={styles.chipRow}>
              {tags.map((tag, i) => (
                <button
                  key={i}
                  className={styles.chip}
                  style={{
                    background: tag.bg_color,
                    color: tag.txt_n_icon_clr,
                    borderColor: tag.bg_color,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    tag.handler?.();
                  }}
                >
                  {tag.icon}
                  {tag.tags_name}
                </button>
              ))}
            </div>
          )}
          {timestamp && <span className={styles.ts}>{timestamp}</span>}
          {metaParts && (
            <>
              <span className={styles.dot} />
              <span className={styles.ts}>{metaParts}</span>
            </>
          )}
        </div>

        {actions.length > 0 && (
          <div className={styles.chipRow} style={{ marginTop: 8 }}>
            {actions.map((action, i) => (
              <button
                key={i}
                className={styles.chip}
                style={{
                  background: action.bg_color,
                  color: action.txt_n_icon_clr,
                  borderColor: action.bg_color,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  action.handler?.();
                }}
              >
                {action.icon}
                {action.action_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Collapsible Section ───────────────────────────────────────────────────────

function ActivitySection({
  label,
  activities,
  onActivityClick,
  defaultOpen = true,
  onOpen,
  footer,
  pinnedComments,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const handleToggle = () => {
    const next = !open;
    setOpen(next);

    if (next) {
      onOpen?.();
    }
  };

  return (
    <section className={styles.section}>
      <button className={styles.sectionHeader} onClick={handleToggle}>
        <span className={styles.sectionLabel}>{label}</span>

        {open ? (
          <ChevronDown
            size={14}
            strokeWidth={2.5}
            className={styles.sectionChevron}
          />
        ) : (
          <ChevronUp
            size={14}
            strokeWidth={2.5}
            className={styles.sectionChevron}
          />
        )}
      </button>

      {open && (
        <div className={styles.timeline}>
          {/* Pinned comments first */}
          {pinnedComments?.map((comment, idx) => (
            <NoteCard
              key={comment.id}
              comment={comment}
              currentUserId={null}
              onEdit={() => {}}
              isEditing={false}
              editState={null}
              onEditChange={() => {}}
              onEditSave={() => {}}
              onEditCancel={() => {}}
              onPin={() => {}}
              onDelete={() => {}}
              isUpdating={false}
              isLast={
                idx === pinnedComments.length - 1 && activities.length === 0
              }
            />
          ))}

          {/* Activities below */}
          {activities.map((activity, idx) => (
            <ActivityCard
              key={activity.activity_id}
              activity={activity}
              onActivityClick={onActivityClick}
              isLast={idx === activities.length - 1}
            />
          ))}

          {footer}
        </div>
      )}
    </section>
  );
}

// ── ActivityTab ───────────────────────────────────────────────────────────────

export default function ActivityTab({
  pinned_comments = [],
  focusActivities = [],
  historyActivities = [],
  onActivityClick,
  onCreateActivity,
  OnhandleFetchActivityHistory,
  leadAcitiesPagination,
  isLoadingHistory,
  activityHandlers = {},
}) {
  const isEmpty =
    focusActivities.length === 0 && historyActivities.length === 0;
  const hydratedFocusActivities = focusActivities.map((a) =>
    hydrateActivity(a, activityHandlers),
  );

  const hydratedHistoryActivities = historyActivities.map((a) =>
    hydrateActivity(a, activityHandlers),
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <button className={styles.createBtn} onClick={onCreateActivity}>
          <Plus size={14} strokeWidth={2.5} />
          Create New
        </button>
      </div>

      <ActivitySection
        label="Focus Now"
        activities={hydratedFocusActivities}
        onActivityClick={onActivityClick}
        defaultOpen={true}
        pinnedComments={pinned_comments}
      />

      <ActivitySection
        label="Happened Already"
        activities={hydratedHistoryActivities}
        onActivityClick={onActivityClick}
        defaultOpen={false}
        onOpen={OnhandleFetchActivityHistory}
        footer={
          <div style={{ padding: 12, textAlign: "center" }}>
            {isLoadingHistory ? (
              <CircularProgress size={20} />
            ) : leadAcitiesPagination && leadAcitiesPagination?.has_more ? (
              <button
                className={styles.loadMoreBtn}
                onClick={OnhandleFetchActivityHistory}
              >
                Load More
              </button>
            ) : null}
          </div>
        }
      />

      {isEmpty && (
        <div className={styles.empty}>
          <Phone size={28} strokeWidth={1.4} />
          <p>No activities yet</p>
        </div>
      )}
    </div>
  );
}
