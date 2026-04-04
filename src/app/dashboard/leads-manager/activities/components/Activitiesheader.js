"use client";

import React from "react";
import { Phone, Mail, MessageCircle, Video, Info } from "lucide-react";
import styles from "../activities.module.scss";

export const ACTIVITY_TYPES = [
  { key: "CALL", label: "Call", icon: Phone },
  { key: "EMAIL", label: "Email", icon: Mail },
  { key: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { key: "VIDEO_CALL", label: "Video Call", icon: Video },
];

const DATE_FILTERS = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
];

export default function ActivitiesHeader({
  activeTypes,
  onToggleType,
  dateFilter,
  onDateFilterChange,
  users,
  selectedUser,
  onUserChange,
}) {
  const allActive = activeTypes.length === ACTIVITY_TYPES.length;

  const handleAllToggle = () =>
    onToggleType(null, allActive ? [] : ACTIVITY_TYPES.map((t) => t.key));

  return (
    <div className={styles.header}>
      {/* Left: type toggles */}
      <div className={styles.types}>
        <button
          className={allActive ? styles.typeActive : styles.typeBtn}
          onClick={handleAllToggle}
        >
          <Info size={15} strokeWidth={2.5} />
          All
        </button>

        {ACTIVITY_TYPES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={
              activeTypes.includes(key) ? styles.typeActive : styles.typeBtn
            }
            onClick={() => onToggleType(key)}
          >
            <Icon size={15} strokeWidth={2.5} />
            {label}
          </button>
        ))}
      </div>

      {/* Right: user select + date filters */}
      <div className={styles.filters}>
        <select
          value={selectedUser}
          onChange={(e) => onUserChange(e.target.value)}
          className={styles.userSelect}
        >
          <option value="">All Users</option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        {DATE_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            className={
              dateFilter === key ? styles.filterActive : styles.filterBtn
            }
            onClick={() => onDateFilterChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
