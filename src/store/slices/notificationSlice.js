import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";
import { playNotificationSound } from "@/utils/client/playNotificationSound";

export const fetchNotifications = createAsyncThunk(
  "notifications/fetch",
  async ({ cursor = null, tab = "unread" } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        limit: "5",
        ...(cursor && { cursor }),
        ...(tab && { tab }),
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
  },
);

export const fetchNotificationMeta = createAsyncThunk(
  "notifications/fetchMeta",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin_ops/notifications/meta");
      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error);
      }

      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const markAsRead = createAsyncThunk(
  "notifications/markAsRead",
  async (notificationId, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/api/admin_ops/notifications/${notificationId}`,
        {
          method: "PATCH",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        return rejectWithValue(data.error);
      }

      return notificationId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const markAllAsRead = createAsyncThunk(
  "notifications/markAllAsRead",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(
        "/api/admin_ops/notifications/mark-all-read",
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        return rejectWithValue(data.error);
      }

      return true;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const notificationSlice = createSlice({
  name: "notifications",
  initialState: {
    lists: {
      all: {
        items: [],
        nextCursor: null,
        isLoading: false,
        isLoadingMore: false,
        hasLoaded: false,
      },
      unread: {
        items: [],
        nextCursor: null,
        isLoading: false,
        isLoadingMore: false,
        hasLoaded: false,
      },
      mentions: {
        items: [],
        nextCursor: null,
        isLoading: false,
        isLoadingMore: false,
        hasLoaded: false,
      },
    },

    error: null,
    isPanelOpen: false,
    highlightBell: false,
    hasLoadedInitial: false,
    isMarkingAllRead: false,
    soundEnabled: true,
    meta: {
      unreadCount: 0,
      lastUnreadAt: null,
      unreadMentionsCount: 0,
      lastMentionAt: null,
    },
    isMetaLoading: false,
    activeTab: "all",
  },
  reducers: {
    togglePanel: (state) => {
      state.isPanelOpen = !state.isPanelOpen;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setSoundEnabled: (state, action) => {
      state.soundEnabled = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "notification_sound_enabled",
          String(action.payload),
        );
      }
    },

    toggleSound: (state) => {
      state.soundEnabled = !state.soundEnabled;
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "notification_sound_enabled",
          String(state.soundEnabled),
        );
      }
    },

    closePanel: (state) => {
      state.isPanelOpen = false;
    },
    openPanel: (state) => {
      state.isPanelOpen = true;
    },
    addNotification: (state, action) => {
      const notif = action.payload;

      const alreadyExists = state.lists.all.items.some(
        (n) => n.id === notif.id,
      );
      if (alreadyExists) return;

      // Always add to "all"
      state.lists.all.items.unshift(notif);

      if (notif.unread) {
        if (notif.is_mention) {
          // BUG FIX: mentions go to meta.unreadMentionsCount and mentions list
          state.meta.unreadMentionsCount += 1;
          state.lists.mentions.items.unshift(notif);
        } else {
          // BUG FIX: non-mentions go to meta.unreadCount and unread list
          state.meta.unreadCount += 1;
          state.lists.unread.items.unshift(notif);
        }
      }

      playNotificationSound(state.soundEnabled);
    },
    // BUG FIX: was referencing state.unreadCount (doesn't exist), correct path is state.meta.unreadCount
    decrementUnreadCount: (state) => {
      state.meta.unreadCount = Math.max(0, state.meta.unreadCount - 1);
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
        const tab = action.meta.arg?.tab || "all";

        if (action.meta.arg?.cursor) {
          state.lists[tab].isLoadingMore = true;
        } else {
          state.lists[tab].isLoading = true;
        }
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        const tab = action.meta.arg?.tab || "all";
        const list = state.lists[tab];

        list.isLoading = false;
        list.isLoadingMore = false;

        if (action.meta.arg?.cursor) {
          list.items = [...list.items, ...action.payload.items];
        } else {
          list.items = action.payload.items;
        }

        list.nextCursor = action.payload.next_cursor;
        list.hasLoaded = true;

        state.error = null;
        state.hasLoadedInitial = true;

        if (state.meta.unreadCount > 0 && !state.isPanelOpen) {
          state.highlightBell = true;
          playNotificationSound(state.soundEnabled);
        }
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        const tab = action.meta.arg?.tab || "all";

        state.lists[tab].isLoading = false;
        state.lists[tab].isLoadingMore = false;
        state.error = action.payload;
      })

      // Mark as read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notificationId = action.payload;

        Object.values(state.lists).forEach((list) => {
          const notification = list.items.find((n) => n.id === notificationId);

          if (notification && notification.unread) {
            notification.unread = false;
            notification.read_at = new Date().toISOString();

            if (notification.is_mention) {
              state.meta.unreadMentionsCount = Math.max(
                0,
                state.meta.unreadMentionsCount - 1,
              );
            } else {
              state.meta.unreadCount = Math.max(0, state.meta.unreadCount - 1);
            }
          }
        });
      })

      .addCase(markAllAsRead.pending, (state) => {
        state.isMarkingAllRead = true;
      })

      // BUG FIX: missing rejected case — isMarkingAllRead would stay true forever on failure
      .addCase(markAllAsRead.rejected, (state) => {
        state.isMarkingAllRead = false;
      })

      .addCase(fetchNotificationMeta.pending, (state) => {
        state.isMetaLoading = true;
      })

      .addCase(fetchNotificationMeta.fulfilled, (state, action) => {
        const data = action.payload;

        state.meta = {
          unreadCount: data.unread_count ?? 0,
          unreadMentionsCount: data.unread_mentions_count ?? 0,
          lastUnreadAt: data.last_unread_at,
          lastMentionAt: data.last_mention_at,
        };

        state.isMetaLoading = false;
      })
      .addCase(fetchNotificationMeta.rejected, (state) => {
        state.isMetaLoading = false;
      })

      // Mark all as read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.isMarkingAllRead = false;

        Object.values(state.lists).forEach((list) => {
          list.items = list.items.map((item) => ({
            ...item,
            unread: false,
            read_at: new Date().toISOString(),
          }));
        });

        state.meta.unreadCount = 0;
        state.meta.unreadMentionsCount = 0;
      });
  },
});

export const {
  setSoundEnabled,
  toggleSound,
  togglePanel,
  closePanel,
  openPanel,
  addNotification,
  decrementUnreadCount,
  clearHighlight,
  highlightBellFromInit,
  setActiveTab,
} = notificationSlice.actions;

const selectNotifications = (state) => state.notifications;

export const selectNotificationMeta = createSelector(
  [selectNotifications],
  (notifications) => notifications.meta,
);

export default notificationSlice.reducer;
