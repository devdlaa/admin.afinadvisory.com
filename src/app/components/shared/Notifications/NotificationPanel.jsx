import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { Drawer } from "@mui/material";
import {
  X,
  Bell,
  MessageSquare,
  AtSign,
  ClipboardCheck,
  Clock,
  CheckCheck,
  Loader2,
} from "lucide-react";
import {
  closePanel,
  fetchNotifications,
  markAllAsRead,
  markAsRead,
  setActiveTab,
} from "@/store/slices/notificationSlice";
import { formatDistanceToNow } from "date-fns";
import styles from "./NotificationPanel.module.scss";

const NOTIFICATION_ICONS = {
  COMMENT: MessageSquare,
  MENTION: AtSign,
  TASK_ASSIGNED: ClipboardCheck,
  TASK_DUE_SOON: Clock,
  TASK_COMPLETED: CheckCheck,
  GENERAL: Bell,
};

const NOTIFICATION_COLORS = {
  COMMENT: styles.comment,
  MENTION: styles.mention,
  TASK_ASSIGNED: styles.taskAssigned,
  TASK_DUE_SOON: styles.taskDueSoon,
};

function NotificationItem({ notification, onClose }) {
  const dispatch = useDispatch();
  const router = useRouter();

  const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
  const colorClass = NOTIFICATION_COLORS[notification.type] || "";

  const handleClick = () => {
    if (notification.unread) {
      setTimeout(() => dispatch(markAsRead(notification.id)), 0);
    }

    if (!notification.link) return;

    const targetUrl = new URL(notification.link, window.location.origin);
    const currentParams = new URLSearchParams(window.location.search);

    for (const [key, value] of currentParams.entries()) {
      if (!targetUrl.searchParams.has(key)) {
        targetUrl.searchParams.set(key, value);
      }
    }

    router.push(targetUrl.pathname + "?" + targetUrl.searchParams.toString());
    onClose();
  };

  return (
    <div
      className={`${styles.notificationItem} ${
        notification.unread ? styles.unread : ""
      }`}
      onClick={handleClick}
    >
      <div className={`${styles.iconWrapper} ${colorClass}`}>
        <Icon size={20} />
      </div>

      <div className={styles.details}>
        <h3 className={styles.title}>{notification.title}</h3>
        {notification.body && (
          <p className={styles.body}>{notification.body}</p>
        )}

        <div className={styles.meta}>
          <span>
            {formatDistanceToNow(new Date(notification?.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>

      {notification.unread && <div className={styles.unreadBadge} />}
    </div>
  );
}

export default function NotificationPanel() {
  const dispatch = useDispatch();
  const { lists, activeTab, meta, isPanelOpen, isMarkingAllRead } = useSelector(
    (state) => state.notifications,
  );
  const totalUnreadCount = meta.unreadCount + meta.unreadMentionsCount;
  const unreadCount = meta.unreadCount;
  const mentionsCount = meta.unreadMentionsCount;

  const currentList = lists[activeTab];

  const items = currentList.items;
  const nextCursor = currentList.nextCursor;
  const isLoading = currentList.isLoading;
  const isLoadingMore = currentList.isLoadingMore;

  const handleClose = () => dispatch(closePanel());

  const handleMarkAllAsRead = () => {
    if (totalUnreadCount > 0) dispatch(markAllAsRead());
  };

  const handleLoadMore = () => {
    if (nextCursor && !isLoadingMore) {
      dispatch(fetchNotifications({ tab: activeTab, cursor: nextCursor }));
    }
  };

  useEffect(() => {
    const list = lists[activeTab];

    if (isPanelOpen && !list.isLoading && !list.hasLoaded) {
      dispatch(fetchNotifications({ tab: activeTab }));
    }
  }, [isPanelOpen, activeTab, lists, dispatch]);

  return (
    <Drawer
      anchor="right"
      open={isPanelOpen}
      onClose={handleClose}
      className={styles.drawer}
    >
      <div className={styles.header}>
        <h2>Notifications</h2>

        <div className={styles.actions}>
          {totalUnreadCount > 0 && (
            <button
              className={styles.markAllBtn}
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllRead}
            >
              {isMarkingAllRead ? (
                <>
                  <Loader2 size={14} className={styles.spinner} />
                  <span>Marking...</span>
                </>
              ) : (
                "Mark all read"
              )}
            </button>
          )}

          <X size={24} className={styles.closeBtn} onClick={handleClose} />
        </div>
      </div>

      <div className={styles.tabs}>
        {[
          { key: "all", label: "All" },
          { key: "unread", label: "Unread", count: unreadCount },
          { key: "mentions", label: "Mentions", count: mentionsCount },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${
              activeTab === tab.key ? styles.activeTab : ""
            }`}
            onClick={() => {
              dispatch(setActiveTab(tab.key));

              if (!lists[tab.key].hasLoaded) {
                dispatch(fetchNotifications({ tab: tab.key }));
              }
            }}
          >
            <span>{tab.label}</span>

            {tab.count > 0 && (
              <span className={styles.count}>
                {tab.count > 99 ? "99+" : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>
            <Loader2 size={32} className={styles.spinner} />
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <Bell size={64} />
            <p>No notifications yet</p>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClose={handleClose}
                />
              ))}
            </div>

            {nextCursor && (
              <div className={styles.loadMore}>
                <button
                  className={styles.loadMoreBtn}
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      <span>Loading...</span>
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
