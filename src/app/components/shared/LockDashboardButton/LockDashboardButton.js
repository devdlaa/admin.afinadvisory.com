"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  Lock,
  Loader2,
  Check,
  Volume2,
  VolumeX,
  LayoutList,
  BellDotIcon,
} from "lucide-react";
import NotificationBell from "../Notifications/NotificationBell";
import { useDispatch, useSelector } from "react-redux";
import { toggleSound } from "@/store/slices/notificationSlice";
import styles from "./DashboardActions.module.scss";
import ReminderDetailsDialogWrapper from "@/app/dashboard/reminders/components/ReminderDetailsDialogWrapper/ReminderDetailsDialogWrapper";
import { openCreateReminder } from "@/store/slices/remindersSlice";
import { openOverview } from "@/store/slices/remindersOverviewSlice";
import RemindersOverview from "@/app/dashboard/reminders/components/RemindersOverview/RemindersOverview";

export default function LockDashboardButton() {
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const dispatch = useDispatch();
  const soundEnabled = useSelector((state) => state.notifications.soundEnabled);
  const reminderAttentionCount = useSelector(
    (state) => state.remindersOverview.reminderAttentionCount,
  );

  const handleLock = async () => {
    try {
      setLoading(true);
      await update({ isDashboardLocked: true });
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        window.location.href = "/dashboard/locked";
      }, 0);
    } catch (err) {
      setLoading(false);
      setSuccess(false);
    }
  };

  const isLoading = status === "loading";
  const isLocked = session?.user?.isDashboardLocked;

  return (
    <aside className={styles.actionSidebar} aria-label="Dashboard actions">
      {/* Notification bell */}
      <div className={styles.actionSidebar__item}>
        {isLoading ? (
          <div
            className={`${styles.actionSidebar__skeleton} ${styles["actionSidebar__skeleton--bell"]}`}
          />
        ) : (
          <NotificationBell />
        )}
      </div>

      <div className={styles.actionSidebar__divider} />

      <div className={styles.min_controlls}>
        {/* Sound toggle */}
        <div className={styles.actionSidebar__item}>
          {isLoading ? (
            <div className={styles.actionSidebar__skeleton} />
          ) : (
            <button
              onClick={() => dispatch(toggleSound())}
              className={`${styles.actionSidebar__btn} ${
                !soundEnabled ? styles["actionSidebar__btn--muted"] : ""
              }`}
              title={
                soundEnabled
                  ? "Disable notification sound"
                  : "Enable notification sound"
              }
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
        </div>

        {/* Create reminder */}
        {/* <button
          onClick={() => dispatch(openCreateReminder())}
          className={`${styles.actionSidebar__btn} ${styles["actionSidebar__btn--primary"]}`}
        >
          <BellDotIcon size={20} />
        </button> */}

        {/* Reminders overview */}
        {/* <div className={styles.actionSidebar__item}>
          {!isLoading && (
            <button
              onClick={() => dispatch(openOverview())}
              className={`${styles.actionSidebar__btn} ${
                reminderAttentionCount > 0
                  ? styles["actionSidebar__btn--highlight"]
                  : ""
              }`}
            >
              <LayoutList size={18} />

              {reminderAttentionCount > 0 && (
                <span className={styles.actionSidebar__badge}>
                  {reminderAttentionCount > 9 ? "9+" : reminderAttentionCount}
                </span>
              )}
            </button>
          )}
        </div> */}
      </div>

      {/* Lock button */}
      <div className={styles.actionSidebar__item}>
        {isLoading ? (
          <div className={styles.actionSidebar__skeleton} />
        ) : !session || isLocked ? null : (
          <button
            onClick={handleLock}
            disabled={loading || success}
            className={`${styles.actionSidebar__btn} ${
              success ? styles["actionSidebar__btn--success"] : ""
            }`}
            title="Lock Dashboard"
          >
            {loading ? (
              <Loader2 size={18} className={styles.actionSidebar__spinner} />
            ) : success ? (
              <Check size={18} />
            ) : (
              <Lock size={18} />
            )}
          </button>
        )}
      </div>

      <ReminderDetailsDialogWrapper />
      <RemindersOverview />
    </aside>
  );
}
