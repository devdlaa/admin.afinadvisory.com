"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Lightbulb,
  Hash,
  Plus,
  UserRound,
  Link2,
  Bell,
  Activity,
  Paperclip,
  Search,
  Check,
} from "lucide-react";

import styles from "./ReminderDialog.module.scss";

// ── Sub-dialogs ──────────────────────────────────────────────────────────────

import LeadTagsDialog from "../LeadTagsDialog/LeadTagsDialog";
import ReminderListsDialog from "../Reminderlistsdialog/Reminderlistsdialog";
import RemindMeDialog from "../Remindmedialog/Remindmedialog";
import FilterDropdown from "@/app/components/pages/FilterDropdown/FilterDropdown";

// ── Extracted checklist ──────────────────────────────────────────────────────
import ReminderChecklist from "../ReminderChecklist/ReminderChecklist";

import {
  STATUS_CFG,
  LIFECYCLE_CFG,
  getReminderPillLabel,
  getIconComponent,
  buildInitialState,
  isDirty,
  validateForm,
  buildReminderPayload,
  buildChecklistPayload,
} from "./ReminderDialog.utils";

/* ─────────────────────────────────────────────
   DUMMY DATA
───────────────────────────────────────────── */
const DUMMY_DETAIL = {
  id: "rem-001",
  status: "active",
  lifecycle: "due",
  due_at: null,
  days_overdue: 5,
  snoozed_until: null,
  completed_at: null,
  completed_by: null,
  title: "Call Sanjay about itr filling",
  description:
    "Need to discuss the Q4 filing deadline and whether we need an extension.",
  tags: [
    { id: "t1", name: "Priority", color_code: "#22C55E" },
    { id: "t2", name: "Income Tax", color_code: "#3B82F6" },
    { id: "t3", name: "Urgent", color_code: "#F97316" },
    { id: "t4", name: "Q4", color_code: "#A855F7" },
    { id: "t5", name: "CA", color_code: "#EAB308" },
  ],
  bucket: null,
  assignee: null,
  task: null,
  is_recurring: false,
  checklist_items: [],
};

/* ─────────────────────────────────────────────
   ASSIGNEE PILL — self-contained pill + popover
   No FilterDropdown. Looks exactly like other pills.
   Lazy loads users once on first open.
───────────────────────────────────────────── */
function AssigneePill({
  assignee,
  users,
  usersLoading,
  onSelect,
  onLoadUsers,
  onSearch,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const hasLoaded = useRef(false);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    // Lazy load exactly once — same pattern as task page
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      onLoadUsers?.();
    }
    setOpen((v) => !v);
    if (!open) setTimeout(() => inputRef.current?.focus(), 60);
  };

  const handleSearch = (e) => {
    setQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  const handleSelect = (user) => {
    onSelect(user);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect(null);
  };

  const filtered = query
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(query.toLowerCase()) ||
          u.email?.toLowerCase().includes(query.toLowerCase()),
      )
    : users;

  return (
    <div className={styles.assigneeWrap} ref={wrapRef}>
      {/* Pill trigger — identical look to other pills */}
      <button className={styles.pill} onClick={handleOpen} type="button">
        <span
          className={styles.pillIconBubble}
          style={{ background: "#FFCCCC" }}
        >
          <UserRound color="#E82323" size={16} />
        </span>
        <span>{assignee ? assignee.name : "Assign to"}</span>
        {assignee && (
          <span
            className={styles.pillClear}
            onClick={handleClear}
            title="Remove assignee"
          >
            <X size={11} strokeWidth={3} />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={styles.assigneeDropdown}>
          <div className={styles.assigneeSearch}>
            <Search size={13} className={styles.assigneeSearchIcon} />
            <input
              ref={inputRef}
              className={styles.assigneeSearchInput}
              placeholder="Search users…"
              value={query}
              onChange={handleSearch}
            />
          </div>

          <div className={styles.assigneeList}>
            {usersLoading && filtered.length === 0 ? (
              <div className={styles.assigneeEmpty}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div className={styles.assigneeEmpty}>No users found</div>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  className={`${styles.assigneeOption} ${assignee?.id === u.id ? styles.assigneeOptionActive : ""}`}
                  onClick={() => handleSelect(u)}
                  type="button"
                >
                  <span className={styles.assigneeAvatar}>
                    {u.name?.[0]?.toUpperCase() || "?"}
                  </span>
                  <span className={styles.assigneeInfo}>
                    <span className={styles.assigneeName}>{u.name}</span>
                    {u.email && (
                      <span className={styles.assigneeEmail}>{u.email}</span>
                    )}
                  </span>
                  {assignee?.id === u.id && (
                    <Check size={14} className={styles.assigneeCheck} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function ReminderDialog({
  mode = "detail",
  serverData = DUMMY_DETAIL,
  users = [],
  usersLoading = false,
  onUserSearch,
  onLoadUsers,
  onClose,
  onCreate,
  onUpdate,
  onSyncChecklist,
}) {
  const isDraft = mode === "draft";
  const data = isDraft ? null : serverData;

  /* ── Form state ── */
  const [form, setForm] = useState(() => buildInitialState(data, isDraft));
  const savedRef = useRef(isDraft ? null : buildInitialState(data, false));
  const dirty = isDirty(form, savedRef.current);
  const patch = useCallback(
    (fields) => setForm((p) => ({ ...p, ...fields })),
    [],
  );

  /* ── Panel / tab ── */
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("activity");

  /* ── Sub-dialog flags ── */
  const [tagsOpen, setTagsOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);

  /* ── Validation error ── */
  const [formError, setFormError] = useState(null);

  /* ── Tag row drag-scroll ── */
  const tagsRef = useRef(null);
  const scrollSnap = useRef({ down: false, startX: 0, left: 0 });
  const tagsDragged = useRef(false);

  const onTagPointerDown = (e) => {
    if (e.target.closest("button")) return; // let button handle its own click
    tagsDragged.current = false;
    scrollSnap.current = {
      down: true,
      startX: e.pageX - tagsRef.current.offsetLeft,
      left: tagsRef.current.scrollLeft,
    };
  };
  const onTagPointerUp = () => {
    scrollSnap.current.down = false;
  };
  const onTagPointerMove = (e) => {
    if (!scrollSnap.current.down) return;
    tagsDragged.current = true;
    e.preventDefault();
    tagsRef.current.scrollLeft =
      scrollSnap.current.left -
      (e.pageX - tagsRef.current.offsetLeft - scrollSnap.current.startX) * 1.5;
  };

  /* ── Handlers ── */
  const handleTagsDone = useCallback(
    (selectedTags) => {
      console.log("selectedTags",selectedTags);
      patch({ tags: selectedTags });
      setTagsOpen(false);
    },
    [patch],
  );

  const handleListDone = useCallback(
    (selectedList) => {
      patch({ bucket: selectedList ?? null });
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

  const handleAssigneeSelect = useCallback(
    (user) => {
      patch({ assignee: user ?? null });
    },
    [patch],
  );

  const handleChecklistChange = useCallback(
    (updated) => {
      patch({ checklist: updated });
    },
    [patch],
  );

  const handleSave = () => {
    const err = validateForm(form);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    if (isDraft) {
      onCreate?.(buildReminderPayload(form));
    } else {
      onUpdate?.(data.id, buildReminderPayload(form));
      if (
        JSON.stringify(form.checklist) !==
        JSON.stringify(savedRef.current.checklist)
      ) {
        onSyncChecklist?.(data.id, buildChecklistPayload(form.checklist));
      }
      savedRef.current = { ...form };
    }
  };

  const handleDiscard = () => {
    setForm({ ...savedRef.current });
    setFormError(null);
  };

  /* ── Derived ── */
  const statusCfg = STATUS_CFG[data?.status ?? "draft"] || STATUS_CFG.active;
  const lcCfg =
    !isDraft && data?.lifecycle ? LIFECYCLE_CFG[data.lifecycle]?.(data) : null;
  const BucketIcon = getIconComponent(form.bucket?.icon);
  const remindLabel = getReminderPillLabel(form.reminderConfig);

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        // Close only when clicking the raw dark overlay — not the card or any sub-dialog
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`${styles.wrapper} ${panelOpen ? styles.wrapperExpanded : ""}`}
      >
        {/* ═══ LEFT CARD ═══ */}
        <div className={styles.card}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTags}>
              <span
                className={styles.statusTag}
                style={{ background: statusCfg.bg, color: statusCfg.color }}
              >
                <span
                  className={styles.dot}
                  style={{ background: statusCfg.dot }}
                />
                {statusCfg.label}
              </span>
              {lcCfg && (
                <span
                  className={styles.statusTag}
                  style={{ background: lcCfg.bg, color: lcCfg.color }}
                >
                  <span
                    className={styles.dot}
                    style={{ background: lcCfg.dot }}
                  />
                  {lcCfg.label}
                </span>
              )}
            </div>
            <div className={styles.headerActions}>
              <button
                className={`${styles.iconBtn} ${panelOpen ? styles.iconBtnActive : ""} ${isDraft ? styles.iconBtnDisabled : ""}`}
                onClick={() => !isDraft && setPanelOpen((p) => !p)}
                title={
                  isDraft
                    ? "Save first to unlock"
                    : panelOpen
                      ? "Hide panel"
                      : "Show activity & docs"
                }
                type="button"
              >
                <Lightbulb size={20} />
              </button>
              <button
                className={styles.iconBtn}
                onClick={onClose}
                type="button"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Title */}
          <input
            className={styles.titleInput}
            placeholder="Reminder Title..."
            value={form.title}
            onChange={(e) => patch({ title: e.target.value })}
          />

          {/* Description */}
          <textarea
            className={styles.descArea}
            placeholder="Say more about the reminder..."
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            rows={3}
          />

          {/* Tags row — click the button to open dialog, drag row to scroll */}
          <div
            ref={tagsRef}
            className={styles.tagsRow}
            onMouseDown={onTagPointerDown}
            onMouseLeave={onTagPointerUp}
            onMouseUp={onTagPointerUp}
            onMouseMove={onTagPointerMove}
          >
            {form.tags.map((tag) => (
              <span
                key={tag.id}
                className={styles.tagChip}
                style={{
                  background: `${tag.color_code}18`,
                  color: tag.color_code,
                }}
              >
                #{tag.name}
              </span>
            ))}
            <button
              className={styles.tagAdd}
              type="button"
              title="Manage tags"
              onClick={(e) => {
                e.stopPropagation();
                if (!tagsDragged.current) setTagsOpen(true);
              }}
            >
              {form.tags.length > 0 ? "Edit Tags" : "Add Tags"}
              <Plus size={14} />
            </button>
          </div>

          {/* Pills row */}
          <div className={styles.pillsRow}>
            {/* List — required */}
            <button
              className={`${styles.pill} ${!form.bucket ? styles.pillRequired : ""}`}
              onClick={() => setListsOpen(true)}
              type="button"
              title={!form.bucket ? "Required — select a list" : "Change list"}
            >
              {form.bucket ? (
                <>
                  <span
                    className={styles.pillIconBubble}
                    style={{ background: form.bucket.icon_bg || "#D5F1FF" }}
                  >
                    <BucketIcon
                      size={16}
                      color={form.bucket.icon_stroke || "#449FCF"}
                      strokeWidth={2}
                    />
                  </span>
                  <span>{form.bucket.name}</span>
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

            {/* Assignee */}
            <AssigneePill
              assignee={form.assignee}
              users={users}
              usersLoading={usersLoading}
              onSelect={handleAssigneeSelect}
              onLoadUsers={onLoadUsers}
              onSearch={onUserSearch}
            />

            {/* Linked task (detail only) */}
            {!isDraft && data?.task && (
              <button
                className={styles.pill}
                onClick={() => window.open(`/tasks/${data.task.id}`, "_blank")}
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

            {/* Remind Me */}
            <button
              className={`${styles.pill} ${styles.pillRemind}`}
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

          <div className={styles.divider} />

          {/* Checklist */}
          <ReminderChecklist
            checklist={form.checklist}
            onChange={handleChecklistChange}
            styles={styles}
          />

          {/* Validation error */}
          {formError && <div className={styles.formError}>{formError}</div>}

          {/* Footer */}
          {isDraft ? (
            <div className={styles.footerBar}>
              <button
                className={styles.footerDiscard}
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className={styles.footerSave}
                onClick={handleSave}
                type="button"
              >
                Create Reminder
              </button>
            </div>
          ) : dirty ? (
            <div className={styles.footerBar}>
              <button
                className={styles.footerDiscard}
                onClick={handleDiscard}
                type="button"
              >
                Discard Changes
              </button>
              <button
                className={styles.footerSave}
                onClick={handleSave}
                type="button"
              >
                Update Reminder
              </button>
            </div>
          ) : null}
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div
          className={`${styles.panel} ${panelOpen ? styles.panelVisible : ""}`}
        >
          <div className={styles.panelTabBar}>
            <button
              className={`${styles.panelTab} ${activeTab === "activity" ? styles.panelTabActive : ""}`}
              onClick={() => setActiveTab("activity")}
              type="button"
            >
              <Activity size={20} /> Activity
            </button>
            <button
              className={`${styles.panelTab} ${activeTab === "documents" ? styles.panelTabActive : ""}`}
              onClick={() => setActiveTab("documents")}
              type="button"
            >
              <Paperclip size={20} /> Documents
            </button>
          </div>
          <div className={styles.panelBody}>
            {activeTab === "activity" && (
              <div className={styles.panelEmpty}>
                <Activity size={28} strokeWidth={1.2} />
                <p>No activity yet</p>
                <span>Changes and comments will appear here</span>
              </div>
            )}
            {activeTab === "documents" && (
              <div className={styles.panelEmpty}>
                <Paperclip size={28} strokeWidth={1.2} />
                <p>No documents yet</p>
                <span>Attach files to this reminder</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/*
        Sub-dialogs live INSIDE the overlay div.
        This means their clicks do NOT reach the overlay's onMouseDown,
        so the overlay never closes when interacting with tags/lists/remind dialogs.
      */}
      {tagsOpen && (
        <LeadTagsDialog
          open={tagsOpen}
          onClose={() => setTagsOpen(false)}
          selectedTagIds={form.tags.map((t) => t.id)}
          onSelectionChange={handleTagsDone}
        />
      )}

      {listsOpen && (
        <ReminderListsDialog
          open={listsOpen}
          onClose={() => setListsOpen(false)}
          selectedListIds={form.bucket ? [form.bucket.id] : []}
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
    </div>
  );
}
