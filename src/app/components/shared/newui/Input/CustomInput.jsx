"use client";
import { useState, useRef } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import styles from "./CustomInput.module.scss";

const CustomInput = ({
  // Basic props
  label = "",
  placeholder = "",
  value = "",
  onChange = () => {},

  // Input types
  type = "text",
  multiline = false,
  rows = 4,

  // Validation
  required = false,
  regex = null,
  errorMessage = "Invalid input",
  minLength = null,
  maxLength = null,

  // Phone specific
  isPhone = false,

  // States
  disabled = false,
  readOnly = false,

  // Styling
  size = "medium", // small | medium | large
  icon = null,
  rootClassName = "",

  // Additional
  helperText = "",
  showCharCount = false,
  forceTouched = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef(null);

  // Normalize regex (string OR RegExp)
  const resolvedRegex = typeof regex === "string" ? new RegExp(regex) : regex;

  // Validation logic
  const validateInput = (val) => {
    const shouldValidate = touched || forceTouched;
    if (!shouldValidate) return { isValid: true, error: "" };

    if (required && !val.trim()) {
      return { isValid: false, error: "This field is required" };
    }

    if (minLength && val.length < minLength) {
      return {
        isValid: false,
        error: `Minimum ${minLength} characters required`,
      };
    }

    if (maxLength && val.length > maxLength) {
      return {
        isValid: false,
        error: `Maximum ${maxLength} characters allowed`,
      };
    }

    if (resolvedRegex && val && !resolvedRegex.test(val)) {
      return { isValid: false, error: errorMessage };
    }

    if (type === "email" && val) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        return { isValid: false, error: "Invalid email address" };
      }
    }

    if (isPhone && val) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(val)) {
        return {
          isValid: false,
          error: "Invalid phone number (10 digits)",
        };
      }
    }

    return { isValid: true, error: "" };
  };

  const validation = validateInput(value);
  const showError = !validation.isValid;
  const showSuccess =
    (touched || forceTouched) && validation.isValid && value.trim();
  const hasValue = value && value.length > 0;

  const handleBlur = () => {
    setIsFocused(false);
    setTouched(true);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleChange = (e) => {
    const newValue = e.target.value;

    if (isPhone && !/^\d*$/.test(newValue)) return;

    onChange(newValue);
  };

  const containerClasses = [styles.inputContainer, styles[size], rootClassName]
    .filter(Boolean)
    .join(" ");

  const inputClasses = [
    styles.inputWrapper,
    isFocused || hasValue ? styles.active : "",
    showError ? styles.error : "",
    showSuccess ? styles.success : "",
    disabled ? styles.disabled : "",
    multiline ? styles.multilineWrapper : "",
  ]
    .filter(Boolean)
    .join(" ");

  const InputComponent = multiline ? "textarea" : "input";

  return (
    <div className={containerClasses}>
      <div className={inputClasses}>
        {/* Icon */}
        {icon && !isPhone && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}

        {/* Input Field */}
        <div className={styles.inputFieldContainer}>
          <InputComponent
            ref={inputRef}
            type={type === "password" && showPassword ? "text" : type}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder=" "
            disabled={disabled}
            readOnly={readOnly}
            rows={multiline ? rows : undefined}
            maxLength={maxLength || undefined}
            className={`${styles.input} ${multiline ? styles.textarea : ""}`}
            aria-invalid={showError}
            aria-required={required}
          />

          {/* Floating Label */}
          <label className={styles.floatingLabel}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
        </div>

        {/* Password Toggle */}
        {type === "password" && (
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        )}

        {/* Error Icon */}
        {showError && (
          <span className={styles.validationIcon} aria-hidden="true">
            <AlertCircle />
          </span>
        )}
      </div>

      {/* Error Message */}
      {showError && (
        <div className={styles.errorMessage} role="alert">
          {validation.error}
        </div>
      )}

      {/* Helper / Counter */}
      {!showError && (helperText || (showCharCount && maxLength)) && (
        <div className={styles.helperText}>
          <span>{helperText}</span>
          {showCharCount && maxLength && (
            <span className={styles.charCount}>
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomInput;
