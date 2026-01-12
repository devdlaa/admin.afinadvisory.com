"use client";
import React, { forwardRef, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Filter, RotateCcw } from "lucide-react";
import {
  fetchEntities,
  setFilters,
  resetFilters,
  selectFilters,
  selectIsLoading,
} from "@/store/slices/entitySlice";

import styles from "./ClientFilterDialog.module.scss";

/* ================================
   Local filter configuration
================================ */

const ENTITY_TYPES = [
  { label: "All Types", value: "" },
  { label: "Unregistered", value: "UN_REGISTRED" },
  { label: "Individual", value: "INDIVIDUAL" },
  { label: "Private Limited Company", value: "PRIVATE_LIMITED_COMPANY" },
  { label: "Public Limited Company", value: "PUBLIC_LIMITED_COMPANY" },
  { label: "One Person Company", value: "ONE_PERSON_COMPANY" },
  { label: "Section 8 Company", value: "SECTION_8_COMPANY" },
  { label: "Producer Company", value: "PRODUCER_COMPANY" },
  { label: "Sole Proprietorship", value: "SOLE_PROPRIETORSHIP" },
  { label: "Partnership Firm", value: "PARTNERSHIP_FIRM" },
  {
    label: "Limited Liability Partnership",
    value: "LIMITED_LIABILITY_PARTNERSHIP",
  },
  { label: "Association Of Person", value: "ASSOCIATION_OF_PERSON" },
  { label: "HUF", value: "HUF" },
  { label: "Trust", value: "TRUST" },
  { label: "Society", value: "SOCIETY" },
  { label: "Cooperative Society", value: "COOPERATIVE_SOCIETY" },
  { label: "Foreign Company", value: "FOREIGN_COMPANY" },
  { label: "Government Company", value: "GOVERNMENT_COMPANY" },
];

const STATUS_OPTIONS = [
  { label: "All Status", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
];

/* ================================
   Component
================================ */

const ClientFilterDialog = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const currentFilters = useSelector(selectFilters);
  const loading = useSelector((state) => selectIsLoading(state, "list"));

  const [localFilters, setLocalFilters] = useState({
    entity_type: "",
    status: "",
    state: "",
  });

  useEffect(() => {
    setLocalFilters({
      entity_type: currentFilters.entity_type || "",
      status: currentFilters.status || "",
      state: currentFilters.state || "",
    });
  }, [currentFilters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setLocalFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();

    const cleanedFilters = Object.entries(localFilters).reduce(
      (acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      },
      {}
    );

    dispatch(setFilters({ ...cleanedFilters, page: 1 }));
    dispatch(
      fetchEntities({
        ...cleanedFilters,
        page: 1,
        page_size: 20,
      })
    );

    ref.current?.close();
  };

  const handleResetFilters = () => {
    setLocalFilters({
      entity_type: "",
      status: "",
      state: "",
    });

    dispatch(resetFilters());
    dispatch(fetchEntities({ page: 1, page_size: 20 }));
    ref.current?.close();
  };

  const handleClose = () => {
    ref.current?.close();
  };

  const hasActiveFilters =
    localFilters.entity_type || localFilters.status || localFilters.state;

  return (
    <dialog ref={ref} className={styles.dialog}>
      <div className={styles.dialogContent}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Filter size={24} className={styles.headerIcon} />
            <div>
              <h2>Filter Clients</h2>
              <p>Apply filters to narrow down your search</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleApplyFilters} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="entity_type">Entity Type</label>
            <select
              id="entity_type"
              name="entity_type"
              value={localFilters.entity_type}
              onChange={handleFilterChange}
              disabled={loading}
            >
              {ENTITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={localFilters.status}
              onChange={handleFilterChange}
              disabled={loading}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="state">State</label>
            <input
              type="text"
              id="state"
              name="state"
              value={localFilters.state}
              onChange={handleFilterChange}
              disabled={loading}
              placeholder="e.g., Rajasthan, Maharashtra"
            />
          </div>

          {hasActiveFilters && (
            <div className={styles.activeFiltersSummary}>
              <p className={styles.summaryTitle}>Active Filters:</p>
              <div className={styles.filterTags}>
                {localFilters.entity_type && (
                  <span className={styles.filterTag}>
                    Type:{" "}
                    {ENTITY_TYPES.find(
                      (t) => t.value === localFilters.entity_type
                    )?.label || localFilters.entity_type}
                  </span>
                )}
                {localFilters.status && (
                  <span className={styles.filterTag}>
                    Status:{" "}
                    {STATUS_OPTIONS.find((s) => s.value === localFilters.status)
                      ?.label || localFilters.status}
                  </span>
                )}
                {localFilters.state && (
                  <span className={styles.filterTag}>
                    State: {localFilters.state}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.resetBtn}
              onClick={handleResetFilters}
              disabled={loading || !hasActiveFilters}
            >
              <RotateCcw size={16} />
              Reset All
            </button>

            <div className={styles.footerRight}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.applyBtn}
                disabled={loading || !hasActiveFilters}
              >
                <Filter size={16} />
                Apply Filters
              </button>
            </div>
          </div>
        </form>
      </div>
    </dialog>
  );
});

ClientFilterDialog.displayName = "ClientFilterDialog";

export default ClientFilterDialog;
