"use client";

import { useState, useEffect } from "react";
import styles from "./reminder-connector.module.scss";
import {
  BellDot,
  CircleCheck,
  CircleAlert,
  Link2,
  RotateCcw,
  ArrowRight,
} from "lucide-react";

// ── Component ──────────────────────────────────────────────────────────
export default function ReminderConnector() {
  const [status, setStatus] = useState("idle"); // idle | connecting | success | already_connected | error
  const [error, setError] = useState(null);

  // On mount: silently check if the extension already has a valid token
  useEffect(() => {
    async function checkExistingToken() {
      try {
        const token = await getTokenFromExtension();
        if (!token) return; // no token stored — stay idle

        const res = await fetch("/api/admin_ops/reminders/connect-extension", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ existingToken: token }),
        });
        const data = await res.json();

        if (res.ok && data.alreadyConnected) {
          setStatus("already_connected");
        }
        // if invalid/expired, stay idle so user can reconnect
      } catch {
        // Extension not responding or fetch failed — stay idle
      }
    }

    checkExistingToken();
  }, []);

  // Postmessage handshake: ask extension for its stored token
  function getTokenFromExtension() {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 1500);

      function handler(event) {
        if (
          event.origin === window.location.origin &&
          event.data?.type === "REMINDER_EXT_TOKEN_RESPONSE"
        ) {
          clearTimeout(timeout);
          window.removeEventListener("message", handler);
          resolve(event.data.token ?? null);
        }
      }

      window.addEventListener("message", handler);
      window.postMessage(
        { type: "REMINDER_EXT_TOKEN_REQUEST" },
        window.location.origin,
      );
    });
  }

  async function handleConnect() {
    setStatus("connecting");
    setError(null);
    try {
      const res = await fetch("/api/admin_ops/reminders/connect-extension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ existingToken: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect");

      // Store the new token in the extension
      window.postMessage(
        { type: "REMINDER_EXT_TOKEN", token: data.token },
        window.location.origin,
      );
      setStatus("success");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  function handleClose() {
    window.location.href = "/dashboard";
  }

  const isSuccess = status === "success" || status === "already_connected";

  const badgeClass = [
    styles.badge,
    isSuccess && styles.badgeSuccess,
    status === "error" && styles.badgeError,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        {/* Badge */}
        <div className={badgeClass}>
          {isSuccess ? (
            <CircleCheck size={30} strokeWidth={2.2} />
          ) : status === "error" ? (
            <CircleAlert size={30} strokeWidth={2} />
          ) : (
            <BellDot size={30} strokeWidth={1.7} />
          )}
        </div>

        {/* Title */}
        <h2 className={styles.title}>
          {status === "success"
            ? "Extension Connected"
            : status === "already_connected"
              ? "Already Connected"
              : status === "error"
                ? "Connection Failed"
                : status === "connecting"
                  ? "Connecting…"
                  : "Connect Reminders"}
        </h2>

        {/* Description */}
        <p className={styles.desc}>
          {status === "success"
            ? "Your Reminders extension is now linked. You'll receive time-sensitive alerts."
            : status === "already_connected"
              ? "This extension is already linked to your account and your token is still valid. No action needed."
              : status === "error"
                ? "We couldn't link the extension to your account. Please check your connection and try again."
                : status === "connecting"
                  ? "Linking the extension to your account. This only takes a moment."
                  : "Link the Reminders extension to your account so you receive alerts."}
        </p>

        {/* ── IDLE ── */}
        {status === "idle" && (
          <button className={styles.btnPrimary} onClick={handleConnect}>
            <Link2 size={16} strokeWidth={2.2} /> Connect Extension
          </button>
        )}

        {/* ── CONNECTING ── */}
        {status === "connecting" && (
          <>
            <button className={styles.btnPrimary} disabled>
              <Link2 size={16} strokeWidth={2.2} /> Connecting…
            </button>
            <div className={styles.progressWrap}>
              <div className={styles.progressLabel}>
                Establishing secure link…
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressBar} />
                <div className={styles.progressBar2} />
              </div>
            </div>
          </>
        )}

        {/* ── SUCCESS / ALREADY CONNECTED ── */}
        {isSuccess && (
          <>
            <div className={`${styles.statusRow} ${styles.statusSuccess}`}>
              ✓{" "}
              {status === "already_connected"
                ? "Token is valid — already connected"
                : "Successfully connected"}
            </div>
            <div className={styles.divider} />
            <button className={styles.btnPrimary} onClick={handleClose}>
              Go to Dashboard <ArrowRight size={16} strokeWidth={2.2} />
            </button>
          </>
        )}

        {/* ── ERROR ── */}
        {status === "error" && (
          <>
            <div className={`${styles.statusRow} ${styles.statusError}`}>
              {error || "Connection failed. Please retry."}
            </div>
            <button className={styles.btnPrimary} onClick={handleConnect}>
              <RotateCcw size={15} strokeWidth={2.2} /> Retry Connection
            </button>
            <button className={styles.btnGhost} onClick={handleClose}>
              Cancel &amp; Go to Dashboard
            </button>
          </>
        )}

        {/* Close link */}
        {!isSuccess && (
          <button className={styles.closeLink} onClick={handleClose}>
            Close and go to dashboard
          </button>
        )}

        <p className={styles.brand}>
          Powered by <span>Afinadvisory-Admin</span>
        </p>
      </div>
    </div>
  );
}
