"use client";

import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import { X, FileText, CheckCircle2, ExternalLink, Blocks } from "lucide-react";
import { CircularProgress } from "@mui/material";
import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";
import {
  createOrAppendInvoice,
  fetchInvoiceDetails,
  selectInvoiceLoading,
  selectSelectedInvoice,
  clearSelectedInvoice,
} from "@/store/slices/invoiceSlice";
import {
  fetchCompanyProfiles,
  selectListProfiles,
  selectIsLoading as selectCompanyProfileLoading,
  selectCachedProfilesCount,
} from "@/store/slices/companyProfileSlice";

import FilterDropdown from "@/app/components/pages/FilterDropdown/FilterDropdown";

import styles from "./CreateInvoiceDialog.module.scss";

export default function CreateInvoiceDialog({
  selectedTasks = [],
  entityId,
  onClose,
}) {
  const dispatch = useDispatch();

  const searchParams = useSearchParams();
  const hasAutoLoadedFromURL = useRef(false);
  const loading = useSelector(selectInvoiceLoading);
  const selectedInvoice = useSelector(selectSelectedInvoice);
  const companyProfiles = useSelector(selectListProfiles);
  const cachedProfilesCount = useSelector(selectCachedProfilesCount);
  const companyProfilesLoading = useSelector((state) =>
    selectCompanyProfileLoading(state, "list"),
  );

  const [mode, setMode] = useState(null);
  const [step, setStep] = useState("mode");

  // Form state
  const [formData, setFormData] = useState({
    company_profile_id: "",
    notes: "",
  });

  const [existingInvoiceNumber, setExistingInvoiceNumber] = useState("");
  const [createdInvoiceId, setCreatedInvoiceId] = useState(null);

  // Error dialog state
  const [errorDialog, setErrorDialog] = useState({
    isOpen: false,
    message: "",
    title: "",
  });

  // Fetch company profiles on mount if not already cached
  useEffect(() => {
    if (cachedProfilesCount === 0) {
      dispatch(fetchCompanyProfiles({ is_active: true, page_size: 20 }));
    }
  }, [dispatch, cachedProfilesCount]);

  useEffect(() => {
    const internalNumber = searchParams.get("internal_number");
    if (!internalNumber || hasAutoLoadedFromURL.current) return;

    hasAutoLoadedFromURL.current = true;

    setMode("append");
    setExistingInvoiceNumber(internalNumber);
    setStep("preview");
    dispatch(fetchInvoiceDetails(internalNumber));
  }, [searchParams, dispatch]);

  // Check for append_to parameter
  useEffect(() => {
    const internalNumber = searchParams.get("internal_number");
    if (!internalNumber) return;

    // Auto-enter append mode
    setMode("append");
    setExistingInvoiceNumber(internalNumber);
    setStep("preview");

    // Auto-load invoice
    dispatch(fetchInvoiceDetails(internalNumber));
  }, [searchParams, dispatch]);

  // Pre-fill from existing invoice
  useEffect(() => {
    if (mode === "append" && selectedInvoice.invoice) {
      const profileId = selectedInvoice.invoice.company_profile_id || "";

      setFormData({
        company_profile_id: profileId,
        notes: selectedInvoice.invoice.notes || "",
      });
    }
  }, [mode, selectedInvoice]);

  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    setStep("preview");
  };

  const showError = (title, message) => {
    setErrorDialog({
      isOpen: true,
      title,
      message,
    });
  };

  const handleLoadInvoice = async () => {
    if (!existingInvoiceNumber.trim()) {
      showError(
        "Invoice Number Required",
        "Please enter an invoice internal number to load.",
      );
      return;
    }

    try {
      await dispatch(fetchInvoiceDetails(existingInvoiceNumber)).unwrap();
    } catch (err) {
      showError(
        "Failed to Load Invoice",
        err.message ||
          "Could not load the specified invoice. Please check the invoice number and try again.",
      );
    }
  };

  const handleChangeInvoice = () => {
    setExistingInvoiceNumber("");
    dispatch(clearSelectedInvoice());
    setFormData({
      company_profile_id: "",
      notes: "",
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (mode === "append" && !existingInvoiceNumber) {
      showError(
        "Invoice Number Required",
        "Invoice number is required for appending to an existing invoice.",
      );
      return;
    }

    if (!formData.company_profile_id && mode === "new") {
      showError(
        "Company Profile Required",
        "Please select a company profile to create the invoice.",
      );
      return;
    }

    if (mode === "append" && !selectedInvoice.invoice) {
      showError(
        "Invoice Not Loaded",
        "Please load a valid invoice before attempting to add tasks.",
      );
      return;
    }

    try {
      // Extract task IDs from task objects
      const taskIds = selectedTasks.map((task) => task.id);

      const payload = {
        entity_id: entityId,
        task_ids: taskIds,
        invoice_data: {
          company_profile_id: formData.company_profile_id,
          notes: formData.notes || null,
        },
      };

      if (mode === "append") {
        payload.invoice_internal_number = existingInvoiceNumber;
      }

      const result = await dispatch(createOrAppendInvoice(payload)).unwrap();

      const invoiceNumber =
        result?.invoice?.internal_number || result?.internal_number || null;
 

      setCreatedInvoiceId(invoiceNumber);
      setStep("success");
    } catch (err) {
      showError(
        "Failed to Create Invoice",
        err.message ||
          "An error occurred while creating the invoice. Please try again.",
      );
    }
  };

  const handleViewInvoice = () => {
    if (!createdInvoiceId) return;

    const params = new URLSearchParams({
      invoice: createdInvoiceId,
    });

    window.open(
      `/dashboard/task-managment/invoices?${params.toString()}`,
      "_blank",
    );

    onClose();
  };
  // Check if company profile should be locked (append mode with loaded invoice)
  const isLocked = mode === "append" && selectedInvoice.invoice;
  const isSubmitting = loading?.create;
  const isLoadingInvoice = loading?.details;

  // Prepare company profile options for FilterDropdown
  const companyProfileOptions = companyProfiles.map((profile) => ({
    value: profile.id,
    label: `${profile.name}${profile.is_default ? " (Default)" : ""}`,
  }));

  // Check if we can submit
  const canSubmit = () => {
    if (isSubmitting || companyProfilesLoading) return false;
    if (mode === "new") {
      return formData.company_profile_id;
    }
    if (mode === "append") {
      return selectedInvoice.invoice && !isLoadingInvoice;
    }
    return false;
  };

  const resetState = () => {
    setMode(null);
    setStep("mode");
    setFormData({ company_profile_id: "", notes: "" });
    setExistingInvoiceNumber("");
    setCreatedInvoiceId(null);
    setErrorDialog({ isOpen: false, message: "", title: "" });
    dispatch(clearSelectedInvoice());
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <>
      <div className={styles.overlay}>
        <div className={styles.dialog}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div>
                <h2 className={styles.title}>
                  {mode === "new"
                    ? "Create New Invoice"
                    : mode === "append"
                      ? "Add to Existing Invoice"
                      : "Create Invoice"}
                </h2>
                <p className={styles.subtitle}>
                  {step === "mode" && "Choose how to invoice selected tasks"}
                  {step === "preview" && "Review and confirm invoice details"}
                  {step === "success" && "Invoice created successfully"}
                </p>
              </div>
            </div>
            <button
              className={styles.closeBtn}
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className={styles.body}>
            {/* Step 1: Mode Selection */}
            {step === "mode" && (
              <div className={styles.modeSelection}>
                <button
                  className={styles.modeCard}
                  onClick={() => handleModeSelect("new")}
                >
                  <div className={styles.modeIcon}>
                    <FileText size={24} />
                  </div>
                  <h3>Create New Invoice</h3>
                  <p>Start a fresh invoice with selected tasks</p>
                </button>

                <button
                  className={styles.modeCard}
                  onClick={() => handleModeSelect("append")}
                >
                  <div className={styles.modeIcon}>
                    <Blocks size={24} />
                  </div>
                  <h3>Add to Existing</h3>
                  <p>Append tasks to an existing draft invoice</p>
                </button>
              </div>
            )}

            {/* Step 2: Preview */}
            {step === "preview" && (
              <div className={styles.preview}>
                {/* Existing Invoice Input (append mode) */}
                {mode === "append" && (
                  <div className={styles.field}>
                    <label>Invoice Number</label>
                    {selectedInvoice.invoice ? (
                      // Show loaded invoice with option to change
                      <div className={styles.loadedInvoice}>
                        <div className={styles.invoiceInfo}>
                          <FileText size={16} />
                          <span>
                            Invoice: <strong>{existingInvoiceNumber}</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          className={styles.changeInvoiceBtn}
                          onClick={handleChangeInvoice}
                          disabled={isSubmitting}
                          title="Change invoice"
                        >
                          <X size={16} />
                          Change
                        </button>
                      </div>
                    ) : (
                      // Show input to load invoice
                      <div className={styles.invoiceLoadSection}>
                        <input
                          type="text"
                          value={existingInvoiceNumber}
                          onChange={(e) =>
                            setExistingInvoiceNumber(e.target.value)
                          }
                          placeholder="Enter invoice internal number"
                          className={styles.input}
                          disabled={isLoadingInvoice}
                        />
                        <button
                          type="button"
                          className={styles.loadBtn}
                          onClick={handleLoadInvoice}
                          disabled={
                            !existingInvoiceNumber.trim() || isLoadingInvoice
                          }
                        >
                          {isLoadingInvoice ? (
                            <>
                              <CircularProgress size={16} color="inherit" />
                              Loading...
                            </>
                          ) : (
                            "Load Invoice"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Form Fields */}
                {(mode === "new" || selectedInvoice.invoice) && (
                  <>
                    <div className={styles.field}>
                      <label>
                        Company Profile
                        {isLocked && (
                          <span className={styles.locked}>(Locked)</span>
                        )}
                      </label>
                      <FilterDropdown
                        options={companyProfileOptions}
                        selectedValue={formData.company_profile_id}
                        onSelect={(selected) => {
                          if (!isLocked && !isSubmitting) {
                            setFormData((prev) => ({
                              ...prev,
                              company_profile_id: selected.value,
                            }));
                          }
                        }}
                        placeholder="Select company profile"
                        label="Company Profile"
                        isLoading={companyProfilesLoading}
                        readOnly={isLocked || isSubmitting}
                        searchable={true}
                      />
                    </div>

                    <div className={styles.field}>
                      <textarea
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        disabled={isSubmitting}
                        className={styles.textarea}
                        rows={3}
                        placeholder="Add any notes about this invoice..."
                      />
                    </div>
                  </>
                )}

                {/* Task Summary */}
                <div className={styles.taskSummary}>
                  <h3>Selected Tasks ({selectedTasks.length})</h3>
                  <div className={styles.taskList}>
                    {selectedTasks.map((task) => (
                      <div key={task.id} className={styles.taskItem}>
                        <FileText size={14} />
                        <span>
                          {task.id}
                          {task.entity?.name && (
                            <span className={styles.entityName}>
                              {" "}
                              - {task.entity.name}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {step === "success" && (
              <div className={styles.success}>
                <div className={styles.successIcon}>
                  <CheckCircle2 size={48} />
                </div>
                <h3>
                  Invoice {mode === "new" ? "Created" : "Updated"} Successfully!
                </h3>
                <p>
                  Invoice <strong>{createdInvoiceId}</strong> has been{" "}
                  {mode === "new" ? "created" : "updated"} with the selected
                  tasks.
                </p>

                <button
                  className={styles.primaryBtn}
                  onClick={handleViewInvoice}
                >
                  <ExternalLink size={16} />
                  View Invoice
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          {step !== "success" && (
            <div className={styles.footer}>
              <button
                className={styles.outlineBtn}
                onClick={step === "mode" ? handleClose : () => setStep("mode")}
                disabled={isSubmitting}
              >
                {step === "mode" ? "Cancel" : "Back"}
              </button>

              {step === "preview" && (
                <button
                  className={styles.primaryBtn}
                  onClick={handleSubmit}
                  disabled={!canSubmit()}
                >
                  {isSubmitting ? (
                    <>
                      <CircularProgress size={16} color="inherit" />
                      {mode === "new" ? "Creating..." : "Adding..."}
                    </>
                  ) : (
                    <>{mode === "new" ? "Create Invoice" : "Add to Invoice"}</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Dialog */}
      <ConfirmationDialog
        isOpen={errorDialog.isOpen}
        onClose={() =>
          setErrorDialog({ isOpen: false, message: "", title: "" })
        }
        actionName={errorDialog.title}
        actionInfo={errorDialog.message}
        confirmText="OK"
        variant="warning"
        onConfirm={() =>
          setErrorDialog({ isOpen: false, message: "", title: "" })
        }
        onCancel={() =>
          setErrorDialog({ isOpen: false, message: "", title: "" })
        }
      />
    </>
  );
}
