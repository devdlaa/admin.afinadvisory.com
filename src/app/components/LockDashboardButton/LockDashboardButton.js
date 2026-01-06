"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Lock, Loader2, Check } from "lucide-react";
import NotificationBell from "../Notifications/NotificationBell";
import styles from "./DashboardActions.module.scss";

export default function LockDashboardButton() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

  // Don't render if user is already locked or no session
  if (!session || session.user?.isDashboardLocked) return null;

  return (
    <div className={styles.dashboardActions}>
      <NotificationBell />

      <button
        onClick={handleLock}
        disabled={loading || success}
        className={`${styles.dashboardActions__btn} ${
          success ? styles.dashboardActions__btn-success : ""
        }`}
        title="Lock Dashboard"
      >
        {loading ? (
          <Loader2 size={20} className={styles.dashboardActions__spinner} />
        ) : success ? (
          <Check size={20} />
        ) : (
          <Lock size={20} />
        )}
      </button>
    </div>
  );
}
