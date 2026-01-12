"use client";
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import styles from "./ForceNotification.module.scss";

export default function ForceNotification({ children }) {
  const [permission, setPermission] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);
  }, []);

  const requestPermission = async () => {
    try {
      setIsRequesting(true);
      const result = await Notification.requestPermission();
      setPermission(result);
    } finally {
      setIsRequesting(false);
    }
  };

  // Still checking
  if (permission === null) {
    return (
      <div className={styles.container}>
        <p>Checking notification settings…</p>
      </div>
    );
  }

  // Allowed → show app
  if (permission === "granted") {
    return <>{children}</>;
  }

  const isBlocked = permission === "denied";

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <Bell size={48} className={styles.icon} />
        <h2>Notifications are turned off</h2>

        {permission === "unsupported" ? (
          <p>Your browser does not support notifications.</p>
        ) : isBlocked ? (
          <>
            <p>Your browser has blocked notifications for this site.</p>

            <div className={styles.steps}>
              <p>To enable them:</p>
              <ol>
                <li>Click the lock icon in your address bar</li>
                <li>Open Site settings</li>
                <li>Set Notifications to Allow</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </>
        ) : (
          <>
            <p>
              Task Manager uses notifications to alert you about important
              updates.
            </p>

            <button
              onClick={requestPermission}
              disabled={isRequesting}
              className={styles.button}
            >
              {isRequesting ? "Waiting…" : "Enable notifications"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
