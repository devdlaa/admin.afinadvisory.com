import styles from "./reminderLayout.module.scss";
import ReminderSidebar from "./components/ReminderSidebar/ReminderSidebar";

export default function RemindersLayout({ children }) {
  return (
    <div className={styles.pageWrapper}>
      <ReminderSidebar />

      <div className={styles.content}>{children}</div>
    </div>
  );
}
