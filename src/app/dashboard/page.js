import React from "react";
import { LayoutDashboard } from "lucide-react"; // lucid icon
import "./dashboard.scss";

const Page = () => {
  return (
    <div className="dashboard-container">
      <div className="dashboard-box">
        <LayoutDashboard size={40} className="dashboard-icon" />
        <h2>Dashboard</h2>
        <p>Your dashboard content will appear here soon.</p>
      </div>
    </div>
  );
};

export default Page;