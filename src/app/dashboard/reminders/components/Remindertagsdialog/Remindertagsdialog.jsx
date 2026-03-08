import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Tag,
  Plus,
  X,
  Pencil,
  Trash2,
  Check,
  Search,
  ArrowLeft,
  Save,
} from "lucide-react";

import {
  fetchReminderTags,
  createReminderTag,
  updateReminderTag,
  deleteReminderTag,
  setTagSearchQuery,
  clearTagSearch,
  selectAllTags,
  selectTagsLoading,
  selectTagsSubmitting,
  selectTagsError,
  selectTagSearch,
  selectVisibleTags,
} from "@/store/slices/reminderMetaSlice";

import { REMINDER_TAG_COLORS } from "@/services/reminders/reminder.constants";

import styles from "./ReminderTagsDialog.module.scss";

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */

const COLOR_KEYS = Object.keys(REMINDER_TAG_COLORS);
const MAX_TAGS = 5;

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */

function ColorSwatch({ colorKey, selected, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.swatch} ${selected ? styles.swatchSelected : ""}`}
      style={{ "--swatch-color": REMINDER_TAG_COLORS[colorKey] }}
      onClick={() => onClick(colorKey)}
      title={colorKey.charAt(0) + colorKey.slice(1).toLowerCase()}
    >
      {selected && <Check size={10} strokeWidth={3} />}
    </button>
  );
}

function TagPill({ tag, checked, onToggle, disabled }) {
  return (
    <button
      type="button"
      className={`${styles.tagPill} ${checked ? styles.tagPillChecked : ""} ${disabled ? styles.tagPillDisabled : ""}`}
      style={{
        "--tag-color": tag.color_code,
        "--tag-color-10": `${tag.color_code}1A`,
        "--tag-color-30": `${tag.color_code}4D`,
      }}
      onClick={() => onToggle(tag)}
      disabled={disabled}
    >
      <span
        className={styles.tagPillDot}
        style={{ background: tag.color_code }}
      />
      <span className={styles.tagPillName}>{tag.name}</span>
      {checked && (
        <span className={styles.tagPillCheck}>
          <Check size={10} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────
   FORM (Create / Edit)
───────────────────────────────────────────── */

function TagForm({ mode, initial, onSubmit, onCancel, submitting }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? COLOR_KEYS[0]);
  const isEdit = mode === "edit";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !color) return;
    onSubmit({ name: name.trim(), color });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={onCancel}
          disabled={submitting}
        >
          <ArrowLeft size={15} />
        </button>
        <div>
          <p className={styles.formTitle}>{isEdit ? "Edit Tag" : "New Tag"}</p>
          <p className={styles.formSub}>
            {isEdit ? "Update the tag details" : "Create a new tag"}
          </p>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          Tag Name <span className={styles.required}>*</span>
        </label>
        <input
          className={styles.input}
          placeholder="e.g., Urgent, Follow-up…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          autoFocus
          disabled={submitting}
        />
        <span className={styles.charCount}>{name.length}/50</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Color</label>
        <div className={styles.swatchGrid}>
          {COLOR_KEYS.map((key) => (
            <ColorSwatch
              key={key}
              colorKey={key}
              selected={color === key}
              onClick={setColor}
            />
          ))}
        </div>
      </div>

      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={submitting || !name.trim()}
          style={{ "--accent": color ? REMINDER_TAG_COLORS[color] : "#3B82F6" }}
        >
          {submitting ? (
            <CircularProgress
              size={14}
              thickness={5}
              style={{ color: "#fff" }}
            />
          ) : (
            <Save size={14} />
          )}
          {isEdit ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

/* ─────────────────────────────────────────────
   MAIN DIALOG
───────────────────────────────────────────── */

export default function ReminderTagsDialog({
  open,
  onClose,
  initialMode = "list",
  selectedTagIds = [],
  onSelectionChange,
}) {
  const dispatch = useDispatch();

  const allTags = useSelector(selectAllTags);
  const loading = useSelector(selectTagsLoading);
  const submitting = useSelector(selectTagsSubmitting);
  const error = useSelector(selectTagsError);
  const search = useSelector(selectTagSearch);
  const visibleTags = useSelector(selectVisibleTags);

  const [mode, setMode] = useState(initialMode);
  const [editingTag, setEditingTag] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set(selectedTagIds));

  /* sync prop */
  useEffect(() => {
    setSelectedIds(new Set(selectedTagIds));
  }, [selectedTagIds.join(",")]);

  /* fetch on open */
  useEffect(() => {
    if (open) {
      if (allTags.length === 0) dispatch(fetchReminderTags());
      setMode(initialMode);
      dispatch(clearTagSearch());
    }
  }, [open]);

  /* ── handlers ── */
  const handleToggle = useCallback((tag) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tag.id)) {
        next.delete(tag.id);
      } else {
        if (next.size >= MAX_TAGS) return prev; // cap at 5
        next.add(tag.id);
      }
      return next;
    });
  }, []);

  const handleDone = () => {
    if (onSelectionChange) {
      onSelectionChange(allTags.filter((t) => selectedIds.has(t.id)));
    }
    onClose();
  };

  const handleCreate = async (payload) => {
    const res = dispatch(createReminderTag(payload));
    if (!res.error) setMode("list");
  };

  const handleUpdate = async (payload) => {
    const res = dispatch(
      updateReminderTag({ tagId: editingTag.id, ...payload }),
    );
    if (!res.error) {
      setEditingTag(null);
      setMode("list");
    }
  };

  const handleDelete = async (tag) => {
    setDeletingId(tag.id);
    dispatch(deleteReminderTag(tag.id));
    setDeletingId(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(tag.id);
      return next;
    });
  };

  const handleSearchChange = (e) => dispatch(setTagSearchQuery(e.target.value));
  const handleClearSearch = () => dispatch(clearTagSearch());
  const openEdit = (tag) => {
    setEditingTag(tag);
    setMode("edit");
  };

  if (!open) return null;

  const selectedCount = selectedIds.size;
  const atMax = selectedCount >= MAX_TAGS;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && handleDone()}
    >
      <div className={styles.dialog}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>
              <Tag size={15} />
            </span>
            <div>
              <p className={styles.headerTitle}>Manage Tags</p>
              {mode === "list" && (
                <p className={styles.headerSub}>
                  {allTags.length} tag{allTags.length !== 1 ? "s" : ""}
                  {selectedCount > 0 && (
                    <span className={styles.selectedBadge}>
                      · {selectedCount}/{MAX_TAGS} selected
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={handleDone}>
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>
          {mode === "create" || mode === "edit" ? (
            <TagForm
              mode={mode}
              initial={mode === "edit" ? editingTag : undefined}
              onSubmit={mode === "edit" ? handleUpdate : handleCreate}
              onCancel={() => setMode("list")}
              submitting={submitting}
            />
          ) : (
            <>
              {/* Search + New */}
              <div className={styles.toolbar}>
                <div className={styles.searchWrap}>
                  <Search size={13} className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    placeholder="Search tags…"
                    value={search.query}
                    onChange={handleSearchChange}
                  />
                  {search.active && (
                    <button
                      className={styles.searchClear}
                      onClick={handleClearSearch}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button
                  className={styles.newBtn}
                  onClick={() => setMode("create")}
                >
                  <Plus size={13} /> New
                </button>
              </div>

              {/* Max cap notice */}
              {atMax && (
                <div className={styles.maxNotice}>
                  Max {MAX_TAGS} tags selected
                </div>
              )}

              {/* Tag list */}
              <div className={styles.listWrap}>
                {loading && allTags.length === 0 ? (
                  <div className={styles.listEmpty}>
                    <CircularProgress
                      size={20}
                      thickness={4}
                      style={{ color: "#6B7280" }}
                    />
                    <span>Loading tags…</span>
                  </div>
                ) : visibleTags.length === 0 ? (
                  <div className={styles.listEmpty}>
                    {search.active ? (
                      <>
                        <Search size={22} strokeWidth={1.5} />
                        <span>No tags match "{search.query}"</span>
                        <button
                          className={styles.clearSearchLink}
                          onClick={handleClearSearch}
                        >
                          Clear search
                        </button>
                      </>
                    ) : (
                      <>
                        <Tag size={22} strokeWidth={1.5} />
                        <span>No tags yet</span>
                        <button
                          className={styles.clearSearchLink}
                          onClick={() => setMode("create")}
                        >
                          Create your first tag
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <ul className={styles.list}>
                    {visibleTags.map((tag) => {
                      const isChecked = selectedIds.has(tag.id);
                      const isDeleting = deletingId === tag.id;
                      return (
                        <li key={tag.id} className={styles.listItem}>
                          <TagPill
                            tag={tag}
                            checked={isChecked}
                            onToggle={handleToggle}
                            disabled={!isChecked && atMax} // disable unchecked pills when at max
                          />
                          <div className={styles.actions}>
                            <button
                              className={styles.actionBtn}
                              onClick={() => openEdit(tag)}
                              disabled={isDeleting || submitting}
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                              onClick={() => handleDelete(tag)}
                              disabled={isDeleting || submitting}
                              title="Delete"
                            >
                              {isDeleting ? (
                                <CircularProgress
                                  size={11}
                                  thickness={5}
                                  style={{ color: "#EF4444" }}
                                />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer (list mode only) ── */}
        {mode === "list" && (
          <div className={styles.footer}>
            <span className={styles.footerInfo}>
              {selectedCount > 0
                ? `${selectedCount} of ${MAX_TAGS} tags selected`
                : "Click a tag to select it"}
            </span>
            <button className={styles.doneBtn} onClick={handleDone}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
