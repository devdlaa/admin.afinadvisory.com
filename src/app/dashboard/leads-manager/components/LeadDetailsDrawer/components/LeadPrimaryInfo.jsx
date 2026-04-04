import React, { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Flame,
  Waves,
  AlertCircle,
  Trophy,
  Flag,
  Calendar,
  User,
  Clock,
  XCircle,
} from "lucide-react";
import styles from "../LeadDetailsDrawer.module.scss";
import { formatDate } from "@/utils/shared/shared_util";

/* ================= PRIORITY CONFIG ================= */
const PRIORITIES = [
  {
    value: "LOW",
    label: "Low Priority",
    Icon: AlertCircle,
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#3c755031",
  },
  {
    value: "NORMAL",
    label: "Normal Priority",
    Icon: Waves,
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  {
    value: "URGENT",
    label: "Urgent",
    Icon: Flame,
    color: "#dc2626",
    bg: "#fff1f2",
    border: "#fecdd3",
  },
];

const STATUS_CONFIG = {
  WON: {
    label: "LEAD WON",
    Icon: Trophy,
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  LOST: {
    label: "LEAD LOST",
    Icon: XCircle,
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
  },
  OPEN: {
    label: "LEAD OPEN",
    Icon: Clock,
    color: "#ca8a04",
    bg: "#fefce8",
    border: "#fde68a",
  },
};

/* ================= PRIORITY PILL ================= */
function PriorityPill({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = PRIORITIES.find((p) => p.value === value) || PRIORITIES[1];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={styles.priorityWrapper} ref={ref}>
      <button
        className={styles.pill}
        style={{
          "--pill-bg": current.bg,
          "--pill-border": current.border,
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.pillMeta}>
          <span className={styles.pillLabel}>PRIORITY</span>
          <span className={styles.pillValue} style={{ color: current.color }}>
            <current.Icon size={22} strokeWidth={2.2} />
            {current.label}
          </span>
        </span>
        <ChevronDown size={18} className={styles.pillChevron} />
      </button>

      {open && (
        <div
          className={`${styles.dropdown} ${open ? styles.dropdownOpen : ""}`}
        >
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              className={styles.dropdownItem}
              onClick={() => {
                onChange(p.value);
                setOpen(false);
              }}
            >
              <p.Icon size={18} strokeWidth={2} color={p.color} />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= READONLY PILL ================= */
function ReadonlyPill({
  label,
  value,
  Icon,
  color = "#71717a",
  bg = "#fafafa",
  border = "#e4e4e7",
}) {
  return (
    <div
      className={styles.pill}
      style={{ "--pill-bg": bg, "--pill-border": border }}
    >
      <span className={styles.pillMeta}>
        <span className={styles.pillLabel}>{label}</span>
        <span className={styles.pillValue} style={{ color }}>
          <Icon size={22} strokeWidth={2.1} />
          {value || "-"}
        </span>
      </span>
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */
export default function LeadPrimaryInfo({
  lead,
  title,
  description,
  priority,
  activeStage,
  onTitleChange,
  onDescriptionChange,
  onPriorityChange,
  leadConversonStatus,
  createdBy,
  createdAt,
  expectedCloseDate,
  closedAt,
}) {
  const status = STATUS_CONFIG[leadConversonStatus] || STATUS_CONFIG.OPEN;
  return (
    <section className={styles.lead_primary_info}>
      {/* TITLE */}
      <div className={styles.leadTitleSection}>
        <p className={styles.sectionEyebrow}>LEAD TITLE</p>
        <textarea
          className={styles.titleTextarea}
          value={title || ""}
          onChange={(e) => onTitleChange(e.target.value)}
          rows={1}
        />
      </div>

      {/* DESCRIPTION */}
      <p className={styles.sectionEyebrow}>Description</p>
      <textarea
        className={styles.descTextarea}
        value={description || ""}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Description About This Lead..."
        rows={5}
      />

      {/* PILLS */}
      <div className={styles.pillsGrid}>
        <PriorityPill value={priority} onChange={onPriorityChange} />
        <ReadonlyPill
          label="CONVERSION STATUS"
          value={status.label}
          Icon={status.Icon}
          color={status.color}
          bg={status.bg}
          border={status.border}
        />
        <ReadonlyPill
          label="ACTIVE STAGE"
          value={activeStage.name}
          Icon={Flag}
          color="#d97706"
          bg="#fffbeb"
          border="#fde68a"
        />
      </div>

      {/* META */}
      <div className={styles.metaGrid}>
        <ReadonlyPill
          label="CREATED ON"
          value={formatDate(createdAt)}
          Icon={Calendar}
        />

        <ReadonlyPill label="CREATED BY" value={createdBy?.name} Icon={User} />

        {closedAt ? (
          <ReadonlyPill
            label={
              leadConversonStatus === "WON"
                ? "WON ON"
                : leadConversonStatus === "LOST"
                  ? "LOST ON"
                  : "CLOSED ON"
            }
            value={formatDate(closedAt)}
            Icon={Calendar}
          />
        ) : (
          <ReadonlyPill
            label="EXPECTED CLOSE DATE"
            value={formatDate(expectedCloseDate)}
            Icon={Clock}
          />
        )}
      </div>
    </section>
  );
}
