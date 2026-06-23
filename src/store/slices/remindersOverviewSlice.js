import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

import {
  reminderLifecycle,
  updateReminder,
  syncChecklist,
  createReminder,
} from "@/store/slices/remindersSlice";

/* ─────────────────────────────────────────────
   THUNK — fetch a page of reminders for a tab
───────────────────────────────────────────── */

export const fetchOverviewPage = createAsyncThunk(
  "remindersOverview/fetchPage",
  async ({ tab, page, limit = 5 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      params.set("tab", tab);
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("is_overview", "true");

      const res = await fetch(`/api/admin_ops/reminders?${params.toString()}`);
      const json = await res.json();

      if (!json.success) throw new Error(json.error?.message || "Failed");

      // API returns { buckets: [{ key, items, has_more, ... }] }
      const bucket = (json.data.buckets ?? []).find((b) => b.key === tab);

      return {
        tab,
        page,
        items: bucket?.items ?? [],
        hasMore: bucket?.has_more ?? false,
      };
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

/* ─────────────────────────────────────────────
   INITIAL STATE
───────────────────────────────────────────── */

const makeTabState = () => ({
  items: [],
  page: 0, // last fetched page (0 = not yet fetched)
  hasMore: true, // assume more until API says otherwise
  loading: false,
  error: null,
});

const initialState = {
  open: false,
  activeTab: "today",
  reminderAttentionCount: 0,
  tabs: {
    today: makeTabState(),
    overdue: makeTabState(),
  },
};

/* ─────────────────────────────────────────────
   SLICE
───────────────────────────────────────────── */

const remindersOverviewSlice = createSlice({
  name: "remindersOverview",
  initialState,

  reducers: {
    openOverview(state) {
      state.open = true;
    },
    closeOverview(state) {
      state.open = false;
    },
    setOverviewTab(state, { payload }) {
      state.activeTab = payload;
    },
    /** Hard reset — useful if you want to force a refresh */
    resetTab(state, { payload: tab }) {
      state.tabs[tab] = makeTabState();
    },
    resetAll(state) {
      state.tabs.today = makeTabState();
      state.tabs.overdue = makeTabState();
    },
    incrementReminderAttention(state) {
      state.reminderAttentionCount += 1;
    },

    decrementReminderAttention(state) {
      state.reminderAttentionCount += 1;
    },

    clearReminderAttention(state) {
      state.reminderAttentionCount = 0;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchOverviewPage.pending, (state, { meta }) => {
        const tab = meta.arg.tab;
        state.tabs[tab].loading = true;
        state.tabs[tab].error = null;
      })
      .addCase(fetchOverviewPage.fulfilled, (state, { payload }) => {
        const { tab, page, items, hasMore } = payload;
        const tabState = state.tabs[tab];

        tabState.loading = false;
        tabState.hasMore = hasMore;
        tabState.page = page;

        if (page === 1) {
          // Fresh load / reset
          tabState.items = items;
        } else {
          // Append, dedup by id
          const existingIds = new Set(tabState.items.map((i) => i.id));
          const newItems = items?.filter((i) => !existingIds.has(i.id));
          tabState.items = [...tabState.items, ...newItems];
        }
      })
      .addCase(fetchOverviewPage.rejected, (state, { meta, payload }) => {
        const tab = meta.arg.tab;
        state.tabs[tab].loading = false;
        state.tabs[tab].error = payload;
      })
      .addCase(reminderLifecycle.fulfilled, (state, { payload }) => {
        const { reminderId, action, data } = payload;

        if (action === "ACKNOWLEDGE") {
          for (const tab of ["today", "overdue"]) {
            state.tabs[tab].items = state.tabs[tab].items.filter(
              (r) => r.id !== reminderId,
            );
          }
        }

        if (action === "SNOOZE" && data) {
          for (const tab of ["today", "overdue"]) {
            const items = state.tabs[tab].items;
            const idx = items.findIndex((r) => r.id === data.id);

            if (idx !== -1) {
              items[idx] = {
                ...items[idx],
                ...data,
              };
            }
          }
        }
      })
      .addCase(updateReminder.fulfilled, (state, { payload }) => {
        const reminder = payload?.reminder ?? payload;
        if (!reminder) return;

        for (const tab of ["today", "overdue"]) {
          const items = state.tabs[tab].items;
          const idx = items.findIndex((r) => r.id === reminder.id);

          if (idx !== -1) {
            items[idx] = {
              ...items[idx],
              ...reminder,
            };
          }
        }
      })

      .addCase(syncChecklist.fulfilled, (state, { payload }) => {
        const { reminder_id, checklist } = payload;
        if (!reminder_id || !checklist) return;

        for (const tab of ["today", "overdue"]) {
          const items = state.tabs[tab].items;
          const idx = items.findIndex((r) => r.id === reminder_id);

          if (idx !== -1) {
            items[idx] = {
              ...items[idx],
              checklist_items: checklist.map((c) => ({
                id: c.id,
                title: c.title,
                done: c.done,
                order: c.order,
              })),
            };
          }
        }
      })
      .addCase(createReminder.fulfilled, (state, { payload }) => {
        // Ignore conflict
        if (payload.status === 409 || payload.data?.conflict?.exists) {
          return;
        }

        const reminder = payload.data?.reminder;
        if (!reminder) return;

        const due = new Date(reminder.due_at);

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // ── TODAY ──
        if (due >= startOfToday && due <= endOfToday) {
          const tab = state.tabs.today;

          const exists = tab.items.some((r) => r.id === reminder.id);
          if (!exists) {
            tab.items.unshift(reminder);
          }
        }

        // ── OVERDUE ──
        if (due < startOfToday) {
          const tab = state.tabs.overdue;

          const exists = tab.items.some((r) => r.id === reminder.id);
          if (!exists) {
            tab.items.unshift(reminder);
          }
        }
      });
  },
});

/* ─────────────────────────────────────────────
   ACTIONS
───────────────────────────────────────────── */

export const {
  openOverview,
  closeOverview,
  setOverviewTab,
  resetTab,
  resetAll,
  incrementReminderAttention,
  clearReminderAttention,
  decrementReminderAttention,
} = remindersOverviewSlice.actions;

/* ─────────────────────────────────────────────
   SELECTORS
───────────────────────────────────────────── */

const selectOverviewRoot = (state) => state.remindersOverview;

export const selectOverviewOpen = createSelector(
  selectOverviewRoot,
  (s) => s.open,
);

export const selectOverviewActiveTab = createSelector(
  selectOverviewRoot,
  (s) => s.activeTab,
);

export const selectOverviewTabState = (tab) =>
  createSelector(selectOverviewRoot, (s) => s.tabs[tab]);

export const selectOverviewTodayState = createSelector(
  selectOverviewRoot,
  (s) => s.tabs.today,
);

export const selectOverviewOverdueState = createSelector(
  selectOverviewRoot,
  (s) => s.tabs.overdue,
);

export default remindersOverviewSlice.reducer;
