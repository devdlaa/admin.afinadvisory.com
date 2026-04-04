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

/**
 * Group timeline items by date (using local timezone)
 * Returns: { "2024-01-15": [items...], "2024-01-14": [items...] }
 */
export const groupByDate = (items) => {
  const grouped = {};

  items.forEach((item) => {
    const date = new Date(item.created_at);
    // Get local date string in YYYY-MM-DD format
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

/**
 * Format date for display (e.g., "Today", "Yesterday", "Jan 15, 2024")
 */
export const formatDateLabel = (dateString) => {
  // Parse the date string (YYYY-MM-DD format)
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  const isToday = compareDate.getTime() === today.getTime();
  const isYesterday = compareDate.getTime() === yesterday.getTime();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ============================================
// ASYNC THUNKS
// ============================================

/**
 * Fetch timeline (comments OR activity based on type)
 * Replaces existing items for that type
 */
export const fetchTimeline = createAsyncThunk(
  "taskTimeline/fetchTimeline",
  async ({ taskId, type = "COMMENT", limit = 20 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        type,
        limit: limit.toString(),
      });

      const result = await apiFetch(
        `/api/admin_ops/tasks/${taskId}/comments?${params.toString()}`
      );

      return {
        taskId,
        type,
        ...result.data, // { items, next_cursor }
      };
    } catch (error) {
      return rejectWithValue({
        type,
        message: error.message || "Failed to fetch timeline",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Load more timeline items (pagination)
 * Prepends older items to existing items (for upward scrolling)
 */
export const loadMoreTimeline = createAsyncThunk(
  "taskTimeline/loadMoreTimeline",
  async (
    { taskId, cursor, type = "COMMENT", limit = 20 },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({
        type,
        limit: limit.toString(),
        cursor,
      });

      const result = await apiFetch(
        `/api/admin_ops/tasks/${taskId}/comments?${params.toString()}`
      );

      return {
        taskId,
        type,
        ...result.data, // { items, next_cursor }
      };
    } catch (error) {
      return rejectWithValue({
        type,
        message: error.message || "Failed to load more timeline items",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Create comment
 */
export const createComment = createAsyncThunk(
  "taskTimeline/createComment",
  async ({ taskId, message, mentions = [] }, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/admin_ops/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ message, mentions }),
      });

      return {
        taskId,
        comment: result.data,
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to create comment",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Update comment
 */
export const updateComment = createAsyncThunk(
  "taskTimeline/updateComment",
  async ({ taskId, commentId, message, mentions = [] }, { rejectWithValue }) => {
    try {
      const result = await apiFetch(
        `/api/admin_ops/tasks/${taskId}/comments/${commentId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ message, mentions }),
        }
      );

      return {
        taskId,
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
  }
);

/**
 * Delete comment
 */
export const deleteComment = createAsyncThunk(
  "taskTimeline/deleteComment",
  async ({ taskId, commentId }, { rejectWithValue }) => {
    try {
      await apiFetch(`/api/admin_ops/tasks/${taskId}/comments/${commentId}`, {
        method: "DELETE",
      });

      return {
        taskId,
        commentId,
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to delete comment",
        code: error.code,
        details: error.details,
      });
    }
  }
);

// ============================================
// INITIAL STATE
// ============================================
const initialState = {
  // Separate arrays for comments and activities
  comments: [],
  activities: [],

  // Current task ID
  currentTaskId: null,

  // Pagination (separate for each type)
  pagination: {
    COMMENT: {
      nextCursor: null,
      hasMore: true,
    },
    ACTIVITY: {
      nextCursor: null,
      hasMore: true,
    },
  },

  // Loading states (separate for each type and action)
  loading: {
    COMMENT: {
      initial: false,
      more: false,
      refresh: false,
    },
    ACTIVITY: {
      initial: false,
      more: false,
      refresh: false,
    },
    create: false,
    update: false,
    delete: false,
  },

  // Error states
  error: {
    COMMENT: null,
    ACTIVITY: null,
    create: null,
    update: null,
    delete: null,
  },

  // Success flags
  success: {
    commentCreated: false,
    commentUpdated: false,
    commentDeleted: false,
  },
};

// ============================================
// SLICE
// ============================================
const taskTimelineSlice = createSlice({
  name: "taskTimeline",
  initialState,
  reducers: {
    // Clear timeline (when switching tasks)
    clearTimeline: (state) => {
      state.comments = [];
      state.activities = [];
      state.pagination = initialState.pagination;
      state.currentTaskId = null;
    },

    // Clear specific type
    clearTimelineType: (state, action) => {
      const type = action.payload;
      if (type === "COMMENT") {
        state.comments = [];
      } else if (type === "ACTIVITY") {
        state.activities = [];
      }
      state.pagination[type] = {
        nextCursor: null,
        hasMore: true,
      };
    },

    // Clear errors
    clearErrors: (state) => {
      state.error = initialState.error;
    },

    // Clear specific error
    clearError: (state, action) => {
      const errorKey = action.payload;
      if (state.error[errorKey] !== undefined) {
        state.error[errorKey] = null;
      }
    },

    // Clear success flags
    clearSuccessFlags: (state) => {
      state.success = initialState.success;
    },

    // Clear specific success flag
    clearSuccessFlag: (state, action) => {
      const successKey = action.payload;
      if (state.success[successKey] !== undefined) {
        state.success[successKey] = false;
      }
    },
  },

  extraReducers: (builder) => {
    // ============================================
    // FETCH TIMELINE (INITIAL)
    // ============================================
    builder
      .addCase(fetchTimeline.pending, (state, action) => {
        const type = action.meta.arg.type;
        state.loading[type].initial = true;
        state.error[type] = null;
      })
      .addCase(fetchTimeline.fulfilled, (state, action) => {
        const { taskId, type, items, next_cursor } = action.payload;

        if (state.currentTaskId && state.currentTaskId !== taskId) {
          return; // ⛔ ignore stale response
        }

        // Store in appropriate array (oldest to newest for WhatsApp-style display)
        if (type === "COMMENT") {
          state.comments = [...items].reverse();
        } else if (type === "ACTIVITY") {
          state.activities = [...items].reverse();
        }

        state.currentTaskId = taskId;
        state.pagination[type].nextCursor = next_cursor;
        state.pagination[type].hasMore = next_cursor !== null;
        state.loading[type].initial = false;
        state.loading[type].refresh = false;
      })
      .addCase(fetchTimeline.rejected, (state, action) => {
        const type = action.payload?.type || action.meta.arg.type;
        state.loading[type].initial = false;
        state.loading[type].refresh = false;
        state.error[type] =
          action.payload?.message || "Failed to fetch timeline";
      });

    // ============================================
    // LOAD MORE TIMELINE
    // ============================================
    builder
      .addCase(loadMoreTimeline.pending, (state, action) => {
        const type = action.meta.arg.type;
        state.loading[type].more = true;
        state.error[type] = null;
      })
      .addCase(loadMoreTimeline.fulfilled, (state, action) => {
        const { taskId,type, items, next_cursor } = action.payload;

        if (state.currentTaskId && state.currentTaskId !== taskId) {
          return; // ⛔ ignore stale response
        }

        // Prepend older items (they come in newest first from API)
        const reversedItems = [...items].reverse();

        if (type === "COMMENT") {
          state.comments = [...reversedItems, ...state.comments];
        } else if (type === "ACTIVITY") {
          state.activities = [...reversedItems, ...state.activities];
        }

        state.pagination[type].nextCursor = next_cursor;
        state.pagination[type].hasMore = next_cursor !== null;
        state.loading[type].more = false;
      })
      .addCase(loadMoreTimeline.rejected, (state, action) => {
        const type = action.payload?.type || action.meta.arg.type;
        state.loading[type].more = false;
        state.error[type] =
          action.payload?.message || "Failed to load more items";
      });

    // ============================================
    // CREATE COMMENT
    // ============================================
    builder
      .addCase(createComment.pending, (state) => {
        state.loading.create = true;
        state.error.create = null;
        state.success.commentCreated = false;
      })
      .addCase(createComment.fulfilled, (state, action) => {
        const { comment } = action.payload;

        // Add to end of comments array (latest at bottom)
        state.comments.push(comment);

        state.loading.create = false;
        state.success.commentCreated = true;
      })
      .addCase(createComment.rejected, (state, action) => {
        state.loading.create = false;
        state.error.create =
          action.payload?.message || "Failed to create comment";
      });

    // ============================================
    // UPDATE COMMENT
    // ============================================
    builder
      .addCase(updateComment.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
        state.success.commentUpdated = false;
      })
      .addCase(updateComment.fulfilled, (state, action) => {
        const { commentId, updatedComment } = action.payload;

        // Update in comments array
        state.comments = state.comments.map((item) =>
          item.id === commentId ? { ...item, ...updatedComment } : item
        );

        state.loading.update = false;
        state.success.commentUpdated = true;
      })
      .addCase(updateComment.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update =
          action.payload?.message || "Failed to update comment";
      });

    // ============================================
    // DELETE COMMENT
    // ============================================
    builder
      .addCase(deleteComment.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
        state.success.commentDeleted = false;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { commentId } = action.payload;

        // Mark as deleted in comments array
        state.comments = state.comments.map((item) =>
          item.id === commentId ? { ...item, deleted: true } : item
        );

        state.loading.delete = false;
        state.success.commentDeleted = true;
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete =
          action.payload?.message || "Failed to delete comment";
      });
  },
});

// ============================================
// ACTIONS
// ============================================
export const {
  clearTimeline,
  clearTimelineType,
  clearErrors,
  clearError,
  clearSuccessFlags,
  clearSuccessFlag,
} = taskTimelineSlice.actions;

// ============================================
// SELECTORS
// ============================================
const selectTimelineState = (state) => state.taskTimeline || initialState;
// ============================================
// SELECTORS (PATCHED & SAFE)
// ============================================

// Base arrays
export const selectItemsByType = (state, type) => {
  const s = selectTimelineState(state);
  return type === "COMMENT" ? s.comments : s.activities;
};

// Grouped by date (memoized)
export const selectTimelineGroupedByDate = createSelector(
  [selectItemsByType],
  (items) => groupByDate(items)
);

// Pagination info (memoized, stable reference)
export const selectPaginationInfo = createSelector(
  [selectTimelineState, (_, type) => type],
  (s, type) => ({
    nextCursor: s.pagination?.[type]?.nextCursor ?? null,
    hasMore: s.pagination?.[type]?.hasMore ?? false,
  })
);

// Has more items
export const selectHasMore = (state, type) => {
  const s = selectTimelineState(state);
  return s.pagination?.[type]?.hasMore ?? false;
};

// Current task id
export const selectCurrentTaskId = (state) =>
  selectTimelineState(state).currentTaskId;

// Loading states (safe)
export const selectIsLoading = (state, type, action = "initial") => {
  const s = selectTimelineState(state);

  if (action === "create" || action === "update" || action === "delete") {
    return s.loading?.[action] ?? false;
  }

  return s.loading?.[type]?.[action] ?? false;
};

// Error states (safe)
export const selectError = (state, type) => {
  const s = selectTimelineState(state);
  return s.error?.[type] ?? null;
};

// Success states (safe)
export const selectSuccess = (state, type) => {
  const s = selectTimelineState(state);
  return s.success?.[type] ?? false;
};

// Total items count
export const selectTotalItemsCount = (state, type) =>
  selectItemsByType(state, type).length;

// ============================================
// EXPORT REDUCER
// ============================================
export default taskTimelineSlice.reducer;
