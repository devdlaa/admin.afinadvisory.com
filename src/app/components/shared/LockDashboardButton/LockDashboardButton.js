"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Lock, Loader2, Check, Volume2, VolumeX } from "lucide-react";
import NotificationBell from "../Notifications/NotificationBell";
import { useDispatch, useSelector } from "react-redux";
import { toggleSound } from "@/store/slices/notificationSlice";
import styles from "./DashboardActions.module.scss";

export default function LockDashboardButton() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const dispatch = useDispatch();
  const soundEnabled = useSelector((state) => state.notifications.soundEnabled);

  const handleLock = async () => {
    try {
      setLoading(true);
      await update({ isDashboardLocked: true });
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        window.location.href = "/dashboard/locked";
      }, 800);
    } catch (err) {
      console.error("Failed to lock dashboard:", err);
      alert("Something went wrong while locking the dashboard.");
      setLoading(false);
      setSuccess(false);
    }
  };

  const isLoading = status === "loading";
  const isLocked = session?.user?.isDashboardLocked;

  return (
    <aside className={styles.actionSidebar} aria-label="Dashboard actions">
      {/* Notification bell — always shown, handles its own auth */}
      <div className={styles.actionSidebar__item}>
        {isLoading ? (
          <div className={`${styles.actionSidebar__skeleton} ${styles["actionSidebar__skeleton--bell"]}`} />
        ) : (
          <NotificationBell />
        )}
      </div>

      <div className={styles.actionSidebar__divider} />

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
            title={soundEnabled ? "Disable notification sound" : "Enable notification sound"}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        )}
      </div>

      {/* Lock button — only show when session is ready and not locked */}
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
    </aside>
  );
}