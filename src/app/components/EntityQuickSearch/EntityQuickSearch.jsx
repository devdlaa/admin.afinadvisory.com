"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Search,
  X,
  Building2,
  User,
  Loader2,
  Plus,
  ChevronDown,
  AlertCircle,
  Link2,
} from "lucide-react";
import style from "./EntityQuickSearch.module.scss";

import {
  quickSearchEntities,
  clearQuickSearch,
  selectQuickSearchResults,
  selectIsLoading,
  selectError,
} from "@/store/slices/entitySlice";

const EntityQuickSearch = ({
  onSelect,
  onCreateNew,
  placeholder = "Search entities by name, PAN, or phone...",
  buttonText = "Link to Entity",
  className = "",
  disabled = false,
}) => {
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Redux state
  const searchResults = useSelector(selectQuickSearchResults);
  const isSearching = useSelector((state) =>
    selectIsLoading(state, "quickSearch")
  );
  const searchError = useSelector((state) => selectError(state, "quickSearch"));

  // Local state
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Debounce search
  useEffect(() => {
    if (!searchTerm.trim()) {
      dispatch(clearQuickSearch());
      return;
    }

    const timer = setTimeout(() => {
      dispatch(quickSearchEntities({ search: searchTerm, limit: 20 }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, dispatch]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && searchResults[focusedIndex]) {
          handleSelect(searchResults[focusedIndex]);
        }
        break;
      case "Escape":
        handleClose();
        break;
    }
  };

  // Handle entity selection
  const handleSelect = (entity) => {
    onSelect(entity);
    handleClose();
  };

  // Handle close
  const handleClose = () => {
    setIsOpen(false);
    setSearchTerm("");
    setFocusedIndex(-1);
    dispatch(clearQuickSearch());
  };

  // Handle clear
  const handleClear = () => {
    setSearchTerm("");
    dispatch(clearQuickSearch());
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle open
  const handleOpen = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  // Get entity type icon
  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case "COMPANY":
      case "FIRM":
      case "LLP":
        return <Building2 size={16} />;
      case "INDIVIDUAL":
      case "PROPRIETOR":
        return <User size={16} />;
      default:
        return <Building2 size={16} />;
    }
  };

  // Get entity type label
  const getEntityTypeLabel = (entityType) => {
    const labels = {
      COMPANY: "Company",
      INDIVIDUAL: "Individual",
      FIRM: "Firm",
      LLP: "LLP",
      PROPRIETOR: "Proprietor",
      HUF: "HUF",
      TRUST: "Trust",
      AOP: "AOP",
      GOI: "GOI",
      FOREIGN_COMPANY: "Foreign Co.",
    };
    return labels[entityType] || entityType;
  };

  const showEmpty =
    !isSearching && searchResults.length === 0 && searchTerm.trim();

  return (
    <div ref={dropdownRef} className={`${style.container} ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={style.triggerBtn}
      >
        <Link2 size={16} />
        <span>{buttonText}</span>
        <ChevronDown size={16} className={style.chevron} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={style.dropdown}>
          {/* Search Input Header */}
          <div className={style.searchHeader}>
            <div className={style.searchInputWrapper}>
              <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className={style.searchInput}
                autoFocus
              />

              {isSearching ? (
                <div className={style.loadingIcon}>
                  <Loader2 size={16} className={style.spinner} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleClear}
                  className={style.clearBtn}
                  tabIndex={-1}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Dropdown Body */}
          <div className={style.dropdownBody}>
            {/* Error State */}
            {searchError && (
              <div className={style.errorState}>
                <AlertCircle size={20} />
                <p>{searchError}</p>
              </div>
            )}

            {/* Loading State */}
            {isSearching && searchResults.length === 0 && (
              <div className={style.loadingState}>
                <Loader2 size={24} className={style.spinner} />
                <p>Searching entities...</p>
              </div>
            )}

            {/* Results List */}
            {!isSearching && searchResults.length > 0 && (
              <div className={style.resultsList}>
                {searchResults.map((entity, index) => (
                  <div
                    key={entity.id}
                    className={`${style.resultItem} ${
                      focusedIndex === index ? style.focused : ""
                    }`}
                    onClick={() => handleSelect(entity)}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    <div className={style.entityIcon}>
                      {getEntityIcon(entity.entity_type)}
                    </div>

                    <div className={style.entityInfo}>
                      <div className={style.entityName}>{entity.name}</div>
                      <div className={style.entityMeta}>
                        {entity.pan && (
                          <span className={style.pan}>PAN: {entity.pan}</span>
                        )}
                        <span className={style.separator}>•</span>
                        <span className={style.type}>
                          {getEntityTypeLabel(entity.entity_type)}
                        </span>
                      </div>
                    </div>

                    <div className={style.selectIndicator}>
                      <ChevronDown size={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {showEmpty && (
              <div className={style.emptyState}>
                <Building2 size={32} />
                <h4>No entities found</h4>
                <p>Try a different search term or create a new entity</p>
                {onCreateNew && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onCreateNew();
                    }}
                    className={style.createBtn}
                  >
                    <Plus size={16} />
                    Create New Entity
                  </button>
                )}
              </div>
            )}

            {/* Search hint */}
            {!searchTerm.trim() &&
              searchResults.length === 0 &&
              !isSearching && (
                <div className={style.hintState}>
                  <Search size={24} />
                  <p>Start typing to search for entities...</p>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityQuickSearch;
