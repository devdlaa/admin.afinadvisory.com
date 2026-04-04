"use client";

import "./AccessDenied.scss";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function AccessDeniedInner() {
  const searchParams = useSearchParams();
  const requestedPath = searchParams.get("requested_path");

  return (
    <div className="access-denied-container">
      <div className="access-denied-box">
        <h1 className="access-denied-title">Access Denied</h1>
        <p className="access-denied-message">
          You do not have permission to view <strong>{requestedPath}</strong>.
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

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccessDeniedInner />
    </Suspense>
  );
}
