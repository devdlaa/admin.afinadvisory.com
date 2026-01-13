// RadioButton/RadioButton.jsx
import React from "react";
import styles from "./RadioButton.module.scss";

const RadioButton = ({
  name,
  value,
  label = "",
  description = "",
  checked = false,
  onChange,
  disabled = false,
  size = "mid",
  rootClass = "",
}) => {
  const handleChange = (e) => {
    if (!disabled && onChange) {
      onChange(e.target.value);
    }
  };

  const hasContent = label || description;

  return (
    <label
      className={`${styles.radioButton} ${styles[size]} ${
        checked ? styles.checked : ""
      } ${disabled ? styles.disabled : ""} ${
        hasContent ? styles.hasContent : styles.minimal
      } ${rootClass}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className={styles.radioInput}
      />
      <span className={styles.radioCircle}>
        {checked && <span className={styles.radioInner} />}
      </span>
      {hasContent && (
        <div className={styles.radioContent}>
          {label && <span className={styles.radioLabel}>{label}</span>}
          {description && (
            <span className={styles.radioDescription}>{description}</span>
          )}
        </div>
      )}
    </label>
  );
};

// RadioGroup component for managing multiple radio buttons
const RadioGroup = ({
  name,
  value,
  onChange,
  children,
  direction = "vertical", // 'vertical' | 'horizontal'
  gap = "mid",
  rootClass = "",
}) => {
  return (
    <div
      className={`${styles.radioGroup} ${styles[direction]} ${
        styles[`gap-${gap}`]
      } ${rootClass}`}
      role="radiogroup"
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            name,
            checked: child.props.value === value,
            onChange,
          });
        }
        return child;
      })}
    </div>
  );
};

export { RadioButton, RadioGroup };
export default RadioButton;
