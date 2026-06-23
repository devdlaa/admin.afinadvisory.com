import styles from "./loader.module.scss";

export default function CircularLoader({ size = "md", color = "#1976d2" }) {
  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.spinner} ${styles[size]}`}
        style={{ borderTopColor: color }}
      ></div>
    </div>
  );
}
