"use client";

import { useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, IndianRupee, User } from "lucide-react";

import Button from "@/app/components/shared/Button/Button";
import FilterDropdown from "@/app/components/pages/FilterDropdown/FilterDropdown";
import {
  createAdHocCharge,
  selectLoading,
} from "@/store/slices/reconcileSlice";
import { quickSearchEntities } from "@/store/slices/entitySlice";

import styles from "./CreateAdHocChargeDialog.module.scss";

const CHARGE_TYPES = [
  { value: "SERVICE_FEE", label: "Service Fee" },
  { value: "GOVERNMENT_FEE", label: "Government Fee" },
  { value: "EXTERNAL_CHARGE", label: "External Charge" },
];

export default function CreateAdHocChargeDialog({ entityId, onClose }) {
  const dispatch = useDispatch();

  // Get loading state from Redux
  const loading = useSelector(selectLoading);
  const isSubmitting = loading?.unreconciled?.bulkAction || false;

  const [formData, setFormData] = useState({
    entity_id: entityId || "",
    title: "",
    amount: "",
    charge_type: "SERVICE_FEE",
    remark: "",
  });

  const [entitySearchResults, setEntitySearchResults] = useState([]);
  const [isSearchingEntities, setIsSearchingEntities] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Get selected entity from Redux store
  const selectedEntity = useSelector((state) => {
    const selectedEntityId = formData.entity_id;
    if (!selectedEntityId) return null;
    return state.entity?.entities?.[selectedEntityId] || null;
  });

  // Combine selected entity with search results
  const entityOptions = useMemo(() => {
    if (!selectedEntity) return entitySearchResults;
    return [
      selectedEntity,
      ...entitySearchResults.filter((e) => e?.id !== selectedEntity?.id),
    ];
  }, [selectedEntity, entitySearchResults]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleEntitySearch = useCallback(
    async (query) => {
      if (!query || !query.trim()) {
        setEntitySearchResults([]);
        return;
      }

      setIsSearchingEntities(true);
      try {
        const result = await dispatch(
          quickSearchEntities({ search: query, limit: 20, forceRefresh: true }),
        ).unwrap();

        const safeData = Array.isArray(result?.data)
          ? result.data.filter((e) => e && e.id && e.name)
          : [];

        setEntitySearchResults(safeData);
      } catch (err) {
        console.error("Entity search failed:", err);
        setEntitySearchResults([]);
      } finally {
        setIsSearchingEntities(false);
      }
    },
    [dispatch],
  );

  const validateForm = () => {
    const errors = {};

    // Validate entity
    if (!formData.entity_id) {
      errors.entity_id = "Please search and select an entity";
    }

    // Validate title
    if (!formData.title?.trim()) {
      errors.title = "Please enter a charge title";
    } else if (formData.title.trim().length < 3) {
      errors.title = "Title must be at least 3 characters";
    } else if (formData.title.length > 200) {
      errors.title = "Title must not exceed 200 characters";
    }

    // Validate amount
    if (!formData.amount || formData.amount === "" || formData.amount === "0") {
      errors.amount = "Please enter a valid amount";
    } else {
      const amountNum = parseFloat(formData.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.amount = "Amount must be greater than 0";
      } else if (amountNum > 10000000) {
        errors.amount = "Amount exceeds maximum limit";
      }
    }

    // Validate charge type
    if (!formData.charge_type) {
      errors.charge_type = "Please select a charge type";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      await dispatch(
        createAdHocCharge({
          entityId: formData.entity_id,
          chargeData: {
            title: formData.title.trim(),
            amount: parseFloat(formData.amount),
            charge_type: formData.charge_type,
            remark: formData.remark?.trim() || null,
          },
        }),
      ).unwrap();

      onClose();
    } catch (err) {
      console.error("Failed to create ad-hoc charge:", err);

      setFormErrors({
        submit: err?.message || "Failed to create ad-hoc charge",
      });
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={isSubmitting ? undefined : onClose}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.title}>Create Ad-hoc Charge</h2>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className={styles.body}>
            {/* Entity - FilterDropdown */}
            <div className={styles.field}>
              <FilterDropdown
                label=""
                placeholder="Search and select Client"
                icon={User}
                options={entityOptions.map((e) => ({
                  value: e?.id,
                  label: e?.name || "Unknown",
                  subtitle: e?.email || "",
                }))}
                selectedValue={formData.entity_id}
                onSelect={(option) =>
                  handleFieldChange("entity_id", option.value)
                }
                onSearchChange={handleEntitySearch}
                isSearching={isSearchingEntities}
                enableLocalSearch={false}
                emptyStateMessage="No entities found"
                className={styles.entityDropdown}
              />
              {formErrors.entity_id && (
                <span className={styles.errorText}>{formErrors.entity_id}</span>
              )}
            </div>

            {/* Title */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                Charge Title <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                disabled={isSubmitting}
                className={`${styles.input} ${formErrors.title ? styles.inputError : ""}`}
                placeholder="e.g., Consultation Fee"
                maxLength={200}
                required
              />
              {formErrors.title && (
                <span className={styles.errorText}>{formErrors.title}</span>
              )}
            </div>

            {/* Amount */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                Amount <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWithIcon}>
                <IndianRupee size={16} className={styles.icon} />
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleFieldChange("amount", e.target.value)}
                  disabled={isSubmitting}
                  className={`${styles.input} ${formErrors.amount ? styles.inputError : ""}`}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              {formErrors.amount && (
                <span className={styles.errorText}>{formErrors.amount}</span>
              )}
            </div>

            {/* Charge Type */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                Charge Type <span className={styles.required}>*</span>
              </label>
              <select
                value={formData.charge_type}
                onChange={(e) =>
                  handleFieldChange("charge_type", e.target.value)
                }
                disabled={isSubmitting}
                className={`${styles.select} ${formErrors.charge_type ? styles.inputError : ""}`}
                required
              >
                {CHARGE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {formErrors.charge_type && (
                <span className={styles.errorText}>
                  {formErrors.charge_type}
                </span>
              )}
            </div>

            {/* Remark */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Remarks (Optional)</label>
              <textarea
                value={formData.remark}
                onChange={(e) => handleFieldChange("remark", e.target.value)}
                disabled={isSubmitting}
                className={styles.textarea}
                rows={3}
                placeholder="Add notes..."
                maxLength={2000}
              />
              <div className={styles.charCount}>
                {formData.remark?.length || 0} / 2000
              </div>
            </div>

            {/* Form-level error */}
            {formErrors.submit && (
              <div className={styles.submitError}>{formErrors.submit}</div>
            )}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Create Charge
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
