"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Calendar,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { CircularProgress } from "@mui/material";
import styles from "./InvoiceTable.module.scss";
import FilterDropdown from "@/app/components/pages/FilterDropdown/FilterDropdown";

// ============================================
// CONSTANTS
// ============================================
const TABS = [
  { key: "DRAFT", label: "Drafts" },
  { key: "Issued", label: "Issued" },
  { key: "Paid", label: "Paid" },
  { key: "Cancelled", label: "Cancelled" },
];

const STATUS_CONFIG = {
  DRAFT: { class: "draftBadge", label: "Draft" },
  ISSUED: { class: "issuedBadge", label: "Issued" },
  PAID: { class: "paidBadge", label: "Paid" },
  CANCELLED: { class: "cancelledBadge", label: "Cancelled" },
};

const DATE_FIELD_OPTIONS = [
  { value: "created_at", label: "Date Created" },
  { value: "issued_at", label: "Date Issued" },
  { value: "paid_at", label: "Date Paid" },
];

const SORTABLE_COLUMNS = [
  { column: "created_at", label: "Date Created" },
  { column: "issued_at", label: "Issued On" },
  { column: "paid_at", label: "Paid On" },
];

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatDate = (dateString) => {
  if (!dateString) return "--";

  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const formatDateRange = (fromDate, toDate) => {
  if (!fromDate && !toDate) return null;

  const format = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const fromFormatted = format(fromDate);
  const toFormatted = format(toDate);

  if (fromFormatted && toFormatted) return `${fromFormatted} - ${toFormatted}`;
  if (fromFormatted) return `From ${fromFormatted}`;
  if (toFormatted) return `Until ${toFormatted}`;
  return null;
};

// ============================================
// COMPONENT
// ============================================
const InvoiceTable = ({
  // Data props
  invoices,
  totalCount,
  currentPage,
  itemsPerPage,
  filterDropdowns,
  searchInput,
  onSearchInputChange,
  onSearchApply,
  onSearchClear,

  // Tab state
  activeTab,
  onTabChange,

  // Selection state
  selectedInvoices,
  allSelected,
  onSelectionChange,
  onSelectAll,
  onRemoveSelection,

  // Filter state
  filters,
  tempDateRange,
  onTempDateRangeChange,
  onFilterChange,
  onApplyDateFilter,
  onClearDateFilter,
  onClearAllFilters,
  hasActiveFilters,

  // Sorting state
  sortBy,
  sortOrder,
  onSort,

  // Action handlers
  onMarkIssued,
  onMarkPaid,
  onMarkDraft,
  // Loading states
  isMarkingIssued,
  isMarkingPaid,
  isMarkingDraft,

  isLoading,
  isLoadingNext,
  isLoadingPrev,

  // Pagination
  onPageChange,
  onItemsPerPageChange,

  // Row click
  onRowClick,
}) => {
  const hasSelection = selectedInvoices.length > 0;

  // Date filter dialog state
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const datePickerRef = useRef(null);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
        setFilterDialogOpen(false);
      }
    };

    if (filterDialogOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filterDialogOpen]);

  // ============================================
  // SORTABLE COLUMN HEADER
  // ============================================
  const SortableHeader = ({ column, label }) => {
    const isSorted = sortBy === column;
    const isAsc = isSorted && sortOrder === "asc";
    const isDesc = isSorted && sortOrder === "desc";

    return (
      <th
        className={`${styles.sortableHeader} ${isSorted ? styles.sorted : ""}`}
        onClick={() => onSort(column)}
      >
        <div className={styles.headerContent}>
          <span>{label}</span>
          <span className={styles.sortIcon}>
            {!isSorted && <ArrowUpDown size={14} />}
            {isAsc && <ArrowUp size={14} />}
            {isDesc && <ArrowDown size={14} />}
          </span>
        </div>
      </th>
    );
  };

  // ============================================
  // GET ACTIVE FILTER LABEL
  // ============================================
  const getActiveFilterLabel = (filterKey, value) => {
    const dropdown = filterDropdowns.find((d) => d.filterKey === filterKey);
    if (!dropdown) return null;

    const option = dropdown.options.find((opt) => opt.value === value);
    return option ? option.label : null;
  };

  // ============================================
  // ACTIVE FILTERS LIST
  // ============================================
  const activeFiltersList = Object.entries(filters)
    .filter(
      ([key, value]) =>
        value !== null &&
        value !== undefined &&
        value !== "" &&
        ![
          "from_date",
          "to_date",
          "date_field",
          "status",
          "page_size",
          "sort_by",
          "sort_order",
        ].includes(key),
    )
    .map(([key, value]) => ({
      key,
      value,
      label: getActiveFilterLabel(key, value),
    }))
    .filter((filter) => filter.label);

  const hasDateFilter = filters.from_date || filters.to_date;
  const selectedDateField =
    DATE_FIELD_OPTIONS.find((opt) => opt.value === filters.date_field) ||
    DATE_FIELD_OPTIONS[0];

  // ============================================
  // STATUS BADGE
  // ============================================
  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;

    return (
      <span className={`${styles.statusBadge} ${styles[config.class]}`}>
        <AlertCircle size={14} />
        {config.label}
      </span>
    );
  };

  // ============================================
  // ACTION BUTTONS - REFACTORED
  // ============================================
  const ActionButton = ({
    onClick,
    disabled,
    isLoading,
    className,
    children,
  }) => (
    <button
      className={styles[className]}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading && (
        <CircularProgress
          size={16}
          style={{
            marginRight: 8,
            color: className === "cancelButton" ? "#dc2626" : "white",
          }}
        />
      )}
      {children}
    </button>
  );

  const renderActionButtons = () => {
    if (!hasSelection) return null;

    const removeButton = (
      <button className={styles.removeButton} onClick={onRemoveSelection}>
        {selectedInvoices.length} Remove Selection
      </button>
    );

    switch (activeTab) {
      case "DRAFT":
        return (
          <>
            {removeButton}
            <ActionButton
              onClick={onMarkIssued}
              isLoading={isMarkingIssued}
              className="actionButton"
            >
              Mark Issued
            </ActionButton>
          </>
        );

      case "Issued":
        return (
          <>
            {removeButton}
            <ActionButton
              onClick={onMarkPaid}
              isLoading={isMarkingPaid}
              className="paidButton"
            >
              Mark Paid
            </ActionButton>
            <ActionButton
              isLoading={isMarkingDraft}
              onClick={onMarkDraft}
              className="actionButton"
            >
              Mark Draft
            </ActionButton>
          </>
        );

      case "Paid":
        return (
          <>
            {removeButton}
            <ActionButton
              onClick={onMarkIssued}
              isLoading={isMarkingIssued}
              className="paidButton"
            >
              Mark Issued
            </ActionButton>
            <ActionButton
              isLoading={isMarkingDraft}
              onClick={onMarkDraft}
              className="actionButton"
            >
              Mark Draft
            </ActionButton>
          </>
        );
      case "Cancelled":
        return (
          <>
            {removeButton}

            <ActionButton
              isLoading={isMarkingDraft}
              onClick={onMarkDraft}
              className="actionButton"
            >
              Mark Draft
            </ActionButton>
          </>
        );

      default:
        return <>{removeButton}</>;
    }
  };

  // ============================================
  // DATE FILTER HANDLERS
  // ============================================
  const handleApplyDateFilterClick = () => {
    onApplyDateFilter();
    setFilterDialogOpen(false);
  };

  const handleClearDateFilterClick = () => {
    onClearDateFilter();
    setFilterDialogOpen(false);
  };

  const handleRemoveFilterChip = (filterKey) => {
    onFilterChange(filterKey, null);
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className={styles.invoiceTableContainer}>
      {/* Fixed Header */}
      <div className={styles.header}>
        <div className={styles.tabsContainer}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.activeTab : ""}`}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Only show filters when no selection */}
        {!hasSelection && (
          <section
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {/* Entity Filter Dropdown */}
            {filterDropdowns.map((dropdown) => (
              <FilterDropdown
                key={dropdown.filterKey}
                label={dropdown.label}
                placeholder={dropdown.placeholder}
                icon={dropdown.icon}
                options={dropdown.options}
                selectedValue={filters[dropdown.filterKey]}
                onSelect={(option) =>
                  onFilterChange(dropdown.filterKey, option.value)
                }
                onSearchChange={dropdown.onSearchChange}
                isSearching={dropdown.isSearching}
                emptyStateMessage={dropdown.emptyStateMessage}
                enableLocalSearch={dropdown.enableLocalSearch}
                isLoading={false}
              />
            ))}

            {/* Date Range Filter Button */}
            <div className={styles.dateFilterWrapper} ref={datePickerRef}>
              <button
                className={`${styles.dateFilterButton} ${hasDateFilter ? styles.active : ""}`}
                onClick={() => setFilterDialogOpen(!filterDialogOpen)}
              >
                <Calendar size={16} />
                <span>
                  {hasDateFilter
                    ? ` ${formatDateRange(filters.from_date, filters.to_date)}`
                    : "Date Filters"}
                </span>
              </button>

              {/* Date Picker Dropdown */}
              {filterDialogOpen && (
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
                          onTempDateRangeChange({
                            ...tempDateRange,
                            from_date: e.target.value,
                          })
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
                          onTempDateRangeChange({
                            ...tempDateRange,
                            to_date: e.target.value,
                          })
                        }
                        className={styles.dateInput}
                        min={tempDateRange.from_date || undefined}
                      />
                    </div>
                  </div>

                  <div className={styles.datePickerActions}>
                    <button
                      className={styles.clearDateButton}
                      onClick={handleClearDateFilterClick}
                    >
                      Clear
                    </button>
                    <button
                      className={styles.applyDateButton}
                      onClick={handleApplyDateFilterClick}
                      disabled={
                        !tempDateRange.from_date && !tempDateRange.to_date
                      }
                    >
                      Apply Filter
                    </button>
                  </div>
                </div>
              )}
            </div>

            <input
              id="search_input"
              type="text"
              className={styles.searchInput}
              placeholder="Search invoice number"
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearchApply()}
            />

            {searchInput ? (
              <button
                className={styles.clearSearchButton}
                onClick={onSearchClear}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            ) : (
              <button
                className={styles.searchButton}
                onClick={onSearchApply}
                disabled={!searchInput.trim()}
              >
                Search
              </button>
            )}

            {/* Clear All Filters Button */}
            {hasActiveFilters && (
              <button
                className={styles.clearAllButton}
                onClick={onClearAllFilters}
              >
                Clear All Filters
              </button>
            )}
          </section>
        )}

        {hasSelection && (
          <div className={styles.headerActions}>{renderActionButtons()}</div>
        )}
      </div>

      {/* Active Filter Chips - Only show when no selection */}
      {!hasSelection && (activeFiltersList.length > 0 || hasDateFilter) && (
        <div className={styles.activeFiltersBar}>
          {hasDateFilter && (
            <div className={styles.filterChip}>
              <Calendar size={12} />
              <span className={styles.filterChipLabel}>
                {selectedDateField.label}:{" "}
                {formatDateRange(filters.from_date, filters.to_date)}
              </span>
              <button
                className={styles.filterChipRemove}
                onClick={() => onClearDateFilter()}
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
                onClick={() => handleRemoveFilterChip(filter.key)}
                aria-label={`Remove ${filter.label} filter`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className={styles.tableWrapper}>
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <CircularProgress color="grey" size={40} />
          </div>
        )}

        <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              <th className={styles.checkboxCell}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className={styles.checkbox}
                />
              </th>
              <th>Client Details</th>
              <th>Invoice Number</th>
              <th>Invoice ID</th>
              {SORTABLE_COLUMNS.map(({ column, label }) => (
                <SortableHeader key={column} column={column} label={label} />
              ))}
              <th>Status</th>
            </tr>
          </thead>

          <tbody className={styles.tableBody}>
            {!isLoading && invoices.length === 0 && (
              <tr>
                <td colSpan={8} className={styles.emptyCell}>
                  No invoices found
                </td>
              </tr>
            )}

            {!isLoading &&
              invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className={styles.tableRow}
                  onClick={(e) => {
                    if (e.target.type !== "checkbox") {
                      onRowClick(invoice);
                    }
                  }}
                >
                  <td className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={selectedInvoices.includes(invoice.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        onSelectionChange(invoice.id);
                      }}
                      className={styles.checkbox}
                    />
                  </td>

                  <td className={styles.clientCell}>
                    <div className={styles.clientName}>
                      {invoice.entity?.name || "N/A"}
                    </div>
                    <div className={styles.clientEmail}>
                      {invoice.entity?.email || ""}
                    </div>
                  </td>

                  <td className={styles.invoiceNumberCell}>
                    <div className={styles.invoiceNumber}>
                      {invoice?.external_number
                        ? invoice.external_number
                        : "--"}
                    </div>
                    <div className={styles.companyName}>
                      {invoice.company_profile?.name || ""}
                    </div>
                  </td>
                  <td className={styles.invoiceNumberCell}>
                    <div className={styles.invoiceNumber}>
                      {invoice?.internal_number
                        ? invoice.internal_number
                        : "--"}
                    </div>
                  </td>

                  <td>{formatDate(invoice.created_at)}</td>
                  <td>{formatDate(invoice.issued_at)}</td>
                  <td>{formatDate(invoice.paid_at)}</td>
                  <td>{getStatusBadge(invoice.status)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Footer with Pagination */}
      <div className={styles.footer}>
        <div className={styles.itemsInfo}>
          Showing {Math.min(invoices.length, itemsPerPage)} of {totalCount}{" "}
          Invoices
        </div>

        <div className={styles.paginationControls}>
          <div className={styles.itemsPerPage}>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className={styles.select}
            >
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

          <div className={styles.pagination}>
            <button
              className={styles.paginationButton}
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoadingPrev}
            >
              {isLoadingPrev ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <ChevronLeft size={16} />
              )}
              Prev
            </button>
            <span className={styles.pageNumber}>
              Page {currentPage} of {Math.ceil(totalCount / itemsPerPage) || 1}
            </span>
            <button
              className={styles.paginationButton}
              onClick={() => onPageChange(currentPage + 1)}
              disabled={
                currentPage * itemsPerPage >= totalCount || isLoadingNext
              }
            >
              Next
              {isLoadingNext ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTable;
