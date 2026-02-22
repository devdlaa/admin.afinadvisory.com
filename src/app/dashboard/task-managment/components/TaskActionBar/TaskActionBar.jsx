import React from "react";
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
} from "lucide-react";

import FilterDropdown from "@/app/components/pages/FilterDropdown/FilterDropdown";
import Button from "@/app/components/shared/Button/Button";
import "./TaskActionBar.scss";

// Keys that the SLA dialog can set as filters.
// Adjust this list to match whatever keys your SLA dialog dispatches.
const SLA_FILTER_KEYS = [
  "sla_status",
  "sla_overdue",
  "deadline_status",
  "paused",
];

const TaskActionBar = ({
  filterDropdowns = [],
  activeFilters = {},
  onFilterChange,
  onClearAllFilters,
  onCreateTask,
  onToggleWorkload,
  onRefresh,
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
  onShowSLASummary,
  hasSLACritical = false,
  isSLADialogOpen = false,
  // Full redux filter object so we can detect SLA-sourced filters
  allActiveFilters = {},
}) => {
  const hasActiveFilters = Object.entries(activeFilters).some(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  // True when the user applied a filter by clicking "View" inside the SLA dialog
  const hasSLAFilterActive = SLA_FILTER_KEYS.some(
    (key) =>
      allActiveFilters[key] !== null &&
      allActiveFilters[key] !== undefined &&
      allActiveFilters[key] !== "",
  );

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
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    )
    .map(([key, value]) => ({
      key,
      value,
      label: getActiveFilterLabel(key, value),
    }))
    .filter((f) => f.label);

  // SLA pill — four states in priority order:
  //   --filter-active  filter applied (teal, highest visibility)
  //   --active         dialog is open (blue)
  //   --critical       critical items exist (pulsing red)
  //   default          grey
  const slaPillModifier = hasSLAFilterActive
    ? "task-action-bar__sla-pill--filter-active"
    : isSLADialogOpen
      ? "task-action-bar__sla-pill--active"
      : hasSLACritical
        ? "task-action-bar__sla-pill--critical"
        : "";

  const slaPillClass = ["task-action-bar__sla-pill", slaPillModifier]
    .filter(Boolean)
    .join(" ");

  const slaLabel = hasSLAFilterActive ? "SLA Filter Active" : "SLA Summary";

  const slaTitle = hasSLAFilterActive
    ? "SLA filter is applied — click to manage"
    : isSLADialogOpen
      ? "Close SLA summary"
      : hasSLACritical
        ? "SLA items need attention — click to review"
        : "Show SLA attention summary";

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
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={onCreateTask}
          >
            New Task
          </Button>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="task-action-bar__controls">
        <div className="task-action-bar__filters">
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
                {unassignedCount} UNASSIGNED TASK
              </button>
            )}

            <button
              className={`task-action-bar__magic-sort-pill${
                isMagicSortActive
                  ? " task-action-bar__magic-sort-pill--active"
                  : ""
              }`}
              onClick={onToggleMagicSort}
              title={
                isMagicSortActive
                  ? "Disable Focus Assist"
                  : "Enable Focus Assist"
              }
            >
              <Sparkles size={14} />
              Focus Assist
            </button>

            <button
              className={slaPillClass}
              onClick={onShowSLASummary}
              title={slaTitle}
            >
              <ShieldAlert size={14} />
              {slaLabel}
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
