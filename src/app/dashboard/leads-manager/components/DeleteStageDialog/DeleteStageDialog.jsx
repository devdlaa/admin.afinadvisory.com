"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Trash2,
  Plus,
  ChevronDown,
  Loader2,
  AlertTriangle,
  GitMerge,
  ArrowRight,
} from "lucide-react";
import styles from "./DeleteStageDialog.module.scss";

export default function DeleteStageDialog({
  open,
  onClose,
  onConfirm,
  stageToDelete,
  existingStages = [],
}) {
  const [mode, setMode] = useState("existing"); // "existing" | "new"
  const [selectedStageId, setSelectedStageId] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const dropdownRef = useRef(null);
  const newStageInputRef = useRef(null);

  // Only open stages are valid migration targets
  const targetableStages = existingStages.filter((s) => !s.is_closed);
  const selectedStage = targetableStages.find((s) => s.id === selectedStageId);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMode("existing");
      setSelectedStageId("");
      setNewStageName("");
      setDropdownOpen(false);
      setLoading(false);
      setError(null);
    }
  }, [open]);

  // Focus new stage input when switching to new mode
  useEffect(() => {
    if (mode === "new") {
      setTimeout(() => newStageInputRef.current?.focus(), 50);
    }
  }, [mode]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const isReady =
    (mode === "existing" && !!selectedStageId) ||
    (mode === "new" && newStageName.trim().length >= 2);

  const handleConfirm = async () => {
    if (!isReady || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onConfirm(
        mode === "existing"
          ? { migrate_to_stage_id: selectedStageId }
          : { migrate_to_new_stage_name: newStageName.trim() },
      );
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (loading) return;
    if (e.target === e.currentTarget) onClose();
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerIconWrap}>
            <Trash2 size={24} strokeWidth={2.2} />
          </div>
          <div className={styles.headerText}>
            <p className={styles.headerTitle}>Delete Stage</p>
            <p className={styles.headerSub}>Move leads before removing</p>
          </div>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            disabled={loading}
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Stage chip ── */}
        <div className={styles.body}>
          <div className={styles.stageBadge}>
            <GitMerge size={20} />
            <span className={styles.stageBadgeName}>
              {stageToDelete?.name ?? "—"}
            </span>
            <ArrowRight size={18} className={styles.stageBadgeArrow} />
            <span className={styles.stageBadgeLabel}>
              all leads will move to
            </span>
          </div>

          {/* ── Migration target ── */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Move leads to</p>

            {/* Existing stage dropdown */}
            {mode === "existing" && (
              <div className={styles.dropdownWrap} ref={dropdownRef}>
                <button
                  type="button"
                  className={`${styles.dropdownTrigger} ${dropdownOpen ? styles.dropdownTriggerOpen : ""}`}
                  onClick={() => !loading && setDropdownOpen((v) => !v)}
                  disabled={loading}
                >
                  <span className={styles.dropdownTriggerText}>
                    {selectedStage
                      ? selectedStage.name
                      : "Select an existing stage…"}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`${styles.dropdownChevron} ${dropdownOpen ? styles.dropdownChevronOpen : ""}`}
                  />
                </button>

                {dropdownOpen && (
                  <div className={styles.dropdownMenu}>
                    {targetableStages.length === 0 ? (
                      <p className={styles.dropdownEmpty}>
                        No other stages available
                      </p>
                    ) : (
                      targetableStages.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`${styles.dropdownItem} ${s.id === selectedStageId ? styles.dropdownItemSelected : ""}`}
                          onClick={() => {
                            setSelectedStageId(s.id);
                            setDropdownOpen(false);
                          }}
                        >
                          <GitMerge size={18} />
                          <span>{s.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* New stage input */}
            {mode === "new" && (
              <div className={styles.newStageWrap}>
                <input
                  ref={newStageInputRef}
                  type="text"
                  className={styles.newStageInput}
                  placeholder="New stage name…"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  disabled={loading}
                  maxLength={80}
                />
              </div>
            )}

            {/* Toggle between modes */}
            <div className={styles.modeToggle}>
              {mode === "existing" ? (
                <button
                  type="button"
                  className={styles.modeToggleBtn}
                  onClick={() => {
                    setMode("new");
                    setSelectedStageId("");
                  }}
                  disabled={loading}
                >
                  <Plus size={15} />
                  <span>Create a new stage instead</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.modeToggleBtn}
                  onClick={() => {
                    setMode("existing");
                    setNewStageName("");
                  }}
                  disabled={loading}
                >
                  <GitMerge size={13} />
                  <span>Move to existing stage instead</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Warning ── */}
          <div className={styles.warning}>
            <span>
              This is permanent. The stage will be deleted and all leads moved.
            </span>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className={styles.errorBanner}>
              <AlertTriangle size={13} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className={`${styles.deleteBtn} ${!isReady ? styles.deleteBtnDisabled : ""}`}
            onClick={handleConfirm}
            disabled={!isReady || loading}
          >
            {loading ? (
              <>
                <Loader2 size={14} className={styles.spinner} />
                <span>Moving leads…</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Delete Stage</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
