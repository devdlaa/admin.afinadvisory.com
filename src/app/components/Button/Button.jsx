import React from "react";
import { Loader2 } from "lucide-react";
import "./Button.scss";

/**
 * Button - A flexible, reusable button component
 *
 * @param {string} variant - Button style: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
 * @param {string} size - Button size: 'sm' | 'md' | 'lg'
 * @param {React.Component} icon - Icon component (from lucide-react)
 * @param {string} iconPosition - Icon position: 'left' | 'right'
 * @param {boolean} loading - Show loading spinner
 * @param {boolean} disabled - Disable button
 * @param {boolean} fullWidth - Make button full width
 * @param {string} className - Custom root class to override styles
 * @param {Function} onClick - Click handler
 * @param {string} type - Button type: 'button' | 'submit' | 'reset'
 * @param {React.ReactNode} children - Button content
 */
const Button = ({
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
  className = "",
  onClick,
  type = "button",
  children,
  ...rest
}) => {
  const classes = [
    "btn",
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && "btn--full-width",
    loading && "btn--loading",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const renderIcon = () => {
    if (loading) {
      return <Loader2 size={getIconSize()} className="btn__spinner" />;
    }
    if (Icon) {
      return <Icon size={getIconSize()} className="btn__icon" />;
    }
    return null;
  };

  const getIconSize = () => {
    switch (size) {
      case "sm":
        return 14;
      case "lg":
        return 20;
      default:
        return 16;
    }
  };

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      {...rest}
    >
      {Icon && iconPosition === "left" && renderIcon()}
      {children && <span className="btn__text">{children}</span>}
      {Icon && iconPosition === "right" && renderIcon()}
    </button>
  );
};

export default Button;
