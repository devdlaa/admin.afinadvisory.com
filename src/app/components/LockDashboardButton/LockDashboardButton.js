"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Lock, Loader2, Check } from "lucide-react";
import "./LockDashboardButton.scss";

export default function LockDashboardButton() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleLock = async () => {
    try {
      setLoading(true);
      await update({ isDashboardLocked: true });

      // Show success state briefly
      setSuccess(true);
      setLoading(false);

      // Redirect after a short delay to show success feedback
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
    <button
      onClick={handleLock}
      disabled={loading || success}
      className={`lock-dashboard-btn ${
        success ? "lock-dashboard-btn--success" : ""
      }`}
      title="Lock Dashboard"
    >
      <div className="lock-dashboard-btn__icon">
        {loading ? (
          <Loader2 size={18} className="lock-dashboard-btn__spinner" />
        ) : success ? (
          <Check size={18} />
        ) : (
          <Lock size={18} />
        )}
      </div>
      <span className="lock-dashboard-btn__text">
        {loading ? "Locking..." : success ? "Locked!" : "Lock"}
      </span>
    </button>
  );
}
