import React from "react";
import { Loader2 } from "lucide-react";
import "./Button.scss";


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
