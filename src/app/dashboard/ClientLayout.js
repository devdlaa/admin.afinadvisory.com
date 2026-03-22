"use client";

import { useState } from "react";
import Sidebar from "../components/shared/Sidebar/Sidebar";
import { Providers } from "../components/providers";
import LockDashboardButton from "../components/shared/LockDashboardButton/LockDashboardButton";

export default function ClientLayout({ children }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Providers>
      <div className="layout">
        <Sidebar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
        <div
          className={`main-content ${isExpanded ? "sidebar-open" : "sidebar-closed"}`}
        >
          <div className="content-area">{children}</div>
        </div>
        {/* <LockDashboardButton /> */}
      </div>
    </Providers>
  );
}
