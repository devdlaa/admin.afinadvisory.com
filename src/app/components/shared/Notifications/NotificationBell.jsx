import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef } from "react";
import { Bell, AtSign } from "lucide-react";

import {
  openPanel,
  fetchNotifications,
  fetchNotificationMeta,
  clearHighlight,
  highlightBellFromInit,
  setActiveTab,
  selectNotificationMeta,
} from "@/store/slices/notificationSlice";

import styles from "./NotificationBell.module.scss";

function getDefaultTab(meta) {
  const { unreadCount, unreadMentionsCount, lastUnreadAt, lastMentionAt } = meta;
  if (unreadMentionsCount > 0 && unreadCount > 0) {
    if (!lastUnreadAt) return "mentions";
    if (!lastMentionAt) return "unread";
    return new Date(lastMentionAt) > new Date(lastUnreadAt) ? "mentions" : "unread";
  }
  if (unreadMentionsCount > 0) return "mentions";
  return "unread";
}

export default function NotificationBell() {
  const dispatch = useDispatch();
  const mentionsBtnRef = useRef(null);
  const prevMentionsCount = useRef(null);

  const { isPanelOpen, highlightBell, lists } = useSelector((s) => s.notifications);
  const meta = useSelector(selectNotificationMeta);
  const unreadCount = meta.unreadCount || 0;
  const mentionsCount = meta.unreadMentionsCount || 0;

  const triggerBarber = () => {
    const el = mentionsBtnRef.current;
    if (!el) return;
    el.classList.remove(styles.animating);
    void el.offsetWidth;
    el.classList.add(styles.animating);
    const onEnd = () => {
      el.classList.remove(styles.animating);
      el.removeEventListener("animationend", onEnd);
    };
    el.addEventListener("animationend", onEnd);
  };

  useEffect(() => {
    dispatch(fetchNotificationMeta()).then((action) => {
      const data = action?.payload;
      const mentions = data?.unread_mentions_count ?? 0;
      const total = (data?.unread_count ?? 0) + mentions;
      if (total > 0) dispatch(highlightBellFromInit());
      if (mentions > 0) setTimeout(triggerBarber, 800);
      prevMentionsCount.current = mentions;
    });
  }, [dispatch]);

  useEffect(() => {
    if (prevMentionsCount.current === null) return;
    if (mentionsCount > prevMentionsCount.current) triggerBarber();
    prevMentionsCount.current = mentionsCount;
  }, [mentionsCount]);

  const handleClick = (tab) => {
    if (isPanelOpen) {
      dispatch(setActiveTab(tab));
      if (!lists[tab].hasLoaded) dispatch(fetchNotifications({ tab }));
    } else {
      dispatch(openPanel());
      dispatch(setActiveTab(tab));
      if (!lists[tab].hasLoaded) dispatch(fetchNotifications({ tab }));
      dispatch(clearHighlight());
    }
  };

  return (
    <div className={styles.wrapper}>

      {/* Bell */}
      <button
        onClick={() => handleClick(getDefaultTab(meta))}
        className={`${styles.btn} ${styles.bellBtn} ${highlightBell ? styles.highlight : ""}`}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Mentions — this button itself stretches */}
      <button
        ref={mentionsBtnRef}
        onClick={() => handleClick("mentions")}
        className={`${styles.btn} ${styles.mentionsBtn} ${mentionsCount > 0 ? styles.hasUnread : ""}`}
        aria-label={`Mentions${mentionsCount > 0 ? `, ${mentionsCount} unread` : ""}`}
      >
        {/* Barber stripes — clipped by overflow:hidden on the button */}
        <span className={styles.stripes} aria-hidden />

        {/* Normal icon */}
        <AtSign size={16} />

        {/* Badge */}
        {mentionsCount > 0 && (
          <span className={styles.mentionsBadge}>
            {mentionsCount > 99 ? "99+" : mentionsCount}
          </span>
        )}

        {/* Label shown only during stretch */}
        {mentionsCount > 0 && (
          <span className={styles.label} aria-hidden>
            <span className={styles.labelCount}>
              {mentionsCount > 99 ? "99+" : mentionsCount}
            </span>
            <span className={styles.labelText}>mentions</span>
          </span>
        )}
      </button>

    </div>
  );
}