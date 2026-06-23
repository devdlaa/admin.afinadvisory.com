"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import CircularProgress from "@mui/material/CircularProgress";
import {
  // layout / ui
  X,
  Plus,
  Pencil,
  Trash2,
  Check,
  Search,
  ArrowLeft,
  Save,
  List,
  // all icons referenced in REMINDER_LIST_ICONS
  Hash,
  Briefcase,
  Home,
  ShoppingCart,
  Calendar,
  DollarSign,
  Heart,
  BookOpen,
  Folder,
  Star,
  Bell,
  Clock,
  ListIcon,
  Tag,
  Flag,
  Target,
  Lightbulb,
  Rocket,
  Gift,
  Car,
  Plane,
  Train,
  Map,
  Compass,
  Music,
  Film,
  Camera,
  Gamepad2,
  Code,
  Terminal,
  Database,
  Server,
  Cloud,
  Lock,
  Key,
  Shield,
  Wifi,
  Phone,
  Mail,
} from "lucide-react";

import {
  fetchReminderLists,
  createReminderList,
  updateReminderList,
  deleteReminderList,
  setListSearchQuery,
  clearListSearch,
  selectAllLists,
  selectAllListsFlat,
  selectListsLoading,
  selectListsSubmitting,
  selectListsError,
  selectListSearch,
  selectVisibleLists,
} from "@/store/slices/reminderMetaSlice";

import { REMINDER_LIST_ICONS } from "@/services/reminders/reminder.constants";

import styles from "./ReminderListsDialog.module.scss";

/* ─────────────────────────────────────────────
   ICON MAP  (key → lucide component)
───────────────────────────────────────────── */

const ICON_COMPONENTS = {
  HASH: Hash,
  BRIEFCASE: Briefcase,
  HOME: Home,
  SHOPPING_CART: ShoppingCart,
  CALENDAR: Calendar,
  DOLLAR_SIGN: DollarSign,
  HEART: Heart,
  BOOK_OPEN: BookOpen,
  FOLDER: Folder,
  STAR: Star,
  BELL: Bell,
  CLOCK: Clock,
  LIST: List,
  TAG: Tag,
  FLAG: Flag,
  TARGET: Target,
  LIGHTBULB: Lightbulb,
  ROCKET: Rocket,
  GIFT: Gift,
  CAR: Car,
  PLANE: Plane,
  TRAIN: Train,
  MAP: Map,
  COMPASS: Compass,
  MUSIC: Music,
  FILM: Film,
  CAMERA: Camera,
  GAMEPAD: Gamepad2,
  CODE: Code,
  TERMINAL: Terminal,
  DATABASE: Database,
  SERVER: Server,
  CLOUD: Cloud,
  LOCK: Lock,
  KEY: Key,
  SHIELD: Shield,
  WIFI: Wifi,
  PHONE: Phone,
  MAIL: Mail,
};

const ICON_KEYS = Object.keys(REMINDER_LIST_ICONS);

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

function RenderIcon({ iconKey, size = 16 }) {
  const meta = REMINDER_LIST_ICONS[iconKey];
  const Comp = ICON_COMPONENTS[iconKey] || Hash;
  return (
    <span
      className={styles.iconBubble}
      style={{ background: meta?.bg, "--icon-stroke": meta?.stroke }}
    >
      <Comp size={size} strokeWidth={1.8} color={meta?.stroke} />
    </span>
  );
}

/* ─────────────────────────────────────────────
   ICON PICKER GRID
───────────────────────────────────────────── */

function IconPicker({ selected, onSelect }) {
  return (
    <div className={styles.iconGrid}>
      {ICON_KEYS.map((key) => {
        const meta = REMINDER_LIST_ICONS[key];
        const Comp = ICON_COMPONENTS[key] || Hash;
        const isSelected = selected === key;
        return (
          <button
            key={key}
            type="button"
            className={`${styles.iconOption} ${isSelected ? styles.iconOptionSelected : ""}`}
            style={{ "--icon-bg": meta.bg, "--icon-stroke": meta.stroke }}
            onClick={() => onSelect(key)}
            title={key
              .replace(/_/g, " ")
              .toLowerCase()
              .replace(/\b\w/g, (c) => c.toUpperCase())}
          >
            <Comp size={20} strokeWidth={1.8} color={meta.stroke} />
            {isSelected && (
              <span className={styles.iconSelectedCheck}>
                <Check size={8} strokeWidth={3.5} color="#fff" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   LIST CARD (row in list mode)
───────────────────────────────────────────── */

function ListCard({
  list,
  checked,
  onToggle,
  onEdit,
  onDelete,
  isDeleting,
  submitting,
}) {
  return (
    <div className={`${styles.card} ${checked ? styles.cardChecked : ""}`}>
      <button
        type="button"
        className={styles.cardMain}
        onClick={() => onToggle(list)}
      >
        <RenderIcon iconKey={list.icon} size={20} />
        <div className={styles.cardInfo}>
          <span className={styles.cardName}>{list.name}</span>
          {list.reminder_count !== undefined && (
            <span className={styles.cardCount}>
              {list.reminder_count} reminder
              {list.reminder_count !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {checked && (
          <span className={styles.cardCheck}>
            <Check size={11} strokeWidth={3} />
          </span>
        )}
      </button>

      <div className={styles.cardActions}>
        <button
          className={styles.actionBtn}
          onClick={() => onEdit(list)}
          disabled={isDeleting || submitting}
          title="Edit"
        >
          <Pencil size={17} />
        </button>
        <button
          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
          onClick={() => onDelete(list)}
          disabled={isDeleting || submitting}
          title="Delete"
        >
          {isDeleting ? (
            <CircularProgress
              size={17}
              thickness={5}
              style={{ color: "#EF4444" }}
            />
          ) : (
            <Trash2 size={17} />
          )}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FORM  (create / edit)
───────────────────────────────────────────── */

function ListForm({ mode, initial, onSubmit, onCancel, submitting }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "HASH");
  const isEdit = mode === "edit";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), icon });
  };

  const selectedMeta = REMINDER_LIST_ICONS[icon];
  const SelectedComp = ICON_COMPONENTS[icon] || Hash;

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
          <p className={styles.formTitle}>
            {isEdit ? "Edit List" : "New List"}
          </p>
          <p className={styles.formSub}>
            {isEdit ? "Update list details" : "Create a new reminder list"}
          </p>
        </div>
      </div>

      <div className={styles.previewRow}>
        <span
          className={styles.previewBubble}
          style={{ background: selectedMeta?.bg }}
        >
          <SelectedComp
            size={22}
            strokeWidth={1.8}
            color={selectedMeta?.stroke}
          />
        </span>
        <div>
          <p className={styles.previewName}>{name.trim() || "List name"}</p>
          <p className={styles.previewSub}>
            {icon
              .replace(/_/g, " ")
              .toLowerCase()
              .replace(/\b\w/g, (c) => c.toUpperCase())}{" "}
            icon
          </p>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          List Name <span className={styles.required}>*</span>
        </label>
        <input
          className={styles.input}
          placeholder="e.g., Work, Personal, Shopping…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          autoFocus
          disabled={submitting}
        />
        <span className={styles.charCount}>{name.length}/50</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Icon</label>
        <IconPicker selected={icon} onSelect={setIcon} />
      </div>

      <div className={styles.formActions}>
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={submitting || !name.trim()}
          style={{
            "--accent-bg": selectedMeta?.bg,
            "--accent-stroke": selectedMeta?.stroke,
          }}
        >
          {submitting ? (
            <CircularProgress
              size={18}
              thickness={5}
              style={{ color: "currentColor" }}
            />
          ) : (
            <Plus size={18} />
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

export default function ReminderListsDialog({
  open,
  onClose,
  initialMode = "list",
  selectedListIds = [],
  onSelectionChange,
}) {
  const dispatch = useDispatch();

  const allLists = useSelector(selectAllLists);
  const allListsFlat = useSelector(selectAllListsFlat);
  const loading = useSelector(selectListsLoading);
  const submitting = useSelector(selectListsSubmitting);
  const error = useSelector(selectListsError);
  const search = useSelector(selectListSearch);
  const visibleLists = useSelector((state) => {
    const all = selectAllListsFlat(state);
    const items = selectAllLists(state);
    const search = selectListSearch(state);

    const pool = all.length > 0 ? all : items;

    if (!search.active) return pool;

    return pool.filter((l) =>
      l.name.toLowerCase().includes(search.query.toLowerCase()),
    );
  });

  const [mode, setMode] = useState(initialMode);
  const [editingList, setEditing] = useState(null);
  const [deletingId, setDeleting] = useState(null);

  // Single selection — store just one id or null
  const [selectedId, setSelectedId] = useState(
    () => selectedListIds[0] ?? null,
  );

  /* sync prop — take first id only */
  useEffect(() => {
    setSelectedId(selectedListIds[0] ?? null);
  }, [selectedListIds.join(",")]);

  /* fetch on open */
  useEffect(() => {
    if (open) {
      const pool = allListsFlat.length > 0 ? allListsFlat : allLists;
      if (pool.length === 0) dispatch(fetchReminderLists({ all: true }));
      setMode(initialMode);
      dispatch(clearListSearch());
    }
  }, [open]);

  /* ── handlers ── */
  const handleToggle = useCallback((list) => {
    setSelectedId((prev) => (prev === list.id ? null : list.id));
  }, []);

  const handleDone = () => {
    if (onSelectionChange) {
      const pool = allListsFlat.length > 0 ? allListsFlat : allLists;
      const selected = pool.filter((l) => l.id === selectedId);
      onSelectionChange(selected);
    }
    onClose();
  };

  const handleCreate = async (payload) => {
    const res = await dispatch(createReminderList(payload));
    if (!res.error) setMode("list");
  };

  const handleUpdate = async (payload) => {
    const res = await dispatch(
      updateReminderList({ listId: editingList.id, ...payload }),
    );
    if (!res.error) {
      setEditing(null);
      setMode("list");
    }
  };

  const handleDelete = async (list) => {
    setDeleting(list.id);
    await dispatch(deleteReminderList(list.id));
    setDeleting(null);
    if (selectedId === list.id) setSelectedId(null);
  };

  const handleSearchChange = (e) =>
    dispatch(setListSearchQuery(e.target.value));
  const handleClearSearch = () => dispatch(clearListSearch());
  const openEdit = (list) => {
    setEditing(list);
    setMode("edit");
  };

  if (!open) return null;

  const isSelected = selectedId !== null;

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
              <List size={16} />
            </span>
            <div>
              <p className={styles.headerTitle}>Manage Lists</p>
              {mode === "list" && (
                <p className={styles.headerSub}>
                  {allLists.length || allListsFlat.length} list
                  {(allLists.length || allListsFlat.length) !== 1 ? "s" : ""}
                  {isSelected && (
                    <span className={styles.selectedBadge}>· 1 selected</span>
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
            <ListForm
              mode={mode}
              initial={mode === "edit" ? editingList : undefined}
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
                    placeholder="Search lists…"
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
                  <Plus size={17} /> New
                </button>
              </div>

              {error && <p className={styles.errorMsg}>{error}</p>}

              <div className={styles.listWrap}>
                {loading &&
                allLists.length === 0 &&
                allListsFlat.length === 0 ? (
                  <div className={styles.empty}>
                    <CircularProgress
                      size={22}
                      thickness={4}
                      style={{ color: "#94A3B8" }}
                    />
                    <span>Loading lists…</span>
                  </div>
                ) : visibleLists.length === 0 ? (
                  <div className={styles.empty}>
                    {search.active ? (
                      <>
                        <Search size={26} strokeWidth={1.4} />
                        <span>No lists match "{search.query}"</span>
                        <button
                          className={styles.emptyLink}
                          onClick={handleClearSearch}
                        >
                          Clear search
                        </button>
                      </>
                    ) : (
                      <>
                        <List size={26} strokeWidth={1.4} />
                        <span>No lists yet</span>
                        <button
                          className={styles.emptyLink}
                          onClick={() => setMode("create")}
                        >
                          Create your first list
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className={styles.cards}>
                    {visibleLists.map((list) => (
                      <ListCard
                        key={list.id}
                        list={list}
                        checked={selectedId === list.id}
                        onToggle={handleToggle}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        isDeleting={deletingId === list.id}
                        submitting={submitting}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {mode === "list" && (
          <div className={styles.footer}>
            <span className={styles.footerInfo}>
              {isSelected ? "1 list selected" : "Click a list to select it"}
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
