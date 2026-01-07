import React from "react";
import {
  Plus,
  Users,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  X,
  ListCheckIcon,
} from "lucide-react";
import FilterDropdown from "@/app/components/FilterDropdown/FilterDropdown";
import Button from "@/app/components/Button/Button";
import "./TaskActionBar.scss";

/**
 * TaskActionBar - Custom action bar for the tasks page
 *
 * @param {Array} filterDropdowns - Array of filter dropdown configurations
 * @param {Object} activeFilters - Current filter values {entity_id, task_category_id, assigned_to}
 * @param {Function} onFilterChange - Callback when filter changes (filterKey, value) => void
 * @param {Function} onClearAllFilters - Callback to clear all filters
 * @param {Function} onCreateTask - Callback for creating new task

 * @param {Function} onToggleWorkload - Callback for toggling workload view
 * @param {boolean} showWorkload - Current workload visibility state
 * @param {number} totalCount - Total number of tasks
 * @param {number} filteredCount - Number of filtered tasks
 * @param {boolean} isLoading - Loading state for refresh
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {Function} onPageChange - Callback when page changes (page) => void
 * @param {boolean} isPaginationLoading - Loading state for pagination
 */
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
}) => {
  const hasActiveFilters = Object.values(activeFilters).some(
    (value) => value !== null && value !== undefined && value !== ""
  );

  const getActiveFilterLabels = () => {
    const labels = [];

    return labels;
  };

  const activeFilterLabels = getActiveFilterLabels();

  const handleRemoveFilter = (filterKey) => {
    onFilterChange(filterKey, null);
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

  return (
    <div className="task-action-bar">
      {/* Header Section */}
      <div className="task-action-bar__header">
        <div className="task-action-bar__title-section">
          <div className="task-action-bar__icon">
            <ListCheckIcon />
          </div>
          <div className="task-action-bar__title-content">
            <h1 className="task-action-bar__title">Tasks Managment</h1>
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

      {/* Filters and Actions Section */}
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

      {/* Pagination and Meta Info Strip */}
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
          </div>

          {activeFilterLabels.length > 0 && (
            <div className="task-action-bar__active-filters">
              <span className="task-action-bar__filters-label">
                Applied filters:
              </span>
              <div className="task-action-bar__filter-tags">
                {activeFilterLabels.map((filter) => (
                  <div key={filter.key} className="task-action-bar__filter-tag">
                    <span className="task-action-bar__filter-tag-text">
                      <span className="task-action-bar__filter-tag-label">
                        {filter.label}:
                      </span>{" "}
                      {filter.value}
                    </span>
                    <button
                      className="task-action-bar__filter-tag-remove"
                      onClick={() => handleRemoveFilter(filter.key)}
                      title="Remove filter"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
