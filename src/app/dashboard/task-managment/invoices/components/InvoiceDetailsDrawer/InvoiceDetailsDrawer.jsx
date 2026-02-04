"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";

import {
  fetchInvoiceDetails,
  selectSelectedInvoice,
  selectInvoiceLoading,
  selectInvoiceError,
  clearSelectedInvoice,
} from "@/store/slices/invoiceSlice";

import FilterDropdown from "@/app/components/pages/FilterDropdown/FilterDropdown";
import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";
import BillingTable from "../../../reconcile/newComponents/BillingTable/BillingTable";
import { createInvoiceLinkedConfig } from "../../../reconcile/newComponents/Billingtableconfig";
import CopyButton from "@/app/components/shared/newui/CopyButton/CopyButton";
import DocumentManager from "@/app/components/shared/DocumentManager/DocumentManager";

import { formatDate } from "@/utils/client/cutils";
import styles from "./InvoiceDetailsDrawer.module.scss";
import {
  Hash,
  Calendar,
  Send,
  CheckCircle,
  Landmark,
  Mail,
  Phone,
  HashIcon,
  ListCheckIcon,
  ArchiveRestore,
} from "lucide-react";

// ============================================================================
// CONSTANTS
// ============================================================================
const STATUS_TRANSITIONS = {
  DRAFT: ["ISSUED", "CANCELLED"],
  ISSUED: ["DRAFT", "PAID", "CANCELLED"],
  PAID: ["DRAFT", "CANCELLED"],
  CANCELLED: ["DRAFT"],
};

const STATUS_CLASSES = {
  DRAFT: styles.statusDraft,
  ISSUED: styles.statusIssued,
  PAID: styles.statusPaid,
  CANCELLED: styles.statusCancelled,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const analyzeTasksForIssuing = (groups) => {
  if (!Array.isArray(groups) || groups.length === 0) {
    return {
      hasIssues: false,
      fullyPaidTasks: [],
      emptyTasks: [],
      totalIssues: 0,
    };
  }

  const fullyPaidTasks = [];
  const emptyTasks = [];

  groups.forEach((group) => {
    const charges = group.charges || [];

    if (charges.length === 0) {
      emptyTasks.push({
        id: group.id,
        title: group.title,
        reason: "No charges attached",
      });
      return;
    }

    const allChargesPaid = charges.every((charge) => charge.status === "PAID");
    if (allChargesPaid) {
      fullyPaidTasks.push({
        id: group.id,
        title: group.title,
        chargeCount: charges.length,
        reason: "All charges are paid",
      });
    }
  });

  return {
    hasIssues: fullyPaidTasks.length > 0 || emptyTasks.length > 0,
    fullyPaidTasks,
    emptyTasks,
    totalIssues: fullyPaidTasks.length + emptyTasks.length,
  };
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const InfoField = React.memo(
  ({
    label,
    icon: Icon,
    value,
    isEditable,
    field,
    isRequired,
    editForm,
    validationErrors,
    isEditingInfo,
    companyProfileOptions,
    companyProfilesLoading,
    onInputChange,
    styles,
  }) => (
    <div className={styles.infoField}>
      <label>
        {label}
        {isRequired && <span className={styles.required}> *</span>}
      </label>

      {isEditingInfo && isEditable ? (
        field === "company_profile_id" ? (
          <div>
            <FilterDropdown
              icon={Landmark}
              options={companyProfileOptions}
              selectedValue={editForm.company_profile_id}
              onSelect={(selected) =>
                onInputChange("company_profile_id", selected.value)
              }
              placeholder="Select company profile"
              isLoading={companyProfilesLoading}
              searchable
              className={`${styles.company_profile_override} ${
                validationErrors.company_profile_id ? styles.inputError : ""
              }`}
            />
            {validationErrors.company_profile_id && (
              <div className={styles.fieldError}>
                {validationErrors.company_profile_id}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className={styles.inputWrapper}>
              <Icon size={16} className={styles.fieldIcon} />
              <input
                type="text"
                value={editForm[field] || ""}
                onChange={(e) => onInputChange(field, e.target.value)}
                className={`${styles.inputField} ${
                  validationErrors[field] ? styles.inputError : ""
                }`}
                placeholder={label}
              />
            </div>
            {validationErrors[field] && (
              <div className={styles.fieldError}>{validationErrors[field]}</div>
            )}
          </div>
        )
      ) : (
        <div className={styles.inputWrapper}>
          <Icon size={16} className={styles.fieldIcon} />
          <div className={styles.readOnlyValue}>{value || "N/A"}</div>
        </div>
      )}
    </div>
  )
);

InfoField.displayName = "InfoField";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const InvoiceDetailsDrawer = ({
  isOpen,
  onClose,
  invoiceId,
  companyProfiles,
  companyProfilesLoading,
  handlers, // Centralized handlers from parent
}) => {
  const dispatch = useDispatch();

  // ============================================================================
  // REDUX SELECTORS
  // ============================================================================
  const selectedInvoice = useSelector(selectSelectedInvoice);
  const loading = useSelector(selectInvoiceLoading);
  const error = useSelector(selectInvoiceError);

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  // Form state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState({
    external_number: "",
    notes: "",
    company_profile_id: "",
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [invoiceNumberRequired, setInvoiceNumberRequired] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState("CHARGES");
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());

  // Pre-issue validation state
  const [hasIgnoredValidation, setHasIgnoredValidation] = useState(false);

  // Confirmation dialog state
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    type: null,
    data: null,
  });

  // ============================================================================
  // DERIVED STATE
  // ============================================================================
  const invoice = selectedInvoice?.invoice;
  const entity = selectedInvoice?.entity;
  const companyProfile = selectedInvoice?.company_profile;
  const groups = selectedInvoice?.groups || [];

  const isDraft = invoice?.status === "DRAFT";
  const isIssued = invoice?.status === "ISSUED";

  const availableTransitions = invoice
    ? STATUS_TRANSITIONS[invoice.status] || []
    : [];

  const canEditCompanyProfile = isDraft;
  const canEditExternalNumber =
    isDraft || (isIssued && !invoice?.external_number);
  const canEditNotes = isDraft;
  const canEdit =
    canEditCompanyProfile || canEditExternalNumber || canEditNotes;

  const companyProfileOptions = useMemo(
    () =>
      companyProfiles.map((profile) => ({
        value: profile.id,
        label: profile.name,
      })),
    [companyProfiles]
  );

  // ============================================================================
  // LIFECYCLE EFFECTS - Optimized
  // ============================================================================

  // Fetch invoice details when drawer opens
  useEffect(() => {
    if (!isOpen || !invoiceId) return;

    if (typeof invoiceId !== "string" || invoiceId.length < 5) {
      console.error("Invalid invoice ID:", invoiceId);
      return;
    }

    dispatch(fetchInvoiceDetails(invoiceId));
  }, [isOpen, invoiceId, dispatch]);

  // Reset all state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      dispatch(clearSelectedInvoice());
      setIsEditingInfo(false);
      setValidationErrors({});
      setInvoiceNumberRequired(false);
      setSelectedTaskIds([]);
      setExpandedTaskIds(new Set());
      setHasIgnoredValidation(false);
      setConfirmationState({
        isOpen: false,
        type: null,
        data: null,
      });
      setActiveTab("CHARGES");
    }
  }, [isOpen, dispatch]);

  // Initialize edit form when invoice loads
  useEffect(() => {
    if (invoice) {
      setEditForm({
        external_number: invoice.external_number || "",
        notes: invoice.notes || "",
        company_profile_id: invoice.company_profile_id || "",
      });
    }
  }, [invoice]);

  // ============================================================================
  // CONFIRMATION DIALOG CONFIGURATION
  // ============================================================================
  const getConfirmationConfig = useCallback(() => {
    const { type, data } = confirmationState;

    switch (type) {
      case "statusChange":
        const status = data?.status;
        const currentStatus = invoice?.status;

        switch (status) {
          case "CANCELLED":
            return {
              actionName: "Cancel Invoice",
              actionInfo:
                "This invoice will be marked as cancelled. You can revert it to draft later if needed.",
              confirmText: "Cancel Invoice",
              variant: "danger",
            };

          case "DRAFT":
            if (currentStatus === "PAID") {
              return {
                actionName: "Revert Paid Invoice to Draft",
                actionInfo:
                  "This will change a paid invoice back to draft status. Please ensure this is intentional as it may affect your records.",
                confirmText: "Revert to Draft",
                variant: "warning",
              };
            }
            if (currentStatus === "ISSUED") {
              return {
                actionName: "Revert to Draft",
                actionInfo:
                  "This invoice will be moved back to draft status and can be edited again.",
                confirmText: "Revert to Draft",
                variant: "warning",
              };
            }
            return {
              actionName: "Revert to Draft",
              actionInfo: "This invoice will be moved back to draft status.",
              confirmText: "Revert to Draft",
              variant: "default",
            };

          case "PAID":
            return {
              actionName: "Mark as Paid",
              actionInfo:
                "This will mark the invoice as paid. Make sure payment has been received before proceeding.",
              confirmText: "Mark as Paid",
              variant: "default",
            };

          case "ISSUED":
            return {
              actionName: "Issue Invoice",
              actionInfo:
                "This will mark the invoice as issued and ready to send to the client. Make sure all details are correct.",
              confirmText: "Issue Invoice",
              variant: "default",
            };

          default:
            return {
              actionName: `Change Status to ${status}`,
              actionInfo: `Are you sure you want to change the invoice status to ${status}?`,
              confirmText: "Confirm",
              variant: "default",
            };
        }

      case "unlinkTasks":
        const count = data?.taskIds?.length || 0;
        return {
          actionName: "Unlink Tasks from Invoice",
          actionInfo: `Are you sure you want to unlink ${count} task${count !== 1 ? "s" : ""} from this invoice? ${count !== 1 ? "They" : "It"} will be moved back to unreconciled.`,
          confirmText: "Unlink Tasks",
          variant: "warning",
        };

      case "deleteCharge":
        return {
          actionName: "Delete Charge",
          actionInfo:
            "Are you sure you want to delete this charge? This action cannot be undone.",
          confirmText: "Delete Charge",
          variant: "danger",
        };

      case "deleteAdHoc":
        return {
          actionName: "Delete Ad-hoc Task",
          actionInfo:
            "This will permanently delete the ad-hoc task and its charge. This action cannot be undone.",
          confirmText: "Delete Permanently",
          variant: "danger",
        };

      case "unlinkAdHoc":
        return {
          actionName: "Unlink Ad-hoc Task",
          actionInfo:
            "This will unlink the ad-hoc task from this invoice. The task will be moved back to unreconciled.",
          confirmText: "Unlink Task",
          variant: "warning",
        };

      case "invoiceNumberRequired":
        return {
          actionName: "Invoice Number Required",
          actionInfo:
            "Please enter an invoice number before issuing the invoice. Click 'Edit Invoice' above to add one.",
          confirmText: "OK",
          variant: "warning",
          hideCancel: true,
        };

      case "noTasksLinked":
        return {
          actionName: "No Tasks Linked",
          actionInfo:
            "This invoice has no tasks linked to it. You must either link charges to this invoice or cancel it.",
          confirmText: "OK",
          variant: "warning",
          hideCancel: true,
        };

      case "tasksNeedingAttention":
        const { fullyPaidTasks, emptyTasks, totalIssues } = data;
        const taskList = [];

        if (emptyTasks && emptyTasks.length > 0) {
          emptyTasks.forEach((task) => {
            taskList.push(`• ${task.title} (${task.reason})`);
          });
        }

        if (fullyPaidTasks && fullyPaidTasks.length > 0) {
          fullyPaidTasks.forEach((task) => {
            taskList.push(
              `• ${task.title} (${task.chargeCount} ${task.chargeCount === 1 ? "charge" : "charges"} - ${task.reason})`
            );
          });
        }

        return {
          actionName: "Tasks Requiring Attention",
          actionInfo: `${totalIssues} task${totalIssues !== 1 ? "s" : ""} ${totalIssues !== 1 ? "have" : "has"} issues that should be resolved before issuing:

${taskList.join("\n")}

These tasks can be unlinked using the multi-select feature in the table below. Would you like to proceed with issuing anyway, or handle these tasks first?`,
          confirmText: "Ignore and Issue",
          cancelText: "I'll Handle It",
          variant: "warning",
        };

      default:
        return {
          actionName: "Confirm Action",
          actionInfo: "Are you sure you want to proceed?",
          confirmText: "Confirm",
          variant: "default",
        };
    }
  }, [confirmationState, invoice]);

  // ============================================================================
  // CONFIRMATION DIALOG HANDLERS
  // ============================================================================
  const closeConfirmation = useCallback(() => {
    setConfirmationState({
      isOpen: false,
      type: null,
      data: null,
    });
  }, []);

  const executeConfirmation = useCallback(async () => {
    const { type, data } = confirmationState;

    try {
      switch (type) {
        case "statusChange":
          if (data.status === "CANCELLED") {
            await handlers.onCancelInvoice(invoice.id);
          } else {
            await handlers.onUpdateInvoiceStatus(invoice.id, data.status);
          }
          break;

        case "unlinkTasks":
          await handlers.onUnlinkTasks(invoice.id,data.taskIds);
          setSelectedTaskIds([]);
          break;

        case "deleteCharge":
          await handlers.onDeleteCharge(data.taskId, data.chargeId);
          break;

        case "deleteAdHoc":
          await handlers.onDeleteAdHoc(data.taskId);
          break;

        case "unlinkAdHoc":
          await handlers.onUnlinkTasks(invoice.id,[data.taskId]);
          break;

        case "tasksNeedingAttention":
          setHasIgnoredValidation(true);
          handleStatusChange("ISSUED");
          break;

        default:
          console.warn(`Unhandled confirmation type: ${type}`);
      }

      closeConfirmation();
    } catch (err) {
      console.error(`Failed to ${type}:`, err);
      closeConfirmation();
    }
  }, [confirmationState, invoice, handlers, closeConfirmation]);

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================
  const handleInputChange = useCallback((field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));

    setValidationErrors((prev) => {
      if (prev[field]) {
        const { [field]: removed, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  const validateForm = useCallback(() => {
    const errors = {};

    if (!editForm.company_profile_id) {
      errors.company_profile_id = "Company profile is required";
    }

    if (invoiceNumberRequired && !editForm.external_number.trim()) {
      errors.external_number = "Invoice number is required before issuing";
    }

    return errors;
  }, [editForm, invoiceNumberRequired]);

  const handleSaveInfo = useCallback(async () => {
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await handlers.onUpdateInvoiceInfo(invoice.id, editForm);

      setIsEditingInfo(false);
      setValidationErrors({});
      setInvoiceNumberRequired(false);
    } catch (err) {
      console.error("Failed to update invoice info:", err);
      setValidationErrors({
        general: err?.message || "Failed to update invoice information",
      });
    }
  }, [validateForm, handlers, invoice, editForm]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingInfo(false);
    setValidationErrors({});
    setInvoiceNumberRequired(false);

    if (invoice) {
      setEditForm({
        external_number: invoice.external_number || "",
        notes: invoice.notes || "",
        company_profile_id: invoice.company_profile_id || "",
      });
    }
  }, [invoice]);

  // ============================================================================
  // STATUS CHANGE HANDLER WITH PRE-ISSUE VALIDATION
  // ============================================================================
  const handleStatusChange = useCallback(
    (status) => {
      // VALIDATION 1: Invoice Number Required
      if (status === "ISSUED" && !editForm.external_number.trim()) {
        setConfirmationState({
          isOpen: true,
          type: "invoiceNumberRequired",
          data: {},
        });
        setIsEditingInfo(true);
        setInvoiceNumberRequired(true);
        setValidationErrors({
          external_number: "Invoice number is required before issuing",
        });
        return;
      }

      // VALIDATION 2: No Tasks Linked
      if (status === "ISSUED" && groups.length === 0) {
        setConfirmationState({
          isOpen: true,
          type: "noTasksLinked",
          data: {},
        });
        return;
      }

      // VALIDATION 3: Tasks Needing Attention (if not ignored)
      if (status === "ISSUED" && !hasIgnoredValidation) {
        const analysis = analyzeTasksForIssuing(groups);

        if (analysis.hasIssues) {
          setConfirmationState({
            isOpen: true,
            type: "tasksNeedingAttention",
            data: analysis,
          });
          return;
        }
      }

      // Reset validation flag after successful issue
      if (status === "ISSUED" && hasIgnoredValidation) {
        setHasIgnoredValidation(false);
      }

      // PROCEED WITH STATUS CHANGE
      const criticalActions = ["CANCELLED", "PAID"];
      const fromPaidToDraft = status === "DRAFT" && invoice?.status === "PAID";

      if (criticalActions.includes(status) || fromPaidToDraft) {
        setConfirmationState({
          isOpen: true,
          type: "statusChange",
          data: { status },
        });
      } else {
        handlers.onUpdateInvoiceStatus(invoice.id, status);
      }
    },
    [editForm.external_number, groups, hasIgnoredValidation, invoice, handlers]
  );

  // ============================================================================
  // BILLING TABLE HANDLERS
  // ============================================================================
  const handleToggleExpand = useCallback((taskId) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandedTaskIds((prev) => {
      if (!groups.length) return new Set();
      const allTaskIds = groups.map((g) => g.id);
      return prev.size > 0 ? new Set() : new Set(allTaskIds);
    });
  }, [groups]);

  const handleToggleTask = useCallback((task) => {
    setSelectedTaskIds((prev) => {
      const isSelected = prev.includes(task.id);
      return isSelected
        ? prev.filter((id) => id !== task.id)
        : [...prev, task.id];
    });
  }, []);

  const handleUnlinkFromInvoice = useCallback(
    (selectedTasks) => {
      if (!invoice?.id || !selectedTasks || selectedTasks.length === 0) {
        console.error("Invalid parameters for unlinking tasks");
        return;
      }

      const taskIds = selectedTasks.map((t) => t.id);

      setConfirmationState({
        isOpen: true,
        type: "unlinkTasks",
        data: { taskIds },
      });
    },
    [invoice?.id]
  );

  const handleUnlinkAdhocTask = useCallback((taskId) => {
    setConfirmationState({
      isOpen: true,
      type: "unlinkAdHoc",
      data: { taskId },
    });
  }, []);

  const handleDeleteAdhocTask = useCallback((taskId) => {
    setConfirmationState({
      isOpen: true,
      type: "deleteAdHoc",
      data: { taskId },
    });
  }, []);

  const handleDeleteCharge = useCallback((taskId, chargeId) => {
    setConfirmationState({
      isOpen: true,
      type: "deleteCharge",
      data: { taskId, chargeId },
    });
  }, []);

  const handleLinkMoreCharges = useCallback(() => {
    const entityId = selectedInvoice?.entity?.id;
    const internalNumber = selectedInvoice?.invoice?.internal_number;

    if (!entityId || !internalNumber) {
      console.error("Missing entity ID or invoice number");
      return;
    }

    const params = new URLSearchParams({
      tab: "unreconciled",
      entity_id: entityId,
      internal_number: internalNumber,
      task_status: "COMPLETED",
    });

    window.open(
      `/dashboard/task-managment/reconcile?${params.toString()}`,
      "_blank"
    );
  }, [selectedInvoice]);

  const handleRemoveSelection = useCallback(() => {
    setSelectedTaskIds([]);
  }, []);

  // ============================================================================
  // BILLING TABLE CONFIG
  // ============================================================================
  const tableConfig = useMemo(() => {
    if (!invoice) return null;

    return createInvoiceLinkedConfig(invoice.id, invoice.status, {
      onToggleExpandAll: handleExpandAll,
      onUnlinkFromInvoice: handleUnlinkFromInvoice,
      onLinkMoreCharges: handleLinkMoreCharges,
      onRemoveSelection: handleRemoveSelection,
      onAddCharge: handlers.onAddCharge,
      onUpdateCharges: handlers.onUpdateCharges,
      onDeleteCharge: handleDeleteCharge,
      onUpdateChargeStatus: handlers.onUpdateChargeStatus,
      onDeleteSystemTask: handleDeleteAdhocTask,
      onUnlinkSystemTask: handleUnlinkAdhocTask,
    });
  }, [
    invoice,
    handleExpandAll,
    handleUnlinkFromInvoice,
    handleLinkMoreCharges,
    handleRemoveSelection,
    handlers,
    handleDeleteCharge,
    handleDeleteAdhocTask,
    handleUnlinkAdhocTask,
  ]);

  // Transform groups into billing table data format
  const billingTableData = useMemo(() => {
    return groups.map((group) => ({
      task: {
        id: group.id,
        title: group.title,
        status: group.status,
        category: group.category,
        entity,
        is_system: group.is_system,
        type: group.task_type,
      },
      charges: group.charges || [],
    }));
  }, [groups, entity]);

  // Get confirmation config
  const confirmationConfig = getConfirmationConfig();

  // ============================================================================
  // RENDER
  // ============================================================================
  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />

      <div className={styles.drawer}>
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.titleSection}>
              <h2 className={styles.title}>Invoice Details</h2>
              {invoice && (
                <span
                  className={`${styles.statusBadge} ${
                    STATUS_CLASSES[invoice.status] || styles.statusDefault
                  }`}
                >
                  {invoice.status}
                </span>
              )}
            </div>
            {invoice && (
              <span className={styles.internalId}>
                <span>
                  <HashIcon size={16} color="grey" />
                  {invoice.internal_number}
                </span>
                <CopyButton
                  rootClass={styles.cp_button}
                  size="small"
                  value={invoice.internal_number}
                />
              </span>
            )}
          </div>

          <div className={styles.sectionHeader}>
            {!isEditingInfo && canEdit && (
              <button
                onClick={() => setIsEditingInfo(true)}
                className={styles.editButton}
                disabled={loading.updateStatus}
              >
                Edit Invoice
              </button>
            )}

            {isEditingInfo && (
              <div className={styles.editActions}>
                <button
                  onClick={handleSaveInfo}
                  className={styles.saveButton}
                  disabled={loading.updateInfo}
                >
                  {loading.updateInfo ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className={styles.cancelButton}
                  disabled={loading.updateInfo}
                >
                  Cancel
                </button>
              </div>
            )}

            {!isEditingInfo && availableTransitions.length > 0 && (
              <div className={styles.statusActions}>
                {availableTransitions.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`${styles.statusButton} ${
                      styles[`statusButton${status}`]
                    }`}
                    disabled={loading.updateStatus || loading.updateInfo}
                  >
                    {loading.updateStatus
                      ? "Processing..."
                      : `Mark as ${status}`}
                  </button>
                ))}
              </div>
            )}

            <button className={styles.closeButton} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className={styles.content}>
          {loading.details ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Loading invoice details...</p>
            </div>
          ) : error.details ? (
            <div className={styles.errorState}>
              <p>Error: {error.details}</p>
              <button
                onClick={() => dispatch(fetchInvoiceDetails(invoiceId))}
                className={styles.retryButton}
              >
                Retry
              </button>
            </div>
          ) : invoice ? (
            <>
              {validationErrors.general && (
                <div className={styles.errorMessage}>
                  {validationErrors.general}
                </div>
              )}

              <section className={styles.invoice_drawr_layout}>
                {/* LEFT SECTION: BILLING TABLE */}
                <div className={styles.lowerSection}>
                  <div className={styles.tabs}>
                    <button
                      className={`${styles.tab} ${
                        activeTab === "CHARGES" ? styles.active : ""
                      }`}
                      onClick={() => setActiveTab("CHARGES")}
                    >
                      <ListCheckIcon size={16} />
                      Linked Tasks
                    </button>

                    <button
                      className={`${styles.tab} ${
                        activeTab === "DOCUMENTS" ? styles.active : ""
                      }`}
                      onClick={() => setActiveTab("DOCUMENTS")}
                    >
                      <ArchiveRestore size={16} />
                      Documents & Invoices
                    </button>
                  </div>

                  {activeTab === "CHARGES" && tableConfig && (
                    <BillingTable
                      config={tableConfig}
                      data={billingTableData}
                      selectedTaskIds={selectedTaskIds}
                      expandedTaskIds={expandedTaskIds}
                      onToggleTask={handleToggleTask}
                      onToggleExpand={handleToggleExpand}
                      onExpandAll={handleExpandAll}
                      inInvoiceView={true}
                    />
                  )}

                  {activeTab === "DOCUMENTS" && (
                    <DocumentManager scope="INVOICE" scopeId={invoice.id} />
                  )}
                </div>

                {/* RIGHT SECTION: INVOICE INFO */}
                <div className={styles.upperSection}>
                  {/* Client Info Card */}
                  {entity && (
                    <div className={styles.clientInfoCard}>
                      <div className={styles.clientHeader}>
                        <div>
                          <h3 className={styles.clientName}>{entity.name}</h3>
                          <span className={styles.clientType}>
                            {entity.entity_type || "INDIVIDUAL"}
                          </span>
                        </div>
                        <span className={styles.activeStatus}>ACTIVE</span>
                      </div>

                      <div className={styles.clientDetails}>
                        {entity.email && (
                          <div className={styles.clientDetailItem}>
                            <Mail size={16} className={styles.detailIcon} />
                            <div>
                              <div className={styles.detailLabel}>
                                EMAIL ADDRESS
                              </div>
                              <div className={styles.detailValue}>
                                {entity.email}
                              </div>
                            </div>
                          </div>
                        )}

                        {entity.primary_phone && (
                          <div className={styles.clientDetailItem}>
                            <Phone size={16} className={styles.detailIcon} />
                            <div>
                              <div className={styles.detailLabel}>
                                PRIMARY PHONE
                              </div>
                              <div className={styles.detailValue}>
                                {entity.primary_phone}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Invoice Info Fields */}
                  <div className={styles.infoGrid}>
                    <InfoField
                      label="Invoice Number"
                      icon={Hash}
                      value={invoice.external_number || "Not set"}
                      isEditable={canEditExternalNumber}
                      field="external_number"
                      isRequired={invoiceNumberRequired}
                      editForm={editForm}
                      validationErrors={validationErrors}
                      isEditingInfo={isEditingInfo}
                      companyProfileOptions={companyProfileOptions}
                      companyProfilesLoading={companyProfilesLoading}
                      onInputChange={handleInputChange}
                      styles={styles}
                    />

                    <InfoField
                      label="Company Profile"
                      icon={Landmark}
                      value={companyProfile?.name}
                      isEditable={canEditCompanyProfile}
                      field="company_profile_id"
                      isRequired={true}
                      editForm={editForm}
                      validationErrors={validationErrors}
                      isEditingInfo={isEditingInfo}
                      companyProfileOptions={companyProfileOptions}
                      companyProfilesLoading={companyProfilesLoading}
                      onInputChange={handleInputChange}
                      styles={styles}
                    />

                    <InfoField
                      label="Created On"
                      icon={Calendar}
                      value={formatDate(invoice.created_at)}
                      isEditable={false}
                      editForm={editForm}
                      validationErrors={validationErrors}
                      isEditingInfo={isEditingInfo}
                      companyProfileOptions={companyProfileOptions}
                      companyProfilesLoading={companyProfilesLoading}
                      onInputChange={handleInputChange}
                      styles={styles}
                    />

                    <InfoField
                      label="Issued On"
                      icon={Send}
                      value={
                        invoice?.issued_at
                          ? formatDate(invoice.issued_at)
                          : "--"
                      }
                      isEditable={false}
                      editForm={editForm}
                      validationErrors={validationErrors}
                      isEditingInfo={isEditingInfo}
                      companyProfileOptions={companyProfileOptions}
                      companyProfilesLoading={companyProfilesLoading}
                      onInputChange={handleInputChange}
                      styles={styles}
                    />

                    <InfoField
                      label="Paid On"
                      icon={CheckCircle}
                      value={
                        invoice?.paid_at ? formatDate(invoice.paid_at) : "--"
                      }
                      isEditable={false}
                      editForm={editForm}
                      validationErrors={validationErrors}
                      isEditingInfo={isEditingInfo}
                      companyProfileOptions={companyProfileOptions}
                      companyProfilesLoading={companyProfilesLoading}
                      onInputChange={handleInputChange}
                      styles={styles}
                    />
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>No invoice data available</p>
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION DIALOG */}
      <ConfirmationDialog
        isOpen={confirmationState.isOpen}
        onClose={closeConfirmation}
        actionName={confirmationConfig.actionName}
        actionInfo={confirmationConfig.actionInfo}
        confirmText={confirmationConfig.confirmText}
        cancelText={
          confirmationConfig.hideCancel
            ? undefined
            : confirmationConfig.cancelText || "Cancel"
        }
        variant={confirmationConfig.variant}
        onConfirm={
          confirmationConfig.hideCancel
            ? closeConfirmation
            : executeConfirmation
        }
        onCancel={closeConfirmation}
      />
    </>
  );
};

export default InvoiceDetailsDrawer;