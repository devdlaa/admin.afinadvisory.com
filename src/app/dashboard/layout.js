"use client";

import dynamic from "next/dynamic";
import "./layout.scss";

const ClientLayout = dynamic(() => import("./ClientLayout"), { ssr: false });

export default function DashboardLayout({ children }) {
  return <ClientLayout>{children}</ClientLayout>;
}
