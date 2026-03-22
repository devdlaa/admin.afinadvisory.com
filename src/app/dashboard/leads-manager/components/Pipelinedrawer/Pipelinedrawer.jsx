import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import CircularProgress from "@mui/material/CircularProgress";
import {
  X,
  GripVertical,
  Plus,
  Check,
  MoreVertical,
  Pencil,
  Trash2,
  Lock,
  Trophy,
  ThumbsDown,
  AlertCircle,
  Info,
  ListOrdered,
} from "lucide-react";
import { PIPELINE_ICONS } from "@/schemas/core/LeadPipelineAndStages.schema";

import { PIPLINE_ICON_MAP } from "@/utils/client/cutils";
import {
  fetchLeadPipelineById,
  createLeadPipeline,
  updateLeadPipeline,
  selectCurrentPipeline,
  selectCurrentPipelineLoading,
  selectSubmittingPipeline,
  clearCurrentPipeline,
} from "@/store/slices/leadPipelinesSlice";

import {
  fetchCompanyProfiles,
  selectListProfiles,
  selectIsLoading as selectProfileLoading,
} from "@/store/slices/companyProfileSlice";

import styles from "./PipelineDrawer.module.scss";

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */

const MAX_OPEN_STAGES = 8;
const TABS = [
  { label: "Pipeline Info", icon: Info },
  { label: "Stages", icon: ListOrdered },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

function PipelineIcon({ name, size = 16, className }) {
  const Comp = PIPLINE_ICON_MAP[name] || Settings;
  return <Comp size={size} className={className} />;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ─────────────────────────────────────────────
   STAGE ROW
───────────────────────────────────────────── */

function StageRow({
  stage,
  index,
  onRename,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
  isSystem,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuUp, setMenuUp] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const rowRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleOpenMenu = () => {
    // Determine if menu should open upward (bug 4 fix)
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setMenuUp(spaceBelow < 120);
    }
    setMenuOpen((v) => !v);
  };

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = "move";
    onDragStart(index);
  };

  if (isSystem) {
    return (
      <div className={styles.stageRow} data-system>
        <span
          className={styles.stageDragHandle}
          style={{ opacity: 0.2, cursor: "not-allowed" }}
        >
          <GripVertical size={14} />
        </span>
        <span className={styles.stageName}>{stage.name}</span>
        <Lock size={12} className={styles.stageLockIcon} />
      </div>
    );
  }

  return (
    <div
      ref={rowRef}
      className={`${styles.stageRow} ${isDragOver ? styles.stageRowDragOver : ""}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
    >
      <span className={styles.stageDragHandle}>
        <GripVertical size={14} />
      </span>
      <span className={styles.stageName}>{stage.name}</span>
      <div className={styles.stageActions} ref={menuRef}>
        <button
          ref={btnRef}
          className={styles.stageMenuBtn}
          onClick={handleOpenMenu}
          type="button"
        >
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <div
            className={`${styles.stageMenu} ${menuUp ? styles.stageMenuUp : ""}`}
          >
            <button
              className={styles.stageMenuItem}
              onClick={() => {
                setMenuOpen(false);
                onRename(index);
              }}
              type="button"
            >
              <Pencil size={13} /> Rename
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STAGE INLINE INPUT
───────────────────────────────────────────── */

function StageInlineInput({
  initialValue = "",
  onConfirm,
  onCancel,
  placeholder = "Stage name…",
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (value.trim().length >= 2) onConfirm(value.trim());
    }
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className={styles.stageInlineInput}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={80}
        className={styles.stageInput}
      />
      <button
        type="button"
        className={styles.stageInputCancel}
        onClick={onCancel}
      >
        <X size={14} />
      </button>
      <button
        type="button"
        className={styles.stageInputConfirm}
        onClick={() => {
          if (value.trim().length >= 2) onConfirm(value.trim());
        }}
        disabled={value.trim().length < 2}
      >
        <Check size={14} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB 1 — PIPELINE INFO
───────────────────────────────────────────── */

function PipelineInfoTab({
  form,
  onChange,
  companies,
  companiesLoading,
  isEdit,
  pipeline,
}) {
  const [iconOpen, setIconOpen] = useState(false);
  const iconRef = useRef(null);

  useEffect(() => {
    if (!iconOpen) return;
    const handler = (e) => {
      if (iconRef.current && !iconRef.current.contains(e.target))
        setIconOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [iconOpen]);

  return (
    <div className={styles.tabContent}>
      {/* Name + Icon inline row */}
      <div className={styles.field}>
        <label className={styles.label}>
          Pipeline Name <span className={styles.required}>*</span>
        </label>
        <div className={styles.nameWithIcon}>
          {/* Icon picker trigger — inline left of input */}
          <div className={styles.iconPickerWrap} ref={iconRef}>
            <button
              type="button"
              className={styles.iconPickerTrigger}
              onClick={() => setIconOpen((v) => !v)}
              title={`Icon: ${form.icon || "settings"}`}
            >
              <PipelineIcon name={form.icon || "settings"} size={20} />
            </button>
            {iconOpen && (
              <div className={styles.iconGrid}>
                {PIPELINE_ICONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.iconGridItem} ${form.icon === key ? styles.iconGridItemSelected : ""}`}
                    onClick={() => {
                      onChange("icon", key);
                      setIconOpen(false);
                    }}
                    title={key}
                  >
                    <PipelineIcon name={key} size={18} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            className={styles.input}
            placeholder="e.g., Sales Pipeline"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            maxLength={120}
          />
        </div>
        {form.name && !/^[A-Za-z0-9 ]+$/.test(form.name) && (
          <p className={styles.fieldError}>
            Only letters, numbers and spaces allowed
          </p>
        )}
      </div>

      {/* Description */}
      <div className={styles.field}>
        <label className={styles.label}>Description</label>
        <textarea
          className={styles.textarea}
          placeholder="Brief description of this pipeline…"
          value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
          maxLength={200}
          rows={3}
        />
      </div>

      {/* Company Profile */}
      <div className={styles.field}>
        <label className={styles.label}>
          Company <span className={styles.required}>*</span>
        </label>
        {companiesLoading ? (
          <div className={styles.loadingRow}>
            <CircularProgress size={14} thickness={4} /> Loading companies…
          </div>
        ) : (
          <select
            className={styles.select}
            value={form.company_profile_id}
            onChange={(e) => onChange("company_profile_id", e.target.value)}
          >
            <option value="">Select company…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_default ? " (Default)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Default checkbox */}
      <div className={styles.field}>
        <label className={styles.label}>Default Pipeline</label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={form.is_default}
            onChange={(e) => onChange("is_default", e.target.checked)}
          />
          <span>Set as default</span>
        </label>
      </div>

      {/* Meta info in edit mode */}
      {isEdit && pipeline && (
        <div className={styles.metaInfo}>
          <div className={styles.metaRow}>
            <span>
              Created by <strong>{pipeline.creator?.name || "—"}</strong> on{" "}
              {formatDate(pipeline.created_at)}
            </span>
          </div>
          {pipeline.updater && (
            <div className={styles.metaRow}>
              <span>
                Last updated by <strong>{pipeline.updater?.name || "—"}</strong>{" "}
                on {formatDate(pipeline.updated_at)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB 2 — STAGES
───────────────────────────────────────────── */

function StagesTab({ stages, onChange }) {
  const [addingNew, setAddingNew] = useState(false);
  const [renamingIndex, setRenamingIndex] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const openStages = stages.filter((s) => !s.is_closed);
  const systemStages = stages.filter((s) => s.is_closed);

  const handleAddStage = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Check dups
    if (openStages.some((s) => s.name.toLowerCase() === trimmed.toLowerCase()))
      return;
    onChange([
      ...stages,
      { name: trimmed, stage_order: openStages.length + 1 },
    ]);
    setAddingNew(false);
  };

  const handleRename = (index, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updated = [...stages];
    // Find actual index in full stages array
    const openIdx = openStages[index];
    const fullIdx = stages.findIndex((s) => s === openIdx);
    updated[fullIdx] = { ...updated[fullIdx], name: trimmed };
    onChange(updated);
    setRenamingIndex(null);
  };

  const handleDelete = (index) => {
    const stageToDelete = openStages[index];
    onChange(stages.filter((s) => s !== stageToDelete));
  };

  // Drag & drop
  const handleDragStart = useCallback((index) => setDragFrom(index), []);
  const handleDragOver = useCallback((index) => setDragOverIndex(index), []);
  const handleDrop = useCallback(
    (dropIndex) => {
      if (dragFrom === null || dragFrom === dropIndex) {
        setDragFrom(null);
        setDragOverIndex(null);
        return;
      }
      // Reorder open stages
      const reordered = [...openStages];
      const [moved] = reordered.splice(dragFrom, 1);
      reordered.splice(dropIndex, 0, moved);

      // Reassign stage_order
      const reorderedWithOrder = reordered.map((s, i) => ({
        ...s,
        stage_order: i + 1,
      }));

      // Merge back with system stages
      onChange([...reorderedWithOrder, ...systemStages]);
      setDragFrom(null);
      setDragOverIndex(null);
    },
    [dragFrom, openStages, systemStages, onChange],
  );

  const handleDragEnd = useCallback(() => {
    setDragFrom(null);
    setDragOverIndex(null);
  }, []);

  const atMax = openStages.length >= MAX_OPEN_STAGES;

  return (
    <div className={styles.tabContent}>
      {/* Open Stages */}
      <div className={styles.stageSection}>
        <div className={styles.stageSectionHeader}>
          <p className={styles.stageSectionTitle}>Open Stages</p>
          <span className={styles.stageSectionCount}>
            {openStages.length}/{MAX_OPEN_STAGES}
          </span>
        </div>

        <div className={styles.stageList}>
          {openStages.map((stage, index) =>
            renamingIndex === index ? (
              <StageInlineInput
                key={`rename-${index}`}
                initialValue={stage.name}
                onConfirm={(name) => handleRename(index, name)}
                onCancel={() => setRenamingIndex(null)}
              />
            ) : (
              <StageRow
                key={stage.id || `new-${index}`}
                stage={stage}
                index={index}
                onRename={(i) => setRenamingIndex(i)}
                onDelete={handleDelete}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                isDragOver={
                  dragOverIndex === index &&
                  dragFrom !== null &&
                  dragFrom !== index
                }
                isSystem={false}
              />
            ),
          )}

          {/* New stage input */}
          {addingNew && (
            <StageInlineInput
              onConfirm={handleAddStage}
              onCancel={() => setAddingNew(false)}
              placeholder="New stage name…"
            />
          )}
        </div>

        {/* Add stage button */}
        {!addingNew && (
          <button
            type="button"
            className={styles.addStageBtn}
            onClick={() => setAddingNew(true)}
            disabled={atMax}
            title={
              atMax ? `Maximum ${MAX_OPEN_STAGES} open stages` : "Add stage"
            }
          >
            <Plus size={13} />
            Add Stage
            {atMax && (
              <span className={styles.addStageCap}>
                (max {MAX_OPEN_STAGES})
              </span>
            )}
          </button>
        )}
      </div>

      {/* Closed / System Stages */}
      <div className={styles.stageSection}>
        <div className={styles.stageSectionHeader}>
          <p className={styles.stageSectionTitle}>Closed Stages</p>
          <span className={styles.stageSectionLock}>
            <Lock size={11} /> System Generated
          </span>
        </div>
        <div className={styles.stageList}>
          {systemStages.length > 0 ? (
            systemStages.map((stage) => (
              <div
                key={stage.id || stage.name}
                className={styles.stageRow}
                data-system
              >
                <span
                  className={styles.stageDragHandle}
                  style={{ opacity: 1, cursor: "not-allowed" }}
                >
                  <GripVertical size={14} />
                </span>
                {stage.is_won ? (
                  <Trophy
                    size={16}
                    className={styles.stageSystemIcon}
                    style={{ color: "var(--stage-won)" }}
                  />
                ) : (
                  <ThumbsDown
                    size={16}
                    className={styles.stageSystemIcon}
                    style={{ color: "var(--stage-lost)" }}
                  />
                )}
                <span className={styles.stageName}>{stage.name}</span>
                <Lock size={12} className={styles.stageLockIcon} />
              </div>
            ))
          ) : (
            <p className={styles.stageSystemPlaceholder}>
              Won & Lost stages are added automatically when the pipeline is
              created.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN DRAWER
───────────────────────────────────────────── */

const EMPTY_FORM = {
  name: "",
  description: "",
  company_profile_id: "",
  icon: "settings",
  is_default: false,
};

export default function PipelineDrawer({ open, onClose, pipelineId = null }) {
  const dispatch = useDispatch();
  const isEdit = !!pipelineId;

  const pipeline = useSelector(selectCurrentPipeline);
  const pipelineLoading = useSelector(selectCurrentPipelineLoading);
  const submitting = useSelector(selectSubmittingPipeline);
  const companies = useSelector(selectListProfiles);
  const companiesLoading = useSelector((s) => selectProfileLoading(s, "list"));

  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [stages, setStages] = useState([]);
  const [formDirty, setFormDirty] = useState(false);
  const [stagesDirty, setStagesDirty] = useState(false);
  const [error, setError] = useState(null);

  const [createdId, setCreatedId] = useState(null);

  const [pipelineCreated, setPipelineCreated] = useState(false);
  const effectivePipelineId = pipelineId || createdId;

  /* Load on open */
  useEffect(() => {
    if (!open) return;

    // Reset state
    setActiveTab(0);
    setFormDirty(false);
    setStagesDirty(false);
    setError(null);
    setCreatedId(null);
    setPipelineCreated(false);

    if (isEdit) {
      dispatch(fetchLeadPipelineById(pipelineId));
    } else {
      
      setForm(EMPTY_FORM);
      setStages([]);
    }

    if (companies.length === 0) {
      dispatch(fetchCompanyProfiles({ page_size: 50 }));
    }
  }, [open, pipelineId]);

  useEffect(() => {
    if (!pipeline) return;
    setForm({
      name: pipeline.name || "",
      description: pipeline.description || "",
      company_profile_id: pipeline.company_profile_id || "",
      icon: pipeline.icon || "settings",
      is_default: pipeline.is_default || false,
    });
    setStages(pipeline.stages || []);
    setFormDirty(false);
    setStagesDirty(false);
  }, [pipeline]);

  useEffect(
    () => () => {
      dispatch(clearCurrentPipeline());
    },
    [],
  );

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormDirty(true);
  };

  const handleStagesChange = (newStages) => {
    setStages(newStages);
    setStagesDirty(true);
  };

  const tab1Valid = useMemo(() => {
    const nameOk =
      form.name.trim().length >= 2 && /^[A-Za-z0-9 ]+$/.test(form.name.trim());
    const companyOk = !!form.company_profile_id;
    return nameOk && companyOk;
  }, [form]);

  const hasChanges = formDirty || stagesDirty;

  const handleCreatePipeline = async () => {
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      company_profile_id: form.company_profile_id,
      icon: form.icon,
      is_default: form.is_default,
    };

    const res = await dispatch(createLeadPipeline(payload));

    if (res.error) {
      setError(res.payload || "Failed to create pipeline");
      return;
    }

    const created = res.payload;
    const newId = created?.pipeline?.id || created?.id;

    if (!newId) {
      setError("Invalid response from server");
      return; // extra safety
    }

    setCreatedId(newId);
    setPipelineCreated(true);

    const returnedStages = created?.pipeline?.stages || created?.stages || [];

    setStages(returnedStages);

    setFormDirty(false);
    setStagesDirty(false);

    setActiveTab(1);
  };

  const handleUpdate = async () => {
    if (!effectivePipelineId) return;
    setError(null);

    const openStages = stages.filter((s) => !s.is_closed);
    const payload = {};

    if (formDirty) {
      payload.name = form.name.trim();
      payload.description = form.description.trim();
      payload.icon = form.icon;
      payload.is_default = form.is_default;
    }

    if (stagesDirty && openStages.length > 0) {
      payload.stages = openStages.map((s) => ({
        ...(s.id ? { id: s.id } : {}),
        name: s.name,
      }));
    }

    const res = await dispatch(
      updateLeadPipeline({ id: effectivePipelineId, ...payload }),
    );
    if (res.error) {
      setError(res.payload || "Failed to update pipeline");
      return;
    }

    // Refresh stages from response
    const updated = res.payload;
    if (updated?.stages) setStages(updated.stages);
    setFormDirty(false);
    setStagesDirty(false);
  };

  const handleClose = () => {
    onClose();
  };

  if (!open) return null;

  const tab2Locked = !isEdit && !createdId;
  const stagesTabDirty = stagesDirty && !!effectivePipelineId;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={styles.drawer}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>
              <PipelineIcon name={form.icon || "settings"} size={19} />
            </span>
            <div>
              <p className={styles.headerTitle}>
                {isEdit ? "Edit Pipeline" : "New Pipeline"}
              </p>
              <p className={styles.headerSub}>
                {isEdit
                  ? "Update pipeline configuration"
                  : "Set up a new sales pipeline"}
              </p>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className={styles.tabs}>
          {TABS.map((tab, i) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.label}
                type="button"
                className={`${styles.tab} ${activeTab === i ? styles.tabActive : ""} ${i === 1 && tab2Locked ? styles.tabLocked : ""}`}
                onClick={() => {
                  if (i === 1 && tab2Locked) return;
                  setActiveTab(i);
                }}
                disabled={i === 1 && tab2Locked}
                title={
                  i === 1 && tab2Locked
                    ? "Create the pipeline first"
                    : undefined
                }
              >
                <Icon size={18} style={{ marginRight: 6 }} />
                {tab.label}

                {i === 1 && tab2Locked && (
                  <Lock size={11} style={{ marginLeft: 4 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>
          {pipelineLoading ? (
            <div className={styles.loadingState}>
              <CircularProgress size={24} thickness={4} />
              <span>Loading pipeline…</span>
            </div>
          ) : (
            <>
              {activeTab === 0 && (
                <PipelineInfoTab
                  form={form}
                  onChange={handleFormChange}
                  companies={companies}
                  companiesLoading={companiesLoading}
                  isEdit={isEdit}
                  pipeline={pipeline}
                />
              )}
              {activeTab === 1 && (
                <StagesTab stages={stages} onChange={handleStagesChange} />
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={14} />
              <span>
                {typeof error === "string" ? error : "Something went wrong"}
              </span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </button>

          {!isEdit && !pipelineCreated && activeTab === 0 && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleCreatePipeline}
              disabled={submitting || !tab1Valid}
            >
              {submitting ? (
                <CircularProgress
                  size={13}
                  thickness={5}
                  className={styles.btnSpinner}
                />
              ) : null}
              Create Pipeline
            </button>
          )}

          {!isEdit && pipelineCreated && activeTab === 0 && formDirty && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleUpdate}
              disabled={submitting || !tab1Valid}
            >
              {submitting ? (
                <CircularProgress
                  size={13}
                  thickness={5}
                  className={styles.btnSpinner}
                />
              ) : null}
              Update Pipeline
            </button>
          )}

          {/* Tab 1 in CREATE mode → Save Stages */}
          {!isEdit && activeTab === 1 && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleUpdate}
              disabled={submitting || !stagesDirty}
            >
              {submitting ? (
                <CircularProgress
                  size={13}
                  thickness={5}
                  className={styles.btnSpinner}
                />
              ) : null}
              Save Stages
            </button>
          )}

          {/* EDIT mode → show Update Pipeline if anything changed */}
          {isEdit && hasChanges && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleUpdate}
              disabled={submitting || (activeTab === 0 && !tab1Valid)}
            >
              {submitting ? (
                <CircularProgress
                  size={13}
                  thickness={5}
                  className={styles.btnSpinner}
                />
              ) : null}
              Update Pipeline
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
