"use client";
import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchTimeline,
  loadMoreTimeline,
} from "@/store/slices/leadTimelineSlice";

import { buildActivityMessage } from "@/utils/server/activityBulder";

import {
  Loader2,
  AlertCircle,
  Activity,
  ChevronDown,
  ClipboardCheck,
} from "lucide-react";
import styles from "./LeadLogsTimeline.module.scss";
import { formatTime } from "@/utils/client/cutils";

const formatValue = (val) => {
  if (val === null || val === undefined) return "None";
  if (typeof val === "object") {
    if (val.name) return val.name;
    return JSON.stringify(val);
  }
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return new Date(val).toLocaleDateString();
  }
  return String(val);
};

const humanizeKey = (key) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const renderChangeDetails = (changes = []) => {
  if (!Array.isArray(changes) || changes.length === 0) return null;

  return (
    <div className={styles.changeDetails}>
      {changes.map((change, idx) => {
        const from = change.from;
        const to = change.to;

        if (
          (typeof from !== "object" || from === null) &&
          (typeof to !== "object" || to === null)
        ) {
          return (
            <div key={idx} className={styles.changeRow}>
              <span className={styles.changeLabel}>
                {humanizeKey(change.action || "Change")}
              </span>
              <span className={styles.changeFrom}>{formatValue(from)}</span>
              <span className={styles.changeArrow}>→</span>
              <span className={styles.changeTo}>{formatValue(to)}</span>
            </div>
          );
        }

        const fromObj = from || {};
        const toObj = to || {};
        const keys = new Set([...Object.keys(fromObj), ...Object.keys(toObj)]);

        return (
          <div key={idx} className={styles.changeBlock}>
            {[...keys].map((key) => {
              const a = fromObj[key];
              const b = toObj[key];
              if (JSON.stringify(a) === JSON.stringify(b)) return null;
              return (
                <div key={key} className={styles.changeRow}>
                  <span className={styles.changeLabel}>{humanizeKey(key)}</span>
                  <span className={styles.changeFrom}>{formatValue(a)}</span>
                  <span className={styles.changeArrow}>→</span>
                  <span className={styles.changeTo}>{formatValue(b)}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// ─── LogCard ─────────────────────────────────────────────────────────────────

const LogCard = ({ item, isLast }) => {
  const changes = item.activity?.meta?.changes ?? [];
  const message =
    item.message || buildActivityMessage(changes) || "updated the lead";

  return (
    <div className={styles.logRow}>
      <div className={styles.logLeft}>
        <div className={styles.logIconWrap}>
          <ClipboardCheck color="grey" size={20} />
        </div>
        {!isLast && <div className={styles.logLine} />}
      </div>

      <div className={styles.logCard}>
        <div className={styles.logCardHeader}>
          <span className={styles.logAuthor}>{item.user_name}</span>
          <span className={styles.logTime}>{formatTime(item.created_at)}</span>
        </div>

        <div className={styles.logEvent}>
          <Activity size={13} />
          <span>{message}</span>
        </div>

        {changes.length > 0 && renderChangeDetails(changes)}
      </div>
    </div>
  );
};

// ─── LeadLogsTimeline ─────────────────────────────────────────────────────────

const LeadLogsTimeline = ({ leadId }) => {
  const dispatch = useDispatch();

  const activities = useSelector(
    (state) => state.leadTimeline?.activities ?? [],
  );
  const pagination = useSelector(
    (state) =>
      state.leadTimeline?.pagination?.ACTIVITY ?? {
        hasMore: false,
        nextCursor: null,
      },
  );
  const isLoadingInitial = useSelector(
    (state) => state.leadTimeline?.loading?.ACTIVITY?.initial ?? false,
  );
  const isLoadingMore = useSelector(
    (state) => state.leadTimeline?.loading?.ACTIVITY?.more ?? false,
  );
  const error = useSelector(
    (state) => state.leadTimeline?.error?.ACTIVITY ?? null,
  );

  // newest first
  const displayActivities = [...activities].reverse();

  useEffect(() => {
    if (leadId) {
      dispatch(fetchTimeline({ leadId, type: "ACTIVITY", limit: 10 }));
    }
  }, [leadId, dispatch]);

  const handleLoadMore = () => {
    if (!pagination.hasMore || isLoadingMore || !pagination.nextCursor) return;
    dispatch(
      loadMoreTimeline({
        leadId,
        cursor: pagination.nextCursor,
        type: "ACTIVITY",
        limit: 10,
      }),
    );
  };

  if (isLoadingInitial) {
    return (
      <div className={styles.loadingWrap}>
        <Loader2 size={22} className={styles.spinning} />
        <span>Loading logs…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorWrap}>
        <AlertCircle size={18} />
        <span>{error}</span>
        <button
          onClick={() =>
            dispatch(fetchTimeline({ leadId, type: "ACTIVITY", limit: 20 }))
          }
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.timelineWrap}>
        {displayActivities.length === 0 ? (
          <div className={styles.emptyState}>
            <Activity size={32} />
            <p>No logs yet</p>
            <span>Activity will appear here as changes are made</span>
          </div>
        ) : (
          <>
            {displayActivities.map((item, idx) => (
              <LogCard
                key={item.id}
                item={item}
                isLast={idx === displayActivities.length - 1}
              />
            ))}

            {pagination.hasMore && (
              <div className={styles.loadMoreWrap}>
                <button
                  className={styles.loadMoreBtn}
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 size={14} className={styles.spinning} /> Loading…
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} /> Load older logs
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LeadLogsTimeline;
