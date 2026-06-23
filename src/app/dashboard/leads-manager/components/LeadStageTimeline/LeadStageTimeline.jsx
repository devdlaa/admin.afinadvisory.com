"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStageHistory } from "@/store/slices/leadTimelineSlice";
import {
  Loader2,
  AlertCircle,
  GitBranch,
  ChevronDown,
  ArrowRight,
  Trophy,
  TrendingDown,
} from "lucide-react";
import styles from "./LeadStageTimeline.module.scss";

// ─── helpers ────────────────────────────────────────────────────────────────

import { formatTime } from "@/utils/client/cutils";

// Returns { label, type } where type drives both chip and card/icon classes
const getStageVariant = (stage) => {
  if (!stage) return { label: "—", type: "neutral" };
  if (stage.is_won) return { label: stage.name, type: "won" };
  if (stage.is_closed) return { label: stage.name, type: "closed" };
  return { label: stage.name, type: "default" };
};

// ─── StageChip ───────────────────────────────────────────────────────────────

const StageChip = ({ stage, dim = false }) => {
  const { label, type } = getStageVariant(stage);
  return (
    <span
      className={[
        styles.chip,
        styles[`chip_${type}`],
        dim ? styles.chipDim : "",
      ].join(" ")}
    >
      {label}
    </span>
  );
};

// ─── StageCard ───────────────────────────────────────────────────────────────

const StageCard = ({ item, isLast }) => {
  const isCreation = !item.from_stage;
  const toVariant = getStageVariant(item.to_stage);

  // icon circle and card left-border both key off the destination stage
  const iconWrapClass = [
    styles.iconWrap,
    toVariant.type === "won" ? styles.iconWrap_won : "",
    toVariant.type === "closed" ? styles.iconWrap_closed : "",
  ].join(" ");

  const cardClass = [
    styles.card,
    toVariant.type === "won" ? styles.card_won : "",
    toVariant.type === "closed" ? styles.card_closed : "",
  ].join(" ");

  const Icon =
    toVariant.type === "won"
      ? Trophy
      : toVariant.type === "closed"
        ? TrendingDown
        : GitBranch;

  const iconColor =
    toVariant.type === "won"
      ? "#16a34a"
      : toVariant.type === "closed"
        ? "#dc2626"
        : "#9ca3af";

  return (
    <div className={styles.row}>
      <div className={styles.rowLeft}>
        <div className={styles.iconWrap}>
          <Icon size={20} color={iconColor} />
        </div>
        {!isLast && <div className={styles.line} />}
      </div>

      <div className={cardClass}>
        <div className={styles.cardTop}>
          <span className={styles.author}>
            {item.changed_by?.name ?? "System"}
          </span>
          <span className={styles.time}>{formatTime(item.changed_at)}</span>
        </div>

        <div className={styles.stageRow}>
          {isCreation ? (
            <>
              <span className={styles.creationLabel}>Lead created in</span>
              <StageChip stage={item.to_stage} />
            </>
          ) : (
            <>
              <StageChip stage={item.from_stage} dim />
              <ArrowRight size={12} className={styles.arrow} />
              <StageChip stage={item.to_stage} />
            </>
          )}
        </div>

        {item.note && <p className={styles.note}>{item.note}</p>}
      </div>
    </div>
  );
};

// ─── LeadStageTimeline ────────────────────────────────────────────────────────

const LeadStageTimeline = ({ leadId }) => {
  const dispatch = useDispatch();

  const stageHistory = useSelector(
    (state) => state.leadTimeline?.stageHistory ?? [],
  );
  const pagination = useSelector(
    (state) =>
      state.leadTimeline?.pagination?.STAGE_HISTORY ?? {
        hasMore: false,
        nextCursor: null,
      },
  );
  const isLoadingInitial = useSelector(
    (state) => state.leadTimeline?.loading?.STAGE_HISTORY?.initial ?? false,
  );
  const isLoadingMore = useSelector(
    (state) => state.leadTimeline?.loading?.STAGE_HISTORY?.more ?? false,
  );
  const error = useSelector(
    (state) => state.leadTimeline?.error?.STAGE_HISTORY ?? null,
  );

  // slice stores oldest→newest; display newest first
  const display = [...stageHistory].reverse();

  useEffect(() => {
    if (leadId) {
      dispatch(fetchStageHistory({ leadId, limit: 10 }));
    }
  }, [leadId, dispatch]);

  const handleLoadMore = () => {
    if (!pagination.hasMore || isLoadingMore || !pagination.nextCursor) return;
    dispatch(
      fetchStageHistory({ leadId, cursor: pagination.nextCursor, limit: 10 }),
    );
  };

  if (isLoadingInitial) {
    return (
      <div className={styles.center}>
        <Loader2 size={20} className={styles.spin} />
        <span>Loading stage history…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorWrap}>
        <AlertCircle size={16} />
        <span>{error}</span>
        <button
          onClick={() => dispatch(fetchStageHistory({ leadId, limit: 10 }))}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {display.length === 0 ? (
        <div className={styles.empty}>
          <GitBranch size={28} />
          <p>No stage history yet</p>
          <span>Stage transitions will appear here</span>
        </div>
      ) : (
        <>
          <div className={styles.timeline}>
            {display.map((item, idx) => (
              <StageCard
                key={item.id}
                item={item}
                isLast={idx === display.length - 1}
              />
            ))}
          </div>

          {pagination.hasMore && (
            <div className={styles.loadMoreWrap}>
              <button
                className={styles.loadMoreBtn}
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 size={13} className={styles.spin} /> Loading…
                  </>
                ) : (
                  <>
                    <ChevronDown size={13} /> Load older history
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LeadStageTimeline;
