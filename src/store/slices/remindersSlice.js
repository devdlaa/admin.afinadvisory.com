import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";
import { shouldSync, syncToExtension } from "@/utils/reminders/reminderSync";

/* ─────────────────────────────────────────────
   HELPER
───────────────────────────────────────────── */

const BASE = "/api/admin_ops/reminders";

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!json.success) {
    const err = new Error(json.error?.message || "Request failed");
    err.code = json.error?.code;
    err.details = json.error?.details;
    err.status = res.status;
    throw err;
  }
  return { data: json.data, status: res.status };
}

/* ─────────────────────────────────────────────
   THUNKS
───────────────────────────────────────────── */

export const fetchMyDay = createAsyncThunk(
  "reminders/fetchMyDay",
  async (filters = {}) => {
    const { tab, bucket_id, tag_ids, page, limit, ignore_date_filter } =
      filters;

    const params = new URLSearchParams();

    if (tab) params.set("tab", tab);
    if (bucket_id) params.set("bucket_id", bucket_id);
    if (tag_ids?.length) params.set("tag_ids", tag_ids.join(","));
    if (page) params.set("page", page);
    if (limit !== undefined && limit !== null) {
      params.set("limit", String(limit));
    }
    if (ignore_date_filter) {
      params.set("ignore_date_filter", "true");
    }
    const res = await fetch(`/api/admin_ops/reminders?${params.toString()}`);
    const json = await res.json();

    if (!json.success) throw new Error(json.error?.message);

    return {
      buckets: json.data.buckets,
      filters,
    };
  },
);

/**
 * POST /api/reminders
 * payload: createReminderSchema shape
 * Returns { reminder, conflict } — caller must check conflict.exists
 */
export const createReminder = createAsyncThunk(
  "reminders/create",
  async (payload, { rejectWithValue }) => {
    try {
      const { data, status } = await apiFetch(BASE, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return { data, status };
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

/**
 * GET /api/reminders/[id]
 * Fetches full reminder detail (checklist, tags, bucket, recurrence…)
 */
export const fetchReminderDetail = createAsyncThunk(
  "reminders/fetchDetail",
  async (reminderId, { rejectWithValue }) => {
    try {
      const { data } = await apiFetch(`${BASE}/${reminderId}`);
      return data;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

/**
 * PUT /api/reminders/[id]
 * payload: { reminderId, ...updateReminderSchema }
 */
export const updateReminder = createAsyncThunk(
  "reminders/update",
  async ({ reminderId, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await apiFetch(`${BASE}/${reminderId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      return data;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const syncChecklist = createAsyncThunk(
  "reminders/syncChecklist",
  async ({ reminderId, items }, { rejectWithValue }) => {
    try {
      const { data } = await apiFetch(`${BASE}/${reminderId}/checklist`, {
        method: "PATCH",
        body: JSON.stringify({ items }),
      });

      return data;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

/**
 * PUT /api/reminders/[id]/lifecycle
 * payload: { reminderId, action: "SNOOZE" | "ACKNOWLEDGE", ...fields }
 */
export const reminderLifecycle = createAsyncThunk(
  "reminders/lifecycle",
  async ({ reminderId, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await apiFetch(`${BASE}/${reminderId}/lifecycle`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      return { data, reminderId, action: payload.action };
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const fetchWeekBoards = createAsyncThunk(
  "reminders/fetchWeekBoards",
  async (
    { board_keys, bucket_id, tag_ids, limit, cursor } = {},
    { rejectWithValue },
  ) => {
    try {
      const params = new URLSearchParams();
      if (board_keys?.length) params.set("board_keys", board_keys.join(","));
      if (bucket_id) params.set("bucket_id", bucket_id);
      if (tag_ids?.length) params.set("tag_ids", tag_ids.join(","));
      if (limit) params.set("limit", String(limit));
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`${BASE}/weekly-board?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      return json.data; // { boards, next_cursor }
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

/* ─────────────────────────────────────────────
   INITIAL STATE
───────────────────────────────────────────── */

const initialState = {
  // ── My Day ────────────────────────────────
  myDay: {
    buckets: [], // [{ key, label, date, items, page, limit, has_more, filters }]
    loading: false,
    error: null,
    filters: {
      // last applied filters — useful to re-fetch after create
      bucket_id: null,
      tag_ids: [],
    },
  },

  // ── Detail panel ─────────────────────────
  detail: {
    data: null, // full reminder object
    loading: false,
    error: null,
  },
  ui: {
    dialogOpen: false,
    activeReminderId: null,
    mode: "update", // "create" | "update"
  },

  weekBoards: {
    byKey: {},
    loading: false,
    error: null,
  },

  // ── Mutations ─────────────────────────────
  creating: false,
  createError: null,

  updating: false,
  updateError: null,

  lifecycleSubmitting: false, // snooze / acknowledge in-flight
  lifecycleError: null,

  // ── Conflict ─────────────────────────────
  // Populated when POST returns 409
  conflict: null,
  // { exists, reminder: { id, title, due_at }, suggested_times: [] }
};

/* ─────────────────────────────────────────────
   HELPERS (state mutation)
───────────────────────────────────────────── */

/** Replace a reminder inside myDay buckets by id */
const patchReminderInBuckets = (buckets, updated) => {
  for (const bucket of buckets) {
    const idx = bucket.items.findIndex((r) => r.id === updated.id);
    if (idx !== -1) {
      bucket.items[idx] = {
        ...bucket.items[idx],
        ...updated,
      };
      return;
    }
  }
};

/** Remove a reminder from all myDay buckets */
const removeReminderFromBuckets = (buckets, reminderId) => {
  for (const bucket of buckets) {
    bucket.items = bucket.items.filter((r) => r.id !== reminderId);
  }
};

/* ─────────────────────────────────────────────
   SLICE
───────────────────────────────────────────── */

const remindersSlice = createSlice({
  name: "reminders",
  initialState,

  reducers: {
    /** Clear conflict state (e.g. when user dismisses the conflict dialog) */
    clearConflict(state) {
      state.conflict = null;
    },

    /** Clear detail (e.g. when detail panel unmounts) */
    clearDetail(state) {
      state.detail = { data: null, loading: false, error: null };
    },

    clearCreateError(state) {
      state.createError = null;
    },
    clearUpdateError(state) {
      state.updateError = null;
    },
    clearLifecycleError(state) {
      state.lifecycleError = null;
    },

    /** Optimistically remove a reminder from myDay (for instant UI) */
    optimisticRemoveFromMyDay(state, { payload: reminderId }) {
      removeReminderFromBuckets(state.myDay.buckets, reminderId);
    },

    /** Patch active filters so components can read what was last requested */
    setMyDayFilters(state, { payload }) {
      state.myDay.filters = { bucket_id: null, tag_ids: [], ...payload };
    },

    openReminderDialog(state, { payload }) {
      state.ui.dialogOpen = true;
      state.ui.activeReminderId = payload; // reminder id
      state.ui.mode = "update";
    },

    openCreateReminder(state) {
      state.ui.dialogOpen = true;
      state.ui.activeReminderId = null;
      state.ui.mode = "create";
    },

    closeReminderDialog(state) {
      state.ui.dialogOpen = false;
      state.ui.activeReminderId = null;
    },
    syncWeekBoardKeys(state, { payload: keys }) {
      const existing = state.weekBoards.byKey;
      keys.forEach((key) => {
        if (!existing[key]) {
          existing[key] = {
            items: [],
            nextCursor: null,
            hasMore: false,
            loading: false,
            initialLoaded: false,
          };
        }
      });
    },

    resetWeekBoard(state, { payload: key }) {
      state.weekBoards.byKey[key] = {
        items: [],
        nextCursor: null,
        hasMore: false,
        loading: false,
        initialLoaded: false,
      };
    },

    syncAcknowledgeFromExtension: (state, { payload }) => {
      const id = payload.id;

      removeReminderFromBuckets(state.myDay.buckets, id);
    },

    syncSnoozeFromExtension: (state, { payload }) => {
      const reminder = payload;

      patchReminderInBuckets(state.myDay.buckets, reminder);
    },
  },

  extraReducers: (builder) => {
    /* ════════════════════════════════════════
       MY DAY
    ════════════════════════════════════════ */
    builder
      .addCase(fetchMyDay.pending, (state) => {
        state.myDay.loading = true;
        state.myDay.error = null;
      })
      .addCase(fetchMyDay.fulfilled, (state, { payload }) => {
        state.myDay.loading = false;

        const incoming = payload.buckets ?? [];
        const { page = 1 } = payload.filters;

        incoming.forEach((newBucket) => {
          const isAll = payload.filters.ignore_date_filter;

          const key = isAll ? "all" : newBucket.key;

          const existing = state.myDay.buckets.find((b) => b.key === key);

          const bucketData = {
            ...newBucket,
            key, // important
          };

          if (!existing) {
            state.myDay.buckets.push(bucketData);
            return;
          }

          if (page === 1) {
            existing.items = bucketData.items;
          } else {
            const map = new Map();

            [...existing.items, ...bucketData.items].forEach((item) => {
              map.set(item.id, item);
            });

            existing.items = Array.from(map.values());
          }

          existing.has_more = bucketData.has_more;
          existing.page = page;
        });

        state.myDay.filters = {
          bucket_id: payload.filters.bucket_id ?? null,
          tag_ids: payload.filters.tag_ids ?? [],
        };
      })
      .addCase(fetchMyDay.rejected, (state, { payload }) => {
        state.myDay.loading = false;
        state.myDay.error = payload;
      });

    /* ════════════════════════════════════════
       CREATE
    ════════════════════════════════════════ */
    builder
      .addCase(createReminder.pending, (state) => {
        state.creating = true;
        state.createError = null;
        state.conflict = null;
      })
      .addCase(createReminder.fulfilled, (state, { payload }) => {
        state.creating = false;

        if (payload.status === 409 || payload.data?.conflict?.exists) {
          state.conflict = payload.data.conflict;
          return;
        }

        const reminder = payload.data?.reminder;
        if (!reminder) return;

        const due = new Date(reminder.due_at);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        if (due >= startOfToday && due <= endOfToday) {
          const todayBucket = state.myDay.buckets.find(
            (b) => b.key === "today",
          );
          if (todayBucket) todayBucket.items.unshift(reminder);

          // ← also inject into week board "today" slot
          const todaySlot = state.weekBoards.byKey["today"];
          if (todaySlot?.initialLoaded) todaySlot.items.unshift(reminder);
        }

        // ← inject into the correct future day slot if due later this week
        Object.entries(state.weekBoards.byKey).forEach(([key, slot]) => {
          if (key === "today" || !slot?.initialLoaded) return;
          const slotDate = slot.date; // "2026-04-13" etc — stored from API response
          if (!slotDate) return;
          const slotStart = new Date(slotDate);
          slotStart.setHours(0, 0, 0, 0);
          const slotEnd = new Date(slotDate);
          slotEnd.setHours(23, 59, 59, 999);
          if (due >= slotStart && due <= slotEnd) {
            slot.items.unshift(reminder);
          }
        });

        // SYNC TO EXTENTION
        if (shouldSync(reminder)) {
          syncToExtension({
            action: "CREATED",
            payload: reminder,
          });
        }
      })
      .addCase(createReminder.rejected, (state, { payload }) => {
        state.creating = false;
        state.createError = payload;
      });

    /* ════════════════════════════════════════
       DETAIL
    ════════════════════════════════════════ */
    builder
      .addCase(fetchReminderDetail.pending, (state) => {
        state.detail.loading = true;
        state.detail.error = null;
      })
      .addCase(fetchReminderDetail.fulfilled, (state, { payload }) => {
        state.detail.loading = false;
        state.detail.data = payload;
      })
      .addCase(fetchReminderDetail.rejected, (state, { payload }) => {
        state.detail.loading = false;
        state.detail.error = payload;
      });

    /* ════════════════════════════════════════
       UPDATE
    ════════════════════════════════════════ */
    builder
      .addCase(updateReminder.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateReminder.fulfilled, (state, { payload }) => {
        state.updating = false;
        const reminder = payload?.reminder ?? payload;
        if (!reminder) return;

        // Sync detail panel if it's open for this reminder
        if (state.detail.data?.id === reminder.id) {
          state.detail.data = { ...state.detail.data, ...reminder };
        }

        // Sync myDay buckets
        patchReminderInBuckets(state.myDay.buckets, reminder);

        // SYNC TO EXTENTION
        if (shouldSync(reminder)) {
          syncToExtension({
            action: "UPDATED",
            payload: reminder,
          });
        } else {
          syncToExtension({
            action: "REMOVE",
            payload: { id: reminder.id },
          });
        }
      })
      .addCase(updateReminder.rejected, (state, { payload }) => {
        state.updating = false;
        state.updateError = payload;
      });

    /* ════════════════════════════════════════
       LIFECYCLE  (snooze / acknowledge)
    ════════════════════════════════════════ */
    builder
      .addCase(reminderLifecycle.pending, (state) => {
        state.lifecycleSubmitting = true;
        state.lifecycleError = null;
      })
      .addCase(reminderLifecycle.fulfilled, (state, { payload }) => {
        state.lifecycleSubmitting = false;
        const { data, reminderId, action } = payload;
        const reminder = data?.reminder ?? data;

        if (action === "ACKNOWLEDGE") {
          removeReminderFromBuckets(state.myDay.buckets, reminderId);
          if (state.detail.data?.id === reminderId) state.detail.data = null;

          // ← also remove from week boards
          Object.values(state.weekBoards.byKey).forEach((slot) => {
            slot.items = slot.items.filter((r) => r.id !== reminderId);
          });

          syncToExtension({
            action: "ACKNOWLEDGE",
            payload: { id: payload.reminderId },
          });
        } else if (action === "SNOOZE" && reminder) {
          patchReminderInBuckets(state.myDay.buckets, reminder);
          if (state.detail.data?.id === reminder.id) {
            state.detail.data = { ...state.detail.data, ...reminder };
          }

          Object.values(state.weekBoards.byKey).forEach((slot) => {
            const idx = slot.items.findIndex((r) => r.id === reminder.id);
            if (idx !== -1)
              slot.items[idx] = { ...slot.items[idx], ...reminder };
          });

          if (shouldSync(reminder)) {
            syncToExtension({
              action: "SNOOZE",
              payload: reminder,
            });
          }
        }
      })
      .addCase(reminderLifecycle.rejected, (state, { payload }) => {
        state.lifecycleSubmitting = false;
        state.lifecycleError = payload;
      });

    builder
      .addCase(syncChecklist.fulfilled, (state, { payload }) => {
        if (!payload?.checklist || !state.detail.data) return;
        if (state.detail.data.id === payload.reminder_id) {
          state.detail.data.checklist_items = payload.checklist.map((i) => ({
            id: i.id,
            title: i.title,
            is_done: i.done,
            order: i.order,
          }));
        }
      })
      .addCase(syncChecklist.rejected, (state, { payload }) => {
        console.error("Checklist sync failed:");
      });

    /* ════════════════════════════════════════
   WEEK BOARDS
════════════════════════════════════════ */
    builder
      .addCase(fetchWeekBoards.pending, (state, { meta }) => {
        const keys = meta.arg.board_keys ?? [];
        keys.forEach((key) => {
          if (state.weekBoards.byKey[key]) {
            state.weekBoards.byKey[key].loading = true;
          }
        });
        state.weekBoards.error = null;
      })
      .addCase(fetchWeekBoards.fulfilled, (state, { payload }) => {
        payload.boards.forEach((board) => {
          const slot = state.weekBoards.byKey[board.key];
          if (!slot) return;

          if (!slot.initialLoaded) {
            slot.items = board.items;
            slot.initialLoaded = true;
          } else {
            // load more — append deduped
            const existingIds = new Set(slot.items.map((r) => r.id));
            const fresh = board.items.filter((r) => !existingIds.has(r.id));
            slot.items.push(...fresh);
          }

          slot.nextCursor = board.next_cursor ?? null;
          slot.hasMore = board.has_more;
          slot.loading = false;
        });
      })
      .addCase(fetchWeekBoards.rejected, (state, { meta, payload }) => {
        const keys = meta.arg.board_keys ?? [];
        keys.forEach((key) => {
          if (state.weekBoards.byKey[key]) {
            state.weekBoards.byKey[key].loading = false;
          }
        });
        state.weekBoards.error = payload;
      });
  },
});

/* ─────────────────────────────────────────────
   ACTIONS
───────────────────────────────────────────── */

export const {
  clearConflict,
  clearDetail,
  clearCreateError,
  clearUpdateError,
  clearLifecycleError,
  optimisticRemoveFromMyDay,
  setMyDayFilters,
  openReminderDialog,
  openCreateReminder,
  closeReminderDialog,
  syncWeekBoardKeys,
  resetWeekBoard,
  syncAcknowledgeFromExtension,
  syncSnoozeFromExtension,
} = remindersSlice.actions;

/* ─────────────────────────────────────────────
   BASE SELECTOR
───────────────────────────────────────────── */

const selectReminders = (state) => state.reminders;

/* ─────────────────────────────────────────────
   MY DAY SELECTORS
───────────────────────────────────────────── */

export const selectMyDaySlice = createSelector(selectReminders, (s) => s.myDay);

export const selectMyDayBuckets = createSelector(
  selectMyDaySlice,
  (m) => m.buckets,
);

export const selectMyDayLoading = createSelector(
  selectMyDaySlice,
  (m) => m.loading,
);

export const selectMyDayError = createSelector(
  selectMyDaySlice,
  (m) => m.error,
);

export const selectMyDayFilters = createSelector(
  selectMyDaySlice,
  (m) => m.filters,
);

/** { key → bucket } map for O(1) lookup by key ("today", "overdue") */
export const selectMyDayBucketMap = createSelector(
  selectMyDayBuckets,
  (buckets) => Object.fromEntries(buckets.map((b) => [b.key, b])),
);

export const selectOverdueBucket = createSelector(
  selectMyDayBucketMap,
  (map) => map.overdue ?? null,
);

export const selectTodayBucket = createSelector(
  selectMyDayBucketMap,
  (map) => map.today ?? null,
);

/** Total PENDING count across all myDay buckets */
export const selectMyDayTotalCount = createSelector(
  selectMyDayBuckets,
  (buckets) => buckets.reduce((sum, b) => sum + b.items.length, 0),
);

/* ─────────────────────────────────────────────
   DETAIL SELECTORS
───────────────────────────────────────────── */

export const selectDetailSlice = createSelector(
  selectReminders,
  (s) => s.detail,
);

export const selectDetailData = createSelector(
  selectDetailSlice,
  (d) => d.data,
);
export const selectDetailLoading = createSelector(
  selectDetailSlice,
  (d) => d.loading,
);
export const selectDetailError = createSelector(
  selectDetailSlice,
  (d) => d.error,
);

export const selectReminderUI = createSelector(selectReminders, (s) => s.ui);

export const selectDialogOpen = createSelector(
  selectReminderUI,
  (ui) => ui.dialogOpen,
);

export const selectActiveReminderId = createSelector(
  selectReminderUI,
  (ui) => ui.activeReminderId,
);

export const selectDialogMode = createSelector(
  selectReminderUI,
  (ui) => ui.mode,
);

/* ─────────────────────────────────────────────
   MUTATION SELECTORS
───────────────────────────────────────────── */

export const selectCreating = createSelector(
  selectReminders,
  (s) => s.creating,
);
export const selectCreateError = createSelector(
  selectReminders,
  (s) => s.createError,
);

export const selectUpdating = createSelector(
  selectReminders,
  (s) => s.updating,
);
export const selectUpdateError = createSelector(
  selectReminders,
  (s) => s.updateError,
);

export const selectLifecycleSubmitting = createSelector(
  selectReminders,
  (s) => s.lifecycleSubmitting,
);
export const selectLifecycleError = createSelector(
  selectReminders,
  (s) => s.lifecycleError,
);

/* ─────────────────────────────────────────────
   CONFLICT SELECTORS
───────────────────────────────────────────── */

export const selectConflict = createSelector(
  selectReminders,
  (s) => s.conflict,
);
export const selectConflictExists = createSelector(
  selectConflict,
  (c) => !!c?.exists,
);

/* ─────────────────────────────────────────────
   WEEK BOARD SELECTORS
───────────────────────────────────────────── */

const selectWeekBoards = createSelector(selectReminders, (s) => s.weekBoards);

export const selectBoardSlot = (key) =>
  createSelector(
    selectWeekBoards,
    (wb) =>
      wb.byKey[key] ?? {
        items: [],
        nextCursor: null,
        hasMore: false,
        loading: false,
        initialLoaded: false,
      },
  );

export const selectBoardItems = (key) =>
  createSelector(selectBoardSlot(key), (slot) => slot.items);

export const selectBoardLoading = (key) =>
  createSelector(selectBoardSlot(key), (slot) => slot.loading);

export const selectBoardHasMore = (key) =>
  createSelector(selectBoardSlot(key), (slot) => slot.hasMore);

export const selectBoardCursor = (key) =>
  createSelector(selectBoardSlot(key), (slot) => slot.nextCursor);

export const selectBoardInitialLoaded = (key) =>
  createSelector(selectBoardSlot(key), (slot) => slot.initialLoaded);

/* ─────────────────────────────────────────────
   COMBINED / CONVENIENCE
───────────────────────────────────────────── */

/** True while any write operation is in-flight */
export const selectAnySubmitting = createSelector(
  selectCreating,
  selectUpdating,
  selectLifecycleSubmitting,
  (c, u, l) => c || u || l,
);

export default remindersSlice.reducer;
