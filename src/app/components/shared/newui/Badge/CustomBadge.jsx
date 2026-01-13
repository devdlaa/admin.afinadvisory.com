import styles from './CustomBadge.module.scss';

const CustomBadge = ({
  // Content
  children,
  text,
  icon: Icon = null,
  iconPosition = 'left', // 'left' | 'right'
  count = null, // For numerical badges

  // Styling
  variant = 'default', // 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'outline'
  size = 'medium', // 'small' | 'medium' | 'large'
  rounded = 'default', // 'default' | 'full' | 'square'
  dot = false, // Show as dot badge
  className = '',

  // Behavior
  onClick = null, // Makes badge clickable
  onRemove = null, // Shows remove icon

  // Accessibility
  ariaLabel = '',
}) => {
  const isClickable = onClick !== null;
  const displayContent = count !== null ? count : (children || text);

  const badgeClasses = [
    styles.badge,
    styles[variant],
    styles[size],
    styles[`rounded-${rounded}`],
    dot ? styles.dot : '',
    isClickable ? styles.clickable : '',
    className,
  ].filter(Boolean).join(' ');

  const BadgeWrapper = isClickable ? 'button' : 'span';

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(e);
    }
  };

  if (dot) {
    return (
      <span 
        className={badgeClasses}
        aria-label={ariaLabel || 'Notification dot'}
      />
    );
  }

  return (
    <BadgeWrapper
      className={badgeClasses}
      onClick={isClickable ? handleClick : undefined}
      type={isClickable ? 'button' : undefined}
      aria-label={ariaLabel}
    >
      {Icon && iconPosition === 'left' && (
        <Icon className={styles.icon} aria-hidden="true" />
      )}
      
      {displayContent && (
        <span className={styles.text}>{displayContent}</span>
      )}

      {Icon && iconPosition === 'right' && (
        <Icon className={styles.icon} aria-hidden="true" />
      )}

      {onRemove && (
        <button
          type="button"
          className={styles.removeButton}
          onClick={handleRemove}
          aria-label="Remove badge"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 3L3 9M3 3L9 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </BadgeWrapper>
  );
};

export default CustomBadge;