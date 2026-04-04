import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

// ============================================
// HELPER - API FETCH WRAPPER
// ============================================
const apiFetch = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw {
      status: response.status,
      message: result.error?.message || result.message || "Request failed",
      code: result.error?.code || "UNKNOWN_ERROR",
      details: result.error?.details || null,
    };
  }

  return result;
};

// ============================================
// HELPER FUNCTIONS
// ============================================
export const groupByDate = (items) => {
  const grouped = {};

  items.forEach((item) => {
    const date = new Date(item.created_at);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push(item);
  });

  return grouped;
};

export const formatDateLabel = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) return "Today";
  if (compareDate.getTime() === yesterday.getTime()) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ============================================
// ASYNC THUNKS
// ============================================

export const fetchTimeline = createAsyncThunk(
  "leadTimeline/fetchTimeline",
  async ({ leadId, type = "COMMENT", limit = 10 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        type,
        limit: limit.toString(),
      });

      const result = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/comments?${params.toString()}`,
      );

      return {
        leadId,
        type,
        ...result.data,
      };
    } catch (error) {
      return rejectWithValue({
        type,
        message: error.message || "Failed to fetch timeline",
        code: error.code,
        details: error.details,
      });
    }
  },
);

export const loadMoreTimeline = createAsyncThunk(
  "leadTimeline/loadMoreTimeline",
  async (
    { leadId, cursor, type = "COMMENT", limit = 20 },
    { rejectWithValue },
  ) => {
    try {
      const params = new URLSearchParams({
        type,
        limit: limit.toString(),
        cursor,
      });

      const result = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/comments?${params.toString()}`,
      );

      return {
        leadId,
        type,
        ...result.data,
      };
    } catch (error) {
      return rejectWithValue({
        type,
        message: error.message || "Failed to load more timeline items",
        code: error.code,
        details: error.details,
      });
    }
  },
);

export const createComment = createAsyncThunk(
  "leadTimeline/createComment",
  async (
    { leadId, message, mentions = [], is_private = false },
    { rejectWithValue },
  ) => {
    try {
      const result = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ message, mentions, is_private }),
        },
      );

      return {
        leadId,
        comment: result.data,
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to create comment",
        code: error.code,
        details: error.details,
      });
    }
  },
);

export const updateComment = createAsyncThunk(
  "leadTimeline/updateComment",
  async (
    {
      leadId,
      commentId,
      message,
      mentions = [],
      is_private,
      is_pinned = false,
    },
    { rejectWithValue },
  ) => {
    try {
      const result = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/comments/${commentId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ message, mentions, is_private, is_pinned }),
        },
      );

      return {
        leadId,
        commentId,
        updatedComment: result.data,
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to update comment",
        code: error.code,
        details: error.details,
      });
    }
  },
);

export const deleteComment = createAsyncThunk(
  "leadTimeline/deleteComment",
  async ({ leadId, commentId }, { rejectWithValue }) => {
    try {
      await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/comments/${commentId}`,
        {
          method: "DELETE",
        },
      );

      return {
        leadId,
        commentId,
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to delete comment",
        code: error.code,
        details: error.details,
      });
    }
  },
);

export const fetchStageHistory = createAsyncThunk(
  "leadTimeline/fetchStageHistory",
  async ({ leadId, cursor = null, limit = 20 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(cursor && { cursor }),
      });

      const result = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/get-stage-history?${params.toString()}`,
      );

      return {
        leadId,
        isLoadMore: !!cursor,
        ...result.data,
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch stage history",
      });
    }
  },
);

// ============================================
// INITIAL STATE
// ============================================
const initialState = {
  comments: [],
  activities: [],
  stageHistory: [],
  currentLeadId: null,

  pagination: {
    COMMENT: { nextCursor: null, hasMore: true },
    ACTIVITY: { nextCursor: null, hasMore: true },
    STAGE_HISTORY: { nextCursor: null, hasMore: true },
  },

  loading: {
    COMMENT: { initial: false, more: false, refresh: false },
    ACTIVITY: { initial: false, more: false, refresh: false },
    STAGE_HISTORY: { initial: false, more: false, refresh: false },
    create: false,
    updatingById: {},
    delete: false,
  },

  error: {
    COMMENT: null,
    STAGE_HISTORY: null,
    ACTIVITY: null,
    create: null,
    update: null,
    delete: null,
  },

  success: {
    commentCreated: false,
    commentUpdated: false,
    commentDeleted: false,
  },
};

// ============================================
// SLICE
// ============================================
const leadTimelineSlice = createSlice({
  name: "leadTimeline",
  initialState,

  reducers: {
    clearTimeline: (state) => {
      state.comments = [];
      state.activities = [];
      state.pagination = initialState.pagination;
      state.currentLeadId = null;
    },

    clearTimelineType: (state, action) => {
      const type = action.payload;
      if (type === "COMMENT") state.comments = [];
      if (type === "ACTIVITY") state.activities = [];

      state.pagination[type] = {
        nextCursor: null,
        hasMore: true,
      };
    },

    clearErrors: (state) => {
      state.error = initialState.error;
    },

    clearError: (state, action) => {
      const key = action.payload;
      if (state.error[key] !== undefined) state.error[key] = null;
    },

    clearSuccessFlags: (state) => {
      state.success = initialState.success;
    },

    clearSuccessFlag: (state, action) => {
      const key = action.payload;
      if (state.success[key] !== undefined) state.success[key] = false;
    },
  },

  extraReducers: (builder) => {
    builder
      // ── FETCH ────────────────────────────────────────────────────────────
      .addCase(fetchTimeline.pending, (state, action) => {
        const type = action.meta.arg.type;
        state.loading[type].initial = true;
        state.error[type] = null;
      })
      .addCase(fetchTimeline.fulfilled, (state, action) => {
        const { leadId, type, items, next_cursor } = action.payload;

        if (state.currentLeadId && state.currentLeadId !== leadId) return;

        if (type === "COMMENT") state.comments = [...items].reverse();
        if (type === "ACTIVITY") state.activities = [...items].reverse();

        state.currentLeadId = leadId;
        state.pagination[type].nextCursor = next_cursor;
        state.pagination[type].hasMore = next_cursor !== null;
        state.loading[type].initial = false;
      })
      .addCase(fetchTimeline.rejected, (state, action) => {
        const type = action.payload?.type || action.meta.arg.type;
        state.loading[type].initial = false;
        state.error[type] = action.payload?.message;
      })

      // ── LOAD MORE ────────────────────────────────────────────────────────
      .addCase(loadMoreTimeline.pending, (state, action) => {
        const type = action.meta.arg.type;
        state.loading[type].more = true;
      })
      .addCase(loadMoreTimeline.fulfilled, (state, action) => {
        const { leadId, type, items, next_cursor } = action.payload;

        if (state.currentLeadId && state.currentLeadId !== leadId) return;

        const reversed = [...items].reverse();

        if (type === "COMMENT") {
          const existingIds = new Set(state.comments.map((c) => c.id));
          state.comments = [
            ...reversed.filter((i) => !existingIds.has(i.id)),
            ...state.comments,
          ];
        }
        if (type === "ACTIVITY") {
          const existingIds = new Set(state.activities.map((a) => a.id));
          state.activities = [
            ...reversed.filter((i) => !existingIds.has(i.id)),
            ...state.activities,
          ];
        }

        state.pagination[type].nextCursor = next_cursor;
        state.pagination[type].hasMore = next_cursor !== null;
        state.loading[type].more = false;
      })
      .addCase(loadMoreTimeline.rejected, (state, action) => {
        const type = action.payload?.type || action.meta.arg.type;
        state.loading[type].more = false;
        state.error[type] = action.payload?.message;
      })

      // ── CREATE ───────────────────────────────────────────────────────────
      .addCase(createComment.pending, (state) => {
        state.loading.create = true;
        state.success.commentCreated = false;
      })
      .addCase(createComment.fulfilled, (state, action) => {
        state.comments.push(action.payload.comment);
        state.loading.create = false;
        state.success.commentCreated = true;
      })
      .addCase(createComment.rejected, (state, action) => {
        state.loading.create = false;
        state.error.create = action.payload?.message;
      })

      // ── UPDATE ───────────────────────────────────────────────────────────
      .addCase(updateComment.pending, (state, action) => {
        const { commentId } = action.meta.arg;
        state.loading.updatingById[commentId] = true;
      })
      .addCase(updateComment.fulfilled, (state, action) => {
        const { commentId, updatedComment } = action.payload;
        state.comments = state.comments.map((c) =>
          c.id === commentId ? { ...c, ...updatedComment } : c,
        );
        delete state.loading.updatingById[commentId];
        state.success.commentUpdated = true;
      })
      .addCase(updateComment.rejected, (state, action) => {
        const { commentId } = action.meta.arg;
        delete state.loading.updatingById[commentId];
        state.error.update = action.payload?.message;
      })

      // ── DELETE ───────────────────────────────────────────────────────────
      .addCase(deleteComment.pending, (state, action) => {
        const { commentId } = action.meta.arg;
        state.loading.updatingById[commentId] = true;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { commentId } = action.payload;
        state.comments = state.comments.map((c) =>
          c.id === commentId ? { ...c, deleted: true } : c,
        );
        delete state.loading.updatingById[commentId];
        state.success.commentDeleted = true;
      })
      .addCase(deleteComment.rejected, (state, action) => {
        const { commentId } = action.meta.arg;
        delete state.loading.updatingById[commentId];
      })

      // ── STAGE HISTORY ───────────────────────────────────────────────────────────
      .addCase(fetchStageHistory.pending, (state, action) => {
        const isLoadMore = !!action.meta.arg.cursor;

        if (isLoadMore) {
          state.loading.STAGE_HISTORY.more = true;
        } else {
          state.loading.STAGE_HISTORY.initial = true;
          state.stageHistory = [];
        }

        state.error.STAGE_HISTORY = null;
      })

      .addCase(fetchStageHistory.fulfilled, (state, action) => {
        const { leadId, items, next_cursor, isLoadMore } = action.payload;

        if (state.currentLeadId && state.currentLeadId !== leadId) return;

        const reversed = [...items].reverse();

        if (isLoadMore) {
          const existingIds = new Set(state.stageHistory.map((i) => i.id));

          state.stageHistory = [
            ...reversed.filter((i) => !existingIds.has(i.id)),
            ...state.stageHistory,
          ];
        } else {
          state.stageHistory = reversed;
        }

        state.currentLeadId = leadId;
        state.pagination.STAGE_HISTORY.nextCursor = next_cursor;
        state.pagination.STAGE_HISTORY.hasMore = next_cursor !== null;

        state.loading.STAGE_HISTORY.initial = false;
        state.loading.STAGE_HISTORY.more = false;
      })

      .addCase(fetchStageHistory.rejected, (state, action) => {
        const isLoadMore = !!action.meta.arg.cursor;

        if (isLoadMore) {
          state.loading.STAGE_HISTORY.more = false;
        } else {
          state.loading.STAGE_HISTORY.initial = false;
        }

        state.error.STAGE_HISTORY = action.payload?.message;
      });
  },
});

// ============================================
// EXPORTS
// ============================================
export const {
  clearTimeline,
  clearTimelineType,
  clearErrors,
  clearError,
  clearSuccessFlags,
  clearSuccessFlag,
} = leadTimelineSlice.actions;

const selectState = (state) => state.leadTimeline || initialState;

export const selectItemsByType = (state, type) => {
  if (type === "COMMENT") return selectState(state).comments;
  if (type === "ACTIVITY") return selectState(state).activities;
  if (type === "STAGE_HISTORY") return selectState(state).stageHistory;
};

export const selectTimelineGroupedByDate = createSelector(
  [selectItemsByType],
  (items) => groupByDate(items),
);

export default leadTimelineSlice.reducer;
