"use client";

import Sidebar from "../components/shared/Sidebar/Sidebar";
import { Providers } from "../components/providers";
import LockDashboardButton from "../components/shared/LockDashboardButton/LockDashboardButton";

export default function ClientLayout({ children }) {
  return (
    <Providers>
      <div className="layout">
        <Sidebar />
        <div className="main-content">
          <div className="content-area">{children}</div>
        </div>
        <LockDashboardButton />
      </div>
    </Providers>
  );
}
