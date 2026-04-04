import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

/* ─────────────────────────────────────────────
   HELPER
───────────────────────────────────────────── */

const BASE = "/api/reminders";

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

/**
 * GET /api/reminders
 * Fetches the "My Day" view: overdue + today buckets.
 * payload: { bucket_id?, tag_ids?: string[] }
 */
export const fetchMyDay = createAsyncThunk(
  "reminders/fetchMyDay",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.bucket_id) params.set("bucket_id", filters.bucket_id);
      if (filters.tag_ids?.length)
        params.set("tag_ids", filters.tag_ids.join(","));

      const qs = params.toString();
      const { data } = await apiFetch(`${BASE}${qs ? `?${qs}` : ""}`);
      return { data, filters };
    } catch (e) {
      return rejectWithValue(e.message);
    }
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
      return { data, status }; // status 409 = conflict
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
      bucket.items[idx] = updated;
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
        state.myDay.buckets = payload.data.buckets ?? [];
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
          // Conflict — surface to UI, do not add to buckets
          state.conflict = payload.data.conflict;
          return;
        }

        const reminder = payload.data?.reminder;
        if (!reminder) return;

        // Inject into the correct myDay bucket (today or none)
        const due = new Date(reminder.due_at);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        if (due >= startOfToday && due <= endOfToday) {
          const todayBucket = state.myDay.buckets.find(
            (b) => b.key === "today",
          );
          if (todayBucket) {
            todayBucket.items.unshift(reminder);
          }
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
          // Remove from myDay — it's done
          removeReminderFromBuckets(state.myDay.buckets, reminderId);
          // Clear detail if open
          if (state.detail.data?.id === reminderId) {
            state.detail.data = null;
          }
        } else if (action === "SNOOZE" && reminder) {
          // Update snoozed_until in buckets + detail
          patchReminderInBuckets(state.myDay.buckets, reminder);
          if (state.detail.data?.id === reminder.id) {
            state.detail.data = { ...state.detail.data, ...reminder };
          }
        }
      })
      .addCase(reminderLifecycle.rejected, (state, { payload }) => {
        state.lifecycleSubmitting = false;
        state.lifecycleError = payload;
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
