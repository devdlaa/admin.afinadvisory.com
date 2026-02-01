"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Loader2, Plus } from "lucide-react";
import styles from "./CustomDropdown.module.scss";

const CustomDropdown = ({
  // Display options
  label = "",
  placeholder = "Select...",
  icon: Icon = null,
  showDropdownArrow = true,

  // Data
  options = [],
  selectedValue = null,

  // Handlers
  onSelect = () => {},
  onAddNew = null, 

  // Styling
  variant = "default",
  outlineColor = "",
  bgColor = "",

  // Config
  disabled = false,
  enableSearch = false,
  isLoading = false, // Loading state for options
  isAddingNew = false, // Loading state for add new
  addNewLabel = "Add New", // Label for add new button

  // 🔹 NEW: single parent override hook
  rootClassName = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const shouldShowSearch = enableSearch || options.length > 10;

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
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, shouldShowSearch]);

  const handleToggle = () => {
    if (!disabled && !isLoading) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchQuery("");
      }
    }
  };

  const handleOptionClick = (option) => {
    onSelect(option);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleAddNew = () => {
    if (onAddNew && !isAddingNew) {
      onAddNew();
    }
  };

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const displayText = selectedOption?.label || placeholder;

  const dropdownClasses = [
    styles.dropdown,
    variant ? styles[variant] : "",
    isOpen ? styles.open : "",
    disabled ? styles.disabled : "",
    outlineColor ? styles[`outline-${selectedOption?.borderColor}`] : "",
  ]
    .filter(Boolean)
    .join(" ");

  const buttonClasses = [
    styles.dropdownButton,
    bgColor ? styles[`bg-${bgColor}`] : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`${dropdownClasses} ${rootClassName}`} ref={dropdownRef}>
      <button
        type="button"
        className={buttonClasses}
        onClick={handleToggle}
        disabled={disabled || isLoading}
        aria-label={label || "Dropdown"}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        style={{
          borderColor: outlineColor || undefined,
          backgroundColor: selectedOption?.bgColor || undefined,
        }}
      >
        <div className={styles.buttonContent}>
          {label && <span className={styles.label}>{label}</span>}

          <div className={styles.displayArea}>
            {selectedOption?.icon && (
              <span className={styles.icon} aria-hidden="true">
                {selectedOption?.icon}
              </span>
            )}
            <span
              style={{
                color: selectedOption?.txtClr,
              }}
              className={styles.text}
            >
              {displayText}
            </span>
          </div>
        </div>

        {isLoading ? (
          <Loader2 size={18} className={styles.loader} />
        ) : (
          showDropdownArrow && <ChevronDown size={18} className={styles.chevron} />
        )}
      </button>

      {isOpen && !isLoading && (
        <div className={styles.dropdownMenu} role="listbox">
          {shouldShowSearch && (
            <div className={styles.searchContainer}>
              <Search size={18} className={styles.searchIcon} aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                onClick={(e) => e.stopPropagation()}
                aria-label="Search options"
              />
            </div>
          )}

          <div className={styles.optionsContainer}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === selectedValue;

                const optionClasses = [
                  styles.dropdownOption,
                  isSelected ? styles.selected : "",
                  option.gradient ? styles.gradient : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div
                    key={option.value}
                    className={optionClasses}
                    onClick={() => handleOptionClick(option)}
                    role="option"
                    aria-selected={isSelected}
                    style={{
                      background: option.gradient || undefined,
                      borderColor: option.outlineColor || undefined,
                    }}
                  >
                    {option?.icon && (
                      <span className={styles.optionIcon} aria-hidden="true">
                        {option?.icon}
                      </span>
                    )}
                    <span className={styles.optionLabel}>{option.label}</span>
                  </div>
                );
              })
            ) : (
              <div className={styles.noResults}>No results found</div>
            )}
          </div>

          {onAddNew && (
            <div className={styles.addNewContainer}>
              <button
                type="button"
                className={styles.addNewButton}
                onClick={handleAddNew}
                disabled={isAddingNew}
                aria-label={addNewLabel}
              >
                {isAddingNew ? (
                  <Loader2 size={16} className={styles.addNewLoader} />
                ) : (
                  <Plus size={16} aria-hidden="true" />
                )}
                <span>{addNewLabel}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;