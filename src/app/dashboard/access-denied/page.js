// app/dashboard/access-denied/page.jsx
"use client";

import "./AccessDenied.scss";

import { useSearchParams } from "next/navigation";

export default function AccessDenied() {
  const searchParams = useSearchParams();
  const requestedPath = searchParams.get("requested_path");

  return (
    <div className="access-denied-container">
      <div className="access-denied-box">
        <h1 className="access-denied-title">Access Denied</h1>
        <p className="access-denied-message">
          You do not have permission to view{" "}
          <strong>{requestedPath}</strong>.
        </p>
        <p className="access-denied-message">
          If you think this is a mistake, please contact your administrator.
        </p>
        <button
          className="access-denied-button"
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
