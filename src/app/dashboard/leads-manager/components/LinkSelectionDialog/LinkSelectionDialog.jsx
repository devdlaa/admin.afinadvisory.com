"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Loader2,
  CircleCheckBig,
  AlertCircle,
  User,
  Star,
  ExternalLink,
  Mail,
  Phone,
} from "lucide-react";

import styles from "./LinkSelectionDialog.module.scss";

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const TABS = [
  { id: "lead_contact", label: "Lead Contact", icon: User },
  { id: "influencer", label: "Influencer", icon: Star },
  { id: "external", label: "External Ref", icon: ExternalLink },
];

const EMPTY_EXTERNAL = { name: "", email: "", phone: "" };

import { isValidPhone, isValidEmail } from "@/utils/client/cutils";

/* ─────────────────────────────────────────────────────────────
   RESULT ROW
───────────────────────────────────────────────────────────── */
function ResultRow({ entity, isSelected, onSelect, type }) {
  const name =
    type === "lead_contact"
      ? entity.contact_person || entity.name
      : entity.name;
  const meta = [
    type === "lead_contact" && entity.entity_type
      ? entity.entity_type.replaceAll("_", " ")
      : null,
    entity.primary_email || entity.email,
    entity.primary_phone || entity.phone,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      className={`${styles.resultItem} ${isSelected ? styles.resultItemSelected : ""}`}
      onClick={() => onSelect(entity)}
    >
      <div className={styles.resultMain}>
        <div className={styles.resultName}>{name}</div>
        {meta && <div className={styles.resultMeta}>{meta}</div>}
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
───────────────────────────────────────────────────────────── */
function SelectedCard({ entity, type, label, onClear, isNew }) {
  const name =
    type === "lead_contact"
      ? entity.contact_person || entity.name
      : entity.name;
  const meta = [
    type === "lead_contact" && entity.entity_type
      ? entity.entity_type.replaceAll("_", " ")
      : null,
    entity.primary_email || entity.email,
    entity.primary_phone || entity.phone,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className={styles.currentSection}>
      <div className={styles.currentLabel}>{label}</div>
      <div
        className={`${styles.currentCard} ${isNew ? styles.currentCardNew : ""}`}
      >
        <div className={styles.currentInfo}>
          <div className={styles.currentName}>{name}</div>
          {meta && <div className={styles.currentMeta}>{meta}</div>}
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
  tabId,
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
          placeholder={
            tabId === "lead_contact"
              ? "Search by name, email, phone, PAN…"
              : "Search by name, email, phone…"
          }
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
                type={tabId}
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
            <span>
              {tabId === "lead_contact"
                ? "Search by name, email, phone, or PAN"
                : "Search by name, email, or phone"}
            </span>
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   EXTERNAL PANEL
───────────────────────────────────────────────────────────── */
function ExternalPanel({ value, onChange }) {
  const handleField = (field) => (e) =>
    onChange({ ...value, [field]: e.target.value });

  return (
    <div className={styles.externalPanel}>
      <div className={styles.externalField}>
        <label className={styles.externalLabel}>
          Full Name <span className={styles.req}>*</span>
        </label>
        <div className={styles.searchBox}>
          <User size={16} />
          <input
            type="text"
            placeholder="Reference person's full name"
            value={value.name}
            onChange={handleField("name")}
            autoComplete="off"
            autoFocus
          />
        </div>
      </div>

      <div className={styles.externalField}>
        <label className={styles.externalLabel}>
          Email <span className={styles.req}>*</span>
        </label>
        <div className={styles.searchBox}>
          <Mail size={16} />
          <input
            type="email"
            placeholder="email@example.com"
            value={value.email}
            onChange={handleField("email")}
            autoComplete="off"
          />
        </div>
      </div>

      <div className={styles.externalField}>
        <label className={styles.externalLabel}>
          Phone <span className={styles.req}>*</span>
        </label>
        <div className={styles.searchBox}>
          <Phone size={16} />
          <input
            type="tel"
            placeholder="+91 98765 43210"
            value={value.phone}
            onChange={handleField("phone")}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN DIALOG
   Purely presentational — zero Redux, zero dispatch.
   All data flows in via props. All side-effects go out via callbacks.

   Props
   ─────
   isOpen                  boolean

   mode                    "client" | "reference"
                           "client"    → only Lead Contact tab
                           "reference" → all 3 tabs

   selectedData            currently saved entity or null
                           { __type: "lead_contact"|"influencer"|"external",
                             id?, contact_person|name, email,
                             primary_phone?, phone?, entity_type?, status? }

   — Search results fed in from parent (parent holds Redux selectors) —
   leadContactResults      array
   leadContactSearching    boolean
   influencerResults       array
   influencerSearching     boolean

   — Callbacks —
   onClose                 () => void
   onSearchChange          (query: string, tabId: string) => void
                           parent debounces + dispatches search thunk
   onTabChange             (tabId: string) => void   (optional)
                           parent can clear results on tab switch
   onConfirm               (payload) => void
                           payload shapes:
                             { type: "lead_contact", id, contact_person, email, primary_phone, entity_type }
                             { type: "influencer",   id, name, email, phone }
                             { type: "external",     name, email, phone }
                             { type: "__cleared" }
   onAddNew                (tabId: string) => void
                           parent opens whichever add-dialog applies
   isUpdating              boolean  — shows spinner while parent is saving
───────────────────────────────────────────────────────────── */
export default function LinkSelectionDialog({
  isOpen,
  mode = "client",
  selectedData = null,

  leadContactResults = [],
  leadContactSearching = false,
  influencerResults = [],
  influencerSearching = false,

  onClose,
  onSearchChange,
  onTabChange,
  onConfirm,
  onAddNew,

  isUpdating = false,
}) {
  const visibleTabs = mode === "client" ? [TABS[0]] : TABS;

  const [activeTab, setActiveTab] = useState(visibleTabs[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelected, setTempSelected] = useState(null);
  const [isClearing, setIsClearing] = useState(false);
  const [externalForm, setExternalForm] = useState(EMPTY_EXTERNAL);

  /* ── Reset internal state each time dialog opens ── */
  useEffect(() => {
    if (!isOpen) return;

    // Fix 1: jump straight to the tab matching the saved selection
    const initialTab =
      mode === "reference" && selectedData?.__type
        ? selectedData.__type
        : visibleTabs[0].id;
    setActiveTab(initialTab);

    setSearchQuery("");
    setTempSelected(null);
    setIsClearing(false);

    // Fix 2: pre-fill external form when saved reference is external
    setExternalForm(
      selectedData?.__type === "external"
        ? {
            name: selectedData.name || "",
            email: selectedData.email || "",
            phone: selectedData.phone || "",
          }
        : EMPTY_EXTERNAL,
    );

    // Fix 3: flush any stale search results from previous open
    onSearchChange?.("", initialTab);
    onTabChange?.(initialTab);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Tab switch ── */
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchQuery("");
    setTempSelected(null);
    setIsClearing(false);
    onTabChange?.(tabId);
    onSearchChange?.("", tabId); // tell parent to clear its results
  };

  /* ── Search input — bubble straight to parent ── */
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    onSearchChange?.(value, activeTab);
  };

  /* ── Select a result row ── */
  const handleSelectEntity = (entity) => {
    setTempSelected({ ...entity, __type: activeTab });
    setIsClearing(false);
  };

  const handleClearSelection = () => {
    setIsClearing(true);
    setTempSelected(null);
  };

  const handleUndoClear = () => setIsClearing(false);

  /* ── Current tab results / loading ── */
  const currentResults =
    activeTab === "lead_contact" ? leadContactResults : influencerResults;
  const currentSearching =
    activeTab === "lead_contact" ? leadContactSearching : influencerSearching;

  /* ── External validity ── */
  const externalValid =
    externalForm.name.trim() &&
    isValidEmail(externalForm.email) &&
    isValidPhone(externalForm.phone);

  /* ── Has anything changed from what's already saved ── */
  const hasChanged = (() => {
    if (isClearing) return !!selectedData;
    if (activeTab === "external") return !!externalValid;
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

    if (activeTab === "external") {
      onConfirm({
        type: "external",
        name: externalForm.name.trim(),
        email: externalForm.email.trim(),
        phone: externalForm.phone.trim(),
      });
      return;
    }

    if (!tempSelected) return;

    if (activeTab === "lead_contact") {
      onConfirm({
        type: "lead_contact",
        id: tempSelected.id,
        contact_person: tempSelected.contact_person || tempSelected.name,
        email: tempSelected.primary_email || tempSelected.email,
        primary_phone: tempSelected.primary_phone,
        entity_type: tempSelected.entity_type,
      });
    } else {
      onConfirm({
        type: "influencer",
        id: tempSelected.id,
        name: tempSelected.name,
        email: tempSelected.email,
        phone: tempSelected.primary_phone || tempSelected.phone,
      });
    }
  };

  const handleOverlay = (e) => {
    if (e.target === e.currentTarget && !isUpdating) onClose();
  };

  const addNewLabel =
    activeTab === "lead_contact"
      ? "+ Add New Lead Contact"
      : activeTab === "influencer"
        ? "+ Add New Influencer"
        : null;

  const confirmLabel = isUpdating ? (
    <>
      <Loader2 size={15} className={styles.btnSpinner} /> Saving…
    </>
  ) : isClearing ? (
    "Remove Link"
  ) : activeTab === "external" ? (
    "Link Reference"
  ) : (
    "Confirm Selection"
  );

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlay}>
      <div className={styles.dialog}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>
            {mode === "client" ? "Select Client" : "Link Reference"}
          </h3>
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

        {/* Tab pills — reference mode only */}
        {mode === "reference" && (
          <div className={styles.tabBar}>
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`${styles.tabPill} ${activeTab === tab.id ? styles.tabPillActive : ""}`}
                  onClick={() => handleTabChange(tab.id)}
                  type="button"
                >
                  <Icon size={14} />
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
              type={selectedData.__type || "lead_contact"}
              label="Currently Linked:"
              onClear={handleClearSelection}
            />
          )}

          {isClearing && (
            <div className={styles.removalWarning}>
              <AlertCircle size={15} />
              <span>
                {mode === "client"
                  ? "Client will be removed from this lead"
                  : "Reference will be removed from this lead"}
              </span>
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
            <SelectedCard
              entity={tempSelected}
              type={tempSelected.__type}
              label="New Selection:"
              isNew
            />
          )}

          {!isClearing &&
            (activeTab !== "external" ? (
              <SearchPanel
                tabId={activeTab}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                results={currentResults}
                isSearching={currentSearching}
                tempSelected={tempSelected}
                onSelect={handleSelectEntity}
              />
            ) : (
              <ExternalPanel value={externalForm} onChange={setExternalForm} />
            ))}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {addNewLabel && activeTab !== "external" && (
              <button
                className={styles.addNewBtn}
                onClick={() => onAddNew?.(activeTab)}
                type="button"
                disabled={isUpdating}
              >
                {addNewLabel}
              </button>
            )}
          </div>
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
