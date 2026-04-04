"use client";

import { useState } from "react";
import {
  Info,
  ChevronDown,
  RefreshCw,
  User,
  Sparkle,
  Users,
} from "lucide-react";
import CircularProgress from "@mui/material/CircularProgress";
import styles from "./LeadPrimaryMeta.module.scss";
import { formatDate, formatDuration } from "@/utils/shared/shared_util";
/* ── Helpers ── */
const SkeletonLine = ({ width = "100%", height = 14, mb = 8 }) => (
  <div
    className={styles.skeletonLine}
    style={{ width, height, marginBottom: mb }}
  />
);

/* ── Component ── */
export default function LeadPrimaryMeta({
  timeline,
  onUpdateStage,
  aiSummary,
  isLoadingAiSummary,
  onRefreshAiSummary,
  teamEffort,
  isLoadingTeamEffort,
  onRefreshTeamEffort,
  lost_by,
}) {
  const [updatingId, setUpdatingId] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);

  /* ── Derived from timeline ── */
  const stages = timeline?.pipeline_stages ?? [];
  const summary = timeline?.summary ?? null;
  const currentStageId = summary?.current_stage?.id ?? null;
  const currentIdx = stages.findIndex((s) => s.stage_id === currentStageId);

  const timeInStage = formatDuration(
    timeline?.summary?.time_in_current_stage_ms,
  );

  /* ── Derived from aiSummary ── */
  const aiText = aiSummary?.ai_summary ?? null;
  const aiGeneratedAt = formatDate(aiSummary?.ai_summary_generated_at);

  /* ── Stage click ── */
  const handleStageClick = async (stage) => {
    if (updatingId || stage.stage_id === currentStageId) return;

    setUpdatingId(stage.stage_id);
    try {
      await onUpdateStage(stage);
    } finally {
      setUpdatingId(null);
    }
  };

  /* ── AI summary header click ── */
  const handleAiHeaderClick = () => {
    if (isLoadingAiSummary) return;

    if (!aiText && !aiOpen) {
      onRefreshAiSummary?.();
      setAiOpen(true);
      return;
    }
    setAiOpen((prev) => !prev);
  };

  const handleAiRefresh = (e) => {
    e.stopPropagation();
    onRefreshAiSummary?.();
  };

  /* ── Team effort header click ── */
  const handleTeamHeaderClick = () => {
    if (isLoadingTeamEffort) return;
    // If no data yet, trigger fetch on first open
    if (!teamEffort && !teamOpen) {
      onRefreshTeamEffort?.();
      setTeamOpen(true);
      return;
    }
    setTeamOpen((prev) => !prev);
  };

  const handleTeamRefresh = (e) => {
    e.stopPropagation();
    onRefreshTeamEffort?.();
  };

  return (
    <div className={styles.wrapper}>
      {/* ── Pipeline Stage Journey ── */}
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.heading}>PIPELINE STAGE JOURNEY</span>
          {timeInStage && (
            <span className={styles.timeInfo}>
              <Info size={15} strokeWidth={1.8} />
              {timeInStage}
            </span>
          )}
        </div>

        <div className={styles.track}>
          {stages.map((stage, idx) => {
            const isFilled = idx <= currentIdx;
            const isCurrent = stage.stage_id === currentStageId;
            const isUpdating = updatingId === stage.stage_id;
            const isLast = idx === stages.length - 1;
            const isWon = stage.stage_id === currentStageId && stage.is_won;

            const isLost =
              stage.stage_id === currentStageId &&
              stage.is_closed &&
              !stage.is_won;
            return (
              <button
                key={stage.stage_id}
                className={[
                  styles.stage,
                  isFilled ? styles.stageFilled : styles.stageGrey,
                  isCurrent ? styles.stageCurrent : "",
                  isWon ? styles.stageWon : "",
                  isLost ? styles.stageLost : "",
                  isLast ? styles.stageLast : "",
                ].join(" ")}
                onClick={() => handleStageClick(stage)}
                disabled={!!updatingId}
                title={stage.name}
              >
                {isUpdating ? (
                  <CircularProgress
                    size={13}
                    thickness={5}
                    className={styles.spinner}
                  />
                ) : (
                  <span className={styles.stageLabel}>{stage.name}</span>
                )}
                {!isLast && (
                  <span
                    className={[
                      styles.arrow,
                      isFilled ? styles.arrowFilled : styles.arrowGrey,
                    ].join(" ")}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      {summary?.lost_reason && (
        <div className={styles.lostBanner}>
          <div className={styles.lostBannerIcon}>
            <Info size={20} strokeWidth={2} />
          </div>

          <div className={styles.lostBannerContent}>
            {lost_by?.name && (
              <p className={styles.lostBannerMeta}>
                Marked lost by <strong>{lost_by.name}</strong>
              </p>
            )}

            <p className={styles.lostBannerText}>{summary.lost_reason}</p>
          </div>
        </div>
      )}

      {/* ── AI Summary ── */}
      <div className={`${styles.summaryCard} ${styles.summaryCardAi}`}>
        <div
          className={styles.summaryHeader}
          onClick={handleAiHeaderClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleAiHeaderClick()}
        >
          <div className={styles.summaryHeaderLeft}>
            <span className={styles.aiIcon}>
              <Sparkle size={24} />
            </span>
            <div>
              {isLoadingAiSummary && !aiText ? (
                <>
                  <SkeletonLine width={180} height={13} mb={4} />
                  <SkeletonLine width={110} height={10} mb={0} />
                </>
              ) : (
                <>
                  <p
                    className={styles.summaryTitle}
                    style={{ color: "#c026d3" }}
                  >
                    AI GENERATED LEAD SUMMARY
                  </p>
                  <p className={styles.summarySubtitle}>
                    {aiGeneratedAt
                      ? `Last updated ${aiGeneratedAt}`
                      : "Not available yet"}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className={styles.summaryAction}>
            {isLoadingAiSummary ? (
              <CircularProgress
                size={16}
                thickness={5}
                className={styles.summarySpinner}
              />
            ) : aiText && aiOpen ? (
              <button
                className={styles.iconBtn}
                onClick={handleAiRefresh}
                title="Refresh"
              >
                <RefreshCw size={16} strokeWidth={2} />
              </button>
            ) : (
              <ChevronDown
                size={18}
                strokeWidth={2}
                className={`${styles.chevron} ${aiOpen ? styles.chevronOpen : ""}`}
              />
            )}
          </div>
        </div>

        {(aiOpen || isLoadingAiSummary) && (
          <div className={styles.summaryBody}>
            {isLoadingAiSummary ? (
              <div className={styles.skeletonBlock}>
                {["100%", "92%", "97%", "85%", "60%"].map((w, i) => (
                  <SkeletonLine
                    key={i}
                    width={w}
                    height={13}
                    mb={i === 4 ? 0 : undefined}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.summaryText}>{aiText}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Team Effort ── */}
      {/* <div className={styles.summaryCard}>
        <div
          className={styles.summaryHeader}
          onClick={handleTeamHeaderClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleTeamHeaderClick()}
        >
          <div className={styles.summaryHeaderLeft}>
            <span className={styles.teamIcon}>
              <Users size={24} strokeWidth={1.8} />
            </span>
            <div>
              {isLoadingTeamEffort && !teamEffort ? (
                <>
                  <SkeletonLine width={200} height={13} mb={4} />
                  <SkeletonLine width={130} height={10} mb={0} />
                </>
              ) : (
                <>
                  <p className={styles.summaryTitle}>
                    TEAM EFFORT & POINTS SUMMARY
                  </p>
                  <p className={styles.summarySubtitle}>
                    {teamEffort?.lastFetchedAt
                      ? `Last fetched ${teamEffort.lastFetchedAt}`
                      : "Click here to fetch it."}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className={styles.summaryAction}>
            {isLoadingTeamEffort ? (
              <CircularProgress
                size={16}
                thickness={5}
                className={styles.summarySpinner}
              />
            ) : teamEffort ? (
              <>
                <div className={styles.totalPointsBadge}>
                  <span className={styles.totalPointsNum}>
                    {teamEffort.totalPoints}
                  </span>
                  <span className={styles.totalPointsLabel}>Total Points</span>
                </div>
                {teamOpen ? (
                  <button
                    className={styles.iconBtn}
                    onClick={handleTeamRefresh}
                    title="Refresh"
                  >
                    <RefreshCw size={16} strokeWidth={2} />
                  </button>
                ) : (
                  <ChevronDown
                    size={18}
                    strokeWidth={2}
                    className={styles.chevron}
                  />
                )}
              </>
            ) : (
              <ChevronDown
                size={18}
                strokeWidth={2}
                className={styles.chevron}
              />
            )}
          </div>
        </div>

        {(teamOpen || isLoadingTeamEffort) && (
          <div className={styles.summaryBody}>
            {isLoadingTeamEffort ? (
              <div className={styles.skeletonBlock}>
                {[1, 2].map((i) => (
                  <div key={i} className={styles.teamSkeletonRow}>
                    <div className={styles.skeletonAvatar} />
                    <div style={{ flex: 1 }}>
                      <SkeletonLine width={120} height={12} mb={6} />
                      <SkeletonLine width="100%" height={8} mb={0} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.teamList}>
                {teamEffort?.members?.map((member, i) => (
                  <div key={i} className={styles.teamMemberRow}>
                    <div className={styles.teamAvatar}>
                      <User size={20} strokeWidth={1.8} />
                    </div>
                    <div className={styles.teamMemberInfo}>
                      <div className={styles.teamMemberTop}>
                        <span className={styles.teamMemberName}>
                          {member.name}
                        </span>
                        <div className={styles.teamMemberStats}>
                          <span className={styles.teamPoints}>
                            <strong>{member.points}</strong>
                            <span className={styles.teamStatLabel}>Points</span>
                          </span>
                          <span className={styles.teamDivider} />
                          <span className={styles.teamEffortPct}>
                            <strong>{member.effortPercent}%</strong>
                            <span className={styles.teamStatLabel}>
                              Efforts
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${member.effortPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div> */}
    </div>
  );
}
