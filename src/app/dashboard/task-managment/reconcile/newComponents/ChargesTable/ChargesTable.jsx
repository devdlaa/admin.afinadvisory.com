"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import styles from "./ChargesTable.module.scss";
import {
  Plus,
  Save,
  X,
  Trash2,
  LibraryBig,
  ChevronDown,
  Loader2,
} from "lucide-react";
import CircularProgress from "@mui/material/CircularProgress";
import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";

import { CHARGE_FIELD_CONFIGS } from "../Billingtableconfig";
import {
  selectChargeLoadingMap,
  selectChargesBulkLoading,
  selectIsMarkPaidLoading,
  selectIsMarkUnpaidLoading,
} from "@/store/slices/chargesSlice";

// ============================================
// NATIVE INPUT COMPONENT
// ============================================

const NativeInput = ({
  label,
  value,
  onChange,
  disabled,
  regex,
  errorMessage,
  className,
}) => {
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e) => {
    const newValue = e.target.value;

    if (regex && newValue !== "") {
      if (!regex.test(newValue)) {
        setError(errorMessage || "Invalid input");
        return;
      }
    }

    setError("");
    onChange(newValue);
  };

  const hasValue = value && value.toString().length > 0;

  return (
    <div className={`${styles.nativeInput} ${className || ""}`}>
      <div
        className={`${styles.inputWrapper} ${isFocused ? styles.focused : ""} ${error ? styles.error : ""} ${disabled ? styles.disabled : ""}`}
      >
        <input
          type="text"
          value={value || ""}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder=" "
          className={styles.input}
        />
        <label
          className={`${styles.label} ${hasValue || isFocused ? styles.active : ""}`}
        >
          {label}
        </label>
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

// ============================================
// NATIVE DROPDOWN COMPONENT
// ============================================

const NativeDropdown = ({
  label,
  placeholder,
  options,
  selectedValue,
  onSelect,
  disabled,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt?.value === selectedValue);
  const hasValue = !!selectedValue;

  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
    setIsFocused(false);
  };

  return (
    <div
      className={`${styles.nativeDropdown} ${className || ""}`}
      ref={dropdownRef}
    >
      <div
        className={`${styles.dropdownWrapper} ${isFocused || isOpen ? styles.focused : ""} ${disabled ? styles.disabled : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className={styles.dropdownButton}>
          <span
            className={`${styles.dropdownValue} ${!hasValue ? styles.placeholder : ""}`}
          >
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            size={18}
            className={`${styles.chevronIcon} ${isOpen ? styles.rotated : ""}`}
          />
        </div>
        <label
          className={`${styles.label} ${hasValue || isOpen ? styles.active : ""}`}
        >
          {label}
        </label>
      </div>

      {isOpen && !disabled && (
        <div className={styles.dropdownMenu}>
          {options.map((option, index) => (
            <div
              key={option?.value || index}
              className={`${styles.dropdownOption} ${option?.value === selectedValue ? styles.selected : ""}`}
              onClick={() => handleSelect(option)}
              style={{
                backgroundColor:
                  option?.value === selectedValue && option?.bgColor
                    ? option.bgColor
                    : undefined,
                color:
                  option?.value === selectedValue && option?.txtClr
                    ? option.txtClr
                    : undefined,
              }}
            >
              {option?.label}
              {option?.value === selectedValue && (
                <span className={styles.checkmark}>✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// CHARGE ROW COMPONENT (NEW - FIXES HOOKS ISSUE)
// ============================================

const ChargeRow = ({
  charge,
  isNewCharge,
  isUpdated,
  isRowSelected,
  currentData,
  isReadOnly,
  chargeLoadingMap,
  bulkLoading,
  chargesConfig,
  onToggleSelect,
  statusUpdateLoading,
  onFieldUpdate,
  onNewChargeChange,
  onCancelNewCharge,
  onDeleteCharge,
}) => {
  // NOW SAFE - hooks are at top level of component
  const isChargeLoading = charge?.id ? !!chargeLoadingMap[charge.id] : false;

  const rowClasses = [
    styles.chargeRow,
    isUpdated && styles.updated,
    isRowSelected && styles.selected,
    isNewCharge && styles.newRow,
  ]
    .filter(Boolean)
    .join(" ");

  const isRowDisabled = isChargeLoading || bulkLoading || statusUpdateLoading;

  return (
    <div className={rowClasses}>
      <div className={styles.chargeCheckbox}>
        {isNewCharge ? (
          <div className={styles.checkboxPlaceholder}></div>
        ) : (
          <input
            type="checkbox"
            checked={isRowSelected}
            onChange={() => onToggleSelect(charge.id)}
            disabled={!chargesConfig?.allowSelect || isRowDisabled}
            className={styles.checkbox}
          />
        )}
      </div>

      <div className={styles.fieldsContainer}>
        <NativeInput
          label={CHARGE_FIELD_CONFIGS.title.label}
          placeholder={CHARGE_FIELD_CONFIGS.title.placeholder}
          value={currentData.title}
          onChange={(value) => {
            if (isNewCharge) {
              onNewChargeChange("title", value);
            } else {
              onFieldUpdate(charge.id, "title", value);
            }
          }}
          disabled={isReadOnly || isRowDisabled}
        />

        <NativeDropdown
          label={CHARGE_FIELD_CONFIGS.charge_type.label}
          placeholder={CHARGE_FIELD_CONFIGS.charge_type.placeholder}
          options={CHARGE_FIELD_CONFIGS.charge_type.options}
          selectedValue={currentData.charge_type}
          onSelect={(option) => {
            if (isNewCharge) {
              onNewChargeChange("charge_type", option.value);
            } else {
              onFieldUpdate(charge.id, "charge_type", option.value);
            }
          }}
          disabled={isReadOnly || isRowDisabled}
        />

        <NativeInput
          label={CHARGE_FIELD_CONFIGS.amount.label}
          placeholder={CHARGE_FIELD_CONFIGS.amount.placeholder}
          value={currentData.amount}
          onChange={(value) => {
            if (isNewCharge) {
              onNewChargeChange("amount", Number(value));
            } else {
              onFieldUpdate(charge.id, "amount", Number(value));
            }
          }}
          disabled={isReadOnly || isRowDisabled}
          regex={CHARGE_FIELD_CONFIGS.amount.validation.regex}
          errorMessage={CHARGE_FIELD_CONFIGS.amount.validation.errorMessage}
        />

        <NativeDropdown
          label={CHARGE_FIELD_CONFIGS.status.label}
          placeholder={CHARGE_FIELD_CONFIGS.status.placeholder}
          options={CHARGE_FIELD_CONFIGS.status.options}
          selectedValue={currentData.status}
          onSelect={(option) => {
            if (isNewCharge) {
              onNewChargeChange("status", option.value);
            } else {
              onFieldUpdate(charge.id, "status", option.value);
            }
          }}
          disabled={isReadOnly || isRowDisabled}
        />
      </div>

      <div className={styles.chargeActions}>
        {isChargeLoading ? (
          <CircularProgress size={18} />
        ) : isNewCharge ? (
          <button
            className={styles.removeButton}
            onClick={onCancelNewCharge}
            title="Cancel"
            disabled={bulkLoading}
          >
            <X size={18} />
          </button>
        ) : (
          <button
            className={styles.deleteButton}
            onClick={() => onDeleteCharge(charge.id)}
            disabled={!chargesConfig?.allowDelete || isRowDisabled}
            title="Delete charge"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================
// CHARGES TABLE COMPONENT
// ============================================

const ChargesTable = ({ charges = [], taskId, data, config }) => {
  const [localCharges, setLocalCharges] = useState(charges);
  const [selectedCharges, setSelectedCharges] = useState(new Set());
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [updatedRows, setUpdatedRows] = useState(new Map());
  const [newCharge, setNewCharge] = useState({
    title: "",
    charge_type: "SERVICE_FEE",
    amount: 0,
    status: "NOT_PAID",
  });

  const [infoDialog, setInfoDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  // Redux loading states - MOVED TO TOP LEVEL
  const chargeLoadingMap = useSelector(selectChargeLoadingMap);
  const bulkLoading = useSelector(selectChargesBulkLoading);
  const isMarkPaidLoading = useSelector(selectIsMarkPaidLoading);
  const isMarkUnpaidLoading = useSelector(selectIsMarkUnpaidLoading);

  // handy derived flag for places that just need "any status update"
  const isAnyStatusUpdating = isMarkPaidLoading || isMarkUnpaidLoading;

  const showInfoDialog = (title, message) => {
    setInfoDialog({
      isOpen: true,
      title,
      message,
    });
  };

  const closeInfoDialog = () => {
    setInfoDialog({
      isOpen: false,
      title: "",
      message: "",
    });
  };

  useEffect(() => {
    setLocalCharges(charges);
  }, [charges]);

  // Get charges table config from main config
  const chargesConfig = useMemo(
    () =>
      config?.getChargesTableConfig ? config.getChargesTableConfig(data) : {},
    [config, data],
  );

  const hasUpdates = updatedRows.size > 0;
  const hasSelection = selectedCharges.size > 0;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFieldUpdate = (chargeId, field, value) => {
    if (!chargesConfig?.allowEdit) return;

    const newUpdated = new Map(updatedRows);
    const existingUpdate = newUpdated.get(chargeId) || {};
    newUpdated.set(chargeId, { ...existingUpdate, [field]: value });
    setUpdatedRows(newUpdated);

    setLocalCharges(
      localCharges.map((charge) =>
        charge?.id === chargeId ? { ...charge, [field]: value } : charge,
      ),
    );
  };

  const handleNewChargeChange = (field, value) => {
    setNewCharge({ ...newCharge, [field]: value });
  };

  const handleAddNewCharge = () => {
    if (!chargesConfig?.allowAdd) return;
    setIsAddingNew(true);
  };

  const handleCancelNewCharge = () => {
    setIsAddingNew(false);
    setNewCharge({
      title: "",
      charge_type: "SERVICE_FEE",
      amount: 0,
      status: "NOT_PAID",
    });
  };

  const handleSaveNewCharge = async () => {
    if (!chargesConfig?.handlers?.onAdd) return;

    // Validate
    if (!newCharge.title?.trim()) {
      showInfoDialog(
        "Missing Charge Title",
        "Please enter a title for the charge before saving.",
      );
      return;
    }
    if (!newCharge.amount || parseFloat(newCharge.amount) <= 0) {
      showInfoDialog(
        "Invalid Charge Amount",
        "Valid amount greater than 0 is required",
      );
      return;
    }

    try {
      await chargesConfig.handlers.onAdd(taskId, newCharge);
      setNewCharge({
        title: "",
        charge_type: "SERVICE_FEE",
        amount: 0,
        status: "NOT_PAID",
      });
      setIsAddingNew(false);
    } catch (error) {
      console.log("Failed to save new charge:");
    }
  };

  const handleSaveUpdates = async () => {
    if (!chargesConfig?.handlers?.onUpdate) return;

    const updates = Array.from(updatedRows.entries()).map(
      ([chargeId, updates]) => ({
        id: chargeId,
        fields: updates,
      }),
    );

    try {
      await chargesConfig.handlers.onUpdate(taskId, updates);
      setUpdatedRows(new Map());
    } catch (error) {
      console.log("Failed to save updates:", error);
    }
  };

  const handleCancelUpdates = () => {
    setUpdatedRows(new Map());
    setLocalCharges(charges);
  };

  const handleDeleteCharge = async (chargeId) => {
    if (!chargesConfig?.allowDelete) return;

    // Removed alert - using confirmation dialog instead if needed
    try {
      if (chargesConfig.handlers?.onDelete) {
        await chargesConfig.handlers.onDelete(taskId, chargeId);
      }
    } catch (error) {
      console.log("Failed to delete charge:", error);
    }
  };

  const handleToggleSelect = (chargeId) => {
    if (!chargesConfig?.allowSelect) return;

    const newSelected = new Set(selectedCharges);
    if (newSelected.has(chargeId)) {
      newSelected.delete(chargeId);
    } else {
      newSelected.add(chargeId);
    }
    setSelectedCharges(newSelected);
  };

  const handleSelectAll = (checked) => {
    if (!chargesConfig?.allowSelect) return;

    if (checked) {
      setSelectedCharges(
        new Set(localCharges.map((c) => c?.id).filter(Boolean)),
      );
    } else {
      setSelectedCharges(new Set());
    }
  };

  const handleMarkStatus = async (status) => {
    if (!chargesConfig?.allowStatusChange) return;

    try {
      if (chargesConfig.handlers?.onUpdateStatus) {
        await chargesConfig.handlers.onUpdateStatus(
          taskId,
          Array.from(selectedCharges),
          status,
        );
      }
      setSelectedCharges(new Set());
    } catch (error) {
      console.log("Failed to update status:");
    }
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderHeaderButtons = () => {
    if (hasUpdates) {
      return (
        <>
          {!bulkLoading && (
            <button
              className={styles.cancelButton}
              onClick={handleCancelUpdates}
              disabled={bulkLoading}
            >
              Cancel Updates
            </button>
          )}

          <button
            className={styles.saveButton}
            onClick={handleSaveUpdates}
            disabled={bulkLoading}
          >
            {bulkLoading ? (
              <>
                <Loader2 size={16} className="spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Updates
              </>
            )}
          </button>
        </>
      );
    }

    if (hasSelection && chargesConfig?.allowStatusChange) {
      return (
        <>
          <button
            className={styles.statusButton}
            onClick={() => handleMarkStatus("PAID")}
            disabled={isMarkPaidLoading}
          >
            {isMarkPaidLoading ? (
              <>
                <Loader2 size={16} className="spin" />
                Marking Paid...
              </>
            ) : (
              "Mark as Paid"
            )}
          </button>
          <button
            className={styles.statusButton}
            onClick={() => handleMarkStatus("NOT_PAID")}
            disabled={isMarkUnpaidLoading}
          >
            {isMarkUnpaidLoading ? (
              <>
                <Loader2 size={16} className="spin" />
                Marking Unpaid...
              </>
            ) : (
              "Mark as Unpaid"
            )}
          </button>
        </>
      );
    }

    if (isAddingNew) {
      return (
        <>
          <button
            className={styles.cancelButton}
            onClick={handleCancelNewCharge}
            disabled={bulkLoading}
          >
            Cancel
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSaveNewCharge}
            disabled={bulkLoading}
          >
            {bulkLoading ? (
              <>
                <Loader2 size={16} className="spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save New Charge
              </>
            )}
          </button>
        </>
      );
    }

    if (chargesConfig?.allowAdd) {
      return (
        <button
          className={styles.addButton}
          onClick={handleAddNewCharge}
          disabled={bulkLoading || isAnyStatusUpdating}
        >
          <Plus size={16} />
          Add New Charge
        </button>
      );
    }

    return null;
  };

  // ============================================================================
  // EMPTY STATE
  // ============================================================================

  if (localCharges.length === 0 && !isAddingNew) {
    return (
      <div className={styles.chargesTable}>
        <div className={styles.chargesHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.chargeCount}>0 Items</span>
          </div>
          <div className={styles.headerRight}>
            {chargesConfig?.emptyState?.showAddButton && (
              <button
                className={styles.addButton}
                onClick={handleAddNewCharge}
                disabled={bulkLoading}
              >
                <Plus size={16} />
                Add New Charge
              </button>
            )}
          </div>
        </div>
        <div className={styles.emptyCharges}>
          <LibraryBig size={54} strokeWidth={0.8} color="grey" />
          <p className={styles.emptyText}>
            {chargesConfig?.emptyState?.title || "No charges"}
          </p>
          <p className={styles.emptySubtext}>
            {chargesConfig?.emptyState?.subtitle ||
              "Add a charge to get started"}
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN TABLE RENDER
  // ============================================================================

  return (
    <div className={styles.chargesTable}>
      <ConfirmationDialog
        isOpen={infoDialog.isOpen}
        onClose={closeInfoDialog}
        onCancel={closeInfoDialog}
        actionName={infoDialog.title}
        actionInfo={infoDialog.message}
        confirmText="OK"
        variant="default"
        onConfirm={closeInfoDialog}
      />

      <div className={styles.chargesHeader}>
        <div className={styles.headerLeft}>
          {hasUpdates ? (
            <span className={styles.updatesText}>
              {updatedRows.size} rows have unsaved updates
            </span>
          ) : (
            <div className={styles.selectionInfo}>
              <input
                type="checkbox"
                checked={
                  selectedCharges.size === localCharges.length &&
                  localCharges.length > 0
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                className={styles.checkbox}
                disabled={
                  !chargesConfig?.allowSelect ||
                  isAddingNew ||
                  bulkLoading ||
                  isAnyStatusUpdating
                }
              />
              <span className={styles.chargeCount}>
                {hasSelection
                  ? `${selectedCharges.size} Items Selected`
                  : `${localCharges.length} Items`}
              </span>
            </div>
          )}
        </div>
        <div className={styles.headerRight}>{renderHeaderButtons()}</div>
      </div>

      <div className={styles.chargesScrollContainer}>
        <div className={styles.chargesGrid}>
          {/* NEW CHARGE ROW AT THE TOP */}
          {isAddingNew && (
            <ChargeRow
              charge={null}
              isNewCharge={true}
              isUpdated={false}
              isRowSelected={false}
              currentData={newCharge}
              isReadOnly={!chargesConfig?.allowEdit}
              chargeLoadingMap={chargeLoadingMap}
              bulkLoading={bulkLoading}
              statusUpdateLoading={isAnyStatusUpdating}
              chargesConfig={chargesConfig}
              onToggleSelect={handleToggleSelect}
              onFieldUpdate={handleFieldUpdate}
              onNewChargeChange={handleNewChargeChange}
              onCancelNewCharge={handleCancelNewCharge}
              onDeleteCharge={handleDeleteCharge}
            />
          )}

          {/* EXISTING CHARGES BELOW */}
          {localCharges.map((charge) => {
            if (!charge) return null;

            const isUpdated = updatedRows.has(charge.id);
            const isRowSelected = selectedCharges.has(charge.id);
            const currentData = {
              ...charge,
              ...(updatedRows.get(charge.id) || {}),
            };

            return (
              <ChargeRow
                key={charge.id}
                charge={charge}
                isNewCharge={false}
                isUpdated={isUpdated}
                isRowSelected={isRowSelected}
                currentData={currentData}
                isReadOnly={!chargesConfig?.allowEdit}
                chargeLoadingMap={chargeLoadingMap}
                bulkLoading={bulkLoading}
                statusUpdateLoading={isAnyStatusUpdating}
                chargesConfig={chargesConfig}
                onToggleSelect={handleToggleSelect}
                onFieldUpdate={handleFieldUpdate}
                onNewChargeChange={handleNewChargeChange}
                onCancelNewCharge={handleCancelNewCharge}
                onDeleteCharge={handleDeleteCharge}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChargesTable;
