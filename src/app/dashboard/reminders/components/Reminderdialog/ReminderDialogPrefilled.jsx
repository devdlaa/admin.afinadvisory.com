"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateReminder,
  syncChecklist,
  reminderLifecycle,
  selectUpdating,
  createReminder,
  selectCreating,
  closeReminderDialog,
} from "@/store/slices/remindersSlice";
import debounce from "lodash.debounce";
import {
  X,
  Lightbulb,
  Hash,
  Plus,
  Link2,
  Bell,
  AlarmClock,
  CircleCheckBig,
} from "lucide-react";
import { CircularProgress } from "@mui/material";

import styles from "./ReminderDialog.module.scss";
import LeadTagsDialog from "../LeadTagsDialog/LeadTagsDialog";
import ReminderListsDialog from "../Reminderlistsdialog/Reminderlistsdialog";
import RemindMeDialog from "../Remindmedialog/Remindmedialog";
import ReminderChecklist from "../ReminderChecklist/ReminderChecklist";
import ReminderDialogSkeleton from "../ReminderDialogSkeleton/ReminderDialogSkeleton.jsx";
import { REMINDER_ICON_COMPONENTS } from "../Reminderlistsdialog/reminderIconMap";
import {
  SNOOZE_OPTS,
  getReminderPillLabel,
  buildReminderPayload,
  buildChecklistPayload,
  buildUpdatePayload,
} from "./ReminderDialog.utils";
import { transformReminderDetail } from "../reminderUtils";

// ─── helpers ─────────────────────────────────────────────────────────────────

function isFormDirty(current, saved) {
  const strip = (f) => ({ ...f, checklist: [] });
  return JSON.stringify(strip(current)) !== JSON.stringify(strip(saved));
}

function validateForm(form) {
  if (!form.title.trim()) return "Please enter a reminder title.";
  if (!form.bucket) return "Please select a list.";
  if (!form.reminderConfig) return "Please set a remind-me date/time.";
  return null;
}

export default function ReminderDialogPrefilled({
  mode = "create",
  activeReminderId,
  prefillData = null,
  prefillLoading = false,
  onClose,
}) {
  const dispatch = useDispatch();
  const isUpdate = mode === "update";

  // ── Redux state ──
  const updating = useSelector(selectUpdating);
  const creating = useSelector(selectCreating);
  const loading = isUpdate ? updating : creating;

  // ── local action loading (snooze / complete) ──
  const [actionLoading, setActionLoading] = useState(false);

  // ── debounced checklist sync ──
  const debouncedSyncRef = useRef(
    debounce((id, items) => {
      dispatch(syncChecklist({ reminderId: id, items }));
    }, 600),
  );

  // ── seed form from prefillData ──
  // Use prefillData directly (already transformed by the parent/caller)
  const initialData = isUpdate ? transformReminderDetail(prefillData) : null;

  // ── form state ──
  const [form, setForm] = useState(() => (isUpdate ? initialData : null));
  const savedRef = useRef(isUpdate ? initialData : null);

  // Re-seed once prefillData arrives (handles async parent fetch)
  const seededRef = useRef(false);
  useEffect(() => {
    if (isUpdate && prefillData && !seededRef.current) {
      const seeded = transformReminderDetail(prefillData);
      setForm(seeded);
      savedRef.current = seeded;
      seededRef.current = true;
    }
  }, [isUpdate, prefillData]);

  // Reset seed flag when reminder changes (e.g. user opens different reminder)
  useEffect(() => {
    seededRef.current = false;
  }, [activeReminderId]);

  const dirty = isUpdate && isFormDirty(form, savedRef.current);
  const patch = useCallback(
    (fields) => setForm((p) => ({ ...p, ...fields })),
    [],
  );

  // ── panel / snooze ──
  const [panelOpen, setPanelOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [loadingSnoozeLabel, setLoadingSnoozeLabel] = useState(null);

  // ── sub-dialog flags ──
  const [tagsOpen, setTagsOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);

  // ── validation error ──
  const [formError, setFormError] = useState(null);

  // ── derived ──
  const bucket = form.bucket ?? null;
  const BucketIcon = (bucket && REMINDER_ICON_COMPONENTS[bucket.icon]) || Hash;
  const remindLabel = getReminderPillLabel(form.reminderConfig);

  // ─── Redux-backed handlers ────────────────────────────────────────────────

  const handleComplete = async () => {
    if (!activeReminderId) return;
    setActionLoading(true);
    try {
      await dispatch(
        reminderLifecycle({
          reminderId: activeReminderId,
          action: "ACKNOWLEDGE",
        }),
      ).unwrap();
    } catch (err) {
      console.error("Complete failed:");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSnoozeClick = async (opt) => {
    if (loadingSnoozeLabel || actionLoading) return;
    const payload =
      typeof opt.payload === "function" ? opt.payload() : opt.payload;
    setLoadingSnoozeLabel(opt.label);
    try {
      await dispatch(
        reminderLifecycle({ reminderId: activeReminderId, ...payload }),
      ).unwrap();
    } catch (err) {
      console.error("Snooze failed:");
    } finally {
      setLoadingSnoozeLabel(null);
      setSnoozeOpen(false);
    }
  };

  const handleCreate = async (payload) => {
    const result = await dispatch(createReminder(payload));
    if (createReminder.fulfilled.match(result)) {
      if (!result.payload?.data?.conflict?.exists) {
        dispatch(closeReminderDialog());
      }
    }
  };

  const handleUpdate = async (payload) => {
    if (!activeReminderId) return;
    await dispatch(
      updateReminder({ reminderId: activeReminderId, ...payload }),
    );
  };

  const handleChecklistChange = useCallback(
    (updated) => {
      patch({ checklist: updated });
      if (isUpdate && activeReminderId) {
        debouncedSyncRef.current(
          activeReminderId,
          buildChecklistPayload(updated),
        );
      }
    },
    [patch, isUpdate, activeReminderId],
  );

  // ─── Form handlers ────────────────────────────────────────────────────────

  const handleTagsDone = useCallback(
    (selectedTags) => {
      patch({ tags: selectedTags });
      setTagsOpen(false);
    },
    [patch],
  );

  const handleListDone = useCallback(
    (selectedList) => {
      const resolved = Array.isArray(selectedList)
        ? (selectedList[0] ?? null)
        : (selectedList ?? null);
      patch({ bucket: resolved });
      setListsOpen(false);
    },
    [patch],
  );

  const handleRemindSet = useCallback(
    (config) => {
      patch({ reminderConfig: config });
      setRemindOpen(false);
    },
    [patch],
  );

  const handleSave = async () => {
    const err = validateForm(form);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);

    if (!isUpdate) {
      handleCreate(buildReminderPayload(form));
      return;
    }

    const delta = buildUpdatePayload(form, savedRef.current);
    await handleUpdate(delta);

    const snapshot = JSON.parse(JSON.stringify(form));
    savedRef.current = snapshot;
    setForm({ ...snapshot });
  };

  const handleDiscard = () => {
    setForm({ ...savedRef.current });
    setFormError(null);
  };

  // prefillLoading replaces the old detailLoading from Redux
  const locked = loading || (isUpdate && prefillLoading);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className={`${styles.wrapper} ${panelOpen ? styles.wrapperExpanded : ""}`}
      >
        {/* ═══ LEFT CARD ═══ */}
        <div className={`${styles.card}  ${styles.max_height} `}>
          {snoozeOpen ? (
            <>
              <div className={styles.snoozeFull}>
                <div className={styles.snoozeHeader}>
                  <span>Snooze</span>
                  <button
                    className={styles.iconBtn}
                    onClick={() => setSnoozeOpen(false)}
                    type="button"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className={styles.snoozeBody}>
                  <div className={styles.snoozeGrid}>
                    {SNOOZE_OPTS.map((opt) => {
                      const isThisLoading = loadingSnoozeLabel === opt.label;
                      return (
                        <button
                          key={opt.label}
                          className={styles.snoozeBtn}
                          onClick={() => handleSnoozeClick(opt)}
                          disabled={!!loadingSnoozeLabel || actionLoading}
                        >
                          {isThisLoading ? (
                            <CircularProgress size={14} thickness={5} />
                          ) : (
                            opt.label
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {isUpdate && prefillLoading ? (
                <ReminderDialogSkeleton />
              ) : (
                <>
                  {/* Header */}
                  <div className={styles.header}>
                    <div className={styles.headerTags}>
                      {isUpdate ? (
                        (initialData?.statusTags ?? []).map((tag, i) => (
                          <span
                            key={i}
                            className={styles.statusTag}
                            style={{ background: tag.bg, color: tag.color }}
                          >
                            <span
                              className={styles.dot}
                              style={{ background: tag.dot }}
                            />
                            {tag.label}
                          </span>
                        ))
                      ) : (
                        <span className={styles.grey_tag}>Draft</span>
                      )}
                    </div>
                    <div className={styles.headerActions}>
                      <button
                        className={`${styles.iconBtn} ${panelOpen ? styles.iconBtnActive : ""} ${!isUpdate ? styles.iconBtnDisabled : ""}`}
                        onClick={() => {
                          if (!isUpdate) return;
                          setPanelOpen((p) => {
                            const next = !p;
                            if (next) setSnoozeOpen(false);
                            return next;
                          });
                        }}
                        title={
                          !isUpdate
                            ? "Save first to unlock"
                            : panelOpen
                              ? "Hide panel"
                              : "Show activity & docs"
                        }
                        type="button"
                      >
                        <Lightbulb size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <input
                    className={styles.titleInput}
                    placeholder="Reminder Title..."
                    value={form.title}
                    disabled={locked}
                    onChange={(e) => patch({ title: e.target.value })}
                  />

                  {/* Description */}
                  <textarea
                    className={styles.descArea}
                    placeholder="Say more about the reminder..."
                    value={form.description}
                    disabled={locked}
                    rows={3}
                    onChange={(e) => patch({ description: e.target.value })}
                  />

                  {/* Tags row */}
                  <div className={styles.tagsRow}>
                    {form.tags.map((tag) => (
                      <button
                        key={tag.id}
                        className={styles.tagChip}
                        style={{
                          "--tag-color": tag.color_code,
                          "--tag-color-10": `${tag.color_code}1A`,
                          "--tag-color-30": `${tag.color_code}4D`,
                        }}
                        disabled={locked}
                        onClick={() => setTagsOpen(true)}
                        type="button"
                      >
                        #{tag.name}
                      </button>
                    ))}
                    {form.tags.length < 5 && (
                      <button
                        className={styles.addChip}
                        disabled={locked}
                        onClick={() => setTagsOpen(true)}
                        type="button"
                        title="Manage tags"
                      >
                        <Plus size={24} strokeWidth={2.2} />
                      </button>
                    )}
                  </div>

                  {/* Pills row */}
                  <div className={styles.pillsRow}>
                    <button
                      className={`${styles.pill} ${!bucket ? styles.pillRequired : ""}`}
                      disabled={locked}
                      onClick={() => setListsOpen(true)}
                      type="button"
                      title={
                        !bucket ? "Required — select a list" : "Change list"
                      }
                    >
                      {bucket ? (
                        <>
                          <span
                            className={styles.pillIconBubble}
                            style={{ background: bucket.icon_bg || "#D5F1FF" }}
                          >
                            <BucketIcon
                              size={16}
                              color={bucket.icon_stroke || "#449FCF"}
                              strokeWidth={2}
                            />
                          </span>
                          <span>{bucket.name}</span>
                        </>
                      ) : (
                        <>
                          <span
                            className={styles.pillIconBubble}
                            style={{ background: "#FFE4E4" }}
                          >
                            <Hash size={16} color="#E53E3E" />
                          </span>
                          <span>Select List *</span>
                        </>
                      )}
                    </button>

                    {isUpdate && prefillData?.task && (
                      <button
                        className={styles.pill}
                        onClick={() =>
                          window.open(`/tasks/${prefillData.task.id}`, "_blank")
                        }
                        type="button"
                      >
                        <span
                          className={styles.pillIconBubble}
                          style={{ background: "#D3F8A5" }}
                        >
                          <Link2 color="#457806" size={16} />
                        </span>
                        <span>Task Linked</span>
                      </button>
                    )}

                    <button
                      className={`${styles.pill} ${styles.pillRemind} ${!form.reminderConfig ? styles.pillRequired : ""}`}
                      disabled={locked}
                      onClick={() => setRemindOpen(true)}
                      type="button"
                    >
                      <span
                        className={styles.pillIconBubble}
                        style={{ background: "#FFF7ED" }}
                      >
                        <Bell color="#B26B0D" size={16} />
                      </span>
                      <span>{remindLabel}</span>
                    </button>
                  </div>

                  {/* Validation error */}
                  {formError && <p className={styles.formError}>{formError}</p>}

                  {/* Footer */}
                  {!isUpdate ? (
                    // CREATE MODE
                    <div className={styles.footerBar}>
                      <button
                        className={styles.footerDiscard}
                        disabled={locked}
                        onClick={onClose}
                        type="button"
                      >
                        Cancel
                      </button>

                      <button
                        className={styles.footerSave}
                        disabled={locked}
                        onClick={handleSave}
                        type="button"
                      >
                        {loading ? "Saving…" : "Save Reminder"}
                      </button>
                    </div>
                  ) : dirty ? (
                    <div className={styles.footerBar}>
                      <button
                        className={styles.footerDiscard}
                        disabled={locked}
                        onClick={handleDiscard}
                        type="button"
                      >
                        Discard Changes
                      </button>

                      <button
                        className={styles.footerSave}
                        disabled={locked}
                        onClick={handleSave}
                        type="button"
                      >
                        {loading ? "Saving…" : "Update Reminder"}
                      </button>
                    </div>
                  ) : (
                    <div className={`${styles.footerBar} ${styles.grid_2}`}>
                      <button
                        className={styles.footerDiscard}
                        disabled={locked || actionLoading}
                        onClick={() => setSnoozeOpen(true)}
                        type="button"
                      >
                        Snooze
                        <AlarmClock size={20} />
                      </button>

                      <button
                        className={styles.footerSave}
                        disabled={locked || actionLoading}
                        onClick={handleComplete}
                        type="button"
                      >
                        {actionLoading ? (
                          <CircularProgress size={20} />
                        ) : (
                          <CircleCheckBig size={20} />
                        )}
                        {actionLoading ? "Updating…" : "Acknowledge"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div
          className={`${styles.panel} ${panelOpen ? styles.panelVisible : ""}`}
        >
          <div className={styles.panelBody}>
            <ReminderChecklist
              checklist={form.checklist}
              onChange={handleChecklistChange}
              disabled={locked}
              styles={styles}
            />
          </div>
        </div>
      </div>

      {tagsOpen && (
        <LeadTagsDialog
          open={tagsOpen}
          onClose={() => setTagsOpen(false)}
          selectedTags={form.tags}
          onSelectionChange={handleTagsDone}
        />
      )}

      {listsOpen && (
        <ReminderListsDialog
          open={listsOpen}
          onClose={() => setListsOpen(false)}
          selectedListIds={bucket?.id ? [bucket.id] : []}
          onSelectionChange={handleListDone}
        />
      )}

      {remindOpen && (
        <RemindMeDialog
          initialValue={form.reminderConfig}
          onClose={() => setRemindOpen(false)}
          onSet={handleRemindSet}
        />
      )}
    </>
  );
}
