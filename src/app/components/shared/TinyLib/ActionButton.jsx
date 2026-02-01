import { Loader2 } from 'lucide-react';
import styles from './ActionButton.module.scss';

const ActionButton = ({
  text,
  icon: Icon = null,
  onClick = () => {},
  isLoading = false,
  disabled = false,
  variant = 'primary', // 'primary', 'secondary', 'success', 'danger', 'light'
  bgColor = '',
  textColor = '',
  size = 'medium', // 'small', 'medium', 'large'
  rootClassName = '', // 🔹 NEW: single parent override hook
}) => {
  const buttonClasses = [
    styles.actionButton,
    styles[variant],
    styles[size],
    disabled || isLoading ? styles.disabled : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={`${buttonClasses} ${rootClassName}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      style={{
        backgroundColor: bgColor || undefined,
        color: textColor || undefined,
      }}
    >
      {isLoading ? (
        <Loader2 className={styles.spinner} size={18} />
      ) : (
        Icon && <Icon size={18} className={styles.icon} />
      )}
      <span className={styles.text}>{text}</span>
    </button>
  );
};

export default ActionButton;