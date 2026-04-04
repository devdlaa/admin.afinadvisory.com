"use client";

import { useState } from "react";

import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { Shield, LogOut, Loader2 } from "lucide-react";
import "./locked-route.scss";

export default function LockedRoute() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: session, update } = useSession();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin_ops/staff-managment/admin-users/unlock-dashboard",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to verify code");
        return;
      }

      await update({ isDashboardLocked: false });

      window.location.href = "/dashboard";
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    setError("");
  };

  return (
    <div className="locked-route">
      <div className="locked-route__container">
        <div className="locked-route__card">
          <div className="locked-route__header">
            <div className="locked-route__icon">
              <Shield size={32} />
            </div>
            <h1 className="locked-route__title">Dashboard Locked</h1>
            <p className="locked-route__subtitle">
              Enter your 6-digit authentication code from Google Authenticator
              to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="locked-route__form">
            <div className="locked-route__input-group">
              <label htmlFor="totp-code" className="locked-route__label">
                Authentication Code
              </label>
              <input
                id="totp-code"
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="000000"
                className={`locked-route__input ${
                  error ? "locked-route__input--error" : ""
                }`}
                maxLength={6}
                autoComplete="one-time-code"
                disabled={isLoading}
                autoFocus
              />
              {error && <div className="locked-route__error">{error}</div>}
            </div>

            <button
              type="submit"
              disabled={code.length !== 6 || isLoading}
              className="locked-route__submit-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="locked-route__spinner" />
                  Verifying...
                </>
              ) : (
                "Unlock Dashboard"
              )}
            </button>
          </form>

          <div className="locked-route__footer">
            <button onClick={handleLogout} className="locked-route__logout-btn">
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
