"use client";
import React from "react";
import styles from "./BillingTable.module.scss";

import TaskRow from "../TaskRow/TaskRow";
import {
  Plus,
  Link2Off,
  Grid3x3,
  User,
  IndianRupee,
  Maximize,
  ListChebronsDownUp,
} from "lucide-react";

const ICON_MAP = {
  plus: Plus,
  unlink: Link2Off,
  expand: Maximize,
  collapse: ListChebronsDownUp,
};

const BillingTable = ({
  config,
  data = [],

  selectedTaskIds = [],
  expandedTaskIds = new Set(),

  onToggleTask,
  onToggleExpand,
  onExpandAll,
}) => {
  const selectedSet = new Set(selectedTaskIds);

  const hasSelection = selectedSet.size > 0;
  const hasAnyExpanded = expandedTaskIds.size > 0;

  const currentHeaderConfig = hasSelection
    ? config.header.withSelection
    : config.header.default;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSelectAll = (checked) => {
    if (!onToggleTask) return;

    data.forEach((item) => {
      const task = item.task;
      const isSelected = selectedSet.has(task.id);

      if (checked && !isSelected) {
        onToggleTask(task);
      }

      if (!checked && isSelected) {
        onToggleTask(task);
      }
    });
  };

  const handleControlAction = (control) => {
    const selectedTasks = data
      .map((i) => i.task)
      .filter((t) => selectedSet.has(t.id));

    if (control.id === "expand-all") {
      onExpandAll?.();
      return;
    }

    if (control.id === "remove-selection") {
      return;
    }

    if (control.handler) {
      control.handler(selectedTasks, {
        clearSelection: () => {},
        selectedCount: selectedTasks.length,
      });
    }
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ===========================================================================

  const renderSelectionInfo = () => {
    if (!currentHeaderConfig.selectionInfo) return null;

    const selectionInfo =
      typeof currentHeaderConfig.selectionInfo === "function"
        ? currentHeaderConfig.selectionInfo(selectedSet.size, data.length)
        : currentHeaderConfig.selectionInfo;

    if (selectionInfo.type === "text-only") {
      return (
        <div className={styles.selectionInfo}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={false}
            disabled
            onChange={() => {}}
          />
          <span className={styles.selectionText}>{selectionInfo.text}</span>
        </div>
      );
    }

    if (selectionInfo.type === "checkbox-with-text") {
      return (
        <div className={styles.selectionInfo}>
          {selectionInfo.showCheckbox && (
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={selectionInfo.checkboxProps.checked}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
          )}
          <span className={styles.selectionText}>{selectionInfo.text}</span>
        </div>
      );
    }

    return null;
  };

  const renderControl = (control) => {
    if (control.condition && !control.condition()) {
      return null;
    }

    const Icon = control.icon
      ? typeof control.icon === "function"
        ? ICON_MAP[control.icon(hasAnyExpanded)]
        : ICON_MAP[control.icon]
      : null;

    const label =
      typeof control.label === "function"
        ? control.label(hasAnyExpanded)
        : control.label;

    const isDisabled = control.disabled ? control.disabled() : false;

    const buttonClass = (() => {
      switch (control.variant) {
        case "primary":
          return styles.primaryButton;
        case "secondary":
          return styles.secondaryButton;
        case "danger":
          return styles.unlinkButton;
        default:
          return styles.expandButton;
      }
    })();

    return (
      <button
        key={control.id}
        className={buttonClass}
        onClick={() => handleControlAction(control)}
        disabled={isDisabled}
      >
        {Icon && <Icon size={16} />}
        {label}
      </button>
    );
  };

  // UPDATED: Config-driven header class
  const renderTopSection = () => {
    const getHeaderClass = () => {
      if (config.viewId !== "INVOICE_LINKED") {
        return styles.headerTop;
      }
      return styles.invoiceHeaderTop;
    };

    return (
      <div className={getHeaderClass()}>
        {renderSelectionInfo()}
        <div className={styles.actionButtons}>
          {currentHeaderConfig.controls.map((control) =>
            renderControl(control),
          )}
        </div>
      </div>
    );
  };

  const renderColumnHeaders = () => (
    <div className={styles.headerColumns}>
      <div className={styles.headerLeft}>
        <div className={styles.iconText}>
          <Grid3x3 size={25} />
          <span className={styles.headerLabel}>Task Details</span>
        </div>
      </div>

      <div className={styles.headerCenter}>
        <div className={styles.iconText}>
          <User size={25} />
          <span className={styles.headerLabel}>Client Details</span>
        </div>
      </div>

      <div className={styles.headerRight}>
        <div className={styles.iconText}>
          <IndianRupee size={25} />
          <span className={styles.headerLabel}>Recoverable Amount</span>
        </div>
      </div>
    </div>
  );

  const renderHeader = () => (
    <div className={styles.tableHeader}>
      {renderTopSection()}
      {renderColumnHeaders()}
    </div>
  );

  const renderEmptyState = () => {
    const emptyState = config.emptyState;

    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path
              d="M24 4L4 14v20l20 10 20-10V14L24 4z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="24" cy="24" r="3" fill="currentColor" />
          </svg>
        </div>
        <p className={styles.emptyText}>{emptyState.title}</p>
        {emptyState.subtitle && (
          <p className={styles.emptySubtext}>
            {emptyState.subtitle.split("<highlight>").map((part, i) => {
              if (i === 0) return part;
              const [highlighted, rest] = part.split("</highlight>");
              return (
                <React.Fragment key={i}>
                  <span className={styles.highlight}>{highlighted}</span>
                  {rest}
                </React.Fragment>
              );
            })}
          </p>
        )}
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className={styles.billingTableContainer}>
      <div className={styles.tableWrapper}>
        {renderHeader()}

        <div className={styles.tableBody}>
          {data.length === 0
            ? renderEmptyState()
            : data.map((item) => (
                <TaskRow
                  key={item.task.id}
                  data={item}
                  config={config}
                  isExpanded={expandedTaskIds.has(item.task.id)}
                  isSelected={selectedSet.has(item.task.id)}
                  onToggleExpand={() => onToggleExpand(item.task.id)}
                  onToggleSelect={() => onToggleTask(item.task)}
                  hasAnySelection={hasSelection}
                  isDisableTaskRows={!config?.showTaskSelection}
                />
              ))}
        </div>
      </div>
    </div>
  );
};

export default BillingTable;
