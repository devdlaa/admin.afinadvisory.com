"use client";
import React, { useMemo } from "react";
import styles from "./TaskRow.module.scss";
import { ChevronDown, ChevronRight } from "lucide-react";

import ChargesTable from "../ChargesTable/ChargesTable";

const TaskRow = ({
  data,
  config,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  isDisableTaskRows,
  inInvoiceView,
}) => {
  const { task, charges = [] } = data;

  // Get task-specific config from the main config
  const taskConfig = useMemo(
    () => config.getTaskRowConfig(data),
    [config, data],
  );

  // Calculate total recoverable for this task using config
  const calculateRecoverable = () => {
    let total = 0;
    let count = 0;

    if (charges && charges.length > 0) {
      charges.forEach((charge) => {
        if (config.recoverableCalculation) {
          const isRecoverable = config.recoverableCalculation(charge);
          if (isRecoverable) {
            total += parseFloat(charge.amount || 0);
            count++;
          }
        }
      });
    }

    return { total, count };
  };

  const { total: recoverableAmount, count: recoverableCount } =
    calculateRecoverable();

  return (
    <div className={`${styles.taskRow} ${isExpanded ? styles.expanded : ""}`}>
      <div
        style={{
          gridTemplateColumns: inInvoiceView
            ? "3fr 0.5fr 1fr"
            : "2.5fr 3fr 1.5fr",
        }}
        className={styles.taskRowMain}
      >
        <div className={styles.leftSection}>
          <input
            disabled={isDisableTaskRows}
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className={styles.checkbox}
          />

          <button className={styles.expandButton} onClick={onToggleExpand}>
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          <div className={styles.taskInfo}>
            <div className={styles.taskTitleRow}>
              <span className={styles.taskTitle}>{task.title}</span>
              {taskConfig.badge.show && (
                <span className={styles[taskConfig.badge.className]}>
                  {taskConfig.badge.text}
                </span>
              )}
            </div>
            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Status</span>
                <span
                  className={`${styles.metaValue} ${
                    styles[
                      `status_${task?.status?.toLowerCase().replace(/\s+/g, "_")}`
                    ]
                  }`}
                >
                  {task.status}
                </span>
              </div>

              {task.category?.name && !inInvoiceView && (
                <>
                  <span className={styles.metaDivider}>•</span>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Category</span>
                    <span className={styles.metaValue}>
                      {task.category?.name}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Client Info + Meta */}
        <div className={styles.centerSection}>
          {!inInvoiceView && (
            <div className={styles.clientWrapper}>
              <div className={styles.clientNameRow}>
                <span className={styles.clientName}>{task.entity?.name}</span>
                {taskConfig.clientBadge.show && (
                  <span className={styles[taskConfig.clientBadge.className]}>
                    {taskConfig.clientBadge.text}
                  </span>
                )}
              </div>
              <span className={styles.clientEmail}>{task.entity?.email}</span>
            </div>
          )}
        </div>

        {/* Column 3: Amount */}
        <div className={styles.rightSection}>
          <span className={styles.amountLabel}>TOTAL RECOVERABLE</span>
          <div className={styles.amountRow}>
            <span className={styles.amountValue}>
              ₹{recoverableAmount.toLocaleString("en-IN")}
            </span>
            {recoverableCount > 0 && (
              <span className={styles.itemCount}>
                {recoverableCount} {recoverableCount === 1 ? "item" : "items"}
              </span>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.expandedContent}>
          <ChargesTable
            charges={charges}
            taskId={task.id}
            data={data}
            config={config}
          />
        </div>
      )}
    </div>
  );
};

export default TaskRow;
