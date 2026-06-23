"use client";

import React, { useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Bell, CalendarClock, Loader2 } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCards } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-cards";

import styles from "./RemindersOverview.module.scss";

import ReminderDialogPrefilled from "../Reminderdialog/ReminderDialogPrefilled";

import {
  closeOverview,
  setOverviewTab,
  fetchOverviewPage,
  selectOverviewOpen,
  selectOverviewActiveTab,
  selectOverviewTodayState,
  selectOverviewOverdueState,
} from "@/store/slices/remindersOverviewSlice";

const TABS = [
  { id: "today", label: "Today's reminders" },
  { id: "overdue", label: "Overdue" },
];

const PAGE_LIMIT = 5;

/* ─────────────────────────────────────────────
   Single slide — memoized so prefillData ref
   is stable and never causes effect re-runs
───────────────────────────────────────────── */
const ReminderSlide = React.memo(function ReminderSlide({ reminder }) {
  // prefillData built once per reminder id, stable reference
  const prefillData = useMemo(() => reminder, [reminder.id]);

  return (
    <div className={styles.slideInner}>
      <ReminderDialogPrefilled
        mode="update"
        activeReminderId={reminder.id}
        prefillData={prefillData}
      />
    </div>
  );
});

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
const RemindersOverview = () => {
  const dispatch = useDispatch();

  const open = useSelector(selectOverviewOpen);
  const activeTab = useSelector(selectOverviewActiveTab);
  const todayState = useSelector(selectOverviewTodayState);
  const overdueState = useSelector(selectOverviewOverdueState);

  const tabState = activeTab === "today" ? todayState : overdueState;
  const { items, page, hasMore, loading } = tabState;

  /* ── Initial fetch ──────────────────────── */
  useEffect(() => {
    if (!open) return;
    if (page === 0 && !loading) {
      dispatch(
        fetchOverviewPage({ tab: activeTab, page: 1, limit: PAGE_LIMIT }),
      );
    }
  }, [open, activeTab, page, loading, dispatch]);

  // useEffect(() => {
  //   if (!open) return;

  //   if (items.length === 1 && hasMore && !loading) {
  //     dispatch(
  //       fetchOverviewPage({
  //         tab: activeTab,
  //         page: page + 1,
  //         limit: PAGE_LIMIT,
  //       }),
  //     );
  //   }
  // }, [items.length, hasMore, loading, page, activeTab, open, dispatch]);

  /* ── Load next page ─────────────────────── */
  const loadNextPage = useCallback(() => {
    if (loading || !hasMore) return;
    dispatch(
      fetchOverviewPage({ tab: activeTab, page: page + 1, limit: PAGE_LIMIT }),
    );
  }, [dispatch, activeTab, page, loading, hasMore]);

  const handleSlideChange = useCallback(
    (swiper) => {
      if (swiper.activeIndex >= items.length - 2 && hasMore && !loading) {
        loadNextPage();
      }
    },
    [items.length, hasMore, loading, loadNextPage],
  );

  const handleTabChange = (tabId) => {
    if (tabId === activeTab) return;
    dispatch(setOverviewTab(tabId));
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) dispatch(closeOverview());
  };

  const handleClose = useCallback(() => dispatch(closeOverview()), [dispatch]);

  if (!open) return null;

  const renderContent = () => {
    if (loading && items.length === 0) {
      return (
        <div className={styles.centered}>
          <Loader2
            size={30}
            strokeWidth={1.5}
            style={{ animation: "ovSpin 1s linear infinite" }}
          />
          <span>Loading reminders…</span>
        </div>
      );
    }

    if (!loading && items.length === 0) {
      const Icon = activeTab === "today" ? Bell : CalendarClock;
      return (
        <div className={styles.centered}>
          <Icon size={38} strokeWidth={1.2} />
          <span>
            {activeTab === "today"
              ? "No reminders for today"
              : "No overdue reminders"}
          </span>
        </div>
      );
    }

    return (
      <div className={styles.swiperArea}>
        <div className={styles.swiperContainer}>
          <Swiper
            key={activeTab}
            effect="cards"
            grabCursor
            modules={[EffectCards]}
            onSlideChange={handleSlideChange}
          >
            {items.map((reminder) => (
              <SwiperSlide key={reminder.id}>
                <ReminderSlide reminder={reminder} onClose={handleClose} />
              </SwiperSlide>
            ))}
          </Swiper>

          {loading && items.length > 0 && (
            <div className={styles.fetchingMore}>
              <Loader2
                size={11}
                style={{ animation: "ovSpin 1s linear infinite" }}
              />
              Loading more…
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`@keyframes ovSpin { to { transform: rotate(360deg); } }`}</style>

      <div className={styles.overlay} onClick={handleOverlayClick}>
        <div className={styles.modal}>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Close overview"
          >
            <X size={14} />
          </button>

          <p className={styles.heading}>Reminders overview</p>

          <div className={styles.tabs}>
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                className={`${styles.tab} ${activeTab === id ? styles.tabActive : ""}`}
                onClick={() => handleTabChange(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {renderContent()}
        </div>
      </div>
    </>
  );
};

export default RemindersOverview;
