import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { Bell } from "lucide-react";

import {
  togglePanel,
  fetchNotifications,
  clearHighlight,
} from "@/store/slices/notificationSlice";

import styles from "./NotificationBell.module.scss";

export default function NotificationBell() {
  const dispatch = useDispatch();

  const { unreadCount, isPanelOpen, highlightBell } = useSelector(
    (state) => state.notifications
  );

  // 🔥 fetch once on load to restore unread + highlight
  useEffect(() => {
    dispatch(fetchNotifications()).then((action) => {
      const unread = action?.payload?.unread_count ?? 0;

      if (unread > 0) {
        // turn on crazy bell after reload
        // only if panel is closed
        dispatch({ type: "notifications/highlightBellFromInit" });
      }
    });
  }, [dispatch]);

  const handleClick = () => {
    dispatch(togglePanel());

    if (!isPanelOpen) {
      dispatch(fetchNotifications());
      dispatch(clearHighlight());
    }
  };

  return (
    <div className={styles.bellWrapper}>
      <button
        onClick={handleClick}
        aria-label="Notifications"
        className={`${styles.bellButton}
          ${unreadCount > 0 ? styles.hasUnread : ""}
          ${highlightBell ? styles.highlight : ""}
        `}
      >
        <Bell size={20} color="white" />

        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
