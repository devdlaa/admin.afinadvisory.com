import { Loader2 } from 'lucide-react';
import styles from './CustomButton.module.scss';

const CustomButton = ({
  // Content
  children,
  text,
  icon: Icon = null,
  iconPosition = 'left', // 'left' | 'right'
  iconOnly = false,

  // Behavior
  onClick = () => {},
  type = 'button', // 'button' | 'submit' | 'reset'
  disabled = false,
  isLoading = false,
  loadingText = null,

  // Styling
  variant = 'primary', // 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline' | 'ghost' | 'link'
  size = 'medium', // 'small' | 'medium' | 'large'
  rounded = 'default', // 'default' | 'full' | 'square'
  fullWidth = false,
  className = '',
  

  // Accessibility
  ariaLabel = '',
  title = '',
}) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    styles[`rounded-${rounded}`],
    iconOnly ? styles.iconOnly : '',
    fullWidth ? styles.fullWidth : '',
    (disabled || isLoading) ? styles.disabled : '',
    className,
  ].filter(Boolean).join(' ');

  const displayText = isLoading && loadingText ? loadingText : (children || text);
  const showIcon = Icon && !isLoading && !iconOnly;
  const showIconOnly = Icon && iconOnly && !isLoading;

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={ariaLabel || (iconOnly ? title : undefined)}
      title={iconOnly ? title : undefined}
    >
      {/* Loading spinner or icon on left */}
      {iconPosition === 'left' && isLoading && (
        <Loader2 className={styles.spinner} aria-hidden="true" />
      )}
      {iconPosition === 'left' && showIcon && (
        <Icon className={styles.icon} aria-hidden="true" />
      )}
      
      {/* Icon-only mode */}
      {iconOnly && (
        <>
          {isLoading ? (
            <Loader2 className={styles.spinner} aria-hidden="true" />
          ) : (
            Icon && <Icon className={styles.icon} aria-hidden="true" />
          )}
        </>
      )}

      {/* Text content */}
      {!iconOnly && displayText && (
        <span className={styles.text}>{displayText}</span>
      )}

      {/* Icon on right */}
      {iconPosition === 'right' && showIcon && (
        <Icon className={styles.icon} aria-hidden="true" />
      )}
      {iconPosition === 'right' && isLoading && (
        <Loader2 className={styles.spinner} aria-hidden="true" />
      )}
    </button>
  );
};

export default CustomButton;