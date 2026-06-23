import React from "react";
import "./TabsBar.scss";

const TabsBar = React.memo(({ tabs, activeTab, onTabChange, tabCounts }) => (
  <div className="tabs-container">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
        onClick={() => onTabChange(tab.id)}
      >
        <span className="tab-label">{tab.label}</span>
        <span className="tab-count">({tabCounts[tab.id] || 0})</span>
      </button>
    ))}
  </div>
));

export default TabsBar;