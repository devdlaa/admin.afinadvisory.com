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
  Users,
  CheckCircle,
  XCircle,
  GitMerge,
  Trophy,
} from "lucide-react";
import styles from "./KanbanBoard.module.scss";

/* ─── Constants ─────────────────────────────────────────────── */
const MIN_WIDTH = 280;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 240;
const COLLAPSED_WIDTH = 40;

/* ─── Dummy data ────────────────────────────────────────────── */
const DUMMY_STAGES = [
  {
    id: "s1",
    pipeline_id: "p1",
    name: "New Inquiry",
    stage_order: 1,
    is_closed: false,
    is_won: false,
    created_at: "",
    created_by: "",
    updated_by: "",
    description:
      "Initial contact from potential client. Capture basic requirements and intent.",
  },
  {
    id: "s2",
    pipeline_id: "p1",
    name: "Negotiation",
    stage_order: 2,
    is_closed: false,
    is_won: false,
    created_at: "",
    created_by: "",
    updated_by: "",
    description:
      "Discuss pricing, scope, and finalize deal terms with the client.",
  },
  {
    id: "s3",
    pipeline_id: "p1",
    name: "Site Visit",
    stage_order: 3,
    is_closed: false,
    is_won: false,
    created_at: "",
    created_by: "",
    updated_by: "",
    description: "",
  },
  {
    id: "s4",
    pipeline_id: "p1",
    name: "Paperwork",
    stage_order: 4,
    is_closed: false,
    is_won: false,
    created_at: "",
    created_by: "",
    updated_by: "",
    description: "",
  },
  {
    id: "s5",
    pipeline_id: "p1",
    name: "Attorney Review",
    stage_order: 5,
    is_closed: false,
    is_won: false,
    created_at: "",
    created_by: "",
    updated_by: "",
    description: "",
  },
  {
    id: "s6",
    pipeline_id: "p1",
    name: "Closed Won",
    stage_order: 6,
    is_closed: true,
    is_won: true,
    created_at: "",
    created_by: "",
    updated_by: "",
    description: "",
  },
  {
    id: "s7",
    pipeline_id: "p1",
    name: "Closed Lost",
    stage_order: 7,
    is_closed: true,
    is_won: false,
    created_at: "",
    created_by: "",
    updated_by: "",
    description: "",
  },
];

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
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [bodyHovered, setBodyHovered] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const leadCount = 0;

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
        className={`${styles.boardCollapsed} ${accentClass}`}
        onClick={() => onUncollapse(stage.id)}
        title={`Click to expand: ${stage.name}`}
      >
        <div className={styles.collapsedContent}>
          <span className={styles.collapsedName}>{stage.name}</span>
          <span className={styles.collapsedCount}>{leadCount} Leads</span>
        </div>
      </div>
    );
  }

  /* ── Normal ── */
  return (
    <div
      className={`${styles.board} ${animClass || ""}`}
      style={{ width: boardWidth }}
    >
      {/* HEADER */}
      <div className={`${styles.boardHeader} ${accentClass}`}>
        <div className={styles.boardHeaderLeft}>
          <div className={styles.stageIconCol}>
            <StageIcon size={24} />
          </div>

          <div className={styles.stageTextBlock}>
            <span className={styles.stageName}>{stage.name}</span>
            <span className={styles.leadCount}>{leadCount} Leads</span>
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
        className={styles.boardBody}
        onMouseEnter={() => setBodyHovered(true)}
        onMouseLeave={() => setBodyHovered(false)}
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
        <div className={styles.emptyState}>
          <span className={styles.emptyText}>This stage is empty</span>
        </div>

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
  onCollapseStage,
}) {
  const rawStages = propStages || DUMMY_STAGES;

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

  // Track which boards are mid-animation: { movedId, swappedId, direction }
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

  const [collapsedIds, setCollapsedIds] = useState(new Set());

  const [committedWidth, setCommittedWidth] = useState(DEFAULT_WIDTH);
  const [liveWidth, setLiveWidth] = useState(null);
  const [resizingId, setResizingId] = useState(null);

  const dragRef = useRef(null);
  const liveWidthRef = useRef(null);

  const handleCollapse = useCallback((id) => {
    setCollapsedIds((prev) => new Set([...prev, id]));
  }, []);

  const handleUncollapse = useCallback((id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

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
        setCommittedWidth(finalWidth);
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
    [committedWidth],
  );

  return (
    <div className={styles.kanbanWrapper}>
      <div className={styles.kanbanScroll}>
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
                    ? styles.slideRight // swapped board goes the opposite way
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
                onCollapse={handleCollapse}
                onUncollapse={handleUncollapse}
                onResizeStart={handleResizeStart}
                isResizing={stage.id === resizingId}
                onMoveStage={handleMoveStage}
                onCreateLead={onCreateLead}
                onDeleteStage={onDeleteStage}
                onCollapseStage={handleCollapse}
                animClass={animClass}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
