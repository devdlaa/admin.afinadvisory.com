import React, { useState, useRef, useEffect } from "react";
import {
  Download,
  Play,
  FileText,
  Music,
  ChevronDown,
  Check,
  CheckCheck,
  Info,
  CornerUpLeft,
  Smile,
  Forward,
  Pin,
  Star,
  Trash2,
} from "lucide-react";
import styles from "./ChatMessage.module.scss";

const ChatMessage = ({
  message,
  isSender = true,
  isGrouped = false,
  showAvatar = true,
  onMediaClick,
  onDownload,
  onAction,
  isGroupChat = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const {
    type = "text",
    content,
    media,
    timestamp,
    status = "sent",
    fileInfo,
    linkPreview,
    forwardedFrom,
  } = message;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const needsReadMore = content && content.length > 300;
  const displayContent =
    needsReadMore && !isExpanded ? content.substring(0, 300) + "..." : content;

  // Build menu items dynamically based on message content
  const menuItems = [
    { id: "info", icon: Info, label: "Message info" },
    { id: "reply", icon: CornerUpLeft, label: "Reply" },
    { id: "react", icon: Smile, label: "React" },
    ...(media ? [{ id: "download", icon: Download, label: "Download" }] : []),
    { id: "forward", icon: Forward, label: "Forward" },
    { id: "pin", icon: Pin, label: "Pin" },
    { id: "star", icon: Star, label: "Star" },
    { id: "delete", icon: Trash2, label: "Delete", danger: true },
  ];

  const handleAction = (id) => {
    setMenuOpen(false);
    if (id === "download") onDownload?.(media?.url);
    onAction?.(id, message);
  };

  // ── file config ──────────────────────────────────────────────────────────
  const getFileConfig = () => {
    if (!fileInfo) return null;
    const map = {
      pdf: { icon: FileText, color: "#EF4444" },
      doc: { icon: FileText, color: "#2563EB" },
      xls: { icon: FileText, color: "#16A34A" },
      mp3: { icon: Music, color: "#8B5CF6" },
      default: { icon: FileText, color: "#6B7280" },
    };
    const ext = fileInfo.fileName.split(".").pop().toLowerCase();
    return map[ext] || map.default;
  };
  const fileConfig = getFileConfig();

  // ── status icon ──────────────────────────────────────────────────────────
  const renderStatus = () => {
    if (!isSender) return null;
    switch (status) {
      case "sending":
        return (
          <span className={styles.statusIcon} data-status="sending">
            ⏱
          </span>
        );
      case "sent":
        return <Check className={styles.statusIcon} size={16} />;
      case "delivered":
        return <CheckCheck className={styles.statusIcon} size={16} />;
      case "read":
        return (
          <CheckCheck
            className={styles.statusIcon}
            size={16}
            data-read="true"
          />
        );
      case "failed":
        return (
          <span className={styles.statusIcon} data-status="failed">
            !
          </span>
        );
      default:
        return null;
    }
  };

  // ── media ────────────────────────────────────────────────────────────────
  const renderMedia = () => {
    if (!media) return null;
    switch (type) {
      case "image":
        return (
          <div
            className={styles.mediaContainer}
            onClick={() => onMediaClick?.(media)}
          >
            <img
              src={media.url}
              alt={media.alt || "Image"}
              className={styles.mediaImage}
            />
            {media.showDownload && (
              <button
                className={styles.mediaOverlayButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload?.(media.url, media.fileName);
                }}
              >
                <Download size={20} />
              </button>
            )}
          </div>
        );
      case "video":
        return (
          <div
            className={styles.mediaContainer}
            onClick={() => onMediaClick?.(media)}
          >
            {media.thumbnail && (
              <img
                src={media.thumbnail}
                alt="thumb"
                className={styles.mediaImage}
              />
            )}
            <button className={styles.playButton}>
              <Play size={40} fill="white" />
            </button>
            <div className={styles.videoDuration}>{media.duration}</div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── file attachment ───────────────────────────────────────────────────────
  const renderFile = () => {
    if (!fileInfo || !fileConfig) return null;
    const Icon = fileConfig.icon;
    return (
      <div className={styles.fileContainer}>
        <div
          className={styles.fileIcon}
          style={{ backgroundColor: fileConfig.color }}
        >
          <Icon size={24} color="white" />
        </div>
        <div className={styles.fileInfo}>
          <div className={styles.fileName}>{fileInfo.fileName}</div>
          <div className={styles.fileSize}>{fileInfo.fileSize}</div>
        </div>
        <button
          className={styles.fileDownloadBtn}
          onClick={() => onDownload?.(fileInfo.url, fileInfo.fileName)}
        >
          <Download size={20} />
        </button>
      </div>
    );
  };

  // ── link preview ─────────────────────────────────────────────────────────
  const renderLinkPreview = () => {
    if (!linkPreview) return null;
    return (
      <a
        href={linkPreview.url}
        className={styles.linkPreview}
        target="_blank"
        rel="noopener noreferrer"
      >
        {linkPreview.image && (
          <img src={linkPreview.image} alt={linkPreview.title} />
        )}
        <div className={styles.linkPreviewContent}>
          <div className={styles.linkPreviewTitle}>{linkPreview.title}</div>
          <div className={styles.linkPreviewDescription}>
            {linkPreview.description}
          </div>
          <div className={styles.linkPreviewUrl}>{linkPreview.domain}</div>
        </div>
      </a>
    );
  };

  return (
    <div
      className={`${styles.messageWrapper} ${isSender ? styles.sender : styles.receiver}`}
      data-grouped={isGrouped}
    >
      {!isSender && showAvatar && !isGrouped && isGroupChat && (
        <div className={styles.avatar}>
          <div className={styles.avatarCircle}>U</div>
        </div>
      )}

      <div className={styles.messageBubble}>
        {forwardedFrom && (
          <div className={styles.forwardedLabel}>
            <span>↪</span> Forwarded
          </div>
        )}

        {renderMedia()}
        {renderFile()}
        {renderLinkPreview()}

        {content && (
          <div className={styles.messageContent}>
            <div className={styles.messageText}>
              {displayContent}{" "}
              {needsReadMore && (
                <button
                  className={styles.readMoreBtn}
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? "Read less" : "Read more"}
                </button>
              )}
            </div>
          </div>
        )}

        <div className={styles.messageFooter}>
          <span className={styles.timestamp}>{timestamp}</span>
          {renderStatus()}
        </div>

        {/* ── Self-contained action menu ──────────────────────────────── */}
        <div className={styles.messageActions} ref={menuRef}>
          <button
            className={styles.menuTrigger}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            aria-label="Message options"
          >
            <ChevronDown size={18} />
          </button>

          {menuOpen && (
            <ul
              className={`${styles.menu} ${isSender ? styles.menuAlignRight : styles.menuAlignLeft}`}
              role="menu"
            >
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <React.Fragment key={item.id}>
                    {item.id === "delete" && (
                      <li className={styles.menuDivider} role="separator" />
                    )}
                    <li role="none">
                      <button
                        role="menuitem"
                        className={`${styles.menuItem} ${item.danger ? styles.menuItemDanger : ""}`}
                        onClick={() => handleAction(item.id)}
                      >
                        <Icon size={17} />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  </React.Fragment>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {isSender && showAvatar && !isGrouped && isGroupChat && (
        <div className={styles.avatar}>
          <div className={styles.avatarCircle}>M</div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
