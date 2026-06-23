import { useState, useRef, useCallback, useEffect } from "react";
import {
  MoreHorizontal,
  Plus,
  ChevronsLeftRight,
  PanelLeftClose,
  MoveLeft,
  MoveRight,
  Trash2,
  UserPlus,
  XCircle,
  GitMerge,
  Trophy,
} from "lucide-react";
import styles from "./KanbanBoard.module.scss";
import { useStageVisibility } from "@/hooks/useStageVisibility";
import { useKanbanUIState } from "@/hooks/useKanbanUIState";
import LeadCard from "../LeadCard/LeadCard";
import LeadCardSkeleton from "../LeadCard/LeadCardSkeleton";
import { useKanbanDragDrop } from "@/hooks/useKanbanDragDrop";

import { useDispatch, useSelector } from "react-redux";
import {
  fetchPipelineLeads,
  selectStageItems,
  selectStageLoading,
  selectStageLeads,
  selectStageHasMore,
  selectStageCursor,
} from "@/store/slices/leadsSlice";

/* ─── Constants ─────────────────────────────────────────────── */
const MIN_WIDTH = 280;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 400;

/* ─── Dropdown ──────────────────────────────────────────────── */
function StageDropdown({ stage, isFirst, isLast, onClose, onAction }) {
  const ref = useRef(null);
  const canMove = !stage.is_closed;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className={styles.dropdown} ref={ref}>
      <button
        className={styles.dropdownItem}
        onClick={() => {
          onAction("new_lead");
          onClose();
        }}
      >
        <UserPlus size={14} />
        <span>New Lead</span>
      </button>

      <div className={styles.dropdownDivider} />
      <button
        className={`${styles.dropdownItem} ${!canMove || isLast ? styles.dropdownItemDisabled : ""}`}
        disabled={!canMove || isLast}
        onClick={() => {
          if (canMove && !isLast) {
            onAction("move_right");
            onClose();
          }
        }}
      >
        <MoveRight size={14} />
        <span>Move Right</span>
      </button>
      <button
        className={`${styles.dropdownItem} ${!canMove || isFirst ? styles.dropdownItemDisabled : ""}`}
        disabled={!canMove || isFirst}
        onClick={() => {
          if (canMove && !isFirst) {
            onAction("move_left");
            onClose();
          }
        }}
      >
        <MoveLeft size={14} />
        <span>Move Left</span>
      </button>

      <div className={styles.dropdownDivider} />

      <button
        className={styles.dropdownItem}
        onClick={() => {
          onAction("collapse");
          onClose();
        }}
      >
        <PanelLeftClose size={14} />
        <span>Collapse Stage</span>
      </button>

      <div className={styles.dropdownDivider} />

      <button
        className={`${styles.dropdownItem} ${stage.is_closed ? styles.dropdownItemDisabled : styles.dropdownItemDanger}`}
        disabled={stage.is_closed}
        onClick={() => {
          if (!stage.is_closed) {
            onAction("delete");
            onClose();
          }
        }}
      >
        <Trash2 size={14} />
        <span>Delete Stage</span>
      </button>
    </div>
  );
}

/* ─── StageBoard ────────────────────────────────────────────── */
function StageBoard({
  stage,
  isFirst,
  isLast,
  isCollapsed,
  boardWidth,
  onCollapse,
  onUncollapse,
  onResizeStart,
  isResizing,
  onMoveStage,
  onCreateLead,
  onDeleteStage,
  onCollapseStage,
  animClass,
  layoutReady,
  pipelineId,
  scrollRef,
  onStageVisible,
  getDragHandlers,
  draggingLeadId,
  dropZoneHandlers,
  isDropTarget,
  overLeadIndex,
  setOverLeadIndex,
  overStageId,
  onLeadClick,
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [bodyHovered, setBodyHovered] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const stageMeta = useSelector(selectStageLeads(pipelineId, stage.id));
  const hasMore = useSelector(selectStageHasMore(pipelineId, stage.id));
  const cursor = useSelector(selectStageCursor(pipelineId, stage.id));
  const ref = useRef(null);
  const dispatch = useDispatch();
  const leads = useSelector(selectStageItems(pipelineId, stage.id));

  const loading = useSelector(selectStageLoading(pipelineId, stage.id));
  const handleLoadMore = () => {
    if (!hasMore || loading || !cursor) return;

    const encodedCursor = btoa(JSON.stringify({ [stage.id]: cursor }));

    dispatch(
      fetchPipelineLeads({
        pipelineId,
        stageIds: [stage.id],
        cursor: encodedCursor,
      }),
    );
  };

  useStageVisibility({
    elRef: ref,
    scrollRef,
    stageId: stage.id,
    pipelineId,
    layoutReady,
    isCollapsed,
    onVisible: () => {
      if (!stageMeta.initialLoaded && !stageMeta.loading) {
        onStageVisible(stage.id);
      }
    },
  });

  const accentClass = stage.is_won
    ? styles.headerWon
    : stage.is_closed
      ? styles.headerLost
      : styles.headerOpen;

  const StageIcon = stage.is_won
    ? Trophy
    : stage.is_closed
      ? XCircle
      : GitMerge;

  const handleAction = (action) => {
    if (action === "collapse") return onCollapseStage?.(stage.id);
    if (action === "new_lead") return onCreateLead?.(stage);
    if (action === "move_left") return onMoveStage?.(stage.id, "left");
    if (action === "move_right") return onMoveStage?.(stage.id, "right");
    if (action === "delete") return onDeleteStage?.(stage.id);
  };

  /* ── Collapsed ── */
  if (isCollapsed) {
    return (
      <div
        ref={ref}
        className={`${styles.boardCollapsed} ${accentClass}`}
        onClick={() => onUncollapse(stage.id)}
        title={`Click to expand: ${stage.name}`}
      >
        <div className={styles.collapsedContent}>
          <span className={styles.collapsedName}>{stage.name}</span>
          <span className={styles.collapsedCount}>{leads?.length} Leads</span>
        </div>
      </div>
    );
  }

  /* ── Normal ── */
  return (
    <div
      ref={ref}
      className={`${styles.board} ${animClass || ""}`}
      style={{ width: boardWidth }}
    >
      {/* HEADER */}
      <div
        className={`${styles.boardHeader} ${accentClass}`}
        data-drag-handle="true"
      >
        <div className={styles.boardHeaderLeft}>
          <div className={styles.stageIconCol}>
            <StageIcon size={24} />
          </div>

          <div className={styles.stageTextBlock}>
            <span className={styles.stageName}>{stage.name}</span>
            <span className={styles.leadCount}>{leads?.length} Leads</span>
          </div>
        </div>
        <div className={styles.boardHeaderActions}>
          <button
            className={`${styles.dotsBtn} ${showDropdown ? styles.dotsBtnActive : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown((v) => !v);
            }}
          >
            <MoreHorizontal size={15} />
          </button>
          {showDropdown && (
            <StageDropdown
              stage={stage}
              isFirst={isFirst}
              isLast={isLast}
              onClose={() => setShowDropdown(false)}
              onAction={handleAction}
            />
          )}
        </div>
      </div>

      {/* BODY */}
      <div
        className={`${styles.boardBody} ${isDropTarget ? styles.boardBodyDropTarget : ""}`}
        onMouseEnter={() => setBodyHovered(true)}
        onMouseLeave={() => setBodyHovered(false)}
        {...dropZoneHandlers}
      >
        {stage.description &&
          (descExpanded ? (
            <textarea
              className={styles.stageDescriptionTextarea}
              value={stage.description}
              readOnly
              autoFocus
              onBlur={() => setDescExpanded(false)}
            />
          ) : (
            <div
              className={styles.stageDescription}
              onClick={() => setDescExpanded(true)}
            >
              {stage.description}
            </div>
          ))}

        {loading && leads?.length === 0 ? (
          <div className={styles.loadingState}>
            <LeadCardSkeleton count={5} />
          </div>
        ) : leads.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyText}>This stage is empty</span>
          </div>
        ) : (
          <div
            className={styles.leadsList}
            onDragOver={(e) => {
              e.preventDefault();

              if (overStageId !== stage.id) return;
              const cards = Array.from(e.currentTarget.children).filter(
                (c) => !c.classList.contains(styles.dropPlaceholder),
              );
              let index = cards.length;
              for (let i = 0; i < cards.length; i++) {
                const rect = cards[i].getBoundingClientRect();
                if (e.clientY < rect.top + rect.height / 2) {
                  index = i;
                  break;
                }
              }
              setOverLeadIndex(index);
            }}
          >
            {(() => {
              const items = [];
              leads.forEach((lead, i) => {
                if (overLeadIndex === i) {
                  items.push(
                    <div
                      key="__placeholder"
                      className={styles.dropPlaceholder}
                    />,
                  );
                }
                items.push(
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={(leadId) => onLeadClick?.(leadId, stage.id)}
                    dragHandlers={getDragHandlers(lead.id, stage.id)}
                    isDragging={draggingLeadId === lead.id}
                  />,
                );
              });

              if (overLeadIndex === leads.length) {
                items.push(
                  <div
                    key="__placeholder"
                    className={styles.dropPlaceholder}
                  />,
                );
              }
              return items;
            })()}
            {hasMore && (
              <div className={styles.loadMoreWrapper}>
                <button
                  className={styles.loadMoreBtn}
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? <span className={styles.loader} /> : "Load More"}
                </button>
              </div>
            )}
          </div>
        )}
        <div
          className={`${styles.actionBar} ${bodyHovered ? styles.actionBarVisible : ""}`}
        >
          <button
            className={styles.actionBarCreate}
            onClick={() => onCreateLead?.(stage)}
          >
            <Plus size={20} />
            <span>Create New Lead</span>
          </button>
          <button
            className={styles.actionBarCollapse}
            onClick={() => onCollapse(stage.id)}
            title="Collapse"
          >
            <ChevronsLeftRight size={20} />
          </button>
        </div>
      </div>

      {/* RESIZE HANDLE */}
      <div
        className={`${styles.resizeHandle} ${isResizing ? styles.resizeHandleActive : ""}`}
        onMouseDown={(e) => onResizeStart(e, stage.id)}
      />
    </div>
  );
}

/* ─── KanbanBoard root ──────────────────────────────────────── */
export default function KanbanBoard({
  stages: propStages,
  onMoveStage,
  onCreateLead,
  onDeleteStage,
  layoutReady,
  pipelineId,
  onLeadClick,
}) {
  const scrollRef = useRef(null);
  const rawStages = propStages;
  const visibleStagesRef = useRef(new Set());
  const batchTimeoutRef = useRef(null);
  const dispatch = useDispatch();

  const {
    draggingLeadId,
    overStageId,
    overLeadIndex,
    setOverLeadIndex,
    getDragHandlers,
    getDropZoneHandlers,
  } = useKanbanDragDrop(pipelineId);
  // Local open-stage order for optimistic moves
  const [localOpenStages, setLocalOpenStages] = useState(() =>
    rawStages
      .filter((s) => !s.is_closed)
      .sort((a, b) => a.stage_order - b.stage_order),
  );

  // Sync when propStages changes (pipeline switch, API success/rollback)
  const prevKeyRef = useRef(null);
  useEffect(() => {
    const incoming = rawStages
      .filter((s) => !s.is_closed)
      .sort((a, b) => a.stage_order - b.stage_order);
    const key = incoming.map((s) => `${s.id}:${s.name}`).join(",");
    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      setLocalOpenStages(incoming);
    }
  }, [rawStages]);

  const closedStages = rawStages
    .filter((s) => s.is_closed)
    .sort((a, b) => (a.is_won ? -1 : 1));

  const orderedStages = [...localOpenStages, ...closedStages];

  const [movingBoards, setMovingBoards] = useState(null);

  // Swap locally → instant UI + slide animation, then call parent for API
  const handleMoveStage = useCallback(
    (stageId, direction) => {
      let swappedId = null;

      setLocalOpenStages((prev) => {
        const idx = prev.findIndex((s) => s.id === stageId);
        if (idx === -1) return prev;
        const targetIdx = direction === "left" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= prev.length) return prev;
        swappedId = prev[targetIdx].id;
        const next = [...prev];
        [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
        return next;
      });

      if (swappedId) {
        setMovingBoards({ movedId: stageId, swappedId, direction });
        setTimeout(() => setMovingBoards(null), 320);
      }

      onMoveStage?.(stageId, direction);
    },
    [onMoveStage],
  );

  const { collapsedIds, collapse, uncollapse, committedWidth, saveWidth } =
    useKanbanUIState(pipelineId, propStages, DEFAULT_WIDTH);
  const [liveWidth, setLiveWidth] = useState(null);
  const [resizingId, setResizingId] = useState(null);

  const dragRef = useRef(null);
  const liveWidthRef = useRef(null);

  const handleResizeStart = useCallback(
    (e, stageId) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startWidth: committedWidth };
      liveWidthRef.current = committedWidth;
      setResizingId(stageId);
      setLiveWidth(committedWidth);

      const onMouseMove = (moveE) => {
        const delta = moveE.clientX - dragRef.current.startX;
        const next = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, dragRef.current.startWidth + delta),
        );
        liveWidthRef.current = next;
        setLiveWidth(next);
      };

      const onMouseUp = () => {
        const finalWidth = liveWidthRef.current;
        saveWidth(finalWidth);
        setLiveWidth(null);
        setResizingId(null);
        dragRef.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };

      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [committedWidth, saveWidth],
  );

  const dispatchVisibleStages = useCallback(() => {
    const stageIds = Array.from(visibleStagesRef.current);
    if (!stageIds.length) return;

    visibleStagesRef.current.clear();

    dispatch(
      fetchPipelineLeads({
        pipelineId,
        stageIds,
      }),
    );
  }, [dispatch, pipelineId]);
  const handleStageVisible = useCallback(
    (stageId) => {
      visibleStagesRef.current.add(stageId);

      if (batchTimeoutRef.current) return;

      batchTimeoutRef.current = setTimeout(() => {
        dispatchVisibleStages();
        batchTimeoutRef.current = null;
      }, 80);
    },
    [dispatchVisibleStages],
  );

  useEffect(() => {
    const slider = scrollRef.current;
    if (!slider) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onMouseDown = (e) => {
      const header = e.target.closest("[data-drag-handle]");
      if (!header) return;
      isDown = true;
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
      slider.classList.add(styles.dragging);
      header.closest("[data-board]")?.classList.add(styles.boardGrabbed);
      e.preventDefault();
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      slider.classList.remove(styles.dragging);
      slider
        .querySelectorAll("[data-board]")
        .forEach((b) => b.classList.remove(styles.boardGrabbed));
    };

    const onMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5;
      slider.scrollLeft = scrollLeft - walk;
    };

    slider.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      slider.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div className={styles.kanbanWrapper}>
      <div ref={scrollRef} className={styles.kanbanScroll}>
        <div className={styles.kanbanInner}>
          {orderedStages.map((stage) => {
            const isCollapsed = collapsedIds.has(stage.id);
            const openIdx = localOpenStages.findIndex((s) => s.id === stage.id);

            const thisWidth =
              stage.id === resizingId && liveWidth !== null
                ? liveWidth
                : committedWidth;

            // Determine animation class for this board
            let animClass = "";
            if (movingBoards) {
              if (stage.id === movingBoards.movedId) {
                animClass =
                  movingBoards.direction === "left"
                    ? styles.slideLeft
                    : styles.slideRight;
              } else if (stage.id === movingBoards.swappedId) {
                animClass =
                  movingBoards.direction === "left"
                    ? styles.slideRight
                    : styles.slideLeft;
              }
            }

            return (
              <StageBoard
                key={stage.id}
                stage={stage}
                isFirst={openIdx === 0}
                isLast={openIdx === localOpenStages.length - 1}
                isCollapsed={isCollapsed}
                boardWidth={thisWidth}
                onCollapse={collapse}
                onUncollapse={uncollapse}
                onCollapseStage={collapse}
                onResizeStart={handleResizeStart}
                isResizing={stage.id === resizingId}
                onMoveStage={handleMoveStage}
                onCreateLead={onCreateLead}
                onDeleteStage={onDeleteStage}
                animClass={animClass}
                layoutReady={layoutReady}
                pipelineId={pipelineId}
                scrollRef={scrollRef}
                onStageVisible={handleStageVisible}
                getDragHandlers={getDragHandlers}
                draggingLeadId={draggingLeadId}
                dropZoneHandlers={getDropZoneHandlers(stage.id, isCollapsed)}
                isDropTarget={overStageId === stage.id && !isCollapsed}
                overStageId={overStageId}
                overLeadIndex={overStageId === stage.id ? overLeadIndex : null}
                setOverLeadIndex={setOverLeadIndex}
                onLeadClick={onLeadClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
