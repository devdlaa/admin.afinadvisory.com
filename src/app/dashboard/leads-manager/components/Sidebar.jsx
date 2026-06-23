"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Pencil, Trash2, Star, Workflow } from "lucide-react";
import { PIPLINE_ICON_MAP } from "@/utils/client/cutils";
import styles from "../page.module.scss";

function getPipelineIcon(iconKey) {
  const Icon = PIPLINE_ICON_MAP[iconKey] ?? Workflow;
  return <Icon size={22} strokeWidth={2.4} />;
}

function SkeletonItem() {
  return (
    <div className={styles.skeletonItem}>
      <div className={styles.skeletonIcon} />
      <div className={styles.skeletonText} />
    </div>
  );
}

function PipelineMenu({
  pipeline,
  anchorRect,
  onUpdate,
  onDelete,
  onMarkDefault,
  onClose,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : 1200;

  const style = {
    position: "fixed",
    top: anchorRect.top,
    left: anchorRect.right + 6,
    zIndex: 9999,
  };

  if (anchorRect.right + 6 + 176 > viewportWidth) {
    style.left = "auto";
    style.right = viewportWidth - anchorRect.left + 4;
  }

  return createPortal(
    <div className={styles.pipelineMenu} ref={ref} style={style}>
      <button
        className={styles.pipelineMenuItem}
        onClick={() => {
          onUpdate(pipeline);
          onClose();
        }}
      >
        <Pencil size={18} strokeWidth={2} />
        <span>Update pipeline</span>
      </button>
      <button
        className={`${styles.pipelineMenuItem} ${pipeline.is_default ? styles.pipelineMenuItemDisabled : ""}`}
        onClick={() => {
          if (!pipeline.is_default) {
            onMarkDefault(pipeline);
            onClose();
          }
        }}
        disabled={pipeline.is_default}
      >
        <Star size={20} strokeWidth={2} />
        <span>
          {pipeline.is_default ? "Default pipeline" : "Mark as default"}
        </span>
      </button>
      <div className={styles.pipelineMenuDivider} />
      <button
        className={`${styles.pipelineMenuItem} ${styles.pipelineMenuItemDanger}`}
        onClick={() => {
          onDelete(pipeline);
          onClose();
        }}
      >
        <Trash2 size={18} strokeWidth={2} />
        <span>Delete pipeline</span>
      </button>
    </div>,
    document.body,
  );
}

function PipelineItem({
  pipeline,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onMarkDefault,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const dotsBtnRef = useRef(null);

  const openMenu = useCallback((e) => {
    e.stopPropagation();
    if (dotsBtnRef.current)
      setAnchorRect(dotsBtnRef.current.getBoundingClientRect());
    setMenuOpen((v) => !v);
  }, []);

  return (
    <div
      className={`${styles.pipelineItem} ${isSelected ? styles.pipelineItemSelected : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        if (!menuOpen) setHovered(false);
      }}
      onClick={() => onSelect(pipeline)}
    >
      <span
        className={`${styles.pipelineIcon} ${isSelected ? styles.pipelineIconSelected : ""}`}
      >
        {getPipelineIcon(pipeline.icon)}
      </span>
      <span className={styles.pipelineName}>{pipeline.name}</span>

      {pipeline.is_default && (
        <span className={styles.pipelineDefaultStar} title="Default pipeline">
          <Star fill="gold" size={18} strokeWidth={2.5} />
        </span>
      )}

      {(hovered || menuOpen) && (
        <button
          ref={dotsBtnRef}
          className={styles.pipelineDotsBtn}
          onClick={openMenu}
        >
          <MoreVertical size={16} strokeWidth={2} />
        </button>
      )}

      {menuOpen && anchorRect && (
        <PipelineMenu
          pipeline={pipeline}
          anchorRect={anchorRect}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onMarkDefault={onMarkDefault}
          onClose={() => {
            setMenuOpen(false);
            setHovered(false);
          }}
        />
      )}
    </div>
  );
}

export default function Sidebar({
  hidden,
  pipelines,
  totalCount,
  selectedPipeline,
  hasMore,
  loading,
  loadingMore,
  onSelectPipeline,
  onCreatePipeline,
  onUpdatePipeline,
  onDeletePipeline,
  onMarkDefault,
  onLoadMore,
}) {
  return (
    <aside
      className={`${styles.sidebar} ${hidden ? styles.sidebarHidden : ""}`}
    >
      <div className={styles.sidebarInner}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>
            Team Pipelines
            {totalCount > 0 && (
              <span className={styles.pipelineCount}>{totalCount}</span>
            )}
          </span>
        </div>

        <div className={styles.pipelineList}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonItem key={i} />)
          ) : pipelines.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No pipelines yet</p>
              <p className={styles.emptySubtitle}>
                Create your first pipeline to get started
              </p>
            </div>
          ) : (
            <>
              {pipelines.map((pipeline) => (
                <PipelineItem
                  key={pipeline.id}
                  pipeline={pipeline}
                  isSelected={selectedPipeline?.id === pipeline.id}
                  onSelect={onSelectPipeline}
                  onUpdate={onUpdatePipeline}
                  onDelete={onDeletePipeline}
                  onMarkDefault={onMarkDefault}
                />
              ))}

              {hasMore && (
                <button
                  className={styles.loadMoreBtn}
                  onClick={onLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
