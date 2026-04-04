import React from "react";
import { AlertCircle } from "lucide-react";
import "./EmptyState.scss";

const EmptyState = ({ message = "No bookings found" }) => (
  <div className="empty-state">
    <AlertCircle size={48} />
    <p>{message}</p>
  </div>
);

export default EmptyState;