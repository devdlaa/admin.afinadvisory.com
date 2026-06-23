"use client";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Filter, Download } from "lucide-react";
import "./GenericFilterDialog.scss";
const GenericFilterDialog = ({
  // Configuration
  config: {
    entityName,
    entityNamePlural,
    className = "",
  },
  
  // Redux selectors and actions
  selectors: {
    selectLoadingStates,
    selectExportData,
  },
  
  actions: {
    filterDataAction,
  },
  
  // Filter configuration
  quickFilters = [
    { label: "7 Days", value: "last7days" },
    { label: "15 Days", value: "last15days" },
    { label: "This Month", value: "thisMonth" },
    { label: "3 Months", value: "last3months" },
    { label: "6 Months", value: "last6months" },
    { label: "This Year", value: "thisYear" },
  ],
  
  fieldOptions = [],
  
  // Export function
  exportFunction = null,
  
  // Dialog props
  isOpen,
  onClose,
  mode = "filter", // "filter" or "export"
}) => {
  const dispatch = useDispatch();
  const { filterLoading, exportLoading } = useSelector(selectLoadingStates);
  const exportData = useSelector(selectExportData);
  
  // Use appropriate loading state based on mode
  const loading = mode === "export" ? exportLoading : filterLoading;

  const [filters, setFilters] = useState({
    quickRange: "",
    startDate: "",
    endDate: "",
    extraFilter: {
      field: "",
      value: "",
    },
  });

  const handleQuickFilterClick = (value) => {
    setFilters((prev) => ({
      ...prev,
      quickRange: prev.quickRange === value ? "" : value,
      // Clear custom date range when selecting preset
      startDate: "",
      endDate: "",
    }));
  };

  const handleInputChange = (field, value) => {
    setFilters((prev) => {
      if (field.startsWith("extraFilter.")) {
        const subField = field.split(".")[1];
        return {
          ...prev,
          extraFilter: {
            ...prev.extraFilter,
            [subField]: value,
          },
        };
      }

      const newFilters = { ...prev, [field]: value };

      // Clear quick range when setting custom dates
      if (field === "startDate" || field === "endDate") {
        newFilters.quickRange = "";
      }

      return newFilters;
    });
  };

  const handleApply = async () => {
    if (loading) return;

    // Prepare filter data
    const filterData = {
      quickRange: filters.quickRange,
      startDate: filters.startDate,
      endDate: filters.endDate,
      extraFilter:
        filters.extraFilter?.field && filters.extraFilter?.value
          ? filters.extraFilter
          : undefined,
    };

    // remove undefined fields
    const cleanedFilterData = Object.fromEntries(
      Object.entries(filterData).filter(
        ([_, v]) => v !== undefined && v !== "" && v !== null
      )
    );

    try {
      const result = await dispatch(
        filterDataAction({ mode, filters: cleanedFilterData })
      ).unwrap();

      if (mode === "export" && exportFunction) {
        if (exportData || result?.data) {
          exportFunction(exportData || result?.data);
        } else {
          alert("No data to Export");
        }
      }
      
      onClose();
    } catch (error) {
      console.error(`${mode} failed:`, error);
      alert(`${mode === "export" ? "Export" : "Filter"} failed: ${error}`);
    }
  };

  const handleReset = () => {
    const resetFilters = {
      quickRange: "",
      startDate: "",
      endDate: "",
      extraFilter: {
        field: "",
        value: "",
      },
    };
    setFilters(resetFilters);
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  // Reset filters when dialog opens
  useEffect(() => {
    if (isOpen) {
      handleReset();
    }
  }, [isOpen]);

  // Check if any filters are applied
  const hasActiveFilters =
    filters.quickRange ||
    filters.startDate ||
    filters.endDate ||
    filters.extraFilter.field ||
    filters.extraFilter.value;

  // Validation for apply button
  const canApply = filters.quickRange || (filters.startDate && filters.endDate);

  if (!isOpen) return null;

  // Always use generic-filter as base class, add custom className if provided
  const baseClass = `generic-filter${className ? ` ${className}` : ''}`;

  return (
    <div className="generic-filter-dialog-overlay">
      <div className={baseClass + "-dialog"}>
        <div className="generic-filter-dialog__header">
          <div className="generic-filter-dialog__header-left">
            {mode === "export" ? <Download size={20} /> : <Filter size={20} />}
            <h3>
              {mode === "export" 
                ? `Export ${entityNamePlural}` 
                : `Filter ${entityNamePlural}`}
            </h3>
          </div>
          <button
            className="generic-filter-dialog__close-btn"
            onClick={handleClose}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="generic-filter-dialog__content">
          {/* Quick Filters Section */}
          <div className="generic-filter-dialog__section">
            <h4>Date Range Presets</h4>
            <div className="generic-filter-dialog__quick-filters">
              {quickFilters.map((filter) => (
                <button
                  key={filter.value}
                  className={`generic-filter-dialog__quick-btn ${
                    filters.quickRange === filter.value
                      ? "generic-filter-dialog__quick-btn--active"
                      : ""
                  }`}
                  onClick={() => handleQuickFilterClick(filter.value)}
                  disabled={loading}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range Section */}
          <div className="generic-filter-dialog__section">
            <h4>Custom Date Range</h4>
            <div className="generic-filter-dialog__date-inputs">
              <div className="generic-filter-dialog__date-group">
                <label>Start Date</label>
                <div className="generic-filter-dialog__date-container">
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      handleInputChange("startDate", e.target.value)
                    }
                    className="generic-filter-dialog__date-input"
                    disabled={loading || !!filters.quickRange}
                  />
                </div>
              </div>

              <div className="generic-filter-dialog__date-group">
                <label>End Date</label>
                <div className="generic-filter-dialog__date-container">
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      handleInputChange("endDate", e.target.value)
                    }
                    className="generic-filter-dialog__date-input"
                    disabled={loading || !!filters.quickRange}
                    min={filters.startDate}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Special Field Search Section */}
          {fieldOptions.length > 0 && (
            <div className="generic-filter-dialog__section">
              <h4>Special Field Search (Optional)</h4>
              <div className="generic-filter-dialog__field-search">
                <div className="generic-filter-dialog__field-group">
                  <label>Search Field</label>
                  <select
                    value={filters.extraFilter.field}
                    onChange={(e) =>
                      handleInputChange("extraFilter.field", e.target.value)
                    }
                    className="generic-filter-dialog__field-select"
                    disabled={loading}
                  >
                    {fieldOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="generic-filter-dialog__field-group">
                  <label>Search Value</label>
                  <input
                    type="text"
                    value={filters.extraFilter.value}
                    onChange={(e) =>
                      handleInputChange("extraFilter.value", e.target.value)
                    }
                    className="generic-filter-dialog__field-input"
                    placeholder="Enter search value..."
                    disabled={loading || !filters.extraFilter.field}
                  />
                </div>
              </div>
              <p className="generic-filter-dialog__field-hint">
                Select a field and enter a value to search within your date range
              </p>
            </div>
          )}
        </div>

        <div className="generic-filter-dialog__footer">
          <button
            className="generic-filter-dialog__reset-btn"
            onClick={handleReset}
            disabled={loading || !hasActiveFilters}
          >
            <X size={16} />
            Reset Filters
          </button>
          <button
            className={`generic-filter-dialog__apply-btn ${
              loading ? "generic-filter-dialog__apply-btn--loading" : ""
            } ${!canApply ? "generic-filter-dialog__apply-btn--disabled" : ""}`}
            onClick={handleApply}
            disabled={filterLoading || exportLoading || !canApply}
            title={
              !canApply
                ? "Please select a date range (quick filter or custom dates)"
                : ""
            }
          >
            {filterLoading || exportLoading ? (
              <>
                <div className="generic-filter-dialog__spinner" />
                {mode === "export" ? "Exporting..." : "Applying..."}
              </>
            ) : (
              <>
                {mode === "export" ? (
                  <Download size={16} />
                ) : (
                  <Filter size={16} />
                )}
                {mode === "export" ? "Export Data" : "Apply Filter"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenericFilterDialog;