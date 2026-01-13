import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Loader2,
  Plus,
} from "lucide-react";
import { CircularProgress } from "@mui/material";
import { truncateText } from "@/utils/server/utils";
import "./GenericActionBar.scss";

// Built-in FilterDropdown component
const FilterDropdown = ({
  label,
  placeholder = "Select...",
  icon: Icon,
  options = [],
  selectedValue,
  onSelect,
  onSearchChange = null,
  onAddNew = null,
  addNewLabel = "Add New",
  isLoading = false,
  isSearching = false,
  emptyStateMessage = "No results found",
  hintMessage = "Start typing to search...",
  enableLocalSearch = true,
  // Lazy loading props
  lazyLoad = false,
  onLazyLoad = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasTriggeredLoad, setHasTriggeredLoad] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const shouldShowSearch =
    enableLocalSearch || options.length > 10 || onSearchChange;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && shouldShowSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, shouldShowSearch]);

  // Debounced search for async
  useEffect(() => {
    if (!onSearchChange) return;

    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        onSearchChange(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleToggle = () => {
    if (!isLoading) {
      const willOpen = !isOpen;
      setIsOpen(willOpen);

      // Lazy load data on first open
      if (willOpen && lazyLoad && !hasTriggeredLoad && onLazyLoad) {
        setHasTriggeredLoad(true);
        onLazyLoad();
      }

      if (!willOpen) {
        setSearchQuery("");
      }
    }
  };

  const handleOptionClick = (option) => {
    onSelect(option);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect({ value: null, label: "" });
  };

  const handleAddNew = (e) => {
    e.stopPropagation();
    if (onAddNew) {
      setIsOpen(false);
      onAddNew();
    }
  };

  // Local filtering only if no async search handler
  const filteredOptions = onSearchChange
    ? options
    : options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const displayText = selectedOption?.label || placeholder;
  const hasSelection =
    selectedValue !== null &&
    selectedValue !== undefined &&
    selectedValue !== "";

  const showHint =
    !searchQuery.trim() &&
    !isSearching &&
    options.length === 0 &&
    onSearchChange;
  const showEmpty =
    !isSearching && filteredOptions.length === 0 && searchQuery.trim();

 

  return (
    <div className="filter-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className={`filter-dropdown__button ${
          hasSelection ? "filter-dropdown__button--selected" : ""
        }`}
        onClick={handleToggle}
        disabled={isLoading}
      >
        <div className="filter-dropdown__content">
          <div className="filter-dropdown__display">
            {selectedOption?.icon && (
              <span className="filter-dropdown__icon">
                {selectedOption.icon}
              </span>
            )}
            {Icon && !selectedOption?.icon && (
              <span className="filter-dropdown__icon">
                <Icon size={14} />
              </span>
            )}
            <span className="filter-dropdown__text">{displayText}</span>
          </div>
        </div>

        <div className="filter-dropdown__actions">
          {hasSelection && (
            <span
              className="filter-dropdown__clear"
              onClick={handleClear}
              title="Clear selection"
            >
              <X size={14} />
            </span>
          )}
          {isLoading ? (
            <Loader2 size={16} className="filter-dropdown__loader" />
          ) : (
            <ChevronDown size={16} className="filter-dropdown__chevron" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="filter-dropdown__menu">
          {shouldShowSearch && (
            <div className="filter-dropdown__search">
              <Search size={16} className="filter-dropdown__search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="filter-dropdown__search-input"
                autoComplete="off"
              />
            </div>
          )}

          <div className="filter-dropdown__options">
            {showHint && (
              <div className="filter-dropdown__hint">
                <Search size={24} />
                <p>{hintMessage}</p>
              </div>
            )}

            {isSearching && (
              <div className="filter-dropdown__loading">
                <Loader2 size={24} className="filter-dropdown__spinner" />
                <p>Searching...</p>
              </div>
            )}

            {isLoading && (
              <div className="filter-dropdown__loading">
                <Loader2 size={24} className="filter-dropdown__spinner" />
                <p>Loading {label}...</p>
              </div>
            )}

            {!showHint && !isSearching && filteredOptions.length > 0 && (
              <>
                {filteredOptions.map((option) => {
                  const isSelected = option.value === selectedValue;
                  return (
                    <div
                      key={option.value}
                      className={`filter-dropdown__option ${
                        isSelected ? "filter-dropdown__option--selected" : ""
                      }`}
                      onClick={() => handleOptionClick(option)}
                    >
                      {option.icon && (
                        <span className="filter-dropdown__option-icon">
                          {option.icon}
                        </span>
                      )}
                      <div className="filter-dropdown__option-text">
                        <div>
                          <span className="filter-dropdown__option-label">
                            {option.label}
                          </span>
                          {option.subtitle && (
                            <span className="filter-dropdown__option-subtitle">
                              {option.subtitle}
                            </span>
                          )}
                        </div>
                        {option.tag && (
                          <span className="filter-dropdown__option-tag">
                            {option.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {showEmpty && (
              <div className="filter-dropdown__empty">{emptyStateMessage}</div>
            )}
          </div>

          {onAddNew && (
            <div className="filter-dropdown__add">
              <button
                type="button"
                className="filter-dropdown__add-button"
                onClick={handleAddNew}
              >
                <Plus size={16} />
                <span>{addNewLabel}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main GenericActionBar Component
const GenericActionBar = ({
  config: {
    entityName,
    entityNamePlural,
    description,
    icon: EntityIcon,
    className = "",
    showAddButton = false,
    addButtonText = "Add New",
    addButtonIcon: AddIcon,
  },

  selectors: {
    selectStats,
    selectLoadingStates,
    selectActiveStates,
    selectSearchState,
  },

  actions: {
    fetchData,
    searchData,
    resetState,
    clearSearch,
    clearFilters,
    setSearchField,
    setSearchQuery,
    goToNextPage,
    goToPrevPage,
  },

  searchOptions = [],
  detectField = null,
  showSearch = true,

  // Filter dropdowns configuration
  filterDropdowns = [],
  activeFilters = {},
  onFilterChange = null,
  onClearAllFilters = null,
  enablePaginaiton = true,

  // Additional action buttons
  additionalActions = [],

  onFilterClick,
  onExport,
  onAddNew,
}) => {
  const dispatch = useDispatch();
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const {
    currentPage,
    itemsPerPage,
    canGoNext,
    canGoPrev,
    needsMoreData,
    cursor,
    totalCached,
    currentPageSize,
  } = useSelector(selectStats);

  const { loading, searchLoading, exportLoading } =
    useSelector(selectLoadingStates);
  const { isSearchActive, isFilterActive } = useSelector(selectActiveStates);
  const { query: currentSearchQuery, field: currentSearchField } =
    useSelector(selectSearchState);

  useEffect(() => {
    setLocalSearchQuery(currentSearchQuery);
  }, [currentSearchQuery]);

  useEffect(() => {
    if (
      needsMoreData &&
      cursor &&
      !loading &&
      !isSearchActive &&
      !isFilterActive
    ) {
      dispatch(fetchData({ cursor, limit: itemsPerPage }));
    }
  }, [
    needsMoreData,
    cursor,
    loading,
    currentPage,
    isSearchActive,
    isFilterActive,
    dispatch,
    itemsPerPage,
    fetchData,
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    const query = localSearchQuery.trim();
    if (!query) return;

    if (detectField) {
      const detectedField = detectField(query);
      if (!detectedField) {
        alert(
          `❌ Invalid input format. Please enter a valid ${searchOptions
            .map((opt) => opt.label)
            .join(", ")}.`
        );
        return;
      }
    }

    dispatch(setSearchQuery(query));
    dispatch(
      searchData({
        value: query,
        field: detectField ? detectField(query) : currentSearchField,
      })
    );
  };

  const handleSearchFieldChange = (field) => {
    dispatch(setSearchField(field));
    setShowSearchDropdown(false);

    if (localSearchQuery.trim()) {
      dispatch(setSearchQuery(localSearchQuery.trim()));
      dispatch(
        searchData({
          value: localSearchQuery.trim(),
          field: field,
        })
      );
    }
  };

  const handleClearSearch = () => {
    setLocalSearchQuery("");
    dispatch(clearSearch());
  };

  const handleClearFilter = () => {
    if (onClearAllFilters) {
      onClearAllFilters();
    } else {
      dispatch(clearFilters());
    }
  };

  const handleRefresh = () => {
    setLocalSearchQuery("");
    dispatch(resetState());
    dispatch(fetchData({ cursor: null, limit: itemsPerPage }));
  };

  const handleNextPage = () => {
    if (canGoNext && !loading) {
      dispatch(goToNextPage());

      if (!isSearchActive && !isFilterActive && needsMoreData && cursor) {
        dispatch(fetchData({ cursor, limit: itemsPerPage }));
      }
    }
  };

  const handlePrevPage = () => {
    if (canGoPrev && !loading) {
      dispatch(goToPrevPage());
    }
  };

  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSearchDropdown(!showSearchDropdown);
  };

  const getCurrentFieldLabel = () => {
    return (
      searchOptions.find((opt) => opt.value === currentSearchField)?.label ||
      searchOptions[0]?.label ||
      "Search"
    );
  };

  const activeFilterCount = Object.values(activeFilters).filter(
    (value) => value !== null && value !== "" && value !== undefined
  ).length;

  const renderPagination = () => {
    return (
      <div className="generic-ab__pagination">
        <div className="generic-ab__pagination-info">
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {currentPageSize > 0 && (
              <span className="generic-ab__info-badge generic-ab__info-badge--page">
                Page {currentPage}
              </span>
            )}

            {currentPageSize > 0 && (
              <span className="generic-ab__info-badge generic-ab__info-badge--items">
                {currentPageSize} items
              </span>
            )}

            <span className="generic-ab__info-badge generic-ab__info-badge--total">
              {totalCached} total
            </span>

            {isSearchActive && (
              <span className="generic-ab__info-badge generic-ab__info-badge--search">
                Search results
              </span>
            )}

            {isFilterActive && (
              <span className="generic-ab__info-badge generic-ab__info-badge--filtered">
                Filtered
              </span>
            )}
          </div>

          {(isSearchActive || isFilterActive) && (
            <div className="generic-ab__pagination-active-filters">
              {isSearchActive && (
                <span className="generic-ab__pagination-filter-tag ftag">
                  Search: "{truncateText(currentSearchQuery, 50)}"
                  <button
                    onClick={handleClearSearch}
                    className="clear-tag-btn"
                    type="button"
                  >
                    <X size={12} /> Clear
                  </button>
                </span>
              )}
              {isFilterActive && activeFilterCount > 0 && (
                <span className="generic-ab__pagination-filter-tag ftag">
                  {activeFilterCount} Filter{activeFilterCount > 1 ? "s" : ""}{" "}
                  Active
                  <button
                    onClick={handleClearFilter}
                    className="clear-tag-btn"
                    type="button"
                  >
                    <X size={12} /> Clear All
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
        {enablePaginaiton && (
          <>
            <div className="generic-ab__pagination-controls">
              <button
                className="generic-ab__pagination-btn"
                onClick={handlePrevPage}
                disabled={!canGoPrev || loading}
                type="button"
              >
                <ChevronLeft size={16} />
                Prev
              </button>

              <span className="generic-ab__pagination-page-indicator">
                Page {currentPage}
                {needsMoreData &&
                  !isSearchActive &&
                  !isFilterActive &&
                  " (Loading...)"}
              </span>

              <button
                className="generic-ab__pagination-btn"
                onClick={handleNextPage}
                disabled={!canGoNext || loading}
                type="button"
              >
                Next
                {loading && !isSearchActive && !isFilterActive ? (
                  <CircularProgress size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const baseClass = `generic-ab${className ? ` ${className}` : ""}`;

  return (
    <div className={baseClass}>
      <div className="generic-ab__header">
        <div className="generic-ab__header-content">
          <div className="generic-ab__header-left">
            <EntityIcon className="generic-ab__header-icon" />
            <div>
              <h1>{entityNamePlural}</h1>
              <p>{description}</p>
            </div>
          </div>
          {showAddButton && onAddNew && (
            <button
              className="generic-ab__btn generic-ab__add-btn"
              onClick={onAddNew}
              disabled={loading}
            >
              {AddIcon && <AddIcon size={18} />}
              {addButtonText}
            </button>
          )}
        </div>
      </div>

      <div className="generic-ab__controls">
        {showSearch && (
          <div className="generic-ab__search-section">
            <form
              onSubmit={handleSearchSubmit}
              className="generic-ab__search-form"
            >
              <div className="generic-ab__search-input-container">
                <Search className="generic-ab__search-icon" size={20} />
                <input
                  type="text"
                  placeholder={`Search by ${getCurrentFieldLabel()}`}
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="generic-ab__search-input"
                  autoComplete="off"
                  disabled={searchLoading}
                />

                {searchOptions.length > 0 && (
                  <div
                    className="generic-ab__search-dropdown"
                    ref={dropdownRef}
                  >
                    <button
                      type="button"
                      className="generic-ab__dropdown-trigger"
                      onClick={toggleDropdown}
                      aria-expanded={showSearchDropdown}
                      aria-haspopup="true"
                      disabled={searchLoading}
                    >
                      {getCurrentFieldLabel()}
                      <ChevronDown size={16} />
                    </button>

                    {showSearchDropdown && (
                      <div className="generic-ab__dropdown-menu" role="menu">
                        {searchOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`generic-ab__dropdown-item ${
                              currentSearchField === option.value
                                ? "generic-ab__dropdown-item--active"
                                : ""
                            }`}
                            onClick={() =>
                              handleSearchFieldChange(option.value)
                            }
                            role="menuitem"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="generic-ab__search-btn"
                disabled={searchLoading || loading || !localSearchQuery.trim()}
              >
                {searchLoading ? (
                  <>
                    <RefreshCw size={18} className="generic-ab__spinning" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={18} /> Search
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {filterDropdowns && filterDropdowns.length > 0 && (
          <div className="generic-ab__filters-section">
            {filterDropdowns.map((dropdown, index) => (
              <FilterDropdown
                key={dropdown.filterKey || index}
                {...dropdown}
                selectedValue={activeFilters[dropdown.filterKey]}
                onSelect={(option) => {
                  if (onFilterChange) {
                    onFilterChange(dropdown.filterKey, option.value);
                  }
                }}
              />
            ))}
          </div>
        )}

        <div className="generic-ab__action-buttons">
          {onFilterClick && (
            <>
              {isFilterActive && activeFilterCount > 0 ? (
                <button
                  className="generic-ab__btn generic-ab__filter-btn generic-ab__clear-filter-btn"
                  onClick={handleClearFilter}
                  disabled={loading}
                  type="button"
                >
                  <X size={18} />
                  Clear ({activeFilterCount})
                </button>
              ) : (
                <button
                  className="generic-ab__btn generic-ab__filter-btn"
                  onClick={onFilterClick}
                  disabled={loading}
                  type="button"
                >
                  <Filter size={18} />
                  Filter
                </button>
              )}
            </>
          )}

          {additionalActions &&
            additionalActions.map((action, index) => (
              <button
                key={index}
                className={`generic-ab__btn ${action.className || ""}`}
                onClick={action.onClick}
                disabled={action.disabled || loading}
                title={action.title}
                type="button"
              >
                {action.icon && <action.icon size={18} />}
                {action.label}
              </button>
            ))}

          {onExport && (
            <button
              className="generic-ab__btn generic-ab__filter-btn"
              onClick={onExport}
              disabled={exportLoading || loading}
              title="Export Report"
            >
              {exportLoading ? (
                <>
                  <RefreshCw size={18} className="generic-ab__spinning" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Export
                </>
              )}
            </button>
          )}

          <button
            className="generic-ab__btn generic-ab__refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
            type="button"
            title="Refresh data"
          >
            <RefreshCw
              size={18}
              className={loading ? "generic-ab__spinning" : ""}
            />
          </button>
        </div>
      </div>

      {renderPagination()}
    </div>
  );
};

export default GenericActionBar;
