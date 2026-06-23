"use client";
import { useState } from 'react';
import { Check, Minus } from 'lucide-react';
import styles from './CustomCheckbox.module.scss';

const CustomCheckbox = ({
  // Value
  checked = false,
  indeterminate = false, // For partial selection state
  defaultChecked = false,

  // Handlers
  onChange = () => {},

  // Content
  label = '',
  description = '', // Optional helper text

  // Styling
  size = 'medium', // 'small' | 'medium' | 'large'
  variant = 'primary', // 'primary' | 'success' | 'danger' | 'warning'
  className = '',
  labelClassName = '',

  // Config
  disabled = false,
  required = false,
  name = '',
  value = '',
  id = '',

  // Accessibility
  ariaLabel = '',
}) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = checked !== undefined && checked !== false;
  const isChecked = isControlled ? checked : internalChecked;

  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = (e) => {
    if (!disabled) {
      if (!isControlled) {
        setInternalChecked(e.target.checked);
      }
      onChange(e);
    }
  };

  const containerClasses = [
    styles.checkboxContainer,
    styles[size],
    disabled ? styles.disabled : '',
    className,
  ].filter(Boolean).join(' ');

  const checkboxClasses = [
    styles.checkbox,
    styles[variant],
    isChecked ? styles.checked : '',
    indeterminate ? styles.indeterminate : '',
  ].filter(Boolean).join(' ');

  const labelClasses = [
    styles.labelText,
    labelClassName,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className={styles.checkboxWrapper}>
        <input
          type="checkbox"
          id={checkboxId}
          name={name}
          value={value}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          className={styles.input}
          aria-label={ariaLabel || label}
          aria-checked={indeterminate ? 'mixed' : isChecked}
        />
        <div className={checkboxClasses}>
          {indeterminate ? (
            <Minus className={styles.icon} aria-hidden="true" />
          ) : isChecked ? (
            <Check className={styles.icon} aria-hidden="true" />
          ) : null}
        </div>
      </div>

      {(label || description) && (
        <label htmlFor={checkboxId} className={styles.labelContainer}>
          {label && (
            <span className={labelClasses}>
              {label}
              {required && <span className={styles.required}>*</span>}
            </span>
          )}
          {description && (
            <span className={styles.description}>{description}</span>
          )}
        </label>
      )}
    </div>
  );
};

export default CustomCheckbox;