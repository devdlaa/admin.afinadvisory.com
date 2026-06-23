"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarClock, Bell } from "lucide-react";
import CircularProgress from "@mui/material/CircularProgress";
import styles from "./reminderPage.module.scss";
import ReminderCard from "./components/ReminderCard/ReminderCard";
import ReminderCardSkeleton from "./components/ReminderCardSkeleton/ReminderCardSkeleton";
import ReminderHeader from "./components/ReminderHeader";

import { useDispatch, useSelector } from "react-redux";

import {
  fetchReminderTags,
  fetchReminderLists,
  selectAllTags,
  selectAllListsFlat,
} from "@/store/slices/reminderMetaSlice";

import {
  fetchMyDay,
  selectMyDayBuckets,
  selectMyDayLoading,
  openReminderDialog,
} from "@/store/slices/remindersSlice";

import {
  REMINDER_TABS,
  parseArrayParam,
  buildQueryString,
} from "./components/reminderUtils";

const initPagination = () => ({
  overdue: { page: 1, limit: 5, loadingMore: false, hasMore: false },
  today: { page: 1, limit: 5, loadingMore: false, hasMore: false },
  all: { page: 1, limit: 5, loadingMore: false, hasMore: false },
});

const ReminderPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const searchParams = useSearchParams();

  // ── Meta (tags + buckets for filter dropdowns) ──────────────────────────
  const rawTags = useSelector(selectAllTags);
  const rawBuckets = useSelector(selectAllListsFlat);
  const myDayBuckets = useSelector(selectMyDayBuckets);
  const myDayLoading = useSelector(selectMyDayLoading);

  const tagOptions = rawTags.map((t) => ({ id: t.id, label: t.name }));
  const bucketOptions = rawBuckets.map((l) => ({ id: l.id, label: l.name }));

  // ── Meta-loaded gate — wait before reading URL filters ──────────────────
  const [metaLoaded, setMetaLoaded] = useState(false);

  // ── Load-more pagination per bucket ─────────────────────────────────────
  const [pagination, setPagination] = useState(initPagination);

  // ── Tabs / filters / URL ─────────────────────────────────────────────────
  const initialTab =
    REMINDER_TABS.find((t) => t.id === searchParams.get("tab"))?.id ||
    "overdue";
  const [activeTab, setActiveTab] = useState(initialTab);

  // These start empty — populated after meta is loaded & URL is validated
  const [selectedBuckets, setSelectedBuckets] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  // ── Sticky header ────────────────────────────────────────────────────────
  const [isStuck, setIsStuck] = useState(false);
  const headerRef = useRef(null);
  const sentinelRef = useRef(null);
  const isBucketMode = !!selectedBuckets.length;

  // ════════════════════════════════════════════════════════════════════════
  //  1. Load meta on mount
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    Promise.all([
      dispatch(fetchReminderTags()),
      dispatch(fetchReminderLists({ all: true })),
    ]).then(() => setMetaLoaded(true));
  }, [dispatch]);

  // ════════════════════════════════════════════════════════════════════════
  //  2. Validate URL params against loaded meta, then set filters
  // ════════════════════════════════════════════════════════════════════════
  // Effect 2
  useEffect(() => {
    if (!metaLoaded) return;

    const urlTab =
      REMINDER_TABS.find((t) => t.id === searchParams.get("tab"))?.id ||
      "overdue";
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }

    const urlBuckets = parseArrayParam(searchParams.get("buckets"));
    const urlTags = parseArrayParam(searchParams.get("tags"));

    const validBuckets = urlBuckets.filter((id) =>
      rawBuckets.some((b) => b.id === id),
    );
    const validTags = urlTags.filter((id) => rawTags.some((t) => t.id === id));

    setSelectedBuckets((prev) =>
      JSON.stringify(prev) === JSON.stringify(validBuckets)
        ? prev
        : validBuckets,
    );
    setSelectedTags((prev) =>
      JSON.stringify(prev) === JSON.stringify(validTags) ? prev : validTags,
    );
  }, [metaLoaded, searchParams]);

  // ════════════════════════════════════════════════════════════════════════
  //  3. Fetch reminders whenever filters change (after meta is ready)
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!metaLoaded) return;

    setPagination((p) => ({
      ...p,
      [activeTab]: { ...p[activeTab], page: 1 },
    }));

    const isAll = activeTab === "all";

    dispatch(
      fetchMyDay({
        tab: isAll ? "today" : activeTab,
        bucket_id: selectedBuckets[0],
        tag_ids: selectedTags,
        page: 1,
        limit: pagination[activeTab].limit,
        ignore_date_filter: isAll && isBucketMode,
      }),
    );
  }, [metaLoaded, selectedBuckets, selectedTags, activeTab]);

  // ════════════════════════════════════════════════════════════════════════
  //  4. Sync has_more from redux buckets on initial load
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!myDayBuckets.length) return;

    setPagination((prev) => {
      const next = { ...prev };

      myDayBuckets.forEach((b) => {
        if (next[b.key]) {
          next[b.key].hasMore = b.has_more;
        }
      });

      return next;
    });
  }, [myDayBuckets]);

  // ════════════════════════════════════════════════════════════════════════
  //  5. Sync URL whenever tab / filters change
  // ════════════════════════════════════════════════════════════════════════
  const syncUrl = useCallback(
    (tab, buckets, tags) => {
      const qs = buildQueryString(tab, buckets, tags);
      router.replace(`${pathname}?${qs}`, { scroll: false });
    },
    [router, pathname],
  );

  useEffect(() => {
    syncUrl(activeTab, selectedBuckets, selectedTags);
  }, [activeTab, selectedBuckets, selectedTags, syncUrl]);

  // ════════════════════════════════════════════════════════════════════════
  //  6. Sticky sentinel
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  //  8. Load more
  // ════════════════════════════════════════════════════════════════════════

  const handleLoadMore = async (tabKey) => {
    const current = pagination[tabKey];
    if (current.loadingMore || !current.hasMore) return;

    const nextPage = current.page + 1;

    setPagination((p) => ({
      ...p,
      [tabKey]: { ...p[tabKey], loadingMore: true },
    }));

    try {
      const isAll = tabKey === "all";
      await dispatch(
        fetchMyDay({
          tab: isAll ? "today" : tabKey,
          bucket_id: selectedBuckets[0],
          tag_ids: selectedTags,
          page: nextPage,
          limit: current.limit,
          ignore_date_filter: isAll && isBucketMode,
        }),
      ).unwrap();

      setPagination((p) => ({
        ...p,
        [tabKey]: {
          ...p[tabKey],
          page: nextPage,
          loadingMore: false,
        },
      }));
    } catch {
      setPagination((p) => ({
        ...p,
        [tabKey]: { ...p[tabKey], loadingMore: false },
      }));
    }
  };

  function handleReminderClick(reminderID) {
    dispatch(openReminderDialog(reminderID));
  }

  // ════════════════════════════════════════════════════════════════════════
  //  9. Derive displayed items per bucket
  // ════════════════════════════════════════════════════════════════════════

  const bucketMap = Object.fromEntries(myDayBuckets.map((b) => [b.key, b]));

  function getItems(key) {
    return bucketMap[key]?.items ?? [];
  }

  // ════════════════════════════════════════════════════════════════════════
  //  10. Render helpers
  // ════════════════════════════════════════════════════════════════════════

  function renderCardList(bucketKey, emptyIcon, emptyTitle, emptySub) {
    const isLoading = myDayLoading && !bucketMap[bucketKey]?.items?.length;
    const items = getItems(bucketKey);
    const { loadingMore, hasMore } = pagination[bucketKey];

    if (isLoading) {
      return (
        <div className={styles.cardList}>
          {[...Array(3)].map((_, i) => (
            <ReminderCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (!items.length) {
      return (
        <div className={styles.emptyState}>
          {emptyIcon}
          <p>{emptyTitle}</p>
          <span>{emptySub}</span>
        </div>
      );
    }

    return (
      <div className={styles.cardList}>
        {items.map((reminder) => (
          <ReminderCard
            key={reminder.id}
            reminder={reminder}
            handleReminderClick={() => handleReminderClick(reminder.id)}
          />
        ))}

        {hasMore && (
          <div className={styles.loadMoreRow}>
            <button
              className={styles.loadMoreBtn}
              onClick={() => handleLoadMore(bucketKey)}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <CircularProgress size={16} thickness={5} />
                  <span>Loading…</span>
                </>
              ) : (
                "Load more"
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════════

  return (
    <div className={styles.container}>
      <ReminderHeader
        sentinelRef={sentinelRef}
        headerRef={headerRef}
        isStuck={isStuck}
        bucketOptions={bucketOptions}
        tagOptions={tagOptions}
        selectedBuckets={selectedBuckets}
        selectedTags={selectedTags}
        onBucketChange={setSelectedBuckets}
        onTagChange={setSelectedTags}
      />

      <div className={styles.tabs}>
        {REMINDER_TABS.map((tab) => {
          const isAllTab = tab.id === "all";
          const disabled = isAllTab && !isBucketMode;

          return (
            <button
              key={tab.id}
              disabled={disabled}
              className={`${styles.tab} ${
                activeTab === tab.id ? styles.activeTab : ""
              } ${disabled ? styles.disabledTab : ""}`}
              onClick={() => !disabled && setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "overdue" &&
        renderCardList(
          "overdue",
          <CalendarClock />,
          "No overdue reminders",
          "You're all caught up!",
        )}

      {activeTab === "today" &&
        renderCardList(
          "today",
          <Bell />,
          "No reminders for today",
          "Enjoy your free day!",
        )}
      {activeTab === "all" &&
        renderCardList(
          "all",
          <Bell />,
          "No reminders",
          "No items in this bucket",
        )}
    </div>
  );
};

export default ReminderPage;
