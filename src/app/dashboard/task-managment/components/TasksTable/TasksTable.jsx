"use client";
import React, { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  Calendar,
  UserPlus,
  ChevronDown,
  Users as UsersIcon,
  X,
  Tag,
  IndianRupee,
  Plus,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  PauseCircle,
  CheckCircle2,
  FileText,
  Sparkles,
  User,
  Bot,
  UserX,
  Folder,
  MessageSquare,
} from "lucide-react";
import "./TasksTable.scss";

import Button from "@/app/components/shared/Button/Button";
import Avatar from "@/app/components/shared/newui/Avatar/Avatar";
import AssignmentDialog from "@/app/components/pages/AssignmentDialog/AssignmentDialog";
import {
  setFilters,
  fetchTasks,
  bulkUpdateTaskStatus,
  bulkUpdateTaskPriority,
  updateTaskAssignmentsInList,
} from "@/store/slices/taskSlice";
import { syncAssignments } from "@/store/slices/taskDetailsSlice";
import { statusOptions, priorityOptions } from "@/utils/shared/constants";
import { getProfileUrl } from "@/utils/shared/shared_util";
import { truncateText } from "@/utils/client/cutils";
import DocumentManagerDialog from "@/app/components/shared/DocumentManager/DocumentManagerDialog/DocumentManagerDialog";
import TaskTimelineDialog from "../TaskTimeline/TaskTimelineDialog/TaskTimelineDialog";

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Always returns a readable absolute date: "20 Feb 2026"
 * No "yesterday", no "2d ago" — users shouldn't have to decode relative time.
 */
const formatAbsoluteDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

/**
 * SLA-specific: relative time makes sense here because it's urgency-focused.
 * "5d left" / "2h overdue" — actionable language.
 */
const formatSlaRelative = (dateStr) => {
  if (!dateStr) return null;

  const timeZone = "Asia/Kolkata";

  const now = new Date();
  const due = new Date(dateStr);

  // Convert both to India calendar dates (no time component)
  const nowDate = new Date(now.toLocaleString("en-US", { timeZone }));
  const dueDate = new Date(due.toLocaleString("en-US", { timeZone }));

  // Strip time → compare pure dates
  nowDate.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffMs = dueDate - nowDate;
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays > 1) return `${diffDays}d left`;

  return `${Math.abs(diffDays)}d overdue`;
};

// ─── SLA config ───────────────────────────────────────────────────────────────

const SLA_CONFIG = {
  BREACHED: {
    icon: AlertTriangle,
    label: "Overdue",
    barClass: "bar-breached",
  },

  DUE_TODAY: {
    icon: Clock,
    label: "Due Today",
    barClass: "bar-due-today",
  },

  DUE_TOMORROW: {
    icon: Clock,
    label: "Due Tomorrow",
    barClass: "bar-due-tomorrow",
  },

  PAUSED: {
    icon: PauseCircle,
    label: "On Hold",
    barClass: "bar-paused",
  },

  RUNNING: {
    icon: CheckCircle2,
    label: "On Track",
    barClass: "bar-running",
  },
};

// ─── Urgency Pill ─────────────────────────────────────────────────────────────

const UrgencyPill = ({ score }) => {
  if (score == null) return null;
  const level =
    score >= 14 ? 5 : score >= 10 ? 4 : score >= 7 ? 3 : score >= 4 ? 2 : 1;
  const labels = ["", "Low", "Moderate", "Elevated", "High", "Critical"];

  return (
    <div
      className={`urgency-pill footer-pill urgency-level-${level}`}
      title={`Urgency score: ${score}`}
    >
      <span>{labels[level]} Urgency</span>
    </div>
  );
};

// ─── SLA Bar (inside card) ────────────────────────────────────────────────────

const getPausedDays = (pausedAt) => {
  if (!pausedAt) return null;

  const timeZone = "Asia/Kolkata";

  const now = new Date();
  const paused = new Date(pausedAt);

  const nowDate = new Date(now.toLocaleString("en-US", { timeZone }));
  const pausedDate = new Date(paused.toLocaleString("en-US", { timeZone }));

  nowDate.setHours(0, 0, 0, 0);
  pausedDate.setHours(0, 0, 0, 0);

  const diffMs = nowDate - pausedDate;

  return Math.max(0, Math.floor(diffMs / 86400000));
};

const SlaSummaryBar = ({ sla_summary }) => {
  if (!sla_summary) return null;
  const absolute = formatAbsoluteDate(sla_summary.due_date);
  const relative = formatSlaRelative(sla_summary.due_date);
  const pausedDays = getPausedDays(sla_summary.paused_at);
  let cfg = SLA_CONFIG[sla_summary.status] || SLA_CONFIG.RUNNING;

  const getPausedLabel = (days) => {
    if (days === 0) return "Paused Today";
    if (days === 1) return "Paused Yesterday";
    return `Paused for ${days}d`;
  };

  if (sla_summary.status === "RUNNING") {
    if (relative === "today") {
      cfg = SLA_CONFIG.DUE_TODAY;
    } else if (relative === "tomorrow") {
      cfg = SLA_CONFIG.DUE_TOMORROW;
    } else if (relative === "due soon") {
      cfg = {
        ...SLA_CONFIG.RUNNING,
        label: "Due Soon",
        barClass: "bar-due-soon",
        icon: Clock,
      };
    }
  }

  const Icon = cfg.icon;

  return (
    <div className={`sla-bar ${cfg.barClass}`}>
      <div className="sla-bar-left">
        <Icon />
        <span className="sla-status-label">{cfg.label}</span>
      </div>
      <div className="sla-bar-right">
        {sla_summary.status === "PAUSED" && pausedDays != null && (
          <span className="sla-deadline">{getPausedLabel(pausedDays)}</span>
        )}

        {absolute && sla_summary.status !== "PAUSED" && (
          <span className="sla-deadline">
            {absolute}

            {relative && (
              <span className="sla-relative">
                {relative === "today"
                  ? "(deadline today)"
                  : relative === "tomorrow"
                    ? "(due tomorrow)"
                    : relative === "due soon"
                      ? "(approaching deadline)"
                      : `(${relative})`}
              </span>
            )}
          </span>
        )}

        {sla_summary.is_overdue && cfg.label !== "Overdue" && (
          <span className="sla-flag flag-overdue">Overdue</span>
        )}

        {sla_summary.is_due_today && cfg.label !== "Due Today" && (
          <span className="sla-flag flag-today">Due today</span>
        )}

        {sla_summary.is_paused && (
          <span className="sla-flag flag-paused">Timer paused</span>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const TaskTable = ({
  tasks = [],
  onTaskClick,
  loading = false,
  activeStatusFilter = null,
  activePriorityFilter = null,
  statusCounts = {},
  isMagicSort = false,
}) => {
  const dispatch = useDispatch();
  const priorityDropdownRef = useRef(null);
  const bulkActionsRef = useRef(null);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  const [docDialog, setDocDialog] = useState({ isOpen: false, task: null });
  const [timelineDialog, setTimelineDialog] = useState({
    isOpen: false,
    task: null,
  });
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] =
    useState(null);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);

  useEffect(() => {
    setSelectedTasks([]);
  }, [tasks]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(e.target)
      )
        setPriorityDropdownOpen(false);
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(e.target))
        setBulkActionsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectTask = (id) =>
    setSelectedTasks((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  const handleSelectAll = () =>
    setSelectedTasks(
      selectedTasks.length === tasks.length ? [] : tasks.map((t) => t.id),
    );
  const handleClearSelection = () => setSelectedTasks([]);

  const handleStatusChange = (status) => {
    dispatch(setFilters({ status }));
    dispatch(fetchTasks(true));
    setSelectedTasks([]);
  };
  const handlePriorityChange = (priority) => {
    dispatch(setFilters({ priority }));
    dispatch(fetchTasks(true));
    setPriorityDropdownOpen(false);
    setSelectedTasks([]);
  };

  const handleBulkStatusUpdate = (status) => {
    if (!selectedTasks.length) return;
    dispatch(bulkUpdateTaskStatus({ task_ids: selectedTasks, status }));
    setBulkActionsOpen(false);
  };
  const handleBulkPriorityUpdate = (priority) => {
    if (!selectedTasks.length) return;
    dispatch(bulkUpdateTaskPriority({ task_ids: selectedTasks, priority }));
    setBulkActionsOpen(false);
  };

  const handleOpenAssignmentDialog = (task) => {
    setSelectedTaskForAssignment(task);
    setShowAssignmentDialog(true);
  };

  const handleCloseAssignmentDialog = () => {
    setShowAssignmentDialog(false);
    setSelectedTaskForAssignment(null);
  };

  const handleSaveAssignments = async (assignmentData) => {
    if (!selectedTaskForAssignment) return;
    setIsSavingAssignments(true);
    try {
      const result = await dispatch(
        syncAssignments({
          taskId: selectedTaskForAssignment.id,
          user_ids: assignmentData.user_ids,
          assigned_to_all: assignmentData.assigned_to_all,
        }),
      ).unwrap();
      dispatch(updateTaskAssignmentsInList(result));
      setShowAssignmentDialog(false);
      setSelectedTaskForAssignment(null);
    } catch (_) {
      // handled by redux
    } finally {
      setIsSavingAssignments(false);
    }
  };

  const handleOpenDocuments = (e, task) => {
    e.stopPropagation();
    setDocDialog({ isOpen: true, task });
  };
  const handleOpenTimeline = (e, task) => {
    e.stopPropagation();
    setTimelineDialog({ isOpen: true, task });
  };
  const isAllSelected =
    tasks.length > 0 && selectedTasks.length === tasks.length;
  const isSomeSelected =
    selectedTasks.length > 0 && selectedTasks.length < tasks.length;

  const getPriorityColor = (p) =>
    priorityOptions.find((o) => o.value === p)?.txtClr || "#6b7280";
  const getStatusColor = (s) =>
    statusOptions.find((o) => o.value === s)?.txtClr || "#6b7280";
  const getStatusLabel = (s) =>
    statusOptions.find((o) => o.value === s)?.label || s;
  const getPriorityLabel = (p) =>
    priorityOptions.find((o) => o.value === p)?.label || p;

  const activePriorityLabel =
    priorityOptions.find((o) => o.value === activePriorityFilter)?.label ||
    "All";

  const renderAssignees = (task) => {
    const {
      assigned_to_all,
      assignments = [],
      remaining_assignee_count = 0,
    } = task;
    const handleClick = (e) => {
      e.stopPropagation();
      handleOpenAssignmentDialog(task);
    };

    if (assigned_to_all) {
      return (
        <div className="task-assignees" onClick={handleClick}>
          <div className="assignee-chip assignee-all">
            <UsersIcon size={15} />
            <span>All Team</span>
          </div>
        </div>
      );
    }

    if (!assignments.length) {
      return (
        <div className="task-assignees" onClick={handleClick}>
          <div className="assignee-chip assignee-empty">
            <UserPlus size={15} />
            <span>Assign</span>
          </div>
        </div>
      );
    }

    return (
      <div className="task-assignees" onClick={handleClick}>
        <div className="avatar-stack">
          {assignments
            .filter((a) => a?.assignee?.id)
            .map((a) => (
              <div
                key={a.id}
                className={`avatar-wrapper ${a.sla_status === "RUNNING" ? "sla-ok" : a.sla_status === "BREACHED" ? "sla-breach" : ""}`}
                title={`${a.assignee.name}${a.sla_status && a.sla_status !== "NONE" ? ` · SLA: ${a.sla_status}` : ""}${a.assignment_source === "AUTO" ? " · Auto-assigned" : ""}`}
              >
                <Avatar
                  src={getProfileUrl(a.assignee.id)}
                  alt={a.assignee.name}
                  size={35}
                  fallbackText={a.assignee.name}
                />
              </div>
            ))}
          {remaining_assignee_count > 0 && (
            <div className="avatar-more">+{remaining_assignee_count}</div>
          )}
          <div className="avatar-add" title="Add assignee">
            <Plus size={19} />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="task-table">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="task-table">
        {/* ── Controls Bar ── */}
        <div className="controls-bar">
          <div className="controls-left">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isSomeSelected;
              }}
              onChange={handleSelectAll}
              className="checkbox"
              disabled={tasks.length === 0}
            />

            {selectedTasks.length === 0 ? (
              <>
                <div className="status-tabs">
                  <button
                    className={`status-tab ${!activeStatusFilter || activeStatusFilter === "ALL" ? "active" : ""}`}
                    onClick={() => handleStatusChange("ALL")}
                    style={{ "--tab-color": "#6b7280" }}
                  >
                    All
                  </button>
                  {statusOptions.map((tab) => (
                    <button
                      key={tab.value ?? tab.label}
                      className={`status-tab ${activeStatusFilter === tab.value ? "active" : ""}`}
                      onClick={() => handleStatusChange(tab.value)}
                      style={{ "--tab-color": tab.txtClr }}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="controls-right-group">
                  {isMagicSort && (
                    <div
                      className="magic-sort-badge"
                      title="Results sorted by AI urgency ranking"
                    >
                      <Sparkles size={13} />
                      <span>Smart sort</span>
                    </div>
                  )}
                  <div className="priority-filter" ref={priorityDropdownRef}>
                    <button
                      className="priority-button"
                      onClick={() =>
                        setPriorityDropdownOpen(!priorityDropdownOpen)
                      }
                    >
                      <span>{activePriorityLabel}</span>
                      <ChevronDown size={16} />
                    </button>
                    {priorityDropdownOpen && (
                      <div className="priority-dropdown">
                        {priorityOptions.map((option) => (
                          <div
                            key={option.value || "all"}
                            className={`priority-option ${activePriorityFilter === option.value ? "active" : ""}`}
                            onClick={() => handlePriorityChange(option.value)}
                          >
                            <div
                              className="priority-dot"
                              style={{ backgroundColor: option.color }}
                            />
                            {option?.icon}
                            <span>{option.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bulk-actions">
                <span className="bulk-count">
                  {selectedTasks.length} selected
                </span>
                <div className="bulk-buttons">
                  <div className="bulk-actions-menu" ref={bulkActionsRef}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={MoreHorizontal}
                      onClick={() => setBulkActionsOpen(!bulkActionsOpen)}
                    >
                      Actions
                    </Button>
                    {bulkActionsOpen && (
                      <div className="bulk-dropdown">
                        <div className="dropdown-section">
                          <div className="dropdown-label">Update Status</div>
                          {statusOptions
                            .filter((o) => o.value)
                            .map((option) => (
                              <button
                                key={option.value}
                                className="dropdown-item"
                                onClick={() =>
                                  handleBulkStatusUpdate(option.value)
                                }
                              >
                                {option.icon}
                                <span>{option.label}</span>
                              </button>
                            ))}
                        </div>
                        <div className="dropdown-divider" />
                        <div className="dropdown-section">
                          <div className="dropdown-label">Update Priority</div>
                          {priorityOptions
                            .filter((o) => o.value)
                            .map((option) => (
                              <button
                                key={option.value}
                                className="dropdown-item"
                                onClick={() =>
                                  handleBulkPriorityUpdate(option.value)
                                }
                              >
                                {option?.icon}
                                <span>{option.label}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={X}
                    onClick={handleClearSelection}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Task List ── */}
        <div
          style={{ display: tasks.length === 0 ? "flex" : "grid" }}
          className="task-list"
        >
          {tasks.length === 0 ? (
            <div className="empty-state">
              <p>No tasks found</p>
              <span>Try adjusting your filters or create a new task</span>
            </div>
          ) : (
            tasks.map((task) => {
              const isSelected = selectedTasks.includes(task.id);
              const hasSla = !!task.sla_summary;
              const slaStatus = task.sla_summary?.status;

              // sla_summary === null means super-admin created, never SLA-assigned
              const isUnassignedViaSla = task.sla_summary === null;

              return (
                <div key={task.id} className="task-card-wrapper">
                  <div
                    className={`task-card ${isSelected ? "selected" : ""} ${hasSla ? `sla-card-${slaStatus?.toLowerCase()}` : ""}`}
                    onClick={() => onTaskClick && onTaskClick(task)}
                  >
                    <div className="task-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectTask(task.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="checkbox"
                      />
                    </div>

                    <div className="task-content">
                      {/* ── Header ── */}
                      <div className="task-header">
                        <div className="task-title-group">
                          <h3 className="task-title">
                            {truncateText(task.title, 40)}
                          </h3>
                          <span className="entity-name">
                            {task.entity?.name || "No Entity"}
                          </span>
                        </div>
                        <div className="task-badges">
                          <span
                            className="badge status-badge"
                            style={{
                              backgroundColor: `${getStatusColor(task.status)}15`,
                              color: getStatusColor(task.status),
                            }}
                          >
                            {getStatusLabel(task.status)}
                          </span>
                          <span
                            className="badge priority-badge"
                            style={{
                              backgroundColor: `${getPriorityColor(task.priority)}15`,
                              color: getPriorityColor(task.priority),
                            }}
                          >
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>
                      </div>

                      {/* ── Meta row ── */}
                      <div className="task-meta">
                        {task.category && (
                          <div className="meta-item">
                            <Tag size={15} />
                            <span>{task.category.name}</span>
                          </div>
                        )}
                        {task.creator && (
                          <div className="meta-item" title={task.creator.email}>
                            <User size={15} />
                            <span>{task.creator.name}</span>
                          </div>
                        )}
                        {/* Created date — always absolute, never "yesterday" */}
                        <div
                          className="meta-item meta-created"
                          title="Created on"
                        >
                          <Clock size={15} />
                          <span>
                            Created On : {formatAbsoluteDate(task.created_at)}
                          </span>
                        </div>
                        {/* Due date — always absolute, prominent amber */}
                        {task.due_date && (
                          <div
                            className="meta-item meta-due"
                            title="Task due date"
                          >
                            <Calendar size={15} />
                            <span>
                              Due: {formatAbsoluteDate(task.due_date)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ── SLA bar — only when SLA exists ── */}
                      {hasSla && (
                        <SlaSummaryBar sla_summary={task.sla_summary} />
                      )}

                      {/* ── Footer ── */}
                      <div className="task-footer">
                        <div className="footer-left">
                          {renderAssignees(task)}

                          {/* Doc badge */}
                          <div
                            className={`doc-badge ${(task.document_count ?? 0) > 0 ? "has-docs" : "no-docs"}`}
                            onClick={(e) => handleOpenDocuments(e, task)}
                            title={`${task.document_count ?? 0} document${task.document_count !== 1 ? "s" : ""}`}
                          >
                            <Folder />
                            <span>
                              {`${task.document_count ?? 0} Document${task.document_count !== 1 ? "s" : ""}`}
                            </span>
                          </div>

                          {/* Urgency pill */}
                          {task.urgency_score != null && (
                            <UrgencyPill score={task.urgency_score} />
                          )}

                          {/* Not Assigned pill — sla_summary null = super-admin task, never assigned via SLA */}

                          {task.is_billable && (
                            <span className="billable-badge">
                              <IndianRupee size={13} /> Billable
                            </span>
                          )}
                          <div
                            className="timeline-badge"
                            onClick={(e) => handleOpenTimeline(e, task)}
                            title="View timeline & comments"
                          >
                            <MessageSquare size={14} />
                            <span>Timeline</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {docDialog.isOpen && docDialog.task && (
        <DocumentManagerDialog
          isOpen={docDialog.isOpen}
          onClose={() => setDocDialog({ isOpen: false, task: null })}
          scope="TASK"
          scopeId={docDialog.task.id}
          title={`Documents · ${truncateText(docDialog.task.title, 40)}`}
        />
      )}

      {timelineDialog.isOpen && timelineDialog.task && (
        <TaskTimelineDialog
          isOpen={timelineDialog.isOpen}
          onClose={() => setTimelineDialog({ isOpen: false, task: null })}
          taskId={timelineDialog.task.id}
          task={timelineDialog.task}
          title={`Timeline · ${truncateText(timelineDialog.task.title, 40)}`}
        />
      )}
      {showAssignmentDialog && selectedTaskForAssignment && (
        <AssignmentDialog
          isOpen={showAssignmentDialog}
          onClose={handleCloseAssignmentDialog}
          hasPermission={true}
          isSaving={isSavingAssignments}
          config={{
            assignedUsers:
              selectedTaskForAssignment?.assignments?.map((a) => a.assignee) ||
              [],
            assignedToAll: selectedTaskForAssignment?.assigned_to_all || false,
            creatorId: selectedTaskForAssignment.creator?.id,
            taskId: selectedTaskForAssignment.id,
            onSave: handleSaveAssignments,
            title: "Manage Task Assignments",
            subtitle: "Drag and drop team members to manage task assignments",
            maxAssignedUsers: 10,
          }}
        />
      )}
    </>
  );
};

export default TaskTable;
