import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { playNotificationSound } from "@/utils/client/playNotificationSound";
export const fetchNotifications = createAsyncThunk(
  "notifications/fetch",
  async ({ cursor = null, unread = false } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        limit: "20",
        ...(cursor && { cursor }),
        ...(unread && { unread: "true" }),
      });

      const response = await fetch(`/api/admin_ops/notifications?${params}`);
      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error);
      }

      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
export const markAsRead = createAsyncThunk(
  "notifications/markAsRead",
  async (notificationId, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/api/admin_ops/notifications/${notificationId}`,
        {
          method: "PATCH",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        return rejectWithValue(data.error);
      }

      return notificationId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  "notifications/markAllAsRead",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(
        "/api/admin_ops/notifications/mark-all-read",
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        return rejectWithValue(data.error);
      }

      return true;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const notificationSlice = createSlice({
  name: "notifications",
  initialState: {
    items: [],
    unreadCount: 0,
    nextCursor: null,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    isPanelOpen: false,
    highlightBell: false,
    hasLoadedInitial: false,
    isMarkingAllRead: false,
  },
  reducers: {
    togglePanel: (state) => {
      state.isPanelOpen = !state.isPanelOpen;
    },
    closePanel: (state) => {
      state.isPanelOpen = false;
    },
    openPanel: (state) => {
      state.isPanelOpen = true;
    },
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      if (action.payload.unread) {
        state.unreadCount += 1;
        state.highlightBell = true;
      }
      playNotificationSound();
    },
    decrementUnreadCount: (state) => {
      state.unreadCount = Math.max(0, state.unreadCount - 1);
    },
    clearHighlight: (state) => {
      state.highlightBell = false;
    },
    highlightBellFromInit: (state) => {
      if (!state.isPanelOpen) {
        state.highlightBell = true;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state, action) => {
        if (action.meta.arg?.cursor) {
          state.isLoadingMore = true;
        } else {
          state.isLoading = true;
        }
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isLoadingMore = false;

        if (action.meta.arg?.cursor) {
          state.items = [...state.items, ...action.payload.items];
        } else {
          state.items = action.payload.items;
        }

        state.nextCursor = action.payload.next_cursor;
        state.unreadCount = action.payload.unread_count;
        state.error = null;
        state.hasLoadedInitial = true;

        if (state.unreadCount > 0 && !state.isPanelOpen) {
          state.highlightBell = true;
          playNotificationSound();
        }
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoadingMore = false;
        state.error = action.payload;
      })

      // Mark as read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notificationId = action.payload;
        const notification = state.items.find((n) => n.id === notificationId);

        if (notification && notification.unread) {
          notification.unread = false;
          notification.read_at = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })

      .addCase(markAllAsRead.pending, (state, action) => {
        state.isMarkingAllRead = true;
      })

      // Mark all as read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.isMarkingAllRead = false;
        state.items = state.items.map((item) => ({
          ...item,
          unread: false,
          read_at: new Date().toISOString(),
        }));
        state.unreadCount = 0;
      });
  },
});

export const {
  togglePanel,
  closePanel,
  openPanel,
  addNotification,
  decrementUnreadCount,
  clearHighlight,
  highlightBellFromInit,
} = notificationSlice.actions;

export default notificationSlice.reducer;
