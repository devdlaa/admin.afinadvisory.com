import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { CircularProgress } from "@mui/material";
import { truncateText } from "@/utils/utils";
import "./GenericActionBar.scss";

const GenericActionBar = ({
  // Configuration
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
  
  // Redux selectors (functions that take state and return data)
  selectors: {
    selectStats,
    selectLoadingStates,
    selectActiveStates,
    selectSearchState,
  },
  
  // Redux actions
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
  
  // Search configuration
  searchOptions = [],
  detectField = null, // function to detect field from input value
  
  // Event handlers
  onFilterClick,
  onExport,
  onAddNew,
}) => {
  const dispatch = useDispatch();
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Redux selectors
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

  const { loading, searchLoading, exportLoading } = useSelector(selectLoadingStates);
  const { isSearchActive, isFilterActive } = useSelector(selectActiveStates);
  const { query: currentSearchQuery, field: currentSearchField } = useSelector(selectSearchState);

  // Sync local search query with Redux state
  useEffect(() => {
    setLocalSearchQuery(currentSearchQuery);
  }, [currentSearchQuery]);

  // Auto-fetch when we need more data for current page
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

  // Close dropdown when clicking outside
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

  // Close dropdown on escape key
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

    // Validate input format if detectField function is provided
    if (detectField) {
      const detectedField = detectField(query);
      if (!detectedField) {
        alert(
          `❌ Invalid input format. Please enter a valid ${searchOptions.map(opt => opt.label).join(', ')}.`
        );
        return;
      }
    }

    // Update Redux state and trigger search
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

    // Re-search with new field if there's an active query
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
    dispatch(clearFilters());
  };

  const handleRefresh = () => {
    setLocalSearchQuery("");
    dispatch(resetState());
    dispatch(fetchData({ cursor: null, limit: itemsPerPage }));
  };

  const handleNextPage = () => {
    if (canGoNext && !loading) {
      dispatch(goToNextPage());

      // Only fetch more data if we're in regular pagination mode and need more data
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

  const renderPagination = () => {
    return (
      <div className="generic-ab__pagination">
        <div className="generic-ab__pagination-info">
          <span>
            {currentPageSize > 0 &&
              `Page ${currentPage} (${currentPageSize} items)  `}
            | {totalCached} Total
            {isSearchActive && ` (Search Results)`}
            {isFilterActive && ` (Filtered)`}
          </span>
          {(isSearchActive || isFilterActive) && (
            <div className="generic-ab__pagination-active-filters">
              {isSearchActive && (
                <span className="generic-ab__pagination-filter-tag ftag">
                  Search: "{truncateText(currentSearchQuery, 50)}"
                  <button
                    onClick={handleClearSearch}
                    className="generic-ab__pagination- clear-tag-btn"
                    type="button"
                  >
                    <X color="black" size={12} /> Clear Filter
                  </button>
                </span>
              )}
              {isFilterActive && (
                <span className="generic-ab__pagination-filter-tag">
                  Filter Active
                  <button
                    onClick={handleClearFilter}
                    className="generic-ab__pagination-clear-tag-btn"
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

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
      </div>
    );
  };

  // Always use generic-ab as base class, add custom className if provided
  const baseClass = `generic-ab${className ? ` ${className}` : ''}`;

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
                <div className="generic-ab__search-dropdown" ref={dropdownRef}>
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
                          onClick={() => handleSearchFieldChange(option.value)}
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

        <div className="generic-ab__action-buttons">
          {isFilterActive ? (
            <button
              className="generic-ab__btn generic-ab__filter-btn generic-ab__clear-filter-btn"
              onClick={handleClearFilter}
              disabled={loading}
              type="button"
            >
              <X size={18} />
              Clear Filter
            </button>
          ) : (
            <button
              className="generic-ab__btn generic-ab__filter-btn"
              onClick={onFilterClick}
              disabled={loading}
              type="button"
            >
              <Filter size={18} />
              Filter & Search
            </button>
          )}

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
                Export Report
              </>
            )}
          </button>

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