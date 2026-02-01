"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  User,
  Building2,
  IndianRupee,
  Calendar,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  Tag,
} from "lucide-react";
import styles from "./TaskChargeTable.module.scss";

export default function TaskChargeTable({
  // Data
  items = [], // Array of { task, charges, type }

  // Loading states
  loading = false,
  deletingCharges = new Set(),
  savingTasks = new Set(),

  // Selection
  selectedTaskIds = [],
  onTaskSelect,
  onTaskSelectAll,

  // Expansion
  expandedTaskIds = [],
  onTaskExpand,
  allExpanded = false,
  onToggleExpandAll,

  // Charge editing
  editingCharges = {},
  onChargeEdit,

  // Actions
  onDeleteCharge,
  onSaveTask,
  onDiscardTask,

  // Flags
  showCheckboxes = true,
  showActions = true,
  isReadOnly = false,

  // Customization
  emptyMessage = "No tasks found",
  emptyDescription = "Try adjusting your filters",
}) {

  
  // Helper to check if task has unsaved changes
  const hasChanges = useCallback(
    (taskId) => {
      return Object.keys(editingCharges).some((key) =>
        key.startsWith(`${taskId}-`),
      );
    },
    [editingCharges],
  );

  // Helper to get charge value (edited or original)
  const getChargeValue = useCallback(
    (taskId, chargeId, field, originalValue) => {
      const key = `task:${taskId}|charge:${chargeId}`;
      const edited = editingCharges[key];
      return edited?.[field] ?? originalValue;
    },
    [editingCharges],
  );

  // Check if charge is edited
  const isChargeEdited = useCallback(
    (taskId, chargeId) => {
      const key = `task:${taskId}|charge:${chargeId}`;
      return !!editingCharges[key];
    },
    [editingCharges],
  );

  // Calculate total recoverable
  const calculateRecoverable = useCallback((charges) => {
    const recoverable = charges
      .filter((c) => c.status === "NOT_PAID" && c.bearer === "CLIENT")
      .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

    const count = charges.filter(
      (c) => c.status === "NOT_PAID" && c.bearer === "CLIENT",
    ).length;

    return { amount: recoverable, count };
  }, []);

  // Check if task is expanded
  const isExpanded = useCallback(
    (taskId) => {
      return expandedTaskIds.includes(taskId);
    },
    [expandedTaskIds],
  );

  // Check if task is selected
  const isSelected = useCallback(
    (taskId) => {
      return selectedTaskIds.includes(taskId);
    },
    [selectedTaskIds],
  );

  // Check if all tasks are selected
  const allSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((item) => selectedTaskIds.includes(item.task.id));
  }, [items, selectedTaskIds]);

  // Check if some tasks are selected
  const someSelected = useMemo(() => {
    if (items.length === 0) return false;
    return (
      items.some((item) => selectedTaskIds.includes(item.task.id)) &&
      !allSelected
    );
  }, [items, selectedTaskIds, allSelected]);

  // Render skeleton loader
  const renderSkeletonRows = () => {
    return Array(3)
      .fill(0)
      .map((_, idx) => (
        <div key={idx} className={styles.skeletonCard}>
          <div className={styles.skeletonRow}>
            <div className={styles.skeletonExpand}></div>
            <div className={styles.skeletonContent}>
              <div className={styles.skeletonTitle}></div>
              <div className={styles.skeletonMeta}></div>
            </div>
          </div>
        </div>
      ));
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.tasksList}>{renderSkeletonRows()}</div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyContainer}>
          <AlertCircle size={48} />
          <h3>{emptyMessage}</h3>
          <p>{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Sticky Header */}
      <div className={styles.stickyHeader}>
        <div className={styles.headerLeft}>
          {showCheckboxes && (
            <div className={styles.headerCheckbox}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={(e) => onTaskSelectAll?.(e.target.checked)}
              />
              <span className={styles.headerCheckboxLabel}>
                {selectedTaskIds.length > 0
                  ? `${selectedTaskIds.length} selected`
                  : "Select all"}
              </span>
            </div>
          )}
        </div>

        <div className={styles.headerRight}>
          <div className={styles.headerStats}>
            <span className={styles.headerStatItem}>
              <span className={styles.headerStatLabel}>Total Tasks:</span>
              <span className={styles.headerStatValue}>{items.length}</span>
            </span>
          </div>

          <button
            className={styles.expandAllBtn}
            onClick={onToggleExpandAll}
            title={allExpanded ? "Collapse all" : "Expand all"}
          >
            {allExpanded ? (
              <>
                <Minimize2 size={14} />
                Collapse All
              </>
            ) : (
              <>
                <Maximize2 size={14} />
                Expand All
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className={styles.tasksList}>
        {items.map((item) => {
          const task = item.task;
          const charges = item.charges || [];
          const taskType = item.type; // 'TASK' or 'ADHOC'

          const expanded = isExpanded(task.id);
          const selected = isSelected(task.id);
          const recoverable = calculateRecoverable(charges);
          const hasUnsavedChanges = hasChanges(task.id);
          const isSaving = savingTasks.has(task.id);

          return (
            <div
              key={task.id}
              className={`${styles.taskCard} ${expanded ? styles.expanded : ""} ${selected ? styles.selected : ""}`}
            >
              {/* Task Row (Collapsed View) */}
              <div
                className={styles.taskRow}
                onClick={() => !isSaving && onTaskExpand?.(task.id)}
                style={{ cursor: isSaving ? "not-allowed" : "pointer" }}
              >
                {showCheckboxes && (
                  <div
                    className={styles.checkboxCell}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) =>
                        onTaskSelect?.(task.id, e.target.checked)
                      }
                      disabled={isSaving}
                    />
                  </div>
                )}

                <button
                  className={styles.expandBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSaving) onTaskExpand?.(task.id);
                  }}
                  disabled={isSaving}
                >
                  {expanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>

                <div
                  className={
                    expanded ? styles.taskGridExpanded : styles.taskGrid
                  }
                >
                  {/* Task Info */}
                  <div className={styles.gridItem}>
                    <div className={styles.taskTitleRow}>
                      <h3 className={styles.taskTitle}>
                        {expanded
                          ? task.title
                          : task.title.length > 60
                            ? task.title.substring(0, 60) + "..."
                            : task.title}
                      </h3>
                      {taskType === "ADHOC" && (
                        <span className={styles.adhocBadge}>
                          <Tag size={11} />
                          AD-HOC
                        </span>
                      )}
                    </div>
                    <p className={styles.taskMeta}>
                      <Calendar size={12} />
                      {new Date(task.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Recoverable (only when collapsed) */}
                  {!expanded && (
                    <div className={`${styles.gridItem} ${styles.bordered}`}>
                      <span className={styles.itemLabel}>Recoverable</span>
                      <div className={styles.itemValue}>
                        ₹{recoverable.amount.toFixed(2)}
                        <span className={styles.itemCount}>
                          {recoverable.count}{" "}
                          {recoverable.count === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Client Info */}
                  <div
                    className={`${styles.gridItem} ${styles.bordered} ${expanded ? styles.expandedBordered : ""}`}
                  >
                    <div className={styles.clientInfo}>
                      <div className={styles.clientName}>
                        {task.entity?.name || "Unknown Client"}
                      </div>
                      <p className={styles.itemMeta}>
                        {task.entity?.email || task.entity?.pan || ""}
                      </p>
                    </div>
                  </div>

                  {/* Task Category (only when collapsed) */}
                  {!expanded && task.category && (
                    <div className={`${styles.gridItem} ${styles.bordered}`}>
                      <span className={styles.itemLabel}>Category</span>
                      <div className={styles.categoryBadge}>
                        {task.category.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Section */}
              {expanded && (
                <div className={styles.expandedSection}>
                  {/* Change indicator */}
                  {hasUnsavedChanges && (
                    <div className={styles.changeIndicator}>
                      <div className={styles.changeIndicatorLeft}>
                        <AlertCircle size={14} />
                        <span>Unsaved changes</span>
                      </div>
                      {showActions && !isReadOnly && (
                        <div className={styles.changeIndicatorRight}>
                          <button
                            className={styles.discardBtn}
                            onClick={() => onDiscardTask?.(task.id)}
                            disabled={isSaving}
                          >
                            Discard
                          </button>
                          <button
                            className={styles.saveBtn}
                            onClick={() => onSaveTask?.(task.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <Loader2
                                  size={13}
                                  className={styles.spinning}
                                />
                                Saving...
                              </>
                            ) : (
                              "Save Changes"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Charges Table */}
                  <div className={styles.chargesSection}>
                    <div className={styles.chargesHeader}>
                      <h4 className={styles.chargesTitle}>Charges</h4>
                      <div className={styles.recoverableSummary}>
                        <span className={styles.recoverableLabel}>
                          Total Recoverable:
                        </span>
                        <span className={styles.recoverableAmount}>
                          ₹{recoverable.amount.toFixed(2)}
                        </span>
                        <span className={styles.recoverableCount}>
                          {recoverable.count}{" "}
                          {recoverable.count === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </div>

                    <div className={styles.tableContainer}>
                      <table className={styles.chargesTable}>
                        <thead>
                          <tr>
                            <th className={styles.titleCol}>Title</th>
                            <th className={styles.typeCol}>Type</th>
                            <th className={styles.amountCol}>Amount</th>
                            <th className={styles.bearerCol}>Bearer</th>
                            <th className={styles.statusCol}>Status</th>
                            {showActions && !isReadOnly && (
                              <th className={styles.actionCol}>Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {charges.length === 0 ? (
                            <tr>
                              <td
                                colSpan={showActions && !isReadOnly ? 6 : 5}
                                className={styles.emptyCharges}
                              >
                                No charges added yet
                              </td>
                            </tr>
                          ) : (
                            charges.map((charge) => {
                              const edited = isChargeEdited(task.id, charge.id);
                              const deleting = deletingCharges.has(charge.id);

                              return (
                                <tr
                                  key={charge.id}
                                  className={edited ? styles.editedRow : ""}
                                >
                                  <td className={styles.titleCol}>
                                    {isReadOnly ? (
                                      <span className={styles.readOnlyText}>
                                        {charge.title}
                                      </span>
                                    ) : (
                                      <input
                                        type="text"
                                        value={getChargeValue(
                                          task.id,
                                          charge.id,
                                          "title",
                                          charge.title || "",
                                        )}
                                        onChange={(e) =>
                                          onChargeEdit?.(
                                            task.id,
                                            charge.id,
                                            "title",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Enter charge title"
                                        className={styles.inputField}
                                        disabled={deleting || isSaving}
                                      />
                                    )}
                                  </td>

                                  <td className={styles.typeCol}>
                                    {isReadOnly ? (
                                      <span className={styles.typeBadge}>
                                        {charge.charge_type}
                                      </span>
                                    ) : (
                                      <select
                                        value={getChargeValue(
                                          task.id,
                                          charge.id,
                                          "charge_type",
                                          charge.charge_type,
                                        )}
                                        onChange={(e) =>
                                          onChargeEdit?.(
                                            task.id,
                                            charge.id,
                                            "charge_type",
                                            e.target.value,
                                          )
                                        }
                                        className={styles.selectField}
                                        disabled={deleting || isSaving}
                                      >
                                        <option value="SERVICE_FEE">
                                          Service Fee
                                        </option>
                                        <option value="GOVERNMENT_FEE">
                                          Government Fee
                                        </option>
                                        <option value="EXTERNAL_CHARGE">
                                          External Charge
                                        </option>
                                        <option value="OTHER_CHARGES">
                                          Other Charges
                                        </option>
                                      </select>
                                    )}
                                  </td>

                                  <td className={styles.amountCol}>
                                    {isReadOnly ? (
                                      <span className={styles.amountText}>
                                        ₹
                                        {parseFloat(charge.amount || 0).toFixed(
                                          2,
                                        )}
                                      </span>
                                    ) : (
                                      <div className={styles.amountField}>
                                        <IndianRupee size={12} />
                                        <input
                                          type="number"
                                          value={getChargeValue(
                                            task.id,
                                            charge.id,
                                            "amount",
                                            charge.amount,
                                          )}
                                          onChange={(e) =>
                                            onChargeEdit?.(
                                              task.id,
                                              charge.id,
                                              "amount",
                                              parseFloat(e.target.value) || 0,
                                            )
                                          }
                                          placeholder="0.00"
                                          className={styles.inputField}
                                          min="0"
                                          step="0.01"
                                          disabled={deleting || isSaving}
                                        />
                                      </div>
                                    )}
                                  </td>

                                  <td className={styles.bearerCol}>
                                    {isReadOnly ? (
                                      <div className={styles.bearerBadge}>
                                        {charge.bearer === "CLIENT" ? (
                                          <User size={12} />
                                        ) : (
                                          <Building2 size={12} />
                                        )}
                                        <span>{charge.bearer}</span>
                                      </div>
                                    ) : (
                                      <div className={styles.selectContainer}>
                                        {getChargeValue(
                                          task.id,
                                          charge.id,
                                          "bearer",
                                          charge.bearer,
                                        ) === "CLIENT" && (
                                          <User
                                            size={12}
                                            className={styles.selectIcon}
                                          />
                                        )}
                                        {getChargeValue(
                                          task.id,
                                          charge.id,
                                          "bearer",
                                          charge.bearer,
                                        ) === "FIRM" && (
                                          <Building2
                                            size={12}
                                            className={styles.selectIcon}
                                          />
                                        )}
                                        <select
                                          value={getChargeValue(
                                            task.id,
                                            charge.id,
                                            "bearer",
                                            charge.bearer,
                                          )}
                                          onChange={(e) =>
                                            onChargeEdit?.(
                                              task.id,
                                              charge.id,
                                              "bearer",
                                              e.target.value,
                                            )
                                          }
                                          className={styles.selectFieldWithIcon}
                                          disabled={deleting || isSaving}
                                        >
                                          <option value="CLIENT">Client</option>
                                          <option value="FIRM">Firm</option>
                                        </select>
                                      </div>
                                    )}
                                  </td>

                                  <td className={styles.statusCol}>
                                    {isReadOnly ? (
                                      <span
                                        className={`${styles.statusBadge} ${styles[`status${charge.status}`]}`}
                                      >
                                        {charge.status.replace("_", " ")}
                                      </span>
                                    ) : (
                                      <select
                                        value={getChargeValue(
                                          task.id,
                                          charge.id,
                                          "status",
                                          charge.status,
                                        )}
                                        onChange={(e) =>
                                          onChargeEdit?.(
                                            task.id,
                                            charge.id,
                                            "status",
                                            e.target.value,
                                          )
                                        }
                                        className={`${styles.selectField} ${styles[`status${getChargeValue(task.id, charge.id, "status", charge.status)}`]}`}
                                        disabled={deleting || isSaving}
                                      >
                                        <option value="NOT_PAID">
                                          Not Paid
                                        </option>
                                        <option value="PAID">Paid</option>
                                        <option value="WRITTEN_OFF">
                                          Written Off
                                        </option>
                                        <option value="CANCELLED">
                                          Cancelled
                                        </option>
                                      </select>
                                    )}
                                  </td>

                                  {showActions && !isReadOnly && (
                                    <td className={styles.actionCol}>
                                      <button
                                        onClick={() =>
                                          onDeleteCharge?.(task.id, charge.id)
                                        }
                                        className={styles.deleteBtn}
                                        disabled={deleting || isSaving}
                                        title="Delete charge"
                                      >
                                        {deleting ? (
                                          <Loader2
                                            size={13}
                                            className={styles.spinning}
                                          />
                                        ) : (
                                          <Trash2 size={13} />
                                        )}
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
