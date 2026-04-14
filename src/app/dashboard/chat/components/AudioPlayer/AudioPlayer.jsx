import React, { useState, useRef, useEffect, useCallback } from "react";

const AudioPlayer = ({
  src, // real audio URL (optional)
  duration: durationProp, // fallback duration string like "2:39" or number in seconds
  isSender = false, // for WhatsApp-like styling (sender vs receiver)
}) => {
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);

  // ── Helpers ────────────────────────────────────────────────
  const parseDuration = (val) => {
    if (typeof val === "number") return val;
    if (!val || typeof val !== "string") return 0;
    const [m, s] = val.split(":").map(Number);
    return (m || 0) * 60 + (s || 0);
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Real duration from audio ───────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
        setReady(true);
      }
    };

    const handleEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("canplay", handleLoaded);
    audio.addEventListener("ended", handleEnded);

    // Fallback when no real src
    if (!src) {
      const fallbackSec = parseDuration(durationProp) || 180;
      setDuration(fallbackSec);
      setReady(true);
    }

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("canplay", handleLoaded);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [src, durationProp]);

  // ── Live time update ───────────────────────────────────────
  useEffect(() => {
    let rafId;

    const update = () => {
      if (audioRef.current && !dragging) {
        setCurrentTime(audioRef.current.currentTime);
      }
      if (playing) rafId = requestAnimationFrame(update);
    };

    if (playing) {
      rafId = requestAnimationFrame(update);
    }

    return () => cancelAnimationFrame(rafId);
  }, [playing, dragging]);

  // ── Play / Pause ───────────────────────────────────────────
  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
      } catch (err) {
        // Autoplay blocked or no src → fallback simulation
        if (!src) {
          setPlaying(true);
        }
      }
    }
  };

  // ── Seek logic ─────────────────────────────────────────────
  const seekTo = useCallback(
    (clientX) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newTime = pos * duration;

      setCurrentTime(newTime);

      if (audioRef.current && ready) {
        audioRef.current.currentTime = newTime;
      }
    },
    [duration, ready],
  );

  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    seekTo(e.clientX);

    const onMove = (ev) => seekTo(ev.clientX);
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    setDragging(true);
    seekTo(e.touches[0].clientX);

    const onMove = (ev) => seekTo(ev.touches[0].clientX);
    const onEnd = () => {
      setDragging(false);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  };

  // ── Speed control ──────────────────────────────────────────
  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  // ── Computed values ────────────────────────────────────────
  const progress = duration > 0 ? currentTime / duration : 0;
  const bgColor = isSender ? "#d9fdd3" : "#ffffff";
  const playedColor = "#25d366";
  const thumbColor = "#25d366";
  const timeColor = "#667781";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px",
        background: bgColor,
        borderRadius: 10,
        minWidth: 260,
        maxWidth: 360,
        userSelect: "none",
        boxSizing: "border-box",
      }}
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: "#25d366",
          border: "none",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          transition: "transform 0.12s",
        }}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <svg width="14" height="16" viewBox="0 0 14 16" fill="white">
            <rect x="1" y="0" width="4" height="16" rx="2" />
            <rect x="9" y="0" width="4" height="16" rx="2" />
          </svg>
        ) : (
          <svg width="14" height="16" viewBox="0 0 14 16" fill="white">
            <path d="M3 1.5L12 8L3 14.5V1.5Z" />
          </svg>
        )}
      </button>

      {/* Progress + time */}
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}
      >
        {/* Progress bar container */}
        <div
          ref={progressRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{
            height: 6,
            background: isSender ? "#8bbf9a" : "#d1d7db",
            borderRadius: 3,
            position: "relative",
            cursor: "pointer",
            overflow: "hidden",
          }}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          aria-label="Seek audio"
        >
          {/* Played portion */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${progress * 100}%`,
              background: playedColor,
              borderRadius: 3,
              transition: dragging ? "none" : "width 0.08s ease-out",
            }}
          />

          {/* Thumb */}
          <div
            style={{
              position: "absolute",
              left: `calc(${progress * 100}% - 8px)`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 16,
              height: 16,
              background: thumbColor,
              borderRadius: "50%",
              boxShadow: "0 1px 5px rgba(0,0,0,0.25)",
              pointerEvents: "none",
              transition: dragging ? "none" : "left 0.08s ease-out",
              zIndex: 2,
            }}
          />
        </div>

        {/* Time labels */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: timeColor,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Speed button */}
      <button
        onClick={cycleSpeed}
        style={{
          minWidth: 42,
          height: 28,
          padding: "0 8px",
          borderRadius: 14,
          background: isSender ? "#b2dfb0" : "#e9edef",
          border: "none",
          color: "#3b4a54",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
        }}
        aria-label="Change playback speed"
      >
        {speed}x
      </button>
    </div>
  );
};

export default AudioPlayer;
