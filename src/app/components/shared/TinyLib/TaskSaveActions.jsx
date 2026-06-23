import { Check, X } from "lucide-react";
import styles from "./TaskSaveActions.module.scss";

export default function TaskSaveActions({
  hasChanges,
  isLoading,
  onUpdate,
  onCancel,
}) {
  return (
    <div
      className={`${styles.actionButtons} ${
        hasChanges ? styles.show : ""
      } ${isLoading ? styles.loading : ""}`}
    >
      <button
        className={`${styles.btn} ${styles.update}`}
        onClick={onUpdate}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className={styles.loader}></span>
        ) : (
          <>
            <Check size={16} />
            <span>Update</span>
          </>
        )}
      </button>

      <button
        className={`${styles.btn} ${styles.cancel}`}
        onClick={onCancel}
        disabled={isLoading}
      >
        <X size={16} />
        <span>Cancel</span>
      </button>
    </div>
  );
}
