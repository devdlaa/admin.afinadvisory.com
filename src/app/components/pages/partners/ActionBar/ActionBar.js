import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  CirclePlus,
} from "lucide-react";
import "./ActionBar.scss";

const ActionBar = ({
  onSearch,
  onRefresh,
  onFilterClick,
  totalItems,
  itemsPerPage,
  currentPage,
  totalPages,
  onPageChange,
  onLoadMore,
  loading,
  isLoadingMore,
  hasMore,
  isSearchActive,
  isFilterActive,
  onClearSearch,
  onClearFilter,
  addInfluncerBtn,
  isAddingNewPartner,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("name");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Updated search options based on the Redux slice capabilities
  const searchOptions = [
    { value: "name", label: "Name" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "uid", label: "Influencer ID" },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside); // For mobile

    // Cleanup
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
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim(), searchField);
    }
  };

  const handleSearchFieldChange = (field) => {
    setSearchField(field);
    setShowSearchDropdown(false);

    // If there's already a search query, re-search with new field
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim(), field);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    onClearSearch();
  };

  const handleClearFilter = () => {
    onClearFilter();
  };

  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSearchDropdown(!showSearchDropdown);
  };

  const renderPagination = () => {
    return (
      <div className="pagination-container">
        <div className="pagination-info">
          <span>
            {itemsPerPage} Per Page | {totalItems} Total Influencers
          </span>
          {(isSearchActive || isFilterActive) && (
            <div className="active-filters">
              {isSearchActive && (
                <span className="filter-tag">
                  Search Active
                  <button
                    onClick={handleClearSearch}
                    className="clear-btn"
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {isFilterActive && (
                <span className="filter-tag">
                  Filter Active
                  <button
                    onClick={handleClearFilter}
                    className="clear-btn"
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            type="button"
          >
            <ChevronLeft size={16} />
            Prev
          </button>

          <span className="page-indicator">
            Page {currentPage} of {totalPages || 1}
          </span>

          <button
            className="pagination-btn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            type="button"
          >
            Next
            <ChevronRight size={16} />
          </button>

          {!isSearchActive && !isFilterActive && hasMore && (
            <button
              className="pagination-btn load-more-btn"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              type="button"
            >
              {isLoadingMore ? (
                <>
                  <RefreshCw size={16} className="spinning" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const getCurrentFieldLabel = () => {
    return (
      searchOptions.find((opt) => opt.value === searchField)?.label ||
      "Name/Username"
    );
  };

  return (
    <div className="action-bar">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <Users className="header-icon" />
            <div>
              <h1>Influencer Management</h1>
              <p>Manage your influencers and their details</p>
            </div>
          </div>
          <button
            className="action-btn add-new_partner"
            onClick={addInfluncerBtn}
            disabled={isAddingNewPartner}
          >
            <CirclePlus size={18} />
            Add new Influncer
          </button>
        </div>
      </div>
      <div className="action-bar-top">
        <div className="search-section">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <div className="search-input-container">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder={`Search by ${getCurrentFieldLabel()}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                autoComplete="off"
              />

              {/* FIXED: Dropdown implementation */}
              <div className="search-dropdown" ref={dropdownRef}>
                <button
                  type="button"
                  className="dropdown-trigger"
                  onClick={toggleDropdown}
                  aria-expanded={showSearchDropdown}
                  aria-haspopup="true"
                >
                  {getCurrentFieldLabel()}
                  <ChevronDown size={16} />
                </button>

                {showSearchDropdown && (
                  <div className="dropdown-menu" role="menu">
                    {searchOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`dropdown-item ${
                          searchField === option.value ? "active" : ""
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
            </div>

            {searchQuery.trim() ? (
              <button
                type="button"
                className="search-btn clear"
                onClick={handleClearSearch}
                title="Clear search"
              >
                <X size={18} />
                Clear
              </button>
            ) : (
              <button type="submit" className="search-btn" disabled={loading}>
                <Search size={18} /> Search
              </button>
            )}
          </form>
        </div>

        <div className="action-buttons">
          <button
            className="action-btn filter-btn"
            onClick={onFilterClick}
            disabled={loading}
            type="button"
          >
            <Filter size={18} />
            Filter List
          </button>

          <button
            className="action-btn refresh-btn"
            onClick={onRefresh}
            disabled={loading}
            type="button"
            title="Refresh data"
          >
            <RefreshCw size={18} className={loading ? "spinning" : ""} />
          </button>
        </div>
      </div>

      {renderPagination()}
    </div>
  );
};

export default ActionBar;
