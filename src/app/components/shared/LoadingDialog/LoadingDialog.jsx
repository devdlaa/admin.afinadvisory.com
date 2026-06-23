import CircularProgress from "@mui/material/CircularProgress";
import styles from "./LoadingDialog.module.scss";

export default function LoadingDialog({ open, icon, title, desc }) {
  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation">
      <div
        className={styles.dialog}
        role="status"
        aria-live="polite"
        aria-label={title}
      >
        {icon && <div className={styles.iconWrap}>{icon}</div>}

        <CircularProgress size={44} thickness={3.5} sx={{ color: "#3b82f6" }} />

        <div className={styles.text}>
          <p className={styles.title}>{title}</p>
          {desc && <p className={styles.desc}>{desc}</p>}
        </div>
      </div>
    </div>
  );
}
