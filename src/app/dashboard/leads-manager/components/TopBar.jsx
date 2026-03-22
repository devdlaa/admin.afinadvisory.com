"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  ChevronDown,
  Plus,
  Tag,
  GitBranch,
  UserRoundPlus,
  Workflow,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import CircularProgress from "@mui/material/CircularProgress";
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
  stages,
  selectedStage,
  searchQuery = "",
  isSearching,
  sidebarHidden,
  onToggleSidebar,
  onStageChange,
  onSearch,
  onNewDeal,
  onManageTags,
  onNewInfluencer,
  onNewContact,
  onAddPipeline,
  stagesLoading,
  companies = [],
  selectedCompanyId,
  companiesLoading,
  onCompanyChange,
}) {
  const debounceRef = useRef(null);
  const [localSearch, setLocalSearch] = useState(searchQuery ?? "");

  const handleChange = useCallback(
    (e) => {
      const val = e.target.value;
      setLocalSearch(val);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onSearch?.(val), 350);
    },
    [onSearch],
  );

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
        <div className={styles.fusedPill}>
          {stagesLoading ? (
            <div className={styles.fusedPillSkeleton}>
              <div className={styles.skeletonStage} />
              <div className={styles.skeletonDivider} />
              <div className={styles.skeletonSearch} />
            </div>
          ) : (
            <>
              <StageDropdown
                stages={stages}
                selected={selectedStage}
                onChange={onStageChange}
              />
              <div className={styles.fusedDivider} />
              <div className={styles.fusedSearch}>
                <input
                  className={styles.fusedSearchInput}
                  type="text"
                  placeholder="Search in the stages..."
                  value={localSearch}
                  disabled={isSearching}
                  onChange={handleChange}
                />
                <span className={styles.fusedSearchIcon}>
                  {isSearching ? (
                    <CircularProgress size={13} thickness={5} />
                  ) : (
                    <Search size={14} strokeWidth={1.8} />
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.topBarRight}>
        <button className={styles.newLeadBtn} onClick={onNewDeal}>
          <Plus size={18} strokeWidth={2.5} />
          <span>New Lead</span>
        </button>

        <div className={styles.iconBtnGroup}>
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
