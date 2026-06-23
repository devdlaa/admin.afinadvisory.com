"use client";
import React, { useEffect, useCallback, useState, useRef } from "react";
import {
  LayoutDashboard,
  Tag,
  Pin,
  PinOff,
  RotateCw,
  Users,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import "./dashboard.scss";
import BoardCard from "../components/pages/BoardCard/BoardCard";
import FilterDropdown from "@/app/components/pages/FilterDropdown/FilterDropdown";
import Button from "@/app/components/shared/Button/Button";

import {
  fetchCategories,
  fetchCategoryBoards,
  toggleCategoryPin,
  repositionCategoryBoard,
  selectAllCategories,
  selectBoards,
  selectIsLoading,
  selectBoardsLoading,
} from "@/store/slices/taskCategorySlice";
import { fetchUsers } from "@/store/slices/userSlice";

const Page = () => {
  const dispatch = useDispatch();
  const { data: session } = useSession();

  const isSuperAdmin = session?.user?.admin_role === "SUPER_ADMIN";

  const categories = useSelector(selectAllCategories);
  const boards = useSelector(selectBoards);
  const categoriesLoading = useSelector((state) =>
    selectIsLoading(state, "list"),
  );
  const boardsLoading = useSelector(selectBoardsLoading);
  const users = useSelector((state) => state.user?.users || []);
  const usersLoading = useSelector((state) => state.user?.loading || false);

  const [selectedUserId, setSelectedUserId] = useState(
    isSuperAdmin ? null : (session?.user?.id ?? null),
  );

  // ── Drag state ────────────────────────────────────────────────────────────
  const [dragState, setDragState] = useState({
    draggingId: null, // board.id being dragged
    overId: null, // board.id currently hovered over
    originPosition: null, // pin_position before drag started
  });

  const dragGhostRef = useRef(null); // the floating ghost element
  const pointerDownRef = useRef(null); // {id, startX, startY, el}
  const isDraggingRef = useRef(false);
  const DRAG_THRESHOLD = 6; // px before drag activates

  // ── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchCategories({ page: 1, page_size: 100 }));
    dispatch(fetchUsers({ page: 1, limit: 100 }));
  }, [dispatch]);

  useEffect(() => {
    if (boards.length > 0) return;
    const filters = selectedUserId ? { admin_user_id: selectedUserId } : {};
    dispatch(fetchCategoryBoards(filters));
  }, [dispatch, selectedUserId]);

  useEffect(() => {
    if (!isSuperAdmin && session?.user?.id) {
      setSelectedUserId(session.user.id);
    }
  }, [session, isSuperAdmin]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCategorySelect = useCallback(
    (option) => {
      dispatch(toggleCategoryPin({ category_id: option.value }));
    },
    [dispatch],
  );

  const handleRefresh = useCallback(() => {
    const filters = selectedUserId ? { admin_user_id: selectedUserId } : {};
    dispatch(fetchCategoryBoards(filters));
  }, [dispatch, selectedUserId]);

  const handleUserSelect = useCallback((option) => {
    setSelectedUserId(option.value || null);
  }, []);

  // ── Ghost helpers ─────────────────────────────────────────────────────────
  const createGhost = useCallback((sourceEl, x, y) => {
    const rect = sourceEl.getBoundingClientRect();
    const ghost = sourceEl.cloneNode(true);
    ghost.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.92;
      transform: scale(1.03) rotate(1.2deg);
      box-shadow: 0 20px 60px rgba(0,0,0,0.22), 0 8px 20px rgba(0,0,0,0.14);
      transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease;
      border-radius: 12px;
      will-change: transform, top, left;
    `;
    ghost.dataset.offsetX = x - rect.left;
    ghost.dataset.offsetY = y - rect.top;
    document.body.appendChild(ghost);
    dragGhostRef.current = ghost;
  }, []);

  const moveGhost = useCallback((x, y) => {
    const ghost = dragGhostRef.current;
    if (!ghost) return;
    ghost.style.top = `${y - Number(ghost.dataset.offsetY)}px`;
    ghost.style.left = `${x - Number(ghost.dataset.offsetX)}px`;
  }, []);

  const removeGhost = useCallback(() => {
    if (dragGhostRef.current) {
      dragGhostRef.current.remove();
      dragGhostRef.current = null;
    }
  }, []);

  // ── Board under pointer ───────────────────────────────────────────────────
  const getBoardIdAtPoint = useCallback((x, y, excludeId) => {
    // Temporarily hide ghost so elementFromPoint works
    const ghost = dragGhostRef.current;
    if (ghost) ghost.style.display = "none";
    const el = document.elementFromPoint(x, y);
    if (ghost) ghost.style.display = "";

    const card = el?.closest("[data-board-id]");
    const id = card?.dataset.boardId;
    return id && id !== excludeId ? id : null;
  }, []);

  // ── Pointer event handlers ────────────────────────────────────────────────
  const handlePointerDown = useCallback((e, board) => {
    if (e.button !== 0) return; // left click only
    pointerDownRef.current = {
      id: board.id,
      position: board.pin_position,
      startX: e.clientX,
      startY: e.clientY,
      el: e.currentTarget.closest("[data-board-id]"),
    };
  }, []);

  const handlePointerMove = useCallback(
    (e) => {
      const down = pointerDownRef.current;
      if (!down) return;

      const dx = e.clientX - down.startX;
      const dy = e.clientY - down.startY;

      if (!isDraggingRef.current) {
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

        // Threshold crossed — start drag
        isDraggingRef.current = true;
        createGhost(down.el, down.startX, down.startY);
        setDragState({
          draggingId: down.id,
          overId: null,
          originPosition: down.position,
        });
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }

      moveGhost(e.clientX, e.clientY);

      const overId = getBoardIdAtPoint(e.clientX, e.clientY, down.id);
      setDragState((prev) =>
        prev.overId !== overId ? { ...prev, overId } : prev,
      );
    },
    [createGhost, moveGhost, getBoardIdAtPoint],
  );

  const handlePointerUp = useCallback(
    (e) => {
      const down = pointerDownRef.current;
      if (!down) return;

      if (isDraggingRef.current) {
        const overId = getBoardIdAtPoint(e.clientX, e.clientY, down.id);

        if (overId) {
          const targetBoard = boards.find((b) => b.id === overId);
          if (targetBoard && targetBoard.pin_position !== down.position) {
            dispatch(
              repositionCategoryBoard({
                category_id: down.id,
                new_position: targetBoard.pin_position,
              }),
            );
          }
        }

        removeGhost();
        setDragState({ draggingId: null, overId: null, originPosition: null });
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        isDraggingRef.current = false;
      }

      pointerDownRef.current = null;
    },
    [boards, dispatch, removeGhost, getBoardIdAtPoint],
  );

  // Global pointer listeners
  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // ── Render ────────────────────────────────────────────────────────────────
  const { draggingId, overId } = dragState;

  return (
    <div className="dashboard-container">
      <div className="dashboard-box">
        <div className="dashboard-box_group">
          <LayoutDashboard size={28} className="dashboard-icon" />
          <h2>Work Boards</h2>
        </div>

        <div className="dashboard-box_controls">
          <Button
            variant="outline"
            size="md"
            icon={RotateCw}
            onClick={handleRefresh}
            loading={boardsLoading}
          />
          {isSuperAdmin && (
            <FilterDropdown
              label="User"
              placeholder="All Users"
              icon={Users}
              options={users.map((user) => ({
                value: user.id,
                label: user.name,
                subtitle: user.email,
              }))}
              selectedValue={selectedUserId}
              onSelect={handleUserSelect}
              enableLocalSearch={true}
              isLoading={usersLoading}
            />
          )}

          <FilterDropdown
            label="Category"
            placeholder="Category Boards"
            icon={Tag}
            options={categories.map((cat) => ({
              value: cat.id,
              label: cat.name,
              icon: cat.is_pinned ? <Pin size={14} /> : <PinOff size={14} />,
            }))}
            selectedValue={null}
            onSelect={handleCategorySelect}
            enableLocalSearch={true}
            isLoading={categoriesLoading}
          />
        </div>
      </div>

      <div className="dashboard-boards">
        {boardsLoading ? (
          <div className="dashboard-boards__row">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="board-skeleton">
                <div className="board-skeleton__title" />
                <div className="board-skeleton__sub" />
                <div className="board-skeleton__bar" />
                <div className="board-skeleton__stats">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="board-skeleton__stat" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="dashboard-boards__row">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="board-empty-slot">
                <Pin size={18} className="board-empty-slot__icon" />
                {i === 0 && <p>Pin a category board to see it here</p>}
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`dashboard-boards__row${draggingId ? " is-dragging" : ""}`}
          >
            {boards.map((board) => {
              const isDragging = board.id === draggingId;
              const isOver = board.id === overId;

              return (
                <div
                  key={board.id}
                  data-board-id={board.id}
                  className={[
                    "board-drag-wrapper",
                    isDragging ? "is-source" : "",
                    isOver ? "is-over" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onPointerDown={(e) => handlePointerDown(e, board)}
                >
                  <BoardCard
                    board={board}
                    onClick={() => {
                      if (isDraggingRef.current) return;
                      const params = new URLSearchParams({
                        task_category_id: board.id,
                        ...(selectedUserId && { assigned_to: selectedUserId }),
                      });
                      window.open(
                        `/dashboard/task-managment?${params.toString()}`,
                        "_blank",
                      );
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
