"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  RotateCw,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
} from "lucide-react";

import FilterDropdown from "@/app/components/pages/FilterDropdown/FilterDropdown";
import Button from "@/app/components/shared/Button/Button";
import styles from "./ReconcileActionBar.module.scss";

export default function ReconcileActionBar({
  filterDropdowns = [],
  activeFilters = {},
  onFilterChange,
  onClearAllFilters,
  onRefresh,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  isPaginationLoading = false,
  isLoading = false,
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({
    from_date: "",
    to_date: "",
  });
  const datePickerRef = useRef(null);

  // Sync temp state with active filters
  useEffect(() => {
    setTempDateRange({
      from_date: activeFilters.from_date || "",
      to_date: activeFilters.to_date || "",
    });
  }, [activeFilters.from_date, activeFilters.to_date]);

  const hasActiveFilters = Object.entries(activeFilters).some(
    ([key, value]) => value !== null && value !== undefined && value !== "",
  );

  const hasDateFilter = activeFilters.from_date || activeFilters.to_date;

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDatePicker]);

  const handleRemoveFilter = (filterKey) => {
    onFilterChange(filterKey, null);
  };

  const handleRemoveDateFilter = () => {
    onFilterChange("from_date", null);
    onFilterChange("to_date", null);
    setTempDateRange({ from_date: "", to_date: "" });
  };

  const handleApplyDateRange = () => {
    if (tempDateRange.from_date) {
      onFilterChange("from_date", tempDateRange.from_date);
    }
    if (tempDateRange.to_date) {
      onFilterChange("to_date", tempDateRange.to_date);
    }
    setShowDatePicker(false);
  };

  const handleClearDateRange = () => {
    setTempDateRange({ from_date: "", to_date: "" });
    onFilterChange("from_date", null);
    onFilterChange("to_date", null);
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && !isPaginationLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && !isPaginationLoading) {
      onPageChange(currentPage + 1);
    }
  };

  const getActiveFilterLabel = (filterKey, value) => {
    const dropdown = filterDropdowns.find((d) => d.filterKey === filterKey);
    if (!dropdown) return null;

    const option = dropdown.options.find((opt) => opt.value === value);
    return option ? option.label : null;
  };

  const formatDateRange = () => {
    if (!hasDateFilter) return null;

    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    const fromFormatted = formatDate(activeFilters.from_date);
    const toFormatted = formatDate(activeFilters.to_date);

    if (fromFormatted && toFormatted) {
      return `${fromFormatted} - ${toFormatted}`;
    } else if (fromFormatted) {
      return `From ${fromFormatted}`;
    } else if (toFormatted) {
      return `Until ${toFormatted}`;
    }
    return null;
  };

  const activeFiltersList = Object.entries(activeFilters)
    .filter(
      ([key, value]) =>
        value !== null &&
        value !== undefined &&
        value !== "" &&
        key !== "from_date" &&
        key !== "to_date" &&
        key !== "order" &&
        key !== "page_size",
    )
    .map(([key, value]) => ({
      key,
      value,
      label: getActiveFilterLabel(key, value),
    }))
    .filter((filter) => filter.label);

  return (
    <div className={styles.actionBar}>
      {/* Filters and Actions */}
      <div className={styles.controls}>
        <div className={styles.filters}>
          {filterDropdowns.map((dropdown) => (
            <FilterDropdown
              key={dropdown.filterKey}
              label={dropdown.label}
              placeholder={dropdown.placeholder}
              icon={dropdown.icon}
              options={dropdown.options}
              selectedValue={activeFilters[dropdown.filterKey]}
              onSelect={(option) =>
                onFilterChange(dropdown.filterKey, option.value)
              }
              onSearchChange={dropdown.onSearchChange}
              isSearching={dropdown.isSearching}
              emptyStateMessage={dropdown.emptyStateMessage}
              enableLocalSearch={dropdown.enableLocalSearch}
              className={styles.filter_drpdown}
              isLoading={false}
            />
          ))}

          {/* Date Range Filter */}
          <div className={styles.dateFilter} ref={datePickerRef}>
            <button
              className={`${styles.dateFilterButton} ${hasDateFilter ? styles.active : ""}`}
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <Calendar size={16} />
              <span>
                {hasDateFilter ? formatDateRange() : "Date Range"}
              </span>
            </button>

            {showDatePicker && (
              <div className={styles.datePickerDropdown}>
                <div className={styles.datePickerHeader}>
                  <h4>Select Date Range</h4>
                </div>

                <div className={styles.dateInputs}>
                  <div className={styles.dateInputGroup}>
                    <label>From Date</label>
                    <input
                      type="date"
                      value={tempDateRange.from_date}
                      onChange={(e) =>
                        setTempDateRange((prev) => ({
                          ...prev,
                          from_date: e.target.value,
                        }))
                      }
                      className={styles.dateInput}
                      max={tempDateRange.to_date || undefined}
                    />
                  </div>

                  <div className={styles.dateInputGroup}>
                    <label>To Date</label>
                    <input
                      type="date"
                      value={tempDateRange.to_date}
                      onChange={(e) =>
                        setTempDateRange((prev) => ({
                          ...prev,
                          to_date: e.target.value,
                        }))
                      }
                      className={styles.dateInput}
                      min={tempDateRange.from_date || undefined}
                    />
                  </div>
                </div>

                <div className={styles.datePickerActions}>
                  <button
                    className={styles.clearDateButton}
                    onClick={handleClearDateRange}
                  >
                    Clear
                  </button>
                  <button
                    className={styles.applyDateButton}
                    onClick={handleApplyDateRange}
                    disabled={!tempDateRange.from_date && !tempDateRange.to_date}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAllFilters}
              className={styles.clearBtn}
              loading={false}
              disabled={false}
            >
              Clear Filters
            </Button>
          )}
        </div>

        <div className={styles.rightActions}>
          <Button
            variant="outline"
            size="md"
            icon={RotateCw}
            onClick={onRefresh}
            loading={isLoading}
                  disabled={false}
          >
            Refresh
          </Button>

          <div className={styles.pagination}>
            <Button
              variant="outline"
              size="md"
              icon={ChevronLeft}
              onClick={handlePrevPage}
              disabled={currentPage === 1 || isPaginationLoading}
              loading={isPaginationLoading && currentPage > 1}
              className={styles.paginationBtn}
            >
              Prev
            </Button>

            <div className={styles.paginationInfo}>
              <span className={styles.paginationCurrent}>{currentPage}</span>
              <span className={styles.paginationSeparator}>/</span>
              <span className={styles.paginationTotal}>{totalPages}</span>
            </div>

            <Button
              variant="outline"
              size="md"
              icon={ChevronRight}
              iconPosition="right"
              onClick={handleNextPage}
              disabled={currentPage === totalPages || isPaginationLoading}
              loading={isPaginationLoading && currentPage < totalPages}
              className={styles.paginationBtn}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filters Chips */}
      {(activeFiltersList.length > 0 || hasDateFilter) && (
        <div className={styles.activeFilters}>
          {hasDateFilter && (
            <div className={styles.filterChip}>
              <Calendar size={12} />
              <span className={styles.filterChipLabel}>
                {formatDateRange()}
              </span>
              <button
                className={styles.filterChipRemove}
                onClick={handleRemoveDateFilter}
                aria-label="Remove date range filter"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {activeFiltersList.map((filter) => (
            <div key={filter.key} className={styles.filterChip}>
              <span className={styles.filterChipLabel}>{filter.label}</span>
              <button
                className={styles.filterChipRemove}
                onClick={() => handleRemoveFilter(filter.key)}
                aria-label={`Remove ${filter.label} filter`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}