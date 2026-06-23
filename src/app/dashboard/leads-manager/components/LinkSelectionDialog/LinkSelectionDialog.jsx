"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Loader2,
  CircleCheckBig,
  AlertCircle,
  User,
  Mail,
  Phone,
} from "lucide-react";

import styles from "./LinkSelectionDialog.module.scss";
import { isValidPhone, isValidEmail } from "@/utils/client/cutils";

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const EMPTY_EXTERNAL = { name: "", email: "", phone: "" };

/* ─────────────────────────────────────────────────────────────
   RESULT ROW
   Expects entity.displayName and entity.displayMeta (pre-computed by parent)
───────────────────────────────────────────────────────────── */
function ResultRow({ entity, isSelected, onSelect }) {
  return (
    <div
      className={`${styles.resultItem} ${isSelected ? styles.resultItemSelected : ""}`}
      onClick={() => onSelect(entity)}
    >
      <div className={styles.resultMain}>
        <div className={styles.resultName}>{entity.displayName}</div>
        {entity.displayMeta && (
          <div className={styles.resultMeta}>{entity.displayMeta}</div>
        )}
      </div>
      {isSelected && (
        <div className={styles.selectedCheck}>
          <CircleCheckBig size={20} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SELECTED CARD
   Expects entity.displayName and entity.displayMeta (pre-computed by parent)
───────────────────────────────────────────────────────────── */
function SelectedCard({ entity, label, onClear, isNew }) {
  return (
    <div className={styles.currentSection}>
      <div className={styles.currentLabel}>{label}</div>
      <div
        className={`${styles.currentCard} ${isNew ? styles.currentCardNew : ""}`}
      >
        <div className={styles.currentInfo}>
          <div className={styles.currentName}>{entity.displayName}</div>
          {entity.displayMeta && (
            <div className={styles.currentMeta}>{entity.displayMeta}</div>
          )}
        </div>
        <div className={styles.currentActions}>
          {!isNew && entity.status && (
            <span
              className={`${styles.statusBadge} ${entity.status === "ACTIVE" ? styles.statusActive : ""}`}
            >
              {entity.status}
            </span>
          )}
          {onClear && (
            <button
              className={styles.clearBtn}
              onClick={onClear}
              type="button"
              title="Remove"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SEARCH PANEL
───────────────────────────────────────────────────────────── */
function SearchPanel({
  placeholder,
  searchQuery,
  onSearchChange,
  results,
  isSearching,
  tempSelected,
  onSelect,
}) {
  return (
    <>
      <div className={styles.searchBox}>
        <Search size={16} />
        <input
          type="text"
          placeholder={placeholder || "Search…"}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          autoFocus
          autoComplete="off"
        />
        {isSearching && <Loader2 size={15} className={styles.searchSpinner} />}
      </div>

      <div className={styles.resultsBox}>
        {isSearching && results.length === 0 ? (
          <div className={styles.stateCenter}>
            <Loader2 size={24} className={styles.spinnerLarge} />
            <span>Searching…</span>
          </div>
        ) : results.length > 0 ? (
          <div className={styles.resultList}>
            {results.map((entity) => (
              <ResultRow
                key={entity.id}
                entity={entity}
                isSelected={tempSelected?.id === entity.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : searchQuery ? (
          <div className={styles.stateCenter}>
            <Search size={40} className={styles.stateIcon} />
            <p>No results found</p>
            <span>Try different keywords</span>
          </div>
        ) : (
          <div className={styles.stateCenter}>
            <Search size={40} className={styles.stateIcon} />
            <p>Start typing to search</p>
            <span>{placeholder || "Search to get started"}</span>
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   EXTERNAL / FORM PANEL
───────────────────────────────────────────────────────────── */
function ExternalPanel({ value, onChange, isFilter = false }) {
  const handleField = (field) => (e) =>
    onChange({ ...value, [field]: e.target.value });

  const handleFilterFocus = (focusedField) => {
    if (!isFilter) return;
    const cleared = { name: "", email: "", phone: "" };
    onChange({ ...cleared, [focusedField]: value[focusedField] });
  };

  return (
    <div className={styles.externalPanel}>
      <div className={styles.externalField}>
        <label className={styles.externalLabel}>
          Full Name {!isFilter && <span className={styles.req}>*</span>}
        </label>
        <div className={styles.searchBox}>
          <User size={16} />
          <input
            type="text"
            placeholder="Reference person's full name"
            value={value.name}
            onChange={handleField("name")}
            onFocus={() => handleFilterFocus("name")}
            autoComplete="off"
            autoFocus
          />
        </div>
      </div>

      <div className={styles.externalField}>
        <label className={styles.externalLabel}>
          Email {!isFilter && <span className={styles.req}>*</span>}
        </label>
        <div className={styles.searchBox}>
          <Mail size={16} />
          <input
            type="email"
            placeholder="email@example.com"
            value={value.email}
            onChange={handleField("email")}
            onFocus={() => handleFilterFocus("email")}
            autoComplete="off"
          />
        </div>
      </div>

      <div className={styles.externalField}>
        <label className={styles.externalLabel}>
          Phone {!isFilter && <span className={styles.req}>*</span>}
        </label>
        <div className={styles.searchBox}>
          <Phone size={16} />
          <input
            type="tel"
            placeholder="+91 98765 43210"
            value={value.phone}
            onChange={handleField("phone")}
            onFocus={() => handleFilterFocus("phone")}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN DIALOG

   Props
   ─────
   isOpen          boolean

   title           string  — dialog header title

   tabs            Tab[]   — drives everything; parent owns all domain logic
                   Tab (search):
                     { id, label, icon, placeholder?, results, isSearching }
                     each result entity must have: { id, displayName, displayMeta? }
                   Tab (form):
                     { id, label, icon, type: "form" }
                     currently only one form tab supported; renders ExternalPanel

   selectedData    currently saved entity or null
                   { __type, id?, displayName, displayMeta?, status? }
                   for form tab: { __type: <form tab id>, name, email, phone }

   onClose         () => void

   onSearchChange  (query: string, tabId: string) => void
                   parent debounces + dispatches; dialog only calls this

   onTabChange     (tabId: string) => void  (optional)
                   called on tab switch so parent can clear stale results

   onConfirm       (payload) => void
                   search tab:  { type: tabId, id, displayName, displayMeta }
                   form tab:    { type: tabId, name, email, phone }
                   cleared:     { type: "__cleared" }

   isUpdating      boolean — shows spinner while parent saves
───────────────────────────────────────────────────────────── */
export default function LinkSelectionDialog({
  isOpen,
  title = "Select",
  tabs = [],
  selectedData = null,
  onClose,
  onSearchChange,
  onTabChange,
  onConfirm,
  isUpdating = false,
  isFilter = false,
}) {
  const [activeTabId, setActiveTabId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelected, setTempSelected] = useState(null);
  const [isClearing, setIsClearing] = useState(false);
  const [externalForm, setExternalForm] = useState(EMPTY_EXTERNAL);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0] ?? null;
  const isFormTab = activeTab?.type === "form";

  /* ── Reset each time dialog opens ── */
  useEffect(() => {
    if (!isOpen || !tabs.length) return;

    const initialTabId =
      selectedData?.__type && tabs.some((t) => t.id === selectedData.__type)
        ? selectedData.__type
        : tabs[0].id;

    setActiveTabId(initialTabId);
    setSearchQuery("");
    setTempSelected(null);
    setIsClearing(false);

    const initialTab = tabs.find((t) => t.id === initialTabId);
    const isInitialForm = initialTab?.type === "form";

    setExternalForm(
      isInitialForm && selectedData?.__type === initialTabId
        ? {
            name: selectedData.name || "",
            email: selectedData.email || "",
            phone: selectedData.phone || "",
          }
        : EMPTY_EXTERNAL,
    );

    onSearchChange?.("", initialTabId);
    onTabChange?.(initialTabId);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Tab switch ── */
  const handleTabChange = (tabId) => {
    setActiveTabId(tabId);
    setSearchQuery("");
    setTempSelected(null);
    setIsClearing(false);
    onTabChange?.(tabId);
    onSearchChange?.("", tabId);
  };

  /* ── Search input ── */
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    onSearchChange?.(value, activeTabId);
  };

  /* ── Row selection ── */
  const handleSelectEntity = (entity) => {
    setTempSelected({ ...entity, __type: activeTabId });
    setIsClearing(false);
  };

  const handleClearSelection = () => {
    setIsClearing(true);
    setTempSelected(null);
  };

  const handleUndoClear = () => setIsClearing(false);

  /* ── External form validity ── */
  const externalValid = isFilter
    ? externalForm.name.trim() ||
      isValidEmail(externalForm.email) ||
      isValidPhone(externalForm.phone)
    : externalForm.name.trim() &&
      isValidEmail(externalForm.email) &&
      isValidPhone(externalForm.phone);

  /* ── Has anything changed from what's already saved ── */
  const hasChanged = (() => {
    if (isClearing) return !!selectedData;
    if (isFormTab) return !!externalValid;
    if (!tempSelected) return false;
    if (!selectedData) return true;
    return (
      tempSelected.id !== selectedData.id ||
      tempSelected.__type !== selectedData.__type
    );
  })();

  /* ── Build payload and hand off to parent ── */
  const handleConfirm = () => {
    if (!hasChanged || isUpdating) return;

    if (isClearing) {
      onConfirm({ type: "__cleared" });
      return;
    }

    if (isFormTab) {
      onConfirm({
        type: activeTabId,
        name: externalForm.name.trim(),
        email: externalForm.email.trim(),
        phone: externalForm.phone.trim(),
      });
      return;
    }

    if (!tempSelected) return;

    onConfirm({
      type: activeTabId,
      id: tempSelected.id,
      displayName: tempSelected.displayName,
      displayMeta: tempSelected.displayMeta,
    });
  };

  const handleOverlay = (e) => {
    if (e.target === e.currentTarget && !isUpdating) onClose();
  };

  const confirmLabel = isUpdating ? (
    <>
      <Loader2 size={15} className={styles.btnSpinner} /> Saving…
    </>
  ) : isClearing ? (
    "Remove Link"
  ) : isFormTab ? (
    "Link Reference"
  ) : (
    "Confirm Selection"
  );

  if (!isOpen || !tabs.length) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlay}>
      <div className={styles.dialog}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            type="button"
            disabled={isUpdating}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab pills — only shown when more than one tab */}
        {tabs.length > 1 && (
          <div className={styles.tabBar}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`${styles.tabPill} ${activeTabId === tab.id ? styles.tabPillActive : ""}`}
                  onClick={() => handleTabChange(tab.id)}
                  type="button"
                >
                  {Icon && <Icon size={14} />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className={styles.body}>
          {selectedData && !isClearing && (
            <SelectedCard
              entity={selectedData}
              label="Currently Linked:"
              onClear={handleClearSelection}
            />
          )}

          {isClearing && (
            <div className={styles.removalWarning}>
              <AlertCircle size={15} />
              <span>This will be removed from the lead</span>
              <button
                className={styles.undoBtn}
                onClick={handleUndoClear}
                type="button"
              >
                Undo
              </button>
            </div>
          )}

          {tempSelected && !isClearing && (
            <SelectedCard entity={tempSelected} label="New Selection:" isNew />
          )}

          {!isClearing &&
            (isFormTab ? (
              <ExternalPanel
                value={externalForm}
                onChange={setExternalForm}
                isFilter={isFilter}
              />
            ) : (
              <SearchPanel
                placeholder={activeTab?.placeholder}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                results={activeTab?.results ?? []}
                isSearching={activeTab?.isSearching ?? false}
                tempSelected={tempSelected}
                onSelect={handleSelectEntity}
              />
            ))}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerLeft} />
          <div className={styles.footerRight}>
            <button
              className={styles.cancelBtn}
              onClick={onClose}
              type="button"
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              className={`${styles.confirmBtn} ${isClearing ? styles.confirmBtnDanger : ""}`}
              onClick={handleConfirm}
              type="button"
              disabled={!hasChanged || isUpdating}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
