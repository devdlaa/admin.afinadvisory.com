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
  Flag,
} from "lucide-react";
import "./TasksTable.scss";


import Button from "@/app/components/shared/Button/Button";
import Avatar from "@/app/components/shared/newui/Avatar/Avatar";
import {
  setFilters,
  fetchTasks,
  bulkUpdateTaskStatus,
  bulkUpdateTaskPriority,
} from "@/store/slices/taskSlice";
import { statusOptions, priorityOptions } from "@/utils/shared/constants";
import { getProfileUrl, formatDate } from "@/utils/shared/shared_util";
import { truncateText } from "@/utils/server/utils";


const TaskTable = ({
  tasks = [],
  onTaskClick,
  onAssigneeClick,

  loading = false,
  activeStatusFilter = null,
  activePriorityFilter = null,
  statusCounts = {},
}) => {
  const dispatch = useDispatch();
  const priorityDropdownRef = useRef(null);
  const bulkActionsRef = useRef(null);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);

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
      if (
        bulkActionsRef.current &&
        !bulkActionsRef.current.contains(event.target)
      ) {
        setBulkActionsOpen(false);
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
    dispatch(fetchTasks(true));
    setSelectedTasks([]);
  };

  const handlePriorityChange = (priority) => {
    dispatch(setFilters({ priority }));
    dispatch(fetchTasks(true));
    setPriorityDropdownOpen(false);
    setSelectedTasks([]);
  };

  const handleBulkStatusUpdate = async (status) => {
    if (selectedTasks.length === 0) return;

    dispatch(
      bulkUpdateTaskStatus({
        task_ids: selectedTasks,
        status,
      })
    );

    setBulkActionsOpen(false);
  };

  const handleBulkPriorityUpdate = async (priority) => {
    if (selectedTasks.length === 0) return;

    dispatch(
      bulkUpdateTaskPriority({
        task_ids: selectedTasks,
        priority,
      })
    );

    setBulkActionsOpen(false);
  };

  const isAllSelected =
    tasks.length > 0 && selectedTasks.length === tasks.length;
  const isSomeSelected =
    selectedTasks.length > 0 && selectedTasks.length < tasks.length;

  const getPriorityColor = (priority) => {
    const option = priorityOptions.find((opt) => opt.value === priority);
    return option?.txtClr || "#6b7280";
  };

  const getStatusColor = (status) => {
    const tab = statusOptions.find((tab) => tab.value === status);
    return tab?.txtClr || "#6b7280";
  };

  const getStatusLabel = (status) => {
    const tab = statusOptions.find((tab) => tab.value === status);
    return tab?.label || status;
  };

  const getPriorityLabel = (priority) => {
    const option = priorityOptions.find((opt) => opt.value === priority);
    return option?.label || priority;
  };

  const activePriorityLabel =
    priorityOptions.find((opt) => opt.value === activePriorityFilter)?.label ||
    "All";

  // Get filtered counts for status tabs
  const getStatusCount = (statusValue) => {
    const { filtered = {} } = statusCounts;
    if (!statusValue) {
      // "All" tab - show sum of all filtered counts
      return Object.values(filtered).reduce((sum, count) => sum + count, 0);
    }
    return filtered[statusValue] || 0;
  };

  const renderAssignees = (task) => {
    const {
      assigned_to_all,
      assignments = [],
      remaining_assignee_count = 0,
    } = task;

    const handleClick = (e) => {
      e.stopPropagation();
      if (onAssigneeClick) {
        onAssigneeClick(task);
      }
    };

    if (assigned_to_all) {
      return (
        <div className="task-assignees" onClick={handleClick}>
          <div className="assignee-chip assignee-all">
            <UsersIcon size={16} />
            <span>All Team</span>
          </div>
        </div>
      );
    }

    if (!assignments.length) {
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
          {assignments.filter(a => a?.assignee?.id).map((a) => (
            <Avatar
              key={a.id}
              src={getProfileUrl(a.assignee.id)}
              alt={a.assignee.name}
              size={35}
              fallbackText={a.assignee.name}
            />
          ))}

          {remaining_assignee_count > 0 && (
            <div className="avatar-more">+{remaining_assignee_count}</div>
          )}

          {assignments.length < 3 && (
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
                {statusOptions.map((tab) => {
                  return (
                    <button
                      key={tab.value || "all"}
                      className={`status-tab ${
                        activeStatusFilter === tab.value ? "active" : ""
                      }`}
                      onClick={() => handleStatusChange(tab.value)}
                      style={{ "--tab-color": tab.txtClr }}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="priority-filter" ref={priorityDropdownRef}>
                <button
                  className="priority-button"
                  onClick={() => setPriorityDropdownOpen(!priorityDropdownOpen)}
                >
                  <span>{activePriorityLabel}</span>
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
                        {option?.icon}
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
                          .filter((opt) => opt.value)
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
                          .filter((opt) => opt.value)
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
                      <h3 className="task-title">
                        {truncateText(task.title, 100)}
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
                    </div>
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
