"use client";

import styles from "./ReminderSidebar.module.scss";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Sun, CalendarDays, Hash, Plus, Tag } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchReminderLists,
  selectAllListsFlat,
  selectAllLists,
  selectListsLoading,
} from "@/store/slices/reminderMetaSlice";

import { REMINDER_ICON_COMPONENTS } from "../Reminderlistsdialog/reminderIconMap";
import { REMINDER_LIST_ICONS } from "@/services/reminders/reminder.constants";

import ReminderTagsDialog from "../LeadTagsDialog/LeadTagsDialog";
import ReminderListsDialog from "../Reminderlistsdialog/Reminderlistsdialog";
import { parseArrayParam } from "../reminderUtils";

const PAGE_SIZE = 5;

function SkeletonRow() {
  return (
    <div className={styles.skRow}>
      <div className={styles.skIcon} />
      <div className={styles.skLine} />
    </div>
  );
}

function BucketIcon({ iconKey }) {
  const meta = REMINDER_LIST_ICONS[iconKey] ?? REMINDER_LIST_ICONS.HASH;
  const Comp = REMINDER_ICON_COMPONENTS[iconKey] ?? Hash;
  return (
    <span className={styles.iconBubble} style={{ background: meta.bg }}>
      <Comp size={13} strokeWidth={2} color={meta.stroke} />
    </span>
  );
}

export default function ReminderSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();

  const currentBuckets = parseArrayParam(searchParams.get("buckets"));

  const isMyDay =
    pathname === "/dashboard/reminders" &&
    (!searchParams.get("tab") || searchParams.get("tab") === "today");
  const isNext7Days = pathname === "/dashboard/reminders/7-days";

  const [visibleBuckets, setVisibleBuckets] = useState(PAGE_SIZE);
  const [bucketOpen, setBucketOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);

  const allListsFlat = useSelector(selectAllListsFlat);
  const allLists = useSelector(selectAllLists);
  const listsLoading = useSelector(selectListsLoading);

  const lists = allListsFlat.length > 0 ? allListsFlat : allLists;

  useEffect(() => {
    if (lists.length === 0 && !listsLoading) {
      dispatch(fetchReminderLists({ all: true }));
    }
  }, []);

  const isActiveBucket = useCallback(
    (id) =>
      pathname === "/dashboard/reminders" &&
      searchParams.get("tab") === "all" &&
      currentBuckets.includes(String(id)),
    [pathname, searchParams, currentBuckets],
  );

  const goto = useCallback(
    (bucketId) => {
      if (isActiveBucket(bucketId)) {
        router.push("/dashboard/reminders?tab=today");
      } else {
        router.push(`/dashboard/reminders?tab=all&buckets=${bucketId}`);
      }
    },
    [router, isActiveBucket],
  );

  const bucketSlice = lists.slice(0, visibleBuckets);

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.inner}>
          {/* ── Header ── */}
          <div className={styles.header}>
            <span className={styles.headerTitle}>Your Reminders</span>
          </div>

          {/* ── Primary nav ── */}
          <div className={styles.nav}>
            <button
              className={`${styles.navItem} ${isMyDay ? styles.navActive : ""}`}
              onClick={() => router.push("/dashboard/reminders?tab=today")}
            >
              <Sun size={16} />
              <span>My Day</span>
            </button>
          </div>

          {/* ── Utility actions ── */}
          <div className={styles.utilNav}>
            <button
              className={styles.utilItem}
              onClick={() => setBucketOpen(true)}
            >
              <Plus size={14} strokeWidth={2.2} />
              <span>New Bucket</span>
            </button>
            <button
              className={styles.utilItem}
              onClick={() => setTagsOpen(true)}
            >
              <Tag size={14} strokeWidth={2.2} />
              <span>Manage Tags</span>
            </button>
          </div>

          <div className={styles.divider} />

          {/* ── Bucket section label ── */}
          <p className={styles.sectionLabel}>Buckets</p>

          {/* ── Bucket list ── */}
          <div className={styles.list}>
            {listsLoading && lists.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : lists.length === 0 ? (
              <p className={styles.empty}>No buckets yet</p>
            ) : (
              <>
                {bucketSlice.map((l) => (
                  <button
                    key={l.id}
                    className={`${styles.row} ${isActiveBucket(l.id) ? styles.rowActive : ""}`}
                    onClick={() => goto(l.id)}
                  >
                    <BucketIcon iconKey={l.icon} />
                    <span className={styles.name}>{l.name}</span>
                    {l.reminder_count !== undefined && (
                      <span className={styles.count}>{l.reminder_count}</span>
                    )}
                    {isActiveBucket(l.id) && (
                      <span className={styles.activeIndicator}>✕</span>
                    )}
                  </button>
                ))}
                {lists.length > visibleBuckets && (
                  <button
                    className={styles.loadMore}
                    onClick={() => setVisibleBuckets((v) => v + PAGE_SIZE)}
                  >
                    Load More
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </aside>

      <ReminderListsDialog
        open={bucketOpen}
        onClose={() => setBucketOpen(false)}
        initialMode="list"
        selectedListIds={[]}
        onSelectionChange={() => {}}
      />
      <ReminderTagsDialog open={tagsOpen} onClose={() => setTagsOpen(false)} />
    </>
  );
}
