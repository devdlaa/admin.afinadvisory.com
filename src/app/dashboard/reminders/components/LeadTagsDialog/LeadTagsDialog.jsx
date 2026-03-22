import React, { useEffect, useRef, useState, useCallback } from "react";
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
  ChevronDown,
} from "lucide-react";
import {
  fetchLeadTags,
  createLeadTag,
  updateLeadTag,
  deleteLeadTag,
  setTagSearchQuery,
  clearTagSearch,
  selectAllTags,
  selectTagsLoading,
  selectTagsSubmitting,
  selectTagsError,
  selectTagSearchQuery,
  selectTagsHasMore,
  selectTagsCursor,
} from "@/store/slices/leadsMetaSlice";

import { REMINDER_TAG_COLORS } from "@/services/reminders/reminder.constants";
import styles from "./LeadTagsDialog.module.scss";

const COLOR_KEYS = Object.keys(REMINDER_TAG_COLORS);
const MAX_TAGS = 5;
const PAGE_LIMIT = 10;

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
      <span className={styles.tagPillDot} />
      <span className={styles.tagPillName}>{tag.name}</span>
      {checked && (
        <span className={styles.tagPillCheck}>
          <Check size={10} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

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
              size={20}
              thickness={5}
              className={styles.submitSpinner}
            />
          ) : (
            <Plus size={20} />
          )}
          {isEdit ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

export default function LeadTagsDialog({
  open,
  onClose,
  initialMode = "list",
  selectedTags = [],
  onSelectionChange,
}) {
  const dispatch = useDispatch();

  const allTags = useSelector(selectAllTags);
  const loading = useSelector(selectTagsLoading);
  const submitting = useSelector(selectTagsSubmitting);
  const error = useSelector(selectTagsError);
  const searchQuery = useSelector(selectTagSearchQuery);
  const hasMore = useSelector(selectTagsHasMore);
  const cursor = useSelector(selectTagsCursor);

  const [mode, setMode] = useState(initialMode);
  const [editingTag, setEditingTag] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(selectedTags.map((t) => t.id)),
  );

  const searchDebounceRef = useRef(null);
  const lastSearchedRef = useRef("");

  useEffect(() => {
    setSelectedIds(new Set(selectedTags.map((t) => t.id)));
  }, [selectedTags]);

  useEffect(() => {
    if (!open) return;

    setMode(initialMode);
    dispatch({ type: "leadsMeta/resetSearchQueryOnly" });

    if (selectedTags.length > 0) {
      dispatch({
        type: "leadsMeta/injectTags",
        payload: { tags: selectedTags, pinSelected: true },
      });
    }

    if (allTags.length === 0) {
      dispatch(fetchLeadTags({ limit: PAGE_LIMIT }));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const q = searchQuery.trim();
    if (!q || lastSearchedRef.current === q) return;

    clearTimeout(searchDebounceRef.current);

    const localHits = allTags.filter((t) =>
      t.name.toLowerCase().includes(q.toLowerCase()),
    );
    if (localHits.length > 0) return;

    searchDebounceRef.current = setTimeout(() => {
      lastSearchedRef.current = q;
      dispatch(fetchLeadTags({ limit: PAGE_LIMIT, search: q }));
    }, 350);

    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery, open, allTags, dispatch]);

  const handleToggle = useCallback((tag) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tag.id)) {
        next.delete(tag.id);
      } else {
        if (next.size >= MAX_TAGS) return prev;
        next.add(tag.id);
      }
      return next;
    });
  }, []);

  const handleDone = () => {
    if (onSelectionChange) {
      const map = new Map();
      selectedTags.forEach((t) => {
        if (selectedIds.has(t.id)) map.set(t.id, t);
      });
      allTags.forEach((t) => {
        if (selectedIds.has(t.id)) map.set(t.id, t);
      });
      onSelectionChange(Array.from(map.values()));
    }
    onClose();
  };

  const handleCreate = async (payload) => {
    const res = await dispatch(createLeadTag(payload));
    if (!res.error) setMode("list");
  };

  const handleUpdate = async (payload) => {
    const res = await dispatch(
      updateLeadTag({ tagId: editingTag.id, ...payload }),
    );
    if (!res.error) {
      setEditingTag(null);
      setMode("list");
    }
  };

  const handleDelete = async (tag) => {
    setDeletingId(tag.id);
    await dispatch(deleteLeadTag(tag.id));
    setDeletingId(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(tag.id);
      return next;
    });
  };

  const handleSearchChange = (e) => dispatch(setTagSearchQuery(e.target.value));

  const handleClearSearch = () => {
    dispatch(clearTagSearch());
    dispatch(fetchLeadTags({ limit: PAGE_LIMIT }));
  };

  const handleLoadMore = () => {
    dispatch(
      fetchLeadTags({
        cursor,
        limit: PAGE_LIMIT,
        ...(searchQuery.trim() ? { search: searchQuery } : {}),
      }),
    );
  };

  const openEdit = (tag) => {
    setEditingTag(tag);
    setMode("edit");
  };

  if (!open) return null;

  const selectedCount = selectedIds.size;
  const atMax = selectedCount >= MAX_TAGS;
  const isSearchActive = searchQuery.trim().length > 0;

  const displayedTags = isSearchActive
    ? allTags.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      )
    : allTags;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && handleDone()}
    >
      <div className={styles.dialog}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>
              <Tag size={20} />
            </span>
            <div>
              <p className={styles.headerTitle}>Manage Tags</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={handleDone}>
            <X size={16} />
          </button>
        </div>

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
              <div className={styles.toolbar}>
                <div className={styles.searchWrap}>
                  <Search size={18} className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    placeholder="Search tags…"
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                  {isSearchActive && (
                    <button
                      className={styles.searchClear}
                      onClick={handleClearSearch}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  className={styles.newBtn}
                  onClick={() => setMode("create")}
                >
                  <Plus size={16} /> Add New
                </button>
              </div>

              {error && <p className={styles.errorMsg}>{error}</p>}

              {atMax && (
                <div className={styles.maxNotice}>
                  Max {MAX_TAGS} tags selected
                </div>
              )}

              <div className={styles.listWrap}>
                {loading && allTags.length === 0 ? (
                  <div className={styles.listEmpty}>
                    <CircularProgress
                      size={20}
                      thickness={4}
                      className={styles.listSpinner}
                    />
                    <span>Loading tags…</span>
                  </div>
                ) : displayedTags.length === 0 ? (
                  <div className={styles.listEmpty}>
                    {isSearchActive ? (
                      <>
                        <Search size={22} strokeWidth={1.5} />
                        {loading ? (
                          <>
                            <CircularProgress size={16} thickness={4} />
                            <span>Searching…</span>
                          </>
                        ) : (
                          <>
                            <span>No tags match "{searchQuery}"</span>
                            <button
                              className={styles.clearSearchLink}
                              onClick={handleClearSearch}
                            >
                              Clear search
                            </button>
                          </>
                        )}
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
                  <>
                    <ul className={styles.list}>
                      {displayedTags.map((tag) => {
                        const isChecked = selectedIds.has(tag.id);
                        const isDeleting = deletingId === tag.id;
                        return (
                          <li key={tag.id} className={styles.listItem}>
                            <TagPill
                              tag={tag}
                              checked={isChecked}
                              onToggle={handleToggle}
                              disabled={!isChecked && atMax}
                            />
                            <div className={styles.actions}>
                              <button
                                className={styles.actionBtn}
                                onClick={() => openEdit(tag)}
                                disabled={isDeleting || submitting}
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                                onClick={() => handleDelete(tag)}
                                disabled={isDeleting || submitting || isChecked}
                                title={
                                  isChecked
                                    ? "Deselect tag before deleting"
                                    : "Delete"
                                }
                              >
                                {isDeleting ? (
                                  <CircularProgress
                                    size={16}
                                    thickness={5}
                                    className={styles.deletingSpinner}
                                  />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {hasMore && !isSearchActive && (
                      <div className={styles.loadMoreWrap}>
                        <button
                          className={styles.loadMoreBtn}
                          onClick={handleLoadMore}
                          disabled={loading}
                        >
                          {loading ? (
                            <CircularProgress
                              size={13}
                              thickness={5}
                              className={styles.loadMoreSpinner}
                            />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                          {loading ? "Loading…" : "Load more"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

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
