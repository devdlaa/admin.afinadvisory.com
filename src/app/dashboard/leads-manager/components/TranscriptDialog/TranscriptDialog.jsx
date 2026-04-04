import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import CircularProgress from "@mui/material/CircularProgress";
import {
  X,
  FileText,
  Clock,
  AlertCircle,
  RefreshCw,
  Mic,
  User,
} from "lucide-react";

import styles from "./TranscriptDialog.module.scss";
import { fetchMeetingTranscript } from "@/store/slices/leadDetails.slice";

function parseTranscript(raw) {
  try {
    const blocks = raw.trim().split(/\n{2,}/);
    const parsed = blocks
      .map((block) => {
        const lines = block.split("\n").filter(Boolean);
        if (lines.length < 2) return null;
        const header = lines[0];
        // Try to extract time like 00:00:04
        const timeMatch = header.match(/(\d{2}:\d{2}:\d{2})/);
        const time = timeMatch ? timeMatch[1] : "";
        const speaker = header.replace(time, "").trim();
        const text = lines.slice(1).join(" ").trim();
        return { speaker, time, text };
      })
      .filter(Boolean);

    return parsed.length > 0 && parsed;
  } catch {
    return null;
  }
}

// Map speaker names to consistent avatar colours
const SPEAKER_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];
const speakerColorMap = {};
let colorIndex = 0;
function getSpeakerColor(speaker) {
  if (!speakerColorMap[speaker]) {
    speakerColorMap[speaker] =
      SPEAKER_COLORS[colorIndex % SPEAKER_COLORS.length];
    colorIndex++;
  }
  return speakerColorMap[speaker];
}

function SpeakerAvatar({ name }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const color = getSpeakerColor(name);
  return (
    <div
      className={styles.avatar}
      style={{ background: color }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export default function TranscriptDialog({ open, onClose, activityId }) {
  const dispatch = useDispatch();
  const overlayRef = useRef(null);

  const transcript = useSelector(
    (s) => s.leadDetails.activityDetails.transcript,
  );
  const loading = useSelector((s) => s.leadDetails.loading.transcript);
  const error = useSelector((s) => s.leadDetails.error.transcript);

  // ── Fetch once on open ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !activityId) return;
    dispatch(fetchMeetingTranscript({ activityId }));
  }, [open, activityId, dispatch]);

  // ── Escape key ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  // ── Derive state ───────────────────────────────────────────────────────────
  const notReady = transcript && transcript.ready === false;
  const hasText =
    transcript &&
    typeof transcript === "string" &&
    transcript.trim().length > 0;

  const rawText = typeof transcript === "string" ? transcript : null;
  const lines = hasText && parseTranscript(rawText);

  const handleRetry = () => dispatch(fetchMeetingTranscript({ activityId }));

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="presentation"
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="td-title"
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <Mic size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h2 id="td-title" className={styles.title}>
                Meeting Transcript
              </h2>
              <p className={styles.subtitle}>
                Auto-generated from recorded session
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close transcript"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className={styles.body}>
          {/* LOADING */}
          {loading && (
            <div className={styles.stateBox}>
              <CircularProgress
                size={36}
                thickness={4}
                sx={{ color: "#3b82f6" }}
              />
              <p className={styles.stateTitle}>Fetching Transcript</p>
              <p className={styles.stateDesc}>
                Pulling the recording from the meeting provider…
              </p>
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className={styles.stateBox}>
              <div className={styles.stateIconWrap} data-variant="error">
                <AlertCircle size={28} />
              </div>
              <p className={styles.stateTitle}>Something went wrong</p>
              <p className={styles.stateDesc}>{error}</p>
              <button
                type="button"
                className={styles.retryBtn}
                onClick={handleRetry}
              >
                <RefreshCw size={15} />
                Try Again
              </button>
            </div>
          )}

          {/* NOT READY */}
          {!loading && !error && notReady && (
            <div className={styles.stateBox}>
              <div className={styles.stateIconWrap} data-variant="waiting">
                <Clock size={28} />
              </div>
              <p className={styles.stateTitle}>Transcript Not Ready Yet</p>
              <p className={styles.stateDesc}>
                The recording is still being processed by the meeting provider.
                Check back in a few minutes.
              </p>
              <button
                type="button"
                className={styles.retryBtn}
                onClick={handleRetry}
              >
                <RefreshCw size={15} />
                Check Again
              </button>
            </div>
          )}

          {/* TRANSCRIPT — real or demo ─────────────────────────────────────── */}
          {!loading && !error && !notReady && (
            <>
              <div className={styles.transcript}>
                {lines.map((line, i) => (
                  <div key={i} className={styles.line}>
                    <SpeakerAvatar name={line.speaker} />
                    <div className={styles.lineContent}>
                      <div className={styles.lineMeta}>
                        <span className={styles.speaker}>{line.speaker}</span>
                        {line.time && (
                          <span className={styles.time}>{line.time}</span>
                        )}
                      </div>
                      <p className={styles.lineText}>{line.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        {!loading && !error && !notReady && (
          <div className={styles.footer}>
            <span className={styles.footerNote}>
              <FileText size={13} />
              {lines.length} exchange{lines.length !== 1 ? "s" : ""} ·
              Auto-generated transcript
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
