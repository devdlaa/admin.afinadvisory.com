import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

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
 * Group timeline items by date
 * Returns: { "2024-01-15": [items...], "2024-01-14": [items...] }
 */
export const groupByDate = (items) => {
  const grouped = {};

  items.forEach((item) => {
    const date = new Date(item.created_at).toISOString().split("T")[0];

    if (!grouped[date]) {
      grouped[date] = [];
    }

    grouped[date].push(item);
  });

  return grouped;
};

/**
 * Format date for display (e.g., "Today", "Yesterday", "Jan 15, 2024")
 */
export const formatDateLabel = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

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
 * Fetch timeline (comments + activity)
 * Replaces existing items
 */
export const fetchTimeline = createAsyncThunk(
  "taskTimeline/fetchTimeline",
  async ({ taskId, type = "ALL", limit = 20 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        type,
        limit: limit.toString(),
      });

      const result = await apiFetch(
        `/api/tasks/${taskId}/comments?${params.toString()}`
      );

      return {
        taskId,
        ...result.data, // { items, next_cursor }
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch timeline",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Load more timeline items (pagination)
 * Appends to existing items
 */
export const loadMoreTimeline = createAsyncThunk(
  "taskTimeline/loadMoreTimeline",
  async ({ taskId, cursor, type = "ALL", limit = 20 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        type,
        limit: limit.toString(),
        cursor,
      });

      const result = await apiFetch(
        `/api/tasks/${taskId}/comments?${params.toString()}`
      );

      return {
        taskId,
        ...result.data, // { items, next_cursor }
      };
    } catch (error) {
      return rejectWithValue({
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
      const result = await apiFetch(`/api/tasks/${taskId}/comments`, {
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
  async ({ taskId, commentId, message }, { rejectWithValue }) => {
    try {
      const result = await apiFetch(
        `/api/tasks/${taskId}/comments/${commentId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ message }),
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
      await apiFetch(`/api/tasks/${taskId}/comments/${commentId}`, {
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
  // Timeline items (chronological order, newest first)
  items: [],

  // Current task ID
  currentTaskId: null,

  // Pagination
  nextCursor: null,
  hasMore: true,

  // Current filter
  currentFilter: "ALL", // COMMENT | ACTIVITY | ALL

  // Loading states
  loading: {
    initial: false,
    more: false,
    create: false,
    update: false,
    delete: false,
  },

  // Error states
  error: {
    fetch: null,
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
    // Set filter type
    setFilter: (state, action) => {
      state.currentFilter = action.payload;
    },

    // Clear timeline (when switching tasks)
    clearTimeline: (state) => {
      state.items = [];
      state.nextCursor = null;
      state.hasMore = true;
      state.currentTaskId = null;
    },

    // Clear errors
    clearErrors: (state) => {
      state.error = initialState.error;
    },

    // Clear specific error
    clearError: (state, action) => {
      const errorKey = action.payload;
      if (state.error[errorKey]) {
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
      .addCase(fetchTimeline.pending, (state) => {
        state.loading.initial = true;
        state.error.fetch = null;
      })
      .addCase(fetchTimeline.fulfilled, (state, action) => {
        const { taskId, items, next_cursor } = action.payload;

        // Replace items
        state.items = items;
        state.currentTaskId = taskId;
        state.nextCursor = next_cursor;
        state.hasMore = next_cursor !== null;

        state.loading.initial = false;
      })
      .addCase(fetchTimeline.rejected, (state, action) => {
        state.loading.initial = false;
        state.error.fetch =
          action.payload?.message || "Failed to fetch timeline";
      });

    // ============================================
    // LOAD MORE TIMELINE
    // ============================================
    builder
      .addCase(loadMoreTimeline.pending, (state) => {
        state.loading.more = true;
        state.error.fetch = null;
      })
      .addCase(loadMoreTimeline.fulfilled, (state, action) => {
        const { items, next_cursor } = action.payload;

        // Append items
        state.items = [...state.items, ...items];
        state.nextCursor = next_cursor;
        state.hasMore = next_cursor !== null;

        state.loading.more = false;
      })
      .addCase(loadMoreTimeline.rejected, (state, action) => {
        state.loading.more = false;
        state.error.fetch =
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

        // Add to beginning of list (newest first)
        state.items.unshift(comment);

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

        // Update in list
        state.items = state.items.map((item) =>
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

        // Mark as deleted in list (soft delete, keeps in timeline)
        state.items = state.items.map((item) =>
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
  setFilter,
  clearTimeline,
  clearErrors,
  clearError,
  clearSuccessFlags,
  clearSuccessFlag,
} = taskTimelineSlice.actions;

// ============================================
// SELECTORS
// ============================================

// Get all timeline items
export const selectTimelineItems = (state) => state.taskTimeline.items;

// Get timeline items grouped by date
export const selectTimelineGroupedByDate = (state) => {
  return groupByDate(state.taskTimeline.items);
};

// Get current filter
export const selectCurrentFilter = (state) => state.taskTimeline.currentFilter;

// Get pagination info
export const selectPaginationInfo = (state) => ({
  nextCursor: state.taskTimeline.nextCursor,
  hasMore: state.taskTimeline.hasMore,
});

// Check if has more items to load
export const selectHasMore = (state) => state.taskTimeline.hasMore;

// Get current task ID
export const selectCurrentTaskId = (state) => state.taskTimeline.currentTaskId;

// Get loading states
export const selectIsLoading = (state, type = "initial") =>
  state.taskTimeline.loading[type];

// Get error states
export const selectError = (state, type = "fetch") =>
  state.taskTimeline.error[type];

// Get success states
export const selectSuccess = (state, type) => state.taskTimeline.success[type];

// Get comments only (filter out activities)
export const selectCommentsOnly = (state) =>
  state.taskTimeline.items.filter((item) => item.type === "COMMENT");

// Get activities only
export const selectActivitiesOnly = (state) =>
  state.taskTimeline.items.filter((item) => item.type === "ACTIVITY");

// Get total items count
export const selectTotalItemsCount = (state) => state.taskTimeline.items.length;

// ============================================
// EXPORT REDUCER
// ============================================
export default taskTimelineSlice.reducer;
