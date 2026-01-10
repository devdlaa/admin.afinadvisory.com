"use client";
import React from "react";

import "./TaskStatusBoard.scss";

const TaskStatusBoard = ({ statusCounts, loading = false }) => {
  const { global = {}, filtered = {} } = statusCounts || {};

  // Calculate totals
  const globalTotal = Object.values(global).reduce(
    (sum, count) => sum + count,
    0
  );
  const filteredTotal = Object.values(filtered).reduce(
    (sum, count) => sum + count,
    0
  );
  
  // Check if any filters are active (filtered total is different from global)
  const hasActiveFilters = filteredTotal !== globalTotal;

  if (loading) {
    return (
      <div className="task-status-board-wrapper">
        <div className="task-status-board">
          <div className="status-columns">
            <div className="status-column skeleton">
              <div className="skeleton-label" />
              <div className="skeleton-count" />
            </div>
            <div className="status-column skeleton">
              <div className="skeleton-label" />
              <div className="skeleton-count" />
            </div>
            <div className="status-column skeleton">
              <div className="skeleton-label" />
              <div className="skeleton-count" />
            </div>
            <div className="status-column skeleton">
              <div className="skeleton-label" />
              <div className="skeleton-count" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="task-status-board-wrapper">
      <div className="task-status-board">
        <div className="status-columns">
          {/* Total Column */}
          <div className="status-column total-column">
            <div className="column-label">TOTAL TASKS</div>
            <div className="column-count">
              {globalTotal}
            </div>
            {hasActiveFilters && (
              <div className="filtered-badge">{filteredTotal} filtered</div>
            )}
          </div>

          {/* Pending Column */}
          <div className="status-column pending-column">
            <div className="column-label">PENDING</div>
            <div className="column-count">
              {global.PENDING || 0}
            </div>
            {hasActiveFilters && (
              <div className="filtered-badge">{filtered.PENDING || 0} filtered</div>
            )}
          </div>

          {/* In Progress Column */}
          <div className="status-column progress-column">
            <div className="column-label">IN PROGRESS</div>
            <div className="column-count">
              {global.IN_PROGRESS || 0}
            </div>
            {hasActiveFilters && (
              <div className="filtered-badge">{filtered.IN_PROGRESS || 0} filtered</div>
            )}
          </div>

          {/* Completed Column */}
          <div className="status-column completed-column">
            <div className="column-label">COMPLETED</div>
            <div className="column-count">
              {global.COMPLETED || 0}
            </div>
            {hasActiveFilters && (
              <div className="filtered-badge">{filtered.COMPLETED || 0} filtered</div>
            )}
          </div>

          {/* On Hold Column */}
          <div className="status-column hold-column">
            <div className="column-label">ON HOLD</div>
            <div className="column-count">
              {global.ON_HOLD || 0}
            </div>
            {hasActiveFilters && (
              <div className="filtered-badge">{filtered.ON_HOLD || 0} filtered</div>
            )}
          </div>

          {/* Pending Client Input Column */}
          <div className="status-column client-column">
            <div className="column-label">PENDING CLIENT INPUT</div>
            <div className="column-count">
              {global.PENDING_CLIENT_INPUT || 0}
            </div>
            {hasActiveFilters && (
              <div className="filtered-badge">{filtered.PENDING_CLIENT_INPUT || 0} filtered</div>
            )}
          </div>

          {/* Cancelled Column */}
          <div className="status-column cancelled-column">
            <div className="column-label">CANCELLED</div>
            <div className="column-count">
              {global.CANCELLED || 0}
            </div>
            {hasActiveFilters && (
              <div className="filtered-badge">{filtered.CANCELLED || 0} filtered</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskStatusBoard;