"use client";

import { Activity, Flag, NotebookPen, FolderOpen, Clock } from "lucide-react";
import styles from "./LeadDrawerTabs.module.scss";

const TABS = [
  { key: "activity", label: "Activity", Icon: Activity },
  { key: "timeline", label: "Stage Timeline", Icon: Flag },
  { key: "notes", label: "Notes", Icon: NotebookPen },
  { key: "documents", label: "Documents", Icon: FolderOpen },
  { key: "logs", label: "Change Logs", Icon: Clock },
];

export default function LeadDrawerTabs({ currentTab, onTabChange }) {
  return (
    <div className={styles.tabsBar}>
      {TABS.map(({ key, label, Icon }, idx) => (
        <button
          key={key}
          className={[
            styles.tab,
            currentTab === key ? styles.active : "",
            idx > 0 ? styles.divided : "",
          ].join(" ")}
          onClick={() => onTabChange(key)}
        >
          <Icon size={20} strokeWidth={currentTab === key ? 2.2 : 1.8} />
          {label}
        </button>
      ))}
    </div>
  );
}

