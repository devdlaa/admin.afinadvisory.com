import React from "react";
import styles from "./SegmentedTabs.module.scss";

const SegmentedTabs = ({
  tabs = [],
  activeTab = "",
  onChange = () => {},
  size = "md", 
  className = "",
}) => {
  return (
    <div className={`${styles.segmentedTabs} ${className} ${styles[size]}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            className={`${styles.tabItem} ${isActive ? styles.active : ""}`}
            onClick={() => onChange(tab.value)}
          >
            {tab.icon && <span className={styles.icon}>{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedTabs;
