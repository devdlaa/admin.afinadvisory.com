"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CalendarDays, Plus, Bell } from "lucide-react";
import styles from "./ReminderWeekBoard.module.scss";

import {
  selectBoardItems,
  selectBoardLoading,
  selectBoardHasMore,
  selectBoardCursor,
  selectBoardInitialLoaded,
  selectBoardSlot,
  openCreateReminder,
  openReminderDialog,
} from "@/store/slices/remindersSlice";

import ReminderCard from "../../../reminders/components/ReminderCard/ReminderCard";

/* ─── Helpers ───────────────────────────────────────────────── */

const BOARD_KEYS_ORDER = [
  "today",
  "tomorrow",
  "day_3",
  "day_4",
  "day_5",
  "day_6",
  "day_7",
];

const BOARD_LABELS = { today: "Today", tomorrow: "Tomorrow" };
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getBoardDate(key) {
  const offset = BOARD_KEYS_ORDER.indexOf(key);
  if (offset === -1) return null;
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

function formatBoardHeader(key) {
  const label = BOARD_LABELS[key];
  const date = getBoardDate(key);
  if (!date) return { title: key, sub: "" };
  const dayName = DAY_NAMES[date.getDay()];
  const dateStr = `${date.getDate()} ${date.toLocaleString("default", { month: "short" })}`;
  return {
    title: label ?? dayName,
    sub: label ? `${dayName}, ${dateStr}` : dateStr,
  };
}

/* ─── Skeleton ──────────────────────────────────────────────── */
function SkeletonCard({ delay = 0 }) {
  return (
    <div
      className={styles.skeletonCard}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

/* ─── Single Day Board ──────────────────────────────────────── */
function DayBoard({ boardKey, scrollRef, onVisible, onLoadMore }) {
  const dispatch = useDispatch();
  const ref = useRef(null);
  const hasTriggeredRef = useRef(false);
  const [bodyHovered, setBodyHovered] = useState(false);

  const items = useSelector(selectBoardItems(boardKey));
  const loading = useSelector(selectBoardLoading(boardKey));
  const hasMore = useSelector(selectBoardHasMore(boardKey));
  const cursor = useSelector(selectBoardCursor(boardKey));
  const initialLoaded = useSelector(selectBoardInitialLoaded(boardKey));
  const slot = useSelector(selectBoardSlot(boardKey));

  const { title, sub } = formatBoardHeader(boardKey);
  const isToday = boardKey === "today";

  /* Visibility — notify parent to batch */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          !hasTriggeredRef.current &&
          !initialLoaded &&
          !slot?.loading
        ) {
          hasTriggeredRef.current = true;
          onVisible(boardKey);
        }
      },
      {
        root: scrollRef?.current ?? null,
        rootMargin: "0px 120px 0px 0px",
        threshold: 0.05,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [boardKey, initialLoaded, slot?.loading, onVisible, scrollRef]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loading || !cursor) return;
    onLoadMore(boardKey, cursor);
  }, [hasMore, loading, cursor, boardKey, onLoadMore]);

  const handleCardClick = useCallback(
    (id) => dispatch(openReminderDialog(id)),
    [dispatch],
  );

  const handleCreate = useCallback(
    () => dispatch(openCreateReminder()),
    [dispatch],
  );

  const showSkeleton = !initialLoaded && loading;
  const showEmpty = initialLoaded && !loading && items.length === 0;

  return (
    <div
      ref={ref}
      className={`${styles.board} ${isToday ? styles.boardToday : ""}`}
    >
      {/* HEADER — data-drag-handle so scroll drag works */}
      <div
        className={`${styles.boardHeader} ${isToday ? styles.boardHeaderToday : ""}`}
        data-drag-handle="true"
      >
        <div className={styles.boardHeaderLeft}>
          <div
            className={`${styles.boardIconCol} ${isToday ? styles.boardIconColToday : ""}`}
          >
            <CalendarDays size={20} />
          </div>
          <div className={styles.boardTextBlock}>
            <span className={styles.boardTitle}>{title}</span>
            {sub && <span className={styles.boardSub}>{sub}</span>}
          </div>
        </div>

        <div className={styles.boardHeaderRight}>
          <span className={styles.boardCount}>
            {initialLoaded ? items.length : "—"}
          </span>
        </div>
      </div>

      {/* BODY */}
      <div
        className={styles.boardBody}
        onMouseEnter={() => setBodyHovered(true)}
        onMouseLeave={() => setBodyHovered(false)}
      >
        {showSkeleton && (
          <div className={styles.skeletonList}>
            <SkeletonCard delay={0} />
            <SkeletonCard delay={0.09} />
            <SkeletonCard delay={0.18} />
          </div>
        )}

        {showEmpty && (
          <div className={styles.emptyState}>
            <Bell size={16} className={styles.emptyIcon} />
            <span className={styles.emptyText}>Nothing here</span>
          </div>
        )}

        {items.length > 0 && (
          <div className={styles.cardList}>
            {items.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                handleReminderClick={() => handleCardClick(reminder.id)}
              />
            ))}

            {initialLoaded && loading && (
              <>
                <SkeletonCard delay={0} />
                <SkeletonCard delay={0.09} />
              </>
            )}

            {hasMore && !loading && (
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

        {/* Slide-up action bar — same as leads */}
        <div
          className={`${styles.actionBar} ${bodyHovered ? styles.actionBarVisible : ""}`}
        >
          <button className={styles.actionBarCreate} onClick={handleCreate}>
            <Plus size={18} />
            <span>New Reminder</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ReminderWeekBoard root ────────────────────────────────── */
export default function ReminderWeekBoard({
  boardKeys,
  onBoardVisible,
  onLoadMore,
}) {
  const scrollRef = useRef(null);

  /* Batch visible keys — fires ONE API call per batch, not one per board */
  const visibleKeysRef = useRef(new Set());
  const batchTimeoutRef = useRef(null);

  const handleBoardVisible = useCallback(
    (key) => {
      visibleKeysRef.current.add(key);

      if (batchTimeoutRef.current) return;

      batchTimeoutRef.current = setTimeout(() => {
        const keys = Array.from(visibleKeysRef.current);
        visibleKeysRef.current.clear();
        batchTimeoutRef.current = null;
        if (keys.length) onBoardVisible(keys);
      }, 80);
    },
    [onBoardVisible],
  );

  /* Drag-to-scroll — identical to leads KanbanBoard */
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
      e.preventDefault();
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      slider.classList.remove(styles.dragging);
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
          {boardKeys.map((key) => (
            <DayBoard
              key={key}
              boardKey={key}
              scrollRef={scrollRef}
              onVisible={handleBoardVisible}
              onLoadMore={onLoadMore}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
