import React from "react";
import "./TaskDrawerSkeleton.scss";

const TaskDrawerSkeleton = () => {
  return (
    <div className="task-drawer-skeleton">
      {/* Left Panel */}
      <div className="task-drawer-skeleton__left">
        {/* Primary Info Skeleton */}
        <div className="skeleton-primary-info">
          {/* Title */}
          <div className="skeleton-line skeleton-line--title"></div>
          <div className="skeleton-line skeleton-line--subtitle"></div>

          {/* Status and Priority Badges */}
          <div className="skeleton-badges">
            <div className="skeleton-badge"></div>
            <div className="skeleton-badge"></div>
          </div>

          {/* Form Fields */}
          <div className="skeleton-fields">
            <div className="skeleton-field">
              <div className="skeleton-line skeleton-line--label"></div>
              <div className="skeleton-line skeleton-line--input"></div>
            </div>
            <div className="skeleton-field">
              <div className="skeleton-line skeleton-line--label"></div>
              <div className="skeleton-line skeleton-line--input"></div>
            </div>
            <div className="skeleton-field-row">
              <div className="skeleton-field">
                <div className="skeleton-line skeleton-line--label"></div>
                <div className="skeleton-line skeleton-line--input"></div>
              </div>
              <div className="skeleton-field">
                <div className="skeleton-line skeleton-line--label"></div>
                <div className="skeleton-line skeleton-line--input"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="skeleton-tabs">
          <div className="skeleton-tab"></div>
          <div className="skeleton-tab"></div>
          <div className="skeleton-tab"></div>
        </div>

        {/* Tab Content Skeleton */}
        <div className="skeleton-content">
          <div className="skeleton-line skeleton-line--full"></div>
          <div className="skeleton-line skeleton-line--full"></div>
          <div className="skeleton-line skeleton-line--medium"></div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="task-drawer-skeleton__right">
        {/* Info Cards */}
        <div className="skeleton-card">
          <div className="skeleton-line skeleton-line--small"></div>
          <div className="skeleton-avatar-group">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-text-group">
              <div className="skeleton-line skeleton-line--name"></div>
              <div className="skeleton-line skeleton-line--email"></div>
            </div>
          </div>
        </div>

        <div className="skeleton-card">
          <div className="skeleton-line skeleton-line--small"></div>
          <div className="skeleton-avatars">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-avatar"></div>
            <div className="skeleton-avatar"></div>
          </div>
        </div>

        <div className="skeleton-card">
          <div className="skeleton-line skeleton-line--small"></div>
          <div className="skeleton-line skeleton-line--medium"></div>
          <div className="skeleton-line skeleton-line--small"></div>
        </div>
      </div>
    </div>
  );
};

export default TaskDrawerSkeleton;