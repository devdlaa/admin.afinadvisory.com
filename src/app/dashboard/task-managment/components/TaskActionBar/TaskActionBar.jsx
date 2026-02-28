import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Users,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  X,
  ListCheckIcon,
  Sparkles,
  ShieldAlert,
  Search,
  Timer,
  Building2,
  CalendarRange,
  ChevronDown,
  CalendarHeart,
} from "lucide-react";

import FilterDropdown from "@/app/components/pages/FilterDropdown/FilterDropdown";
import Button from "@/app/components/shared/Button/Button";
import "./TaskActionBar.scss";

// ── Filter key groups ──────────────────────────────────────────────────────
const SLA_FILTER_KEYS = [
  "sla_status",
  "sla_due_date_from",
  "sla_due_date_to",
  "sla_paused_before",
  "due_date_from",
  "due_date_to",
];

// Aging uses ONLY created_date_from + created_date_to set by the AgingBoard,
// identified by the presence of created_date_from (AgingBoard always sets both).
// DateRangeFilter can also set created_date_from/to — we tell them apart by
// a dedicated flag: when AgingBoard applies its filter it also sets
// `aging_filter_active: true` in Redux. However, since we can't change the
// backend shape right now, we use a simpler heuristic:
//   • Aging filter  → created_date_to is set AND created_date_from is null
//                     (AgingBoard only sets the "to" bound)
//   • Date Range    → created_date_from and/or created_date_to both come
//                     from user interaction in DateRangeFilter
//
// To make this unambiguous we introduce a lightweight sentinel key
// `aging_active` that lives only in the Redux filter map (never sent to API).
// AgingBoard sets it; DateRangeFilter clears it.
const AGING_SENTINEL_KEY = "aging_active";

// ── ISO datetime helpers ───────────────────────────────────────────────────
/**
 * Convert a plain date string "YYYY-MM-DD" from <input type="date"> to the
 * ISO-8601 datetime the API requires: "YYYY-MM-DDT00:00:00Z" (from-date)
 * or "YYYY-MM-DDT23:59:59Z" (to-date, inclusive).
 */
const toISOFrom = (dateStr) => {
  if (!dateStr) return null;
  return `${dateStr}T00:00:00Z`;
};

const toISOTo = (dateStr) => {
  if (!dateStr) return null;
  return `${dateStr}T23:59:59Z`;
};

/**
 * Extract plain "YYYY-MM-DD" from an ISO datetime string so we can populate
 * <input type="date"> correctly when re-opening the dropdown.
 */
const fromISO = (isoStr) => {
  if (!isoStr) return "";
  return isoStr.slice(0, 10); // "YYYY-MM-DD"
};

// ── DateRangeFilter — inline dropdown component ────────────────────────────
const DATE_TYPE_OPTIONS = [
  { value: "created", label: "Creation Date" },
  { value: "due", label: "Due Date" },
];

function DateRangeFilter({ allActiveFilters, onFilterChange }) {
  const [open, setOpen] = useState(false);
  const [dateType, setDateType] = useState("created"); // "created" | "due"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const ref = useRef(null);

  // Derive active state — but EXCLUDE values that were set by AgingBoard
  const agingIsActive = !!allActiveFilters[AGING_SENTINEL_KEY];

  const hasCreatedRange =
    !agingIsActive &&
    (allActiveFilters.created_date_from || allActiveFilters.created_date_to);
  const hasDueRange =
    allActiveFilters.due_date_from || allActiveFilters.due_date_to;
  const isActive = hasCreatedRange || hasDueRange;

  // Sync local state when external filters change (e.g. clear all)
  useEffect(() => {
    if (!hasCreatedRange && !hasDueRange) {
      setFromDate("");
      setToDate("");
    }
  }, [hasCreatedRange, hasDueRange]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    // Pre-populate fields from current filters when opening
    if (dateType === "created") {
      setFromDate(fromISO(allActiveFilters.created_date_from));
      setToDate(fromISO(allActiveFilters.created_date_to));
    } else {
      setFromDate(fromISO(allActiveFilters.due_date_from));
      setToDate(fromISO(allActiveFilters.due_date_to));
    }
    setOpen((v) => !v);
  };

  const handleDateTypeChange = (type) => {
    setDateType(type);
    if (type === "created") {
      setFromDate(fromISO(allActiveFilters.created_date_from));
      setToDate(fromISO(allActiveFilters.created_date_to));
    } else {
      setFromDate(fromISO(allActiveFilters.due_date_from));
      setToDate(fromISO(allActiveFilters.due_date_to));
    }
  };

  const handleApply = () => {
    if (dateType === "created") {
      onFilterChange("created_date_from", toISOFrom(fromDate));
      onFilterChange("created_date_to", toISOTo(toDate));
      // Clear the other type
      onFilterChange("due_date_from", null);
      onFilterChange("due_date_to", null);
    } else {
      onFilterChange("due_date_from", toISOFrom(fromDate));
      onFilterChange("due_date_to", toISOTo(toDate));
      // Clear the other type
      onFilterChange("created_date_from", null);
      onFilterChange("created_date_to", null);
    }
    // Clear the aging sentinel so aging pill deactivates
    onFilterChange(AGING_SENTINEL_KEY, null);
    setOpen(false);
  };

  const handleClear = () => {
    setFromDate("");
    setToDate("");
    onFilterChange("created_date_from", null);
    onFilterChange("created_date_to", null);
    onFilterChange("due_date_from", null);
    onFilterChange("due_date_to", null);
    onFilterChange(AGING_SENTINEL_KEY, null);
    setOpen(false);
  };

  // Build label for button
  const activeType = hasCreatedRange ? "created" : hasDueRange ? "due" : null;
  const activeLabel =
    activeType === "created"
      ? "Creation Date"
      : activeType === "due"
        ? "Due Date"
        : "Date Range";

  const fromVal =
    activeType === "created"
      ? allActiveFilters.created_date_from
      : activeType === "due"
        ? allActiveFilters.due_date_from
        : null;
  const toVal =
    activeType === "created"
      ? allActiveFilters.created_date_to
      : activeType === "due"
        ? allActiveFilters.due_date_to
        : null;

  const formatDate = (isoStr) => {
    if (!isoStr) return null;
    const dt = new Date(isoStr);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  const rangeText =
    fromVal || toVal
      ? `${formatDate(fromVal) || "…"} → ${formatDate(toVal) || "…"}`
      : null;

  // Disabled when aging filter is active (they share created_date keys)
  const isDisabledByAging = agingIsActive && !hasDueRange;

  return (
    <div className="task-action-bar__date-range-wrap" ref={ref}>
      <button
        className={`task-action-bar__date-range-btn${isActive ? " task-action-bar__date-range-btn--active" : ""}${isDisabledByAging ? " task-action-bar__date-range-btn--locked" : ""}`}
        onClick={isDisabledByAging ? undefined : handleOpen}
        title={
          isDisabledByAging
            ? "Clear Aging filter first to use Date Range on creation date"
            : "Filter by date range"
        }
        disabled={isDisabledByAging}
      >
        <CalendarHeart size={14} />
        <span className="task-action-bar__date-range-label">
          {isActive ? (
            <>
              <span className="task-action-bar__date-range-type">
                {activeLabel}:
              </span>
              <span className="task-action-bar__date-range-value">
                {rangeText}
              </span>
            </>
          ) : (
            "Date Range"
          )}
        </span>
        {isActive ? (
          <span
            className="task-action-bar__date-range-clear"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            title="Clear date filter"
          >
            <X size={11} />
          </span>
        ) : (
          <ChevronDown
            size={12}
            className="task-action-bar__date-range-chevron"
          />
        )}
      </button>

      {open && (
        <div className="task-action-bar__date-dropdown">
          {/* Date type selector */}
          <div className="task-action-bar__date-type-row">
            {DATE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`task-action-bar__date-type-btn${dateType === opt.value ? " task-action-bar__date-type-btn--active" : ""}`}
                onClick={() => handleDateTypeChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Date inputs */}
          <div className="task-action-bar__date-fields">
            <div className="task-action-bar__date-field">
              <label className="task-action-bar__date-label">From</label>
              <input
                type="date"
                className="task-action-bar__date-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                max={toDate || undefined}
              />
            </div>
            <div className="task-action-bar__date-field">
              <label className="task-action-bar__date-label">To</label>
              <input
                type="date"
                className="task-action-bar__date-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate || undefined}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="task-action-bar__date-actions">
            <button
              className="task-action-bar__date-clear-btn"
              onClick={handleClear}
            >
              Clear
            </button>
            <button
              className="task-action-bar__date-apply-btn"
              onClick={handleApply}
              disabled={!fromDate && !toDate}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
const TaskActionBar = ({
  filterDropdowns = [],
  activeFilters = {},
  onFilterChange,
  onClearAllFilters,
  onCreateTask,
  onToggleWorkload,
  onRefresh,
  onOpenSearch,
  showWorkload = false,
  totalCount = 0,
  filteredCount = 0,
  isTaskLoading,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  isPaginationLoading = false,
  unassignedCount = 0,
  unassignedCountLoading = false,
  onToggleUnassigned,
  isUnassignedFilterActive,
  onToggleMagicSort,
  isMagicSortActive = false,
  // Without-client pill
  isWithoutClientActive = false,
  onToggleWithoutClient,
  // SLA props
  onShowSLASummary,
  hasSLACritical = false,
  isSLADialogOpen = false,
  // Aging props
  onShowAgingBoard,
  isAgingDialogOpen = false,
  // All filters for derived state
  allActiveFilters = {},
}) => {
  const hasActiveFilters = Object.entries(activeFilters).some(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  // ── Conflict detection ────────────────────────────────────────────────────
  // Aging is active when the sentinel key is set (set by AgingBoard, cleared
  // by DateRangeFilter and handleClearAllFilters).
  const agingIsActive = !!allActiveFilters[AGING_SENTINEL_KEY];

  const hasSLAFilterActive = SLA_FILTER_KEYS.some(
    (key) =>
      allActiveFilters[key] !== null &&
      allActiveFilters[key] !== undefined &&
      allActiveFilters[key] !== "",
  );

  // Date range is active when created or due date filters exist AND aging is NOT the source
  const hasDateRangeCreated =
    !agingIsActive &&
    (allActiveFilters.created_date_from || allActiveFilters.created_date_to);
  const hasDateRangeDue =
    allActiveFilters.due_date_from || allActiveFilters.due_date_to;
  const hasDateRangeFilterActive = !!(hasDateRangeCreated || hasDateRangeDue);

  const slaLockedByAging = agingIsActive && !hasSLAFilterActive;
  const agingLockedBySLA = hasSLAFilterActive && !agingIsActive;

  const handleRemoveFilter = (filterKey) => onFilterChange(filterKey, null);

  const handlePrevPage = () => {
    if (currentPage > 1 && !isPaginationLoading && onPageChange)
      onPageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && !isPaginationLoading && onPageChange)
      onPageChange(currentPage + 1);
  };

  const getActiveFilterLabel = (filterKey, value) => {
    const dropdown = filterDropdowns.find((d) => d.filterKey === filterKey);
    if (!dropdown) return null;
    const option = dropdown.options.find((opt) => opt.value === value);
    return option ? option.label : null;
  };

  const activeFiltersList = Object.entries(activeFilters)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ({
      key,
      value,
      label: getActiveFilterLabel(key, value),
    }))
    .filter((f) => f.label);

  // ── SLA pill ──────────────────────────────────────────────────────────────
  const slaPillModifier = hasSLAFilterActive
    ? "task-action-bar__sla-pill--filter-active"
    : isSLADialogOpen
      ? "task-action-bar__sla-pill--active"
      : hasSLACritical
        ? "task-action-bar__sla-pill--critical"
        : slaLockedByAging
          ? "task-action-bar__sla-pill--locked"
          : "";

  const slaPillClass = ["task-action-bar__sla-pill", slaPillModifier]
    .filter(Boolean)
    .join(" ");

  const slaLabel = hasSLAFilterActive ? "SLA Filter Active" : "SLA Summary";

  const slaTitle = slaLockedByAging
    ? "Clear Aging filters first to use SLA filters"
    : hasSLAFilterActive
      ? "SLA filter is applied — click to manage"
      : isSLADialogOpen
        ? "Close SLA summary"
        : hasSLACritical
          ? "SLA items need attention — click to review"
          : "Show SLA attention summary";

  // ── Aging pill ────────────────────────────────────────────────────────────
  const agingPillModifier = agingIsActive
    ? "task-action-bar__aging-pill--filter-active"
    : isAgingDialogOpen
      ? "task-action-bar__aging-pill--active"
      : agingLockedBySLA
        ? "task-action-bar__aging-pill--locked"
        : hasDateRangeFilterActive
          ? "task-action-bar__aging-pill--locked"
          : "";

  const agingPillClass = ["task-action-bar__aging-pill", agingPillModifier]
    .filter(Boolean)
    .join(" ");

  const agingLabel = agingIsActive ? "Aging Filter Active" : "Aging Tasks";

  const agingLockedByDateRange = hasDateRangeCreated && !agingIsActive;

  const agingTitle = agingLockedBySLA
    ? "Clear SLA filters first to use Aging filters"
    : agingLockedByDateRange
      ? "Clear Date Range (Creation Date) filter first to use Aging"
      : agingIsActive
        ? "Aging filter is applied — click to manage"
        : isAgingDialogOpen
          ? "Close Aging board"
          : "Show aging tasks by status & age";

  const agingDisabled = agingLockedBySLA || agingLockedByDateRange;

  return (
    <div className="task-action-bar">
      {/* Header */}
      <div className="task-action-bar__header">
        <div className="task-action-bar__title-section">
          <div className="task-action-bar__icon">
            <ListCheckIcon />
          </div>
          <div className="task-action-bar__title-content">
            <h1 className="task-action-bar__title">Tasks Management</h1>
            <p className="task-action-bar__subtitle">
              Manage and track all your tasks in one place
            </p>
          </div>
        </div>
        <div className="task-action-bar__actions">
          <Button variant="primary" size="md" icon={Plus} onClick={onCreateTask}>
            New Task
          </Button>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="task-action-bar__controls">
        <div className="task-action-bar__filters">
          {filterDropdowns
            .filter((d) => d.filterKey !== "entity_missing")
            .map((dropdown) => (
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
                onAddNew={dropdown.onAddNew}
                addNewLabel={dropdown.addNewLabel}
                isLoading={dropdown.isLoading}
                isSearching={dropdown.isSearching}
                emptyStateMessage={dropdown.emptyStateMessage}
                hintMessage={dropdown.hintMessage}
                enableLocalSearch={dropdown.enableLocalSearch}
                lazyLoad={dropdown.lazyLoad}
                onLazyLoad={dropdown.onLazyLoad}
                className="task-action-bar__filter"
              />
            ))}

          <DateRangeFilter
            allActiveFilters={allActiveFilters}
            onFilterChange={onFilterChange}
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="md"
              onClick={onClearAllFilters}
              className="task-action-bar__clear-btn"
            >
              Clear Filters
            </Button>
          )}
        </div>

        <div className="task-action-bar__right-actions">
          <Button
            variant="outline"
            size="md"
            icon={Users}
            onClick={onToggleWorkload}
            className={showWorkload ? "task-action-bar__workload-active" : ""}
          >
            {showWorkload ? "Hide Workload" : "Show Workload"}
          </Button>

          <Button
            variant="outline"
            size="md"
            icon={Search}
            onClick={onOpenSearch}
          >
            Search
          </Button>

          <Button
            variant="outline"
            size="md"
            icon={RotateCw}
            onClick={onRefresh}
            loading={isTaskLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFiltersList.length > 0 && (
        <div className="task-action-bar__active-filters">
          {activeFiltersList.map((filter) => (
            <div key={filter.key} className="task-action-bar__filter-chip">
              <span className="task-action-bar__filter-chip-label">
                {filter.label}
              </span>
              <button
                className="task-action-bar__filter-chip-remove"
                onClick={() => handleRemoveFilter(filter.key)}
                aria-label={`Remove ${filter.label} filter`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination and meta strip */}
      <div className="task-action-bar__pagination-strip">
        <div className="task-action-bar__meta-info">
          <div className="task-action-bar__meta-counts">
            <span className="task-action-bar__meta-item">
              <span className="task-action-bar__meta-label">Total:</span>
              <span className="task-action-bar__meta-value">{totalCount}</span>
            </span>

            {hasActiveFilters && (
              <>
                <span className="task-action-bar__meta-divider">|</span>
                <span className="task-action-bar__meta-item">
                  <span className="task-action-bar__meta-label">Filtered:</span>
                  <span className="task-action-bar__meta-value task-action-bar__meta-value--filtered">
                    {filteredCount}
                  </span>
                </span>
              </>
            )}

            {/* Without Client pill */}
            <button
              className={`task-action-bar__no-client-pill${
                isWithoutClientActive
                  ? " task-action-bar__no-client-pill--active"
                  : ""
              }`}
              onClick={onToggleWithoutClient}
              title={
                isWithoutClientActive
                  ? "Clear — show all tasks"
                  : "Show tasks without a linked client"
              }
            >
              <Building2 size={13} />
              Without Client
            </button>

            {/* Unassigned pill */}
            {!unassignedCountLoading && unassignedCount > 0 && (
              <button
                className={`task-action-bar__unassigned-pill${
                  isUnassignedFilterActive
                    ? " task-action-bar__unassigned-pill--active"
                    : ""
                }`}
                onClick={onToggleUnassigned}
                title={
                  isUnassignedFilterActive
                    ? "Clear unassigned filter"
                    : "Show only unassigned tasks"
                }
              >
                <span className="task-action-bar__unassigned-dot" />
                {unassignedCount} UNASSIGNED
              </button>
            )}

            {/* Focus Assist pill */}
            <button
              className={`task-action-bar__magic-sort-pill${
                isMagicSortActive
                  ? " task-action-bar__magic-sort-pill--active"
                  : ""
              }`}
              onClick={onToggleMagicSort}
              title={
                isMagicSortActive ? "Disable Focus Assist" : "Enable Focus Assist"
              }
            >
              <Sparkles size={14} />
              Focus Assist
            </button>

            {/* SLA pill */}
            <button
              className={slaPillClass}
              onClick={slaLockedByAging ? undefined : onShowSLASummary}
              title={slaTitle}
              disabled={slaLockedByAging}
            >
              <ShieldAlert size={14} />
              {slaLabel}
            </button>

            {/* Aging pill */}
            <button
              className={agingPillClass}
              onClick={agingDisabled ? undefined : onShowAgingBoard}
              title={agingTitle}
              disabled={agingDisabled}
            >
              <Timer size={14} />
              {agingLabel}
            </button>
          </div>
        </div>

        <div className="task-action-bar__pagination">
          <Button
            variant="outline"
            size="sm"
            icon={ChevronLeft}
            onClick={handlePrevPage}
            disabled={currentPage === 1 || isPaginationLoading}
            loading={isPaginationLoading && currentPage > 1}
            className="task-action-bar__pagination-btn"
          >
            Prev
          </Button>

          <div className="task-action-bar__pagination-info">
            <span className="task-action-bar__pagination-current">
              {currentPage}
            </span>
            <span className="task-action-bar__pagination-separator">/</span>
            <span className="task-action-bar__pagination-total">
              {totalPages}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={ChevronRight}
            iconPosition="right"
            onClick={handleNextPage}
            disabled={currentPage === totalPages || isPaginationLoading}
            loading={isPaginationLoading && currentPage < totalPages}
            className="task-action-bar__pagination-btn"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaskActionBar;