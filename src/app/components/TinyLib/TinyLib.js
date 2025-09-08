"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  X,
  ChevronDown,
  Eye,
  EyeOff,
  Calendar,
  Copy,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Edit3,
} from "lucide-react";
import "./TinyLib.scss";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { TextField, Paper, ClickAwayListener, CircularProgress } from "@mui/material";
import { createPortal } from "react-dom";
import { styled } from "@mui/material/styles";




// ---------- SearchBar Component ----------
export const SearchBar = ({
  placeholder = "Search...",
  searchBy = ["name", "email", "userId"],
  onSearch = () => {},
  onClear = () => {},
  isLoading = false,
  disabled = false,
  className = "",
}) => {
  const [value, setValue] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(searchBy[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const isDisabled = disabled || isLoading;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setValue(e.target.value);
    onSearch(e.target.value, selectedFilter);
  };

  const handleClear = () => {
    setValue("");
    onClear();
  };

  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);
    setIsDropdownOpen(false);
    if (value) onSearch(value, filter);
  };

  // ---------- Styles ----------
  const styles = {
    wrapper: {
      position: "relative",
      width: "100%",
      fontFamily: "Poppins, sans-serif",
    },
    container: {
      display: "flex",
      border: "1.5px solid #e2e8f0",
      borderRadius: 16,
      background: "#fff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      transition: "all 0.3s ease",
      overflow: "visible",
    },
    filterWrapper: { position: "relative" },
    filterToggle: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "14px 18px",
      background: "#f1f5f9",
      border: "none",
      borderRight: "1.5px solid #e2e8f0",
      cursor: isDisabled ? "not-allowed" : "pointer",
      color: isDisabled ? "#9ca3af" : "#64748b",
      fontWeight: 500,
      fontSize: 14,
      borderRadius: "16px 0 0 16px"
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      marginTop: 4,
      background: "#fff",
      border: "1.5px solid #e2e8f0",
      borderRadius: 12,
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      zIndex: 1000,
    },
    option: (active) => ({
      display: "block",
      width: "100%",
      padding: "12px 16px",
      background: active ? "rgba(59, 130, 246, 0.1)" : "transparent",
      color: active ? "#3b82f6" : "#1e293b",
      border: "none",
      textAlign: "left",
      cursor: "pointer",
      fontWeight: active ? 500 : 400,
    }),
    inputWrapper: {
      flex: 1,
      position: "relative",
      display: "flex",
      alignItems: "center",
    },
    input: {
      flex: 1,
      padding: "14px 16px 14px 48px",
      border: "none",
      outline: "none",
      fontSize: 14,
      color: "#1e293b",
      background: "none",
    },
    iconLeft: {
      position: "absolute",
      left: 16,
      pointerEvents: "none",
      color: "#64748b",
      display : "flex",
      alignItems: "center"
    },
    iconRight: {
      position: "absolute",
      right: 16,
      background: "none",
      border: "none",
      padding: 6,
      cursor: "pointer",
      borderRadius: 8,
      color: "#64748b",
         display : "flex",
      alignItems: "center"
    },
  };

  return (
    <div style={styles.wrapper} className={className}>
      <div style={styles.container}>
        {/* Filter Dropdown */}
        <div style={styles.filterWrapper} ref={dropdownRef}>
          <button
            type="button"
            style={styles.filterToggle}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isDisabled}
          >
            {selectedFilter} <ChevronDown size={14} />
          </button>
          {isDropdownOpen && (
            <div style={styles.dropdown}>
              {searchBy.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  style={styles.option(filter === selectedFilter)}
                  onClick={() => handleFilterSelect(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Input */}
        <div style={styles.inputWrapper}>
          <div style={styles.iconLeft}>
            {isLoading ? <CircularProgress size={14} color="grey" /> : <Search size={16} />}
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            disabled={isDisabled}
            style={styles.input}
          />
          {value && !isLoading && (
            <button
              onClick={handleClear}
              disabled={isDisabled}
              style={styles.iconRight}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Input Field with Loading State
export const InputField = ({
  type = "text",
  placeholder = "",
  value = "",
  onChange = () => {},
  icon: Icon,
  disabled = false,
  isLoading = false,
  error = "",
  label = "",
  className = "",
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isDisabled = disabled || isLoading;

  return (
    <div className={`input-field ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <div
        className={`input-wrapper ${error ? "error" : ""} ${
          isLoading ? "loading" : ""
        }`}
      >
        {isLoading ? (
          <Loader2 size={16} className="input-icon loading-spin" />
        ) : (
          Icon && <Icon size={16} className="input-icon" />
        )}
        <input
          type={type === "password" && showPassword ? "text" : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isDisabled}
          className="input-control"
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="password-toggle"
            disabled={isDisabled}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <span className="input-error">{error}</span>}
    </div>
  );
};

// Enhanced Dropdown with Loading State
export const Dropdown = ({
  options = [],
  value = "",
  onChange = () => {},
  placeholder = "Select option",
  disabled = false,
  isLoading = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isDisabled = disabled || isLoading;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`dropdown ${className}`} ref={dropdownRef}>
      <button
        className={`dropdown-toggle ${isOpen ? "open" : ""} ${
          isLoading ? "loading" : ""
        }`}
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        {isLoading ? (
          <Loader2 size={16} className="dropdown-arrow loading-spin" />
        ) : (
          <ChevronDown size={16} className="dropdown-arrow" />
        )}
      </button>
      {isOpen && !isLoading && (
        <div className="dropdown-menu">
          {options.map((option) => (
            <button
              key={option.value}
              className={`dropdown-option ${
                value === option.value ? "selected" : ""
              }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Enhanced Button with Loading State
export const Button = ({
  type = "primary",
  size = "medium",
  text = "",
  icon: Icon,
  onClick = () => {},
  disabled = false,
  isLoading = false,
  className = "",
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`btn btn-${type} btn-${size} ${
        isLoading ? "loading" : ""
      } ${className}`}
      onClick={onClick}
      disabled={isDisabled}
    >
      {isLoading ? (
        <Loader2
          size={size === "small" ? 14 : size === "large" ? 18 : 16}
          className="btn-loader loading-spin"
        />
      ) : (
        Icon && (
          <Icon size={size === "small" ? 14 : size === "large" ? 18 : 16} />
        )
      )}
      {text && <span>{text}</span>}
    </button>
  );
};

// Enhanced Icon Button with Loading State
export const IconButton = ({
  icon: Icon,
  onClick = () => {},
  size = "medium",
  variant = "default",
  disabled = false,
  isLoading = false,
  className = "",
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`icon-btn icon-btn-${size} icon-btn-${variant} ${
        isLoading ? "loading" : ""
      } ${className}`}
      onClick={onClick}
      disabled={isDisabled}
    >
      {isLoading ? (
        <Loader2
          size={size === "small" ? 14 : size === "large" ? 20 : 16}
          className="loading-spin"
        />
      ) : (
        <Icon size={size === "small" ? 14 : size === "large" ? 20 : 16} />
      )}
    </button>
  );
};

// Enhanced Radio Button Group
export const RadioGroup = ({
  options = [],
  value = "",
  onChange = () => {},
  name = "radio-group",
  disabled = false,
  isLoading = false,
  className = "",
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <div className={`radio-group ${isLoading ? "loading" : ""} ${className}`}>
      {options.map((option) => (
        <label
          key={option.value}
          className={`radio-option ${isDisabled ? "disabled" : ""}`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            className="radio-input"
            disabled={isDisabled}
          />
          <span className="radio-custom">
            {isLoading && value === option.value && (
              <Loader2 size={10} className="radio-loader loading-spin" />
            )}
          </span>
          <span className="radio-label">{option.label}</span>
        </label>
      ))}
    </div>
  );
};

// Enhanced Copy Item with Loading State
export const CopyItem = ({
  value = "",
  label = "",
  onCopy = () => {},
  isLoading = false,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (isLoading) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopy(value);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className={`copy-item ${isLoading ? "loading" : ""} ${className}`}>
      {label && <span className="copy-label">{label}</span>}
      <div className="copy-container">
        <span className="copy-value">{value}</span>
        <button
          onClick={handleCopy}
          className="copy-btn"
          title="Copy to clipboard"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 size={14} className="loading-spin" />
          ) : copied ? (
            <Check size={14} />
          ) : (
            <Copy size={14} />
          )}
        </button>
      </div>
    </div>
  );
};

// Custom styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  "&.MuiPaper-root": {
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    overflow: "hidden",

    // Calendar header
    "& .MuiPickersCalendarHeader-root": {
      backgroundColor: "#f8fafc",
      borderBottom: "1px solid #f1f5f9",
      padding: "16px",
      margin: 0,
    },

    "& .MuiPickersCalendarHeader-label": {
      fontSize: "16px",
      fontWeight: 600,
      color: "#1e293b",
      fontFamily: "inherit",
    },

    "& .MuiPickersArrowSwitcher-root": {
      "& .MuiIconButton-root": {
        width: "32px",
        height: "32px",
        borderRadius: "8px",
        color: "#64748b",
        transition: "all 0.2s ease",

        "&:hover": {
          backgroundColor: "#e2e8f0",
          color: "#374151",
        },
      },
    },

    // Calendar grid
    "& .MuiDayCalendar-root": {
      padding: "16px",
    },

    "& .MuiDayCalendar-header": {
      marginBottom: "8px",

      "& .MuiDayCalendar-weekDayLabel": {
        fontSize: "12px",
        fontWeight: 600,
        color: "#64748b",
        fontFamily: "inherit",
      },
    },

    "& .MuiPickersDay-root": {
      width: "36px",
      height: "36px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: 500,
      color: "#374151",
      fontFamily: "inherit",
      transition: "all 0.2s ease",

      "&:hover": {
        backgroundColor: "#f1f5f9",
      },

      "&.Mui-selected": {
        backgroundColor: "#3b82f6 !important",
        color: "white",
        fontWeight: 600,

        "&:hover": {
          backgroundColor: "#2563eb !important",
        },
      },

      "&.MuiPickersDay-today:not(.Mui-selected)": {
        backgroundColor: "#dbeafe",
        color: "#1d4ed8",
        fontWeight: 600,
        border: "none",
      },

      "&.MuiPickersDay-outsideCurrentMonth": {
        color: "#cbd5e1",
      },

      "&.Mui-disabled": {
        color: "#cbd5e1",
        opacity: 0.5,
      },
    },

    // Year/Month picker
    "& .MuiYearCalendar-root, & .MuiMonthCalendar-root": {
      padding: "16px",
      maxHeight: "300px",

      "& .MuiPickersYear-root, & .MuiPickersMonth-root": {
        borderRadius: "8px",
        fontFamily: "inherit",
        transition: "all 0.2s ease",

        "&:hover": {
          backgroundColor: "#f1f5f9",
        },

        "&.Mui-selected": {
          backgroundColor: "#3b82f6",
          color: "white",
        },
      },
    },
  },
}));

const CustomTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "16px",
    border: "1.5px solid #e2e8f0",
    backgroundColor: "#ffffff",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    fontFamily: "inherit",
    minHeight: "48px",

    "& fieldset": {
      border: "none",
    },

    "&:hover": {
      borderColor: "#cbd5e1",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },

    "&.Mui-focused": {
      borderColor: "#3b82f6",
      boxShadow:
        "0 0 0 4px rgba(59, 130, 246, 0.1), 0 4px 6px rgba(0, 0, 0, 0.1)",
      transform: "translateY(-1px)",
    },

    "& .MuiOutlinedInput-input": {
      padding: "14px 16px 14px 48px",
      fontSize: "14px",
      color: "#1e293b",
      fontFamily: "inherit",
      fontWeight: 400,

      "&::placeholder": {
        color: "#64748b",
        opacity: 1,
      },
    },

    // Hide the default calendar icon
    "& .MuiInputAdornment-root": {
      display: "none",
    },
  },

  "& .MuiFormLabel-root": {
    display: "none",
  },
}));

const InputWrapper = styled("div")({
  position: "relative",
  width: "100%",

  "& .calendar-icon": {
    position: "absolute",
    left: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#64748b",
    pointerEvents: "none",
    zIndex: 1,
    transition: "color 0.3s ease",
  },

  "& .MuiOutlinedInput-root.Mui-focused + .calendar-icon": {
    color: "#3b82f6",
  },
});

// Custom Date Selector Component
export const DateSelector = ({
  value = null,
  onChange = () => {},
  placeholder = "Select date",
  disabled = false,
  className = "",
  minDate = null,
  maxDate = null,
  ...props
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`date-selector ${className}`}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <InputWrapper>
          <DatePicker
            value={value}
            onChange={onChange} // directly use parent setter
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            disabled={disabled}
            minDate={minDate}
            maxDate={maxDate}
            slots={{
              textField: CustomTextField, // styling only
              paper: StyledPaper,
            }}
            slotProps={{
              textField: {
                placeholder,
                onClick: () => !disabled && setOpen(true),
                fullWidth: true,
              },
              actionBar: { actions: ["clear", "today"] },
            }}
            format="dd/MM/yyyy"
            enableAccessibleFieldDOMStructure={false} // avoids warnings
            {...props}
          />
          <Calendar size={16} className="calendar-icon" />
        </InputWrapper>
      </LocalizationProvider>
    </div>
  );
};
