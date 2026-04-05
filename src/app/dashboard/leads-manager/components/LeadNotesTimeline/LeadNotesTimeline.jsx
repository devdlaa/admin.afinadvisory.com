"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import {
  fetchTimeline,
  loadMoreTimeline,
  createComment,
  updateComment,
  clearTimeline,
  deleteComment,
} from "@/store/slices/leadTimelineSlice";

import UserMentionsDropdown from "@/app/components/shared/UserMentionsDropdown/UserMentionsDropdown";

import {
  Send,
  Edit2,
  Loader2,
  AlertCircle,
  MessageSquare,
  X,
  Check,
  ChevronDown,
  Lock,
  Globe,
  Plus,
  StickyNote,
  Pin,
  Trash2,
} from "lucide-react";
import styles from "./LeadNotesTimeline.module.scss";

import { getInitials, formatTime } from "@/utils/client/cutils";

// ─── NoteCard ────────────────────────────────────────────────────────────────

export const NoteCard = ({
  comment,
  currentUserId,
  onEdit,
  isEditing,
  editState,
  onEditChange,
  onEditSave,
  onPin,
  onEditCancel,
  isUpdating,
  isLast,
  onDelete,
  lead,
}) => {
  const isOwner = comment.user_id === currentUserId;

  const isDeleted = comment.deleted === true;
  const inputRef = useRef(null);
  const [showMentions, setShowMentions] = useState(false);
  const [isMentioning, setIsMentioning] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleEditInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    onEditChange({ ...editState, message: value });

    const textBeforeCursor = value.slice(0, cursorPos);
    if (textBeforeCursor.endsWith("@")) {
      setIsMentioning(true);
      setMentionQuery("");
      setShowMentions(true);
      return;
    }
    if (isMentioning) {
      const lastAt = textBeforeCursor.lastIndexOf("@");
      if (lastAt === -1) {
        setIsMentioning(false);
        setShowMentions(false);
        return;
      }
      const q = textBeforeCursor.slice(lastAt + 1);
      if (q.includes(" ")) {
        setIsMentioning(false);
        setShowMentions(false);
        return;
      }
      setMentionQuery(q);
      setShowMentions(true);
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === " " && isMentioning) {
      setIsMentioning(false);
      setShowMentions(false);
    }
    if (e.key === "Escape") {
      setIsMentioning(false);
      setShowMentions(false);
      onEditCancel();
    }
    if (e.key === "Enter" && !e.shiftKey && !showMentions) {
      e.preventDefault();
      onEditSave();
    }
  };

  const handleMentionSelect = (user) => {
    if (editState.mentions.find((u) => u.id === user.id)) {
      setShowMentions(false);
      setIsMentioning(false);
      return;
    }
    onEditChange({
      ...editState,
      message: editState.message.replace(/@[^@\s]*$/, "").trimEnd() + " ",
      mentions: [...editState.mentions, user],
    });
    setShowMentions(false);
    setIsMentioning(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRemoveEditMention = (userId) => {
    onEditChange({
      ...editState,
      mentions: editState.mentions.filter((u) => u.id !== userId),
    });
  };

  if (isDeleted) {
    return (
      <div className={styles.noteRow}>
        <div className={styles.noteLeft}>
          <div className={styles.noteIconWrap}>
            <StickyNote size={16} />
          </div>
          {!isLast && <div className={styles.noteLine} />}
        </div>
        <div className={`${styles.noteCard} ${styles.deletedCard}`}>
          <MessageSquare size={13} />
          <span>This note has been deleted</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.noteRow}>
      <div className={styles.noteLeft}>
        <div className={styles.noteIconWrap}>
          <StickyNote size={16} />
        </div>
        {!isLast && <div className={styles.noteLine} />}
      </div>

      <div
        className={`${styles.noteCard} ${isEditing ? styles.editingCard : ""} ${comment.is_private ? styles.privateCard : ""}`}
      >
        {/* Header */}
        <div className={styles.noteCardHeader}>
          <div className={styles.noteAvatar}>
            <span>{getInitials(comment.user_name)}</span>
          </div>
          <div className={styles.noteMeta}>
            <span className={styles.noteAuthor}>{comment.user_name}</span>
            <span className={styles.noteTime}>
              {formatTime(comment.created_at)}
            </span>
          </div>
          <div className={styles.noteHeaderRight}>
            {comment.is_private && !isEditing && (
              <span className={styles.privateBadge}>
                <Lock size={10} /> Private
              </span>
            )}
            {comment.updated_at !== comment.created_at && !isEditing && (
              <span className={styles.editedBadge}>
                <Edit2 size={10} /> edited
              </span>
            )}
            {/* ← add this */}
            {!isEditing && (
              <button
                className={`${styles.pinBtn} ${comment.is_pinned ? styles.pinned : ""}`}
                onClick={() => onPin(comment)}
                disabled={isUpdating}
                title={comment.is_pinned ? "Unpin note" : "Pin note"}
              >
                {isUpdating ? (
                  <Loader2 size={13} className={styles.spinning} />
                ) : (
                  <Pin size={13} />
                )}
              </button>
            )}
            {!isEditing && isOwner && (
              <button
                className={styles.editBtn}
                onClick={() => onEdit(comment)}
                title="Edit note"
              >
                <Edit2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Body - view mode */}
        {!isEditing && (
          <div className={styles.noteBody}>
            {comment.mentions?.length > 0 && (
              <div className={styles.mentionsRow}>
                {comment.mentions.map((u) => (
                  <span key={u.id} className={styles.mentionChip}>
                    @{u.name}
                  </span>
                ))}
              </div>
            )}
            <p className={styles.noteText}>{comment.message}</p>
          </div>
        )}

        {/* Edit mode */}
        {isEditing && (
          <div className={styles.editMode}>
            {editState.mentions.length > 0 && (
              <div className={styles.editMentionChips}>
                {editState.mentions.map((u) => (
                  <div key={u.id} className={styles.editChip}>
                    <span>@{u.name}</span>
                    <button onClick={() => handleRemoveEditMention(u.id)}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.editInputWrap}>
              <textarea
                ref={inputRef}
                value={editState.message}
                onChange={handleEditInputChange}
                onKeyDown={handleEditKeyDown}
                className={styles.editTextarea}
                rows={3}
                disabled={isUpdating}
                placeholder="Edit your note..."
              />
              {showMentions && (
                <UserMentionsDropdown
                  inputRef={inputRef}
                  query={mentionQuery}
                  onSelect={handleMentionSelect}
                  onClose={() => setShowMentions(false)}
                  leadId={comment.scope_id}
                  currentUserId={currentUserId}
                  eligibleUserIds={lead.assignments.map((a) => a.id)}
                />
              )}
            </div>

            <div className={styles.editControls}>
              <div className={styles.editControlsLeft}>
                <button
                  className={`${styles.visibilityToggle} ${editState.is_private ? styles.privateToggle : styles.publicToggle}`}
                  onClick={() =>
                    onEditChange({
                      ...editState,
                      is_private: !editState.is_private,
                    })
                  }
                  type="button"
                  title={
                    editState.is_private
                      ? "Private – only you can see"
                      : "Visible to assigned users"
                  }
                >
                  {editState.is_private ? (
                    <>
                      <Lock size={12} /> Private
                    </>
                  ) : (
                    <>
                      <Globe size={12} /> Visible
                    </>
                  )}
                </button>
              </div>
              <div className={styles.editControlsRight}>
                <button
                  className={styles.deleteBtn}
                  onClick={() => onDelete(comment.id)}
                  disabled={isUpdating}
                  title="Delete note"
                >
                  {isUpdating ? (
                    <Loader2 size={14} className={styles.spinning} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
                <button
                  className={styles.cancelEditBtn}
                  onClick={onEditCancel}
                  disabled={isUpdating}
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  className={styles.saveEditBtn}
                  onClick={onEditSave}
                  disabled={!editState.message.trim() || isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 size={14} className={styles.spinning} />
                  ) : (
                    <Check size={14} />
                  )}
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── CreateNoteBox ────────────────────────────────────────────────────────────

const CreateNoteBox = ({ leadId, lead, onCreated, isCreating }) => {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [mentions, setMentions] = useState([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [isMentioning, setIsMentioning] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const inputRef = useRef(null);
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const handleExpand = () => {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCancel = () => {
    setExpanded(false);
    setMessage("");
    setMentions([]);
    setIsPrivate(false);
    setShowMentions(false);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setMessage(value);

    const textBeforeCursor = value.slice(0, cursorPos);
    if (textBeforeCursor.endsWith("@")) {
      setIsMentioning(true);
      setMentionQuery("");
      setShowMentions(true);
      return;
    }
    if (isMentioning) {
      const lastAt = textBeforeCursor.lastIndexOf("@");
      if (lastAt === -1) {
        setIsMentioning(false);
        setShowMentions(false);
        return;
      }
      const q = textBeforeCursor.slice(lastAt + 1);
      if (q.includes(" ")) {
        setIsMentioning(false);
        setShowMentions(false);
        return;
      }
      setMentionQuery(q);
      setShowMentions(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === " " && isMentioning) {
      setIsMentioning(false);
      setShowMentions(false);
    }
    if (e.key === "Escape") {
      setIsMentioning(false);
      setShowMentions(false);
      handleCancel();
    }
    if (e.key === "Enter" && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMentionSelect = (user) => {
    if (mentions.find((u) => u.id === user.id)) {
      setShowMentions(false);
      setIsMentioning(false);
      return;
    }
    setMessage((prev) => {
      const idx = prev.lastIndexOf("@");
      return idx !== -1 ? prev.slice(0, idx).trimEnd() + " " : prev;
    });
    setMentions((prev) => [...prev, user]);
    setShowMentions(false);
    setIsMentioning(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRemoveMention = (userId) => {
    setMentions((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    const result = await dispatch(
      createComment({
        leadId,
        message: message.trim(),
        mentions: mentions.map((u) => ({ id: u.id, name: u.name })),
        is_private: isPrivate,
      }),
    );
    if (!result.error) {
      handleCancel();
      onCreated?.();
    }
  };

  if (!expanded) {
    return (
      <button className={styles.createNoteBtn} onClick={handleExpand}>
        <div className={styles.createNoteBtnIcon}>
          <Plus size={15} />
        </div>
        <span>Add a note...</span>
      </button>
    );
  }

  return (
    <div className={styles.createNoteBox}>
      {mentions.length > 0 && (
        <div className={styles.createMentionChips}>
          {mentions.map((u) => (
            <div key={u.id} className={styles.editChip}>
              <span>@{u.name}</span>
              <button onClick={() => handleRemoveMention(u.id)}>
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.createInputWrap}>
        <textarea
          ref={inputRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={styles.createTextarea}
          rows={3}
          placeholder="Take a note, @name..."
          disabled={isCreating}
        />
        {showMentions && (
          <UserMentionsDropdown
            inputRef={inputRef}
            query={mentionQuery}
            onSelect={handleMentionSelect}
            onClose={() => setShowMentions(false)}
            leadId={leadId}
            currentUserId={currentUserId}
            eligibleUserIds={lead.assignments.map((a) => a.id)}
          />
        )}
      </div>

      <div className={styles.createControls}>
        <button
          className={`${styles.visibilityToggle} ${isPrivate ? styles.privateToggle : styles.publicToggle}`}
          onClick={() => setIsPrivate((p) => !p)}
          type="button"
        >
          {isPrivate ? (
            <>
              <Lock size={12} /> Private
            </>
          ) : (
            <>
              <Globe size={12} /> Visible
            </>
          )}
        </button>
        <div className={styles.createControlsRight}>
          <button
            className={styles.cancelEditBtn}
            onClick={handleCancel}
            disabled={isCreating}
          >
            <X size={14} /> Cancel
          </button>
          <button
            className={styles.saveEditBtn}
            onClick={handleSend}
            disabled={!message.trim() || isCreating}
          >
            {isCreating ? (
              <Loader2 size={14} className={styles.spinning} />
            ) : (
              <Send size={14} />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── LeadNotesTimeline ────────────────────────────────────────────────────────

const LeadNotesTimeline = ({ leadId, lead }) => {
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const comments = useSelector((state) => state.leadTimeline?.comments ?? []);
  const pagination = useSelector(
    (state) =>
      state.leadTimeline?.pagination?.COMMENT ?? {
        hasMore: false,
        nextCursor: null,
      },
  );
  const isLoadingInitial = useSelector(
    (state) => state.leadTimeline?.loading?.COMMENT?.initial ?? false,
  );
  const isLoadingMore = useSelector(
    (state) => state.leadTimeline?.loading?.COMMENT?.more ?? false,
  );
  const isCreating = useSelector(
    (state) => state.leadTimeline?.loading?.create ?? false,
  );
  const updatingById = useSelector(
    (state) => state.leadTimeline?.loading?.updatingById ?? {},
  );
  const error = useSelector(
    (state) => state.leadTimeline?.error?.COMMENT ?? null,
  );

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editState, setEditState] = useState({
    message: "",
    mentions: [],
    is_private: false,
  });

  const timelineRef = useRef(null);
  const isInitialLoad = useRef(true);

  // newest first = reverse of the array (redux stores oldest→newest)
  const displayComments = [...comments].reverse();

  useEffect(() => {
    if (leadId) {
      dispatch(clearTimeline());
      dispatch(fetchTimeline({ leadId, type: "COMMENT", limit: 20 }));
      isInitialLoad.current = true;
    }
  }, [leadId, dispatch]);

  const handleLoadMore = () => {
    if (!pagination.hasMore || isLoadingMore || !pagination.nextCursor) return;
    dispatch(
      loadMoreTimeline({
        leadId,
        cursor: pagination.nextCursor,
        type: "COMMENT",
        limit: 20,
      }),
    );
  };

  const handleStartEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditState({
      message: comment.message,
      mentions: comment.mentions || [],
      is_private: comment.is_private || false,
      is_pinned: !comment.is_pinned,
    });
  };
  const handleDelete = (commentId) => {
    dispatch(deleteComment({ leadId, commentId }));
  };

  const handleEditSave = async () => {
    if (!editState.message.trim()) return;
    const result = await dispatch(
      updateComment({
        leadId,
        commentId: editingCommentId,
        message: editState.message.trim(),
        mentions: editState.mentions,
        is_private: editState.is_private,
      }),
    );
    if (!result.error) {
      setEditingCommentId(null);
      setEditState({ message: "", mentions: [], is_private: false });
    }
  };
  const handlePin = (comment) => {
    dispatch(
      updateComment({
        leadId,
        commentId: comment.id,
        is_pinned: !comment.is_pinned,
      }),
    );
  };

  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditState({ message: "", mentions: [], is_private: false });
  };

  if (isLoadingInitial) {
    return (
      <div className={styles.loadingWrap}>
        <Loader2 size={24} className={styles.spinning} />
        <span>Loading notes…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorWrap}>
        <AlertCircle size={20} />
        <span>{error}</span>
        <button
          onClick={() =>
            dispatch(fetchTimeline({ leadId, type: "COMMENT", limit: 20 }))
          }
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Create note box — sticky at top */}
      <div className={styles.createSection}>
        <CreateNoteBox leadId={leadId} lead={lead} isCreating={isCreating} />
      </div>

      {/* Timeline */}
      <div className={styles.timelineWrap} ref={timelineRef}>
        {displayComments.length === 0 ? (
          <div className={styles.emptyState}>
            <StickyNote size={36} />
            <p>No notes yet</p>
            <span>Add the first note above</span>
          </div>
        ) : (
          <>
            {displayComments.map((comment, idx) => (
              <NoteCard
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                onEdit={handleStartEdit}
                isEditing={editingCommentId === comment.id}
                editState={editingCommentId === comment.id ? editState : null}
                isLast={idx === displayComments.length - 1}
                onEditChange={setEditState}
                onEditSave={handleEditSave}
                onEditCancel={handleEditCancel}
                isUpdating={!!updatingById[comment.id]}
                lead={lead}
                onPin={handlePin}
                onDelete={handleDelete}
              />
            ))}

            {/* Load more — at the bottom */}
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
                      <ChevronDown size={14} /> Load older notes
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

export default LeadNotesTimeline;
