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

import { clientsFilterConfig } from "@/config/clientsActionBarConfig";
import styles from "./ClientFilterDialog.module.scss";

const ClientFilterDialog = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const currentFilters = useSelector(selectFilters);
  const loading = useSelector((state) => selectIsLoading(state, "list"));

  // Local filter state
  const [localFilters, setLocalFilters] = useState({
    entity_type: "",
    status: "",
    state: "",
  });

  // Sync with Redux state when dialog opens
  useEffect(() => {
    setLocalFilters({
      entity_type: currentFilters.entity_type || "",
      status: currentFilters.status || "",
      state: currentFilters.state || "",
    });
  }, [currentFilters]);

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setLocalFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Apply filters
  const handleApplyFilters = (e) => {
    e.preventDefault();

    // Clean up empty strings
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
        page_size: currentFilters.page_size || 20,
      })
    );

    ref.current?.close();
  };

  // Reset filters
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

  // Handle close
  const handleClose = () => {
    ref.current?.close();
  };

  // Check if any filter is active
  const hasActiveFilters =
    localFilters.entity_type || localFilters.status || localFilters.state;

  return (
    <dialog ref={ref} className={styles.dialog}>
      <div className={styles.dialogContent}>
        {/* Header */}
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

        {/* Form */}
        <form onSubmit={handleApplyFilters} className={styles.form}>
          {/* Entity Type Filter */}
          <div className={styles.formGroup}>
            <label htmlFor="entity_type">Entity Type</label>
            <select
              id="entity_type"
              name="entity_type"
              value={localFilters.entity_type}
              onChange={handleFilterChange}
              disabled={loading}
            >
              {clientsFilterConfig.entityTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className={styles.formGroup}>
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={localFilters.status}
              onChange={handleFilterChange}
              disabled={loading}
            >
              {clientsFilterConfig.statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* State Filter */}
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
            <span className={styles.hint}>
              Enter state name to filter clients by location
            </span>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className={styles.activeFiltersSummary}>
              <p className={styles.summaryTitle}>Active Filters:</p>
              <div className={styles.filterTags}>
                {localFilters.entity_type && (
                  <span className={styles.filterTag}>
                    Type:{" "}
                    {clientsFilterConfig.entityTypes.find(
                      (t) => t.value === localFilters.entity_type
                    )?.label || localFilters.entity_type}
                  </span>
                )}
                {localFilters.status && (
                  <span className={styles.filterTag}>
                    Status:{" "}
                    {clientsFilterConfig.statusOptions.find(
                      (s) => s.value === localFilters.status
                    )?.label || localFilters.status}
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

          {/* Footer Actions */}
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
                {loading ? (
                  <>
                    <div className={styles.spinner} />
                    Applying...
                  </>
                ) : (
                  <>
                    <Filter size={16} />
                    Apply Filters
                  </>
                )}
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
