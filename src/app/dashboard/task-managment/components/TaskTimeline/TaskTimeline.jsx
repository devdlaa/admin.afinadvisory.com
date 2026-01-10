"use client";
import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import {
  fetchTimeline,
  loadMoreTimeline,
  createComment,
  updateComment,
  selectTimelineGroupedByDate,
  selectHasMore,
  selectIsLoading,
  selectError,
  clearTimeline,
  formatDateLabel,
  selectItemsByType,
  selectPaginationInfo,
} from "@/store/slices/taskTimelineSlice";

import UserMentionsDropdown from "@/app/components/UserMentionsDropdown/UserMentionsDropdown";
import {
  Send,
  Edit2,
  Loader2,
  ChevronUp,
  AlertCircle,
  MessageSquare,
  Activity,
  X,
  Check,
  RefreshCw,
} from "lucide-react";
import styles from "./TaskTimeline.module.scss";
import {
  buildFallbackMessage,
 
} from "@/utils/shared/shared_util";

const renderChangeDetails = (changes = []) => {
  if (!Array.isArray(changes) || changes.length === 0) return null;

  return (
    <div className={styles.activityDetails}>
      {changes.map((change, index) => {
        let label = "";
        let from = "";
        let to = "";

        switch (change.action) {
          case "STATUS_CHANGED":
            label = "Status";
            from = change.from;
            to = change.to;
            break;

          case "PRIORITY_CHANGED":
            label = "Priority";
            from = change.from;
            to = change.to;
            break;

          case "CATEGORY_CHANGED":
            label = "Category";
            from = change.from?.name ?? "None";
            to = change.to?.name ?? "None";
            break;

          case "ENTITY_ASSIGNED":
          case "ENTITY_UNASSIGNED":
            label = "Assignee";
            from = change.from?.name ?? "None";
            to = change.to?.name ?? "None";
            break;

          case "DUE_DATE_CHANGED":
            label = "Due date";
            from = change.from
              ? new Date(change.from).toLocaleDateString()
              : "None";
            to = change.to ? new Date(change.to).toLocaleDateString() : "None";
            break;

          default:
            return null;
        }

        return (
          <div key={index} className={styles.activityDetailRow}>
            <span className={styles.activityDetailLabel}>{label}:</span>
            <span className={styles.activityDetailValue}>
              {from} → {to}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const TaskTimeline = ({ taskId, task }) => {
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const timelineRef = useRef(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const isInitialLoad = useRef(true);
  const isLoadingMore = useRef(false);

  const currentUserId = session?.user?.id;

  // Local state
  const [activeTab, setActiveTab] = useState("COMMENT");
  const [message, setMessage] = useState("");
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);

  // Redux selectors based on active tab
  const groupedTimeline = useSelector((state) =>
    selectTimelineGroupedByDate(state, activeTab)
  );
  const hasMore = useSelector((state) => selectHasMore(state, activeTab));
  const isLoadingInitial = useSelector((state) =>
    selectIsLoading(state, activeTab, "initial")
  );
  const isLoadingMoreData = useSelector((state) =>
    selectIsLoading(state, activeTab, "more")
  );
  const isRefreshing = useSelector((state) =>
    selectIsLoading(state, activeTab, "refresh")
  );
  const isCreating = useSelector((state) =>
    selectIsLoading(state, "loading", "create")
  );
  const error = useSelector((state) => selectError(state, activeTab));
  const paginationInfo = useSelector((state) =>
    selectPaginationInfo(state, activeTab)
  );

  // Load initial timeline when component mounts or task changes
  useEffect(() => {
    if (taskId) {
      dispatch(clearTimeline());
      dispatch(fetchTimeline({ taskId, type: "COMMENT", limit: 20 }));
      dispatch(fetchTimeline({ taskId, type: "ACTIVITY", limit: 20 }));
      isInitialLoad.current = true;
    }
  }, [taskId, dispatch]);

  // Scroll to bottom on initial load and new comments
  useEffect(() => {
    if (!isLoadingInitial && bottomRef.current && isInitialLoad.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "instant" });
        isInitialLoad.current = false;
      }, 100);
    }
  }, [isLoadingInitial, groupedTimeline]);

  // Scroll to bottom when new comment is created
  useEffect(() => {
    if (!isCreating && bottomRef.current && !isInitialLoad.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isCreating]);

  // Handle tab change
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    isInitialLoad.current = true;
    // Scroll to bottom after tab change
    setTimeout(() => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "instant" });
        isInitialLoad.current = false;
      }
    }, 100);
  };

  // Handle refresh
  const handleRefresh = () => {
    if (isRefreshing) return;

    dispatch(
      fetchTimeline({
        taskId,
        type: activeTab,
        limit: 20,
      })
    ).then(() => {
      isInitialLoad.current = true;
      setTimeout(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: "smooth" });
          isInitialLoad.current = false;
        }
      }, 100);
    });
  };

  // Handle input change for mentions
  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setMessage(value);

    // Check if user deleted a mention
    mentionedUsers.forEach((user) => {
      if (!value.includes(`@${user.name}`)) {
        setMentionedUsers((prev) => prev.filter((u) => u.id !== user.id));
      }
    });

    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

      if (!textAfterAt.includes(" ") && textAfterAt.length <= 50) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Handle mention select
  const handleMentionSelect = (user) => {
    if (mentionedUsers.find((u) => u.id === user.id)) {
      setShowMentions(false);
      return;
    }

    const cursorPos = inputRef.current.selectionStart;
    const textBeforeCursor = message.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const beforeMention = message.slice(0, lastAtIndex);
    const afterMention = message.slice(cursorPos);
    const newMessage = `${beforeMention}@${user.name} ${afterMention}`;

    setMessage(newMessage);
    setMentionedUsers([...mentionedUsers, user]);
    setShowMentions(false);

    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Remove mention chip
  const handleRemoveMention = (userId) => {
    const user = mentionedUsers.find((u) => u.id === userId);
    if (user) {
      setMessage((prev) => prev.replace(`@${user.name}`, "").trim());
      setMentionedUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  };

  // Send comment
  const handleSendComment = async () => {
    if (!message.trim()) return;

    const mentions = mentionedUsers.map((u) => u.id);

    if (editingCommentId) {
       dispatch(
        updateComment({
          taskId,
          commentId: editingCommentId,
          message: message.trim(),
          mentions,
        })
      );
      setEditingCommentId(null);
    } else {
      dispatch(
        createComment({
          taskId,
          message: message.trim(),
          mentions,
        })
      );
    }

    setMessage("");
    setMentionedUsers([]);
    setShowMentions(false);
  };

  // Handle key press
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSendComment();
    } else if (e.key === "Escape" && editingCommentId) {
      handleCancelEdit();
    }
  };

  // Start editing
  const handleStartEdit = (comment) => {
    setEditingCommentId(comment.id);
    setMessage(comment.message);

    // Extract mentioned users from message
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(comment.message)) !== null) {
      mentions.push({ id: match[1], name: match[1] });
    }
    setMentionedUsers(mentions);

    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setMessage("");
    setMentionedUsers([]);
  };

  // Load more
  const handleLoadMore = () => {
    if (hasMore && !isLoadingMoreData && paginationInfo.nextCursor) {
      isLoadingMore.current = true;
      const currentScrollHeight = timelineRef.current?.scrollHeight;

      dispatch(
        loadMoreTimeline({
          taskId,
          cursor: paginationInfo.nextCursor,
          type: activeTab,
          limit: 20,
        })
      ).then(() => {
        setTimeout(() => {
          if (timelineRef.current) {
            const newScrollHeight = timelineRef.current.scrollHeight;
            const heightDifference = newScrollHeight - currentScrollHeight;
            timelineRef.current.scrollTop = heightDifference;
            isLoadingMore.current = false;
          }
        }, 100);
      });
    }
  };

  // Check if comment can be edited (within 48 hours)
  const canEdit = (comment) => {
    if (comment.user_id !== currentUserId) return false;
    const editedUntil = new Date(comment.edited_until);
    return new Date() < editedUntil;
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Render formatted message with highlighted mentions
  const renderMessageWithMentions = (message) => {
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(message)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {message.slice(lastIndex, match.index)}
          </span>
        );
      }

      parts.push(
        <span key={`mention-${match.index}`} className={styles.mention}>
          {match[0]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < message.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>{message.slice(lastIndex)}</span>
      );
    }

    return parts.length > 0 ? parts : message;
  };

  // Render activity entry
  const renderActivity = (item) => {
    const message =
      item.message ||
      (item.activity?.meta?.changes
        ? buildFallbackMessage(item.activity.meta.changes)
        : "updated the task");

    const changes = item.activity?.meta?.changes ?? [];

    return (
      <div key={item.id} className={styles.activityItem}>
        <div className={styles.activityLeft}>
          <div className={styles.activityAvatar}>
            <span className={styles.avatarInitials}>
              {getInitials(item.user_name)}
            </span>
          </div>
        </div>

        <div className={styles.activityRight}>
          <div className={styles.activityHeader}>
            <span className={styles.activityUser}>{item.user_name}</span>
            <span className={styles.activityTime}>
              {new Date(item.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className={styles.activityContent}>
            <div className={styles.activityEvent}>
              <Activity size={14} />
              <span>{message}</span>
            </div>

            {changes.length > 0 && renderChangeDetails(changes)}
          </div>
        </div>
      </div>
    );
  };

  // Render comment
  const renderComment = (comment) => {
    const isOwner = comment.user_id === currentUserId;
    const canEditComment = canEdit(comment);
    const isDeleted = comment.deleted === true;
    const isEditing = editingCommentId === comment.id;

    if (isDeleted) {
      return (
        <div key={comment.id} className={styles.commentItem}>
          <div className={styles.commentLeft}>
            <div className={styles.commentAvatar}>
              <span className={styles.avatarInitials}>
                {getInitials(comment.user_name)}
              </span>
            </div>
          </div>
          <div className={styles.commentRight}>
            <div className={styles.deletedMessage}>
              <MessageSquare size={14} />
              <span>This comment has been deleted</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={comment.id}
        className={`${styles.commentItem} ${isEditing ? styles.editing : ""}`}
      >
        <div className={styles.commentLeft}>
          <div className={styles.commentAvatar}>
            <span className={styles.avatarInitials}>
              {getInitials(comment.user_name)}
            </span>
          </div>
        </div>

        <div className={styles.commentRight}>
          <div className={styles.commentBubble}>
            <div className={styles.commentHeader}>
              <span className={styles.commentUser}>{comment.user_name}</span>
              <span className={styles.commentTime}>
                {new Date(comment.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className={styles.commentMessage}>
              {renderMessageWithMentions(comment.message)}
            </div>

            {comment.updated_at !== comment.created_at && (
              <div className={styles.editedBadge}>
                <Edit2 size={10} /> edited
              </div>
            )}
          </div>

          {!isEditing && isOwner && canEditComment && (
            <button
              className={styles.editBtn}
              onClick={() => handleStartEdit(comment)}
              title="Edit comment"
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render timeline grouped by date
  const renderTimeline = () => {
    const dates = Object.keys(groupedTimeline).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    if (dates.length === 0) {
      return (
        <div className={styles.emptyState}>
          <MessageSquare size={48} />
          <h3>No {activeTab === "COMMENT" ? "comments" : "activity"} yet</h3>
          <p>
            {activeTab === "COMMENT"
              ? "Be the first to comment on this task"
              : "No activity recorded for this task"}
          </p>
        </div>
      );
    }

    return dates.map((date) => {
      const items = groupedTimeline[date];

      if (items.length === 0) return null;

      return (
        <div key={date} className={styles.dateGroup}>
          <div className={styles.dateDivider}>
            <span className={styles.dateLabel}>{formatDateLabel(date)}</span>
          </div>
          <div className={styles.dateItems}>
            {items.map((item) =>
              item.type === "ACTIVITY"
                ? renderActivity(item)
                : renderComment(item)
            )}
          </div>
        </div>
      );
    });
  };

  if (isLoadingInitial) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={32} />
        <p>Loading timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={32} />
        <p>{error}</p>
        <button
          onClick={() =>
            dispatch(fetchTimeline({ taskId, type: activeTab, limit: 20 }))
          }
          className={styles.retryBtn}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.timelineContainer}>
      {/* Tabs with Refresh Button */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabsLeft}>
          <button
            className={`${styles.tab} ${
              activeTab === "COMMENT" ? styles.active : ""
            }`}
            onClick={() => handleTabChange("COMMENT")}
          >
            <MessageSquare size={16} />
            Comments
          </button>
          <button
            className={`${styles.tab} ${
              activeTab === "ACTIVITY" ? styles.active : ""
            }`}
            onClick={() => handleTabChange("ACTIVITY")}
          >
            <Activity size={16} />
            Activity
          </button>
        </div>

        <button
          className={styles.refreshBtn}
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh"
        >
          <RefreshCw
            size={16}
            className={isRefreshing ? styles.spinning : ""}
          />
        </button>
      </div>

      {/* Timeline content with scroll */}
      <div className={styles.timelineContent} ref={timelineRef}>
        {/* Load More Button (always visible at top if there's more to load) */}
        {hasMore && !isLoadingInitial && (
          <div className={styles.loadMoreContainer}>
            <button
              onClick={handleLoadMore}
              className={styles.loadMoreBtn}
              disabled={isLoadingMoreData}
            >
              {isLoadingMoreData ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  Loading...
                </>
              ) : (
                <>
                  <ChevronUp size={16} />
                  Load older
                </>
              )}
            </button>
          </div>
        )}

        {/* Timeline items grouped by date */}
        {renderTimeline()}

        {/* Scroll anchor at bottom */}
        <div ref={bottomRef} />
      </div>

      {/* Comment Input (fixed at bottom - only show for COMMENT tab) */}
      {activeTab === "COMMENT" && (
        <div className={styles.commentInputSection}>
          {editingCommentId && (
            <div className={styles.editingBanner}>
              <Edit2 size={14} />
              <span>Editing comment</span>
              <button
                onClick={handleCancelEdit}
                className={styles.cancelEditBtn}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {mentionedUsers.length > 0 && (
            <div className={styles.mentionedChips}>
              <span className={styles.chipsLabel}>Mentioned:</span>
              {mentionedUsers.map((user) => (
                <div key={user.id} className={styles.userChip}>
                  <span>{user.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMention(user.id)}
                    className={styles.chipRemove}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.inputContainer}>
            <div className={styles.inputWrapper}>
              <textarea
                ref={inputRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  editingCommentId
                    ? "Edit your comment..."
                    : "Add a comment... Use @ to mention"
                }
                className={styles.messageInput}
                rows={4}
                disabled={isCreating}
              />

              <button
                type="button"
                onClick={handleSendComment}
                disabled={!message.trim() || isCreating}
                className={styles.sendBtn}
                title={editingCommentId ? "Update comment" : "Send comment"}
              >
                {isCreating ? (
                  <Loader2 size={18} className={styles.spinner} />
                ) : editingCommentId ? (
                  <Check size={18} />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>

            {showMentions && (
              <UserMentionsDropdown
                inputRef={inputRef}
                query={mentionQuery}
                onSelect={handleMentionSelect}
                onClose={() => setShowMentions(false)}
                taskId={taskId}
                task={task}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskTimeline;
