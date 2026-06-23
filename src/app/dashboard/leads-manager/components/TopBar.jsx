"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronDown,
  Tag,
  GitBranch,
  UserRoundPlus,
  Workflow,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
} from "lucide-react";

import MuiTooltip from "@mui/material/Tooltip";
import styles from "../page.module.scss";

function StageDropdown({ stages, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={styles.stageDropdownWrap} ref={ref}>
      <button
        className={styles.stageDropdownTrigger}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{selected}</span>
        <ChevronDown size={15} strokeWidth={2.2} />
      </button>
      {open && (
        <div className={styles.stageDropdownMenu}>
          {stages.map((stage) => (
            <button
              key={stage}
              className={`${styles.stageDropdownItem} ${stage === selected ? styles.stageDropdownItemSelected : ""}`}
              onClick={() => {
                onChange(stage);
                setOpen(false);
              }}
            >
              {stage}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyDropdown({ companies, selectedId, onChange, loading }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = companies.find((c) => c.id === selectedId);

  if (loading) {
    return (
      <div className={styles.companySkeleton}>
        <div className={styles.skeletonCompany} />
      </div>
    );
  }

  return (
    <div className={styles.stageDropdownWrap} ref={ref}>
      <button
        className={styles.companyTrigger}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{selected?.name ?? "Select Company"}</span>
        <ChevronDown size={15} strokeWidth={2.2} />
      </button>

      {open && (
        <div className={styles.stageDropdownMenu}>
          {companies.map((c) => (
            <button
              key={c.id}
              className={`${styles.stageDropdownItem} ${
                c.id === selectedId ? styles.stageDropdownItemSelected : ""
              }`}
              onClick={() => {
                onChange(c.id);
                setOpen(false);
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({ icon, tooltip, onClick }) {
  return (
    <MuiTooltip title={tooltip} placement="bottom" arrow>
      <button className={styles.iconBtn} onClick={onClick}>
        {icon}
      </button>
    </MuiTooltip>
  );
}

export default function TopBar({
  sidebarHidden,
  onToggleSidebar,
  onRefreshKanbanBoard,
  onManageTags,
  onNewInfluencer,
  onNewContact,
  onAddPipeline,
  companies = [],
  selectedCompanyId,
  companiesLoading,
  onCompanyChange,
}) {
  const debounceRef = useRef(null);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div className={styles.topBar}>
      <div className={styles.topBarLeft}>
        <MuiTooltip
          title={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
          placement="bottom"
          arrow
        >
          <button className={styles.iconBtn} onClick={onToggleSidebar}>
            {sidebarHidden ? (
              <PanelLeftOpen size={20} strokeWidth={2.4} />
            ) : (
              <PanelLeftClose size={20} strokeWidth={2.4} />
            )}
          </button>
        </MuiTooltip>
        <div className={styles.companyDropdownWrap}>
          <CompanyDropdown
            companies={companies}
            selectedId={selectedCompanyId}
            onChange={onCompanyChange}
            loading={companiesLoading}
          />
        </div>
      </div>

      <div className={styles.topBarRight}>
        <div className={styles.iconBtnGroup}>
          <IconBtn
            icon={<RefreshCcw size={20} strokeWidth={2.4} />}
            tooltip="Refresh Leads"
            onClick={onRefreshKanbanBoard}
          />
          <IconBtn
            icon={<Tag size={20} strokeWidth={2.4} />}
            tooltip="Manage tags"
            onClick={onManageTags}
          />
          <IconBtn
            icon={<GitBranch size={20} strokeWidth={2.4} />}
            tooltip="New influencer"
            onClick={onNewInfluencer}
          />
          <IconBtn
            icon={<UserRoundPlus size={20} strokeWidth={2.4} />}
            tooltip="New lead contact"
            onClick={onNewContact}
          />
          <IconBtn
            icon={<Workflow size={20} strokeWidth={2.4} />}
            tooltip="Add pipeline"
            onClick={onAddPipeline}
          />
        </div>
      </div>
    </div>
  );
}
