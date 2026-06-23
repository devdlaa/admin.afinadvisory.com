"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Users, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import {
  fetchAssignmentReport,
  selectAssignmentReport,
} from "@/store/slices/taskSlice";
import Avatar from "@/app/components/shared/newui/Avatar/Avatar";
import { getProfileUrl } from "@/utils/shared/shared_util";
import "./TaskWorkload.scss";

const TaskWorkload = () => {
  const dispatch = useDispatch();

  // Get workload data and loading state from Redux
  const assignmentReport = useSelector(selectAssignmentReport);
  const isLoading = useSelector(
    (state) => state.task?.assignmentReportLoading ?? false,
  );

  // Fetch data only if not already loaded
  useEffect(() => {
    if (assignmentReport === null) {
      dispatch(fetchAssignmentReport());
    }
  }, [dispatch, assignmentReport]);

  // Handle manual refresh
  const handleRefresh = () => {
    dispatch(fetchAssignmentReport());
  };
  
  // Calculate summary statistics
  const summary = Array.isArray(assignmentReport)
    ? assignmentReport.reduce(
        (acc, user) => ({
          total: acc.total + (user.total || 0),
          pending: acc.pending + (user.pending || 0),
          in_progress: acc.in_progress + (user.in_progress || 0),
          completed: acc.completed + (user.completed || 0),
          on_hold: acc.on_hold + (user.on_hold || 0),
          pending_client_input:
            acc.pending_client_input + (user.pending_client_input || 0),
          cancelled: acc.cancelled + (user.cancelled || 0),
        }),
        {
          total: 0,
          pending: 0,
          in_progress: 0,
          completed: 0,
          on_hold: 0,
          pending_client_input: 0,
          cancelled: 0,
        },
      )
    : {
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        on_hold: 0,
        pending_client_input: 0,
        cancelled: 0,
      };

  // Sort users by total assignment count (highest first)
  const sortedUsers = assignmentReport
    ? [...assignmentReport].sort((a, b) => b.total - a.total)
    : [];

  // Loading state
  if (isLoading && !assignmentReport) {
    return (
      <div className="workload">
        <div className="workload__loading">
          <Loader2 size={32} className="workload__spinner" />
          <p>Loading workload data...</p>
        </div>
      </div>
    );
  }

  // Error state (if data failed to load and no cached data)
  if (!isLoading && !assignmentReport) {
    return (
      <div className="workload">
        <div className="workload__error">
          <AlertCircle size={48} />
          <h3>Failed to Load Workload Data</h3>
          <p>Unable to fetch assignment statistics. Please try again.</p>
          <button className="workload__error-btn" onClick={handleRefresh}>
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (assignmentReport && assignmentReport.length === 0) {
    return (
      <div className="workload">
        <div className="workload__header">
          <div className="workload__header-left">
            <Users size={24} />
            <h2>Team Workload</h2>
          </div>
          <button
            className="workload__refresh-btn"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh workload data"
          >
            <RefreshCw size={16} className={isLoading ? "spinning" : ""} />
            Refresh
          </button>
        </div>

        <div className="workload__empty">
          <Users size={48} />
          <h3>No Assignments Yet</h3>
          <p>No tasks have been assigned to team members yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workload">
      {/* Header */}
      <div className="workload__header">
        <div className="workload__header-left">
          <Users size={24} />
          <div>
            <h2>Team Workload</h2>
            <span className="workload__subtitle">
              {assignmentReport?.length || 0} Team Member
              {assignmentReport?.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <button
          className="workload__refresh-btn"
          onClick={handleRefresh}
          disabled={isLoading}
          title="Refresh workload data"
        >
          <RefreshCw size={16} className={isLoading ? "spinning" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary Statistics */}
      <div className="workload__summary">
        <div className="workload__summary-item">
          <span className="workload__summary-label">
            Assignments (These are not total tasks)
          </span>
          <span className="workload__summary-value">{summary.total}</span>
        </div>
        <div className="workload__summary-item workload__summary-item--pending">
          <span className="workload__summary-label">Pending</span>
          <span className="workload__summary-value">{summary.pending}</span>
        </div>
        <div className="workload__summary-item workload__summary-item--progress">
          <span className="workload__summary-label">In Progress</span>
          <span className="workload__summary-value">{summary.in_progress}</span>
        </div>
        <div className="workload__summary-item workload__summary-item--completed">
          <span className="workload__summary-label">Completed</span>
          <span className="workload__summary-value">{summary.completed}</span>
        </div>
      </div>

      {/* Table */}
      <div className="workload__table">
        {/* Table Header */}
        <div className="workload__table-header">
          <div className="workload__table-cell workload__table-cell--user">
            Team Member
          </div>
          <div className="workload__table-cell workload__table-cell--total">
            Total
          </div>
          <div className="workload__table-cell workload__table-cell--pending">
            Pending
          </div>
          <div className="workload__table-cell workload__table-cell--progress">
            In Progress
          </div>
          <div className="workload__table-cell workload__table-cell--completed">
            Completed
          </div>
          <div className="workload__table-cell workload__table-cell--hold">
            On Hold
          </div>
          <div className="workload__table-cell workload__table-cell--client-input">
            Client Input
          </div>
          <div className="workload__table-cell workload__table-cell--cancelled">
            Cancelled
          </div>
        </div>

        {/* Scrollable Table Body */}
        <div className="workload__table-wrapper">
          <div className="workload__table-body">
            {sortedUsers.map((user) => (
              <div key={user.admin_user_id} className="workload__table-row">
                <div className="workload__table-cell workload__table-cell--user">
                  <div className="workload__user">
                    <Avatar
                      src={
                        user.admin_user_id
                          ? getProfileUrl(user.admin_user_id)
                          : undefined
                      }
                      alt={user.name}
                      size={32}
                      fallbackText={user.name}
                    />
                    <div className="workload__user-info">
                      <span className="workload__user-name">{user.name}</span>
                      {user.email && (
                        <span className="workload__user-email">
                          {user.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="workload__table-cell workload__table-cell--total">
                  <span className="workload__count workload__count--total">
                    {user.total}
                  </span>
                </div>
                <div className="workload__table-cell workload__table-cell--pending">
                  <span className="workload__count workload__count--pending">
                    {user.pending}
                  </span>
                </div>
                <div className="workload__table-cell workload__table-cell--progress">
                  <span className="workload__count workload__count--progress">
                    {user.in_progress}
                  </span>
                </div>
                <div className="workload__table-cell workload__table-cell--completed">
                  <span className="workload__count workload__count--completed">
                    {user.completed}
                  </span>
                </div>
                <div className="workload__table-cell workload__table-cell--hold">
                  <span className="workload__count workload__count--hold">
                    {user.on_hold}
                  </span>
                </div>
                <div className="workload__table-cell workload__table-cell--pending">
                  <span className="workload__count workload__count--pending">
                    {user.pending_client_input}
                  </span>
                </div>
                <div className="workload__table-cell workload__table-cell--cancelled">
                  <span className="workload__count workload__count--cancelled">
                    {user.cancelled}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskWorkload;
