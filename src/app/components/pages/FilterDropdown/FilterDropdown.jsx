import React, { useState, useRef, useEffect } from "react";
import { Search, X, ChevronDown, Loader2, Plus } from "lucide-react";
import "./FilterDropdown.scss";


/**
 * FilterDropdown - A reusable dropdown component with search, loading states, and more
 *
 * @param {string} label - Label for the dropdown
 * @param {string} placeholder - Placeholder text when no value selected
 * @param {React.Component} icon - Icon component to display
 * @param {Array} options - Array of {value, label, subtitle, icon, tag}
 * @param {any} selectedValue - Currently selected value
 * @param {Function} onSelect - Callback when option is selected (option) => void
 * @param {Function} onSearchChange - Async search handler (query) => void
 * @param {Function} onAddNew - Callback for "Add New" button
 * @param {string} addNewLabel - Label for add new button
 * @param {boolean} isLoading - Show loading state
 * @param {boolean} isSearching - Show searching state
 * @param {string} emptyStateMessage - Message when no results
 * @param {string} hintMessage - Hint message before searching
 * @param {boolean} enableLocalSearch - Enable client-side filtering
 * @param {boolean} lazyLoad - Load data only when dropdown opens
 * @param {Function} onLazyLoad - Callback to load data on first open
 * @param {string} className - Custom root class for styling
 * 
 * 
 */


import { truncateText } from "@/utils/client/cutils";
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
  lazyLoad = false,
  onLazyLoad = null,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasTriggeredLoad, setHasTriggeredLoad] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState("downward");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const shouldShowSearch =
    enableLocalSearch || options.length > 10 || onSearchChange;

  // Click outside to close
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

  // Auto-focus search input
  useEffect(() => {
    if (isOpen && shouldShowSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, shouldShowSearch]);

  // Debounced async search
  useEffect(() => {
    if (!onSearchChange) return;

    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        onSearchChange(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearchChange]);

  const handleToggle = () => {
    if (!isLoading) {
      const willOpen = !isOpen;
      setIsOpen(willOpen);

      // Calculate available space and determine dropdown direction
      if (willOpen && dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 400; // max-height of dropdown

        // If not enough space below and more space above, open upward
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          setDropdownDirection("upward");
        } else {
          setDropdownDirection("downward");
        }
      }

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

  const rootClass = `filter-dropdown ${className}`.trim();

  return (
    <div className={rootClass} ref={dropdownRef}>
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
            {Icon && (
              <span className="filter-dropdown__icon">
                <Icon size={16} />
              </span>
            )}
            <span className="filter-dropdown__text">{truncateText(displayText,45)}</span>
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
            <>
              {!hasSelection && (
                <ChevronDown size={16} className="filter-dropdown__chevron" />
              )}
            </>
          )}
        </div>
      </button>

      {isOpen && (
        <div
          className={`filter-dropdown__menu ${
            dropdownDirection === "upward"
              ? "filter-dropdown__menu--upward"
              : ""
          }`}
        >
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

export default FilterDropdown;
