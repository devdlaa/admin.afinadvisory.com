"use client";
import React, { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  Calendar,
  UserPlus,
  ChevronDown,
  Users as UsersIcon,
  Trash2,
  UserCheck,
  X,
  Clock,
  Tag,
  SquarePen,
  Bell,
  PauseCircle,
  MessageSquare,
  CheckCircle2,
  XCircle,
  RotateCcw,
  IndianRupee,
  Plus,
} from "lucide-react";
import "./TasksTable.scss";

import Button from "@/app/components/Button/Button";
import Avatar from "@/app/components/newui/Avatar/Avatar";
import { setFilters } from "@/store/slices/taskSlice";

const TaskTable = ({
  tasks = [],
  onTaskClick,
  onManageTask,
  onAssigneeClick,
  onBulkAssign,
  onBulkStatusChange,
  onBulkDelete,
  loading = false,
  activeStatusFilter = null,
  activePriorityFilter = null,
}) => {
  const dispatch = useDispatch();
  const priorityDropdownRef = useRef(null);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);

  const statusTabs = [
    {
      value: "PENDING",
      label: "Pending",
      color: "#f59e0b",
      icon: <Clock size={14} />,
    },

    {
      value: "IN_PROGRESS",
      label: "In Progress",
      color: "#3b82f6",
      icon: <RotateCcw size={14} />,
    },

    {
      value: "ON_HOLD",
      label: "On Hold",
      color: "#8b5cf6",
      icon: <PauseCircle size={14} />,
    },

    {
      value: "PENDING_CLIENT_INPUT",
      label: "Client Input",
      color: "#f97316",
      icon: <MessageSquare size={14} />,
    },

    {
      value: "COMPLETED",
      label: "Completed",
      color: "#10b981",
      icon: <CheckCircle2 size={14} />,
    },

    {
      value: "CANCELLED",
      label: "Cancelled",
      color: "#ef4444",
      icon: <XCircle size={14} />,
    },
  ];

  const priorityOptions = [
    { value: null, label: "All", color: "#6b7280" },
    { value: "LOW", label: "Low", color: "#10b981" },
    { value: "NORMAL", label: "Normal", color: "#3b82f6" },
    { value: "HIGH", label: "High", color: "#f59e0b" },
  ];

  useEffect(() => {
    setSelectedTasks([]);
  }, [tasks]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target)
      ) {
        setPriorityDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectTask = (taskId) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map((task) => task.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedTasks([]);
  };

  const handleStatusChange = (status) => {
    dispatch(setFilters({ status }));
    setSelectedTasks([]);
  };

  const handlePriorityChange = (priority) => {
    dispatch(setFilters({ priority }));
    setPriorityDropdownOpen(false);
    setSelectedTasks([]);
  };

  const isAllSelected =
    tasks.length > 0 && selectedTasks.length === tasks.length;
  const isSomeSelected =
    selectedTasks.length > 0 && selectedTasks.length < tasks.length;

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getProfileUrl = (userId) =>
    `https://nlpbifhxscrlgsfgrlua.supabase.co/storage/v1/object/public/team_profiles/${userId}.jpg`;

  const getPriorityColor = (priority) => {
    const option = priorityOptions.find((opt) => opt.value === priority);
    return option?.color || "#6b7280";
  };

  const getStatusColor = (status) => {
    const tab = statusTabs.find((tab) => tab.value === status);
    return tab?.color || "#6b7280";
  };

  const getStatusLabel = (status) => {
    const tab = statusTabs.find((tab) => tab.value === status);
    return tab?.label || status;
  };

  const getPriorityLabel = (priority) => {
    const option = priorityOptions.find((opt) => opt.value === priority);
    return option?.label || priority;
  };

  const activePriorityLabel =
    priorityOptions.find((opt) => opt.value === activePriorityFilter)?.label ||
    "All";

  const renderAssignees = (task) => {
    const { is_assigned_to_all, assignees_preview, remaining_assignee_count } =
      task;

    const handleClick = (e) => {
      e.stopPropagation();
      if (onAssigneeClick) {
        onAssigneeClick(task);
      }
    };

    if (is_assigned_to_all) {
      return (
        <div className="task-assignees" onClick={handleClick}>
          <div className="assignee-chip assignee-all">
            <UsersIcon size={16} />
            <span>All Team</span>
          </div>
        </div>
      );
    }

    if (!assignees_preview || assignees_preview.length === 0) {
      return (
        <div className="task-assignees" onClick={handleClick}>
          <div className="assignee-chip assignee-empty">
            <UserPlus size={16} />
            <span>Assign</span>
          </div>
        </div>
      );
    }

    return (
      <div className="task-assignees" onClick={handleClick}>
        <div className="avatar-stack">
          {assignees_preview.map((assignee) => (
            <Avatar
              key={assignee.id}
              src={getProfileUrl(assignee.id)}
              alt={assignee.name}
              size={35}
              fallbackText={assignee.name}
            />
          ))}
          {remaining_assignee_count > 0 && (
            <div className="avatar-more">+{remaining_assignee_count}</div>
          )}
          {assignees_preview.length < 3 && (
            <div className="avatar-more">
              <Plus />
            </div>
          )}
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
    <div className="task-table">
      {/* Controls Section - Hides when tasks are selected */}
      <div className="controls-bar">
        <div className="controls-left">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => el && (el.indeterminate = isSomeSelected)}
            onChange={handleSelectAll}
            className="checkbox"
            disabled={tasks.length === 0}
          />

          {selectedTasks.length === 0 ? (
            <>
              <div className="status-tabs">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.value || "all"}
                    className={`status-tab ${
                      activeStatusFilter === tab.value ? "active" : ""
                    }`}
                    onClick={() => handleStatusChange(tab.value)}
                    style={{ "--tab-color": tab.color }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="priority-filter" ref={priorityDropdownRef}>
                <button
                  className="priority-button"
                  onClick={() => setPriorityDropdownOpen(!priorityDropdownOpen)}
                >
                  <span>{activePriorityLabel} Priority</span>
                  <ChevronDown size={16} />
                </button>

                {priorityDropdownOpen && (
                  <div className="priority-dropdown">
                    {priorityOptions.map((option) => (
                      <div
                        key={option.value || "all"}
                        className={`priority-option ${
                          activePriorityFilter === option.value ? "active" : ""
                        }`}
                        onClick={() => handlePriorityChange(option.value)}
                      >
                        <div
                          className="priority-dot"
                          style={{ backgroundColor: option.color }}
                        />
                        <span>{option.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bulk-actions">
              <span className="bulk-count">
                {selectedTasks.length} selected
              </span>
              <div className="bulk-buttons">
                <Button
                  variant="outline"
                  size="sm"
                  icon={UserCheck}
                  onClick={() => onBulkAssign && onBulkAssign(selectedTasks)}
                >
                  Assign
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Trash2}
                  onClick={() => onBulkDelete && onBulkDelete(selectedTasks)}
                >
                  Delete
                </Button>
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

      {/* Task List */}
      <div
        style={{
          display: tasks.length === 0 ? "flex" : "grid",

        }}
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

            return (
              <div
                key={task.id}
                className={`task-card ${isSelected ? "selected" : ""}`}
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
                  <div className="task-header">
                    <div className="task-title-group">
                      <h3 className="task-title">{task.title}</h3>
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
                          backgroundColor: `${getPriorityColor(
                            task.priority
                          )}15`,
                          color: getPriorityColor(task.priority),
                        }}
                      >
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                  </div>

                  <div className="task-meta">
                    {task.category && (
                      <div className="meta-item">
                        <Tag size={14} />
                        <span className="meta-item">{task.category.name}</span>
                      </div>
                    )}

                    {task.creator && (
                      <div className="meta-item">
                        <span className="meta-label">Created By</span>
                        <span className="meta-item">{task.creator.name}</span>
                      </div>
                    )}

                    <div className="meta-item">
                      <Calendar size={14} />
                      <span className="meta-item">
                        {formatDate(task.created_at)}
                      </span>
                    </div>

                    {task.is_billable && (
                      <span className="billable-badge">
                        {" "}
                        <IndianRupee /> Billable Task
                      </span>
                    )}
                  </div>

                  <div className="task-footer">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      {renderAssignees(task)}

                      {true && (
                        <div className="attention-badge">
                          <Bell size={14} />
                          <span>Needs Attention</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onManageTask && onManageTask(task);
                      }}
                      icon={SquarePen}
                    >
                      Manage Task
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskTable;
