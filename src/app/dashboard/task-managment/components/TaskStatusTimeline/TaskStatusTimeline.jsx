import { useState } from "react";
import {
  PlusCircle,
  PlayCircle,
  PauseCircle,
  Clock,
  Trash2,
  RotateCcw,
  XCircle,
  CheckCircle2,
  ArrowRight,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  User,
  Users,
  UserPlus,
  UserMinus,
} from "lucide-react";
import styles from "./TaskStatusTimeline.module.scss";

// ── Config ────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING: { label: "Pending", chipClass: "pending", dot: "#eab308" },
  IN_PROGRESS: { label: "In Progress", chipClass: "progress", dot: "#3b82f6" },
  ON_HOLD: { label: "On Hold", chipClass: "hold", dot: "#f97316" },
  PENDING_CLIENT_INPUT: { label: "Client Input", chipClass: "client", dot: "#8b5cf6" },
  COMPLETED: { label: "Completed", chipClass: "completed", dot: "#22c55e" },
  CANCELLED: { label: "Cancelled", chipClass: "cancelled", dot: "#ef4444" },
};

const ACTION_CONFIG = {
  TASK_CREATED:  { label: "Task Created",  category: "Task Lifecycle", iconClass: "created",    labelClass: "green",  Icon: PlusCircle, verb: "Created"  },
  TASK_DELETED:  { label: "Task Deleted",  category: "Task Lifecycle", iconClass: "deleted",    labelClass: "red",    Icon: Trash2,     verb: "Deleted"  },
  TASK_RESTORED: { label: "Task Restored", category: "Task Lifecycle", iconClass: "restored",   labelClass: "blue",   Icon: RotateCcw,  verb: "Restored" },
  STATUS_CHANGED:     { category: "Status Change", verb: "Changed" },
  ASSIGNMENT_CHANGED: { label: "Assignments Updated", category: "Assignment", iconClass: "assignment", labelClass: "purple", Icon: Users, verb: "Updated" },
  ASSIGNED_TO_ALL:    { label: "Assigned to All",     category: "Assignment", iconClass: "assignment", labelClass: "purple", Icon: Users, verb: "Assigned" },
};

const STATUS_ICON_MAP = {
  IN_PROGRESS: PlayCircle,
  ON_HOLD: PauseCircle,
  PENDING_CLIENT_INPUT: Clock,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
  PENDING: Clock,
};

const ASSIGNMENT_TYPES = new Set(["ASSIGNMENT_CHANGED", "ASSIGNED_TO_ALL"]);
const STATUS_TYPES = new Set(["STATUS_CHANGED", "TASK_CREATED", "TASK_DELETED", "TASK_RESTORED"]);

const FILTERS = [
  { value: "all",         label: "All"         },
  { value: "status",      label: "Status"      },
  { value: "assignments", label: "Assignments" },
];

// ── Demo data ─────────────────────────────────────────────────────

const DEMO_TIMELINE = [
  { id: "1", type: "TASK_CREATED",  at: "2026-03-08T03:45:00", by: { name: "Sahil Joshi" } },
  { id: "2", type: "STATUS_CHANGED", at: "2026-03-08T04:10:00", by: { name: "Sahil Joshi" }, previous_status: { value: "PENDING" }, status: { value: "IN_PROGRESS" } },
  { id: "3", type: "ASSIGNMENT_CHANGED", at: "2026-03-08T04:20:00", by: { name: "Sahil Joshi" }, assignmentChanges: { added: [{ id: "1", name: "Rahul Verma" }, { id: "2", name: "Priya Singh" }], removed: [] } },
  { id: "4", type: "STATUS_CHANGED", at: "2026-03-08T04:38:00", by: { name: "Sahil Joshi" }, previous_status: { value: "IN_PROGRESS" }, status: { value: "ON_HOLD" }, reason: "Waiting for design assets from the client before proceeding." },
  { id: "5", type: "ASSIGNMENT_CHANGED", at: "2026-03-08T04:50:00", by: { name: "Sahil Joshi" }, assignmentChanges: { added: [], removed: [{ id: "2", name: "Priya Singh" }] } },
  { id: "6", type: "STATUS_CHANGED", at: "2026-03-08T05:12:00", by: { name: "Sahil Joshi" }, previous_status: { value: "ON_HOLD" }, status: { value: "COMPLETED" } },
];

// ── Helpers ───────────────────────────────────────────────────────

const formatDate = (iso) => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
};

const getDaysAgo = (iso) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
};

const getCreatedAt = (timeline) =>
  [...timeline].find((e) => e.type === "TASK_CREATED")?.at ?? null;

// ── Sub-components ────────────────────────────────────────────────

const ReasonBlock = ({ reason, statusKey }) => {
  if (!reason) return null;
  const cls = STATUS_CONFIG[statusKey]?.chipClass ?? "";
  return (
    <div className={`${styles.reason} ${styles[cls] ?? ""}`}>
      <div className={styles.reasonLabel}>Reason</div>
      <div className={styles.reasonText}>{reason}</div>
    </div>
  );
};

const StatusChip = ({ statusKey, muted }) => {
  const cfg = STATUS_CONFIG[statusKey];
  if (!cfg) return null;
  return (
    <span className={`${styles.chip} ${muted ? styles.from : `${styles.to} ${styles[cfg.chipClass]}`}`}>
      {!muted && <span className={styles.chipDot} />}
      {cfg.label}
    </span>
  );
};

const AssignmentChanges = ({ assignmentChanges }) => {
  if (!assignmentChanges) return null;

  // ASSIGNED_TO_ALL passes the raw changes array
  if (Array.isArray(assignmentChanges)) {
    return (
      <div className={styles.assignmentBlock}>
        <div className={`${styles.assignmentRow} ${styles.added}`}>
          <Users size={12} />
          <span>Task assigned to <strong>all team members</strong></span>
        </div>
      </div>
    );
  }

  const { added = [], removed = [] } = assignmentChanges;
  if (!added.length && !removed.length) return null;

  return (
    <div className={styles.assignmentBlock}>
      {added.map((u) => (
        <div key={u.id} className={`${styles.assignmentRow} ${styles.added}`}>
          <UserPlus size={12} />
          <span><strong>{u.name}</strong> added</span>
        </div>
      ))}
      {removed.map((u) => (
        <div key={u.id} className={`${styles.assignmentRow} ${styles.removed}`}>
          <UserMinus size={12} />
          <span><strong>{u.name}</strong> removed</span>
        </div>
      ))}
    </div>
  );
};

const TimelineItem = ({ item, isLast }) => {
  const isLifecycle  = ["TASK_CREATED", "TASK_DELETED", "TASK_RESTORED"].includes(item.type);
  const isAssignment = ASSIGNMENT_TYPES.has(item.type);
  const actionCfg    = ACTION_CONFIG[item.type] ?? ACTION_CONFIG.STATUS_CHANGED;

  let Icon      = actionCfg.Icon;
  let iconClass = actionCfg.iconClass;

  if (!isLifecycle && !isAssignment && item.status?.value) {
    Icon      = STATUS_ICON_MAP[item.status.value] ?? ArrowRight;
    iconClass = STATUS_CONFIG[item.status.value]?.chipClass ?? "progress";
  }

  return (
    <div className={`${styles.item} ${isLast ? styles.itemLast : ""}`}>
      <div className={styles.gutter}>
        <div className={`${styles.icon} ${styles[iconClass]}`}>
          {Icon && <Icon size={16} strokeWidth={2.1} />}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.meta}>
          <span className={styles.category}>{actionCfg.category}</span>
          <span className={styles.date}>{formatDate(item.at)}</span>
        </div>

        {/* Lifecycle / assignment label */}
        {(isLifecycle || isAssignment) && (
          <div className={`${styles.mainLabel} ${styles[actionCfg.labelClass]}`}>
            {actionCfg.label}
          </div>
        )}

        {/* Status chips */}
        {!isLifecycle && !isAssignment && (
          <div className={styles.chips}>
            {item.previous_status?.value && <StatusChip statusKey={item.previous_status.value} muted />}
            <span className={styles.arrow}><ArrowRight size={13} strokeWidth={2.5} /></span>
            {item.status?.value && <StatusChip statusKey={item.status.value} />}
          </div>
        )}

        <div className={styles.by}>
          <User size={13} strokeWidth={2} />
          <span>{actionCfg.verb} by</span>
          <span className={styles.byName}>{item.by?.name ?? item.by}</span>
        </div>

        {isAssignment && <AssignmentChanges assignmentChanges={item.assignmentChanges} />}
        <ReasonBlock reason={item.reason} statusKey={item.status?.value} />
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────

const TaskStatusTimeline = ({ timeline = DEMO_TIMELINE }) => {
  const [newestFirst, setNewestFirst] = useState(true);
  const [filter, setFilter] = useState("all");

  const createdAt = getCreatedAt(timeline);

  const filtered = timeline.filter((item) => {
    if (filter === "all") return true;
    if (filter === "status") return STATUS_TYPES.has(item.type);
    if (filter === "assignments") return ASSIGNMENT_TYPES.has(item.type);
    return true;
  });

  const sorted = newestFirst ? [...filtered].reverse() : [...filtered];

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3>Status Timeline</h3>
          <span className={styles.badge}>{timeline.length} events</span>
          {createdAt && (
            <span className={styles.createdPill}>
              <span className={styles.createdDot} />
              Created&nbsp;
              <strong>
                {new Date(createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </strong>
              &nbsp;·&nbsp;{getDaysAgo(createdAt)}
            </span>
          )}
        </div>

        <div className={styles.headerRight}>
          <div className={styles.filterTabs}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                className={`${styles.filterTab} ${filter === f.value ? styles.filterTabActive : ""}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button className={styles.sortBtn} onClick={() => setNewestFirst((p) => !p)}>
            {newestFirst
              ? <ArrowDownNarrowWide size={14} strokeWidth={2.2} />
              : <ArrowUpNarrowWide  size={14} strokeWidth={2.2} />}
            <span>{newestFirst ? "Newest" : "Oldest"}</span>
          </button>
        </div>
      </div>

      <div className={styles.scroll}>
        {sorted.length === 0 ? (
          <div className={styles.empty}>No {filter !== "all" ? filter : ""} events yet.</div>
        ) : (
          sorted.map((item, idx) => (
            <TimelineItem key={item.id} item={item} isLast={idx === sorted.length - 1} />
          ))
        )}
      </div>
    </div>
  );
};

export default TaskStatusTimeline;