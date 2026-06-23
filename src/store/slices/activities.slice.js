import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

/* ============================
   Shared fetch helper
============================ */

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("Invalid server response");
  }

  if (!res.ok || !json.success) {
    const err = new Error(json?.error?.message || "Request failed");
    err.code = json?.error?.code;
    err.status = res.status;
    throw err;
  }

  return json.data;
}

/* ============================
   Thunks — List
============================ */

export const fetchActivities = createAsyncThunk(
  "activities/fetch",
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(
        `/api/admin_ops/leads-manager/leads/activities?${query}`,
      );
      const json = await res.json();
      if (!json.success) return rejectWithValue(json.error);
      return { data: json.data, params };
    } catch (err) {
      return rejectWithValue({ message: err.message });
    }
  },
);

/* ============================
   Thunks — Activity mutations
============================ */

export const updateActivity = createAsyncThunk(
  "activities/updateActivity",
  async ({ leadId, activityId, payload }, { rejectWithValue }) => {
    try {
      return await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/activities/${activityId}`,
        { method: "PATCH", body: JSON.stringify(payload) },
      );
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const updateActivityLifecycle = createAsyncThunk(
  "activities/updateActivityLifecycle",
  async ({ leadId, activityId, payload }, { rejectWithValue }) => {
    try {
      return await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/activities/${activityId}/lifecycle`,
        { method: "PATCH", body: JSON.stringify(payload) },
      );
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const fetchActivityEmail = createAsyncThunk(
  "activities/fetchActivityEmail",
  async ({ leadId, activityId }, { rejectWithValue }) => {
    try {
      return await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/activities/${activityId}/email`,
      );
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const updateActivityEmail = createAsyncThunk(
  "activities/updateActivityEmail",
  async ({ leadId, activityId, payload }, { rejectWithValue }) => {
    try {
      return await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/activities/${activityId}/email`,
        { method: "PATCH", body: JSON.stringify(payload) },
      );
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

/* ============================
   Helper — patch a single item across all cached pages
============================ */

function patchItemInPages(state, updated) {
  state.pages = state.pages.map((page) =>
    page.map((item) => (item.id === updated.id ? updated : item)),
  );
  state.items = state.items.map((item) =>
    item.id === updated.id ? updated : item,
  );
}

/* ============================
   Initial State
============================ */

const initialState = {
  // pagination
  pages: [],
  cursors: [],
  currentPage: 0,
  items: [],
  next_cursor: null,

  // email detail for the open activity
  activityEmail: null,

  loading: {
    list: false,
    updateActivity: false,
    updateLifecycle: false,
    email: false,
    updateEmail: false,
  },

  error: {
    list: null,
    updateActivity: null,
    updateLifecycle: null,
    email: null,
    updateEmail: null,
  },
};

/* ============================
   Slice
============================ */

const activitiesSlice = createSlice({
  name: "activities",
  initialState,
  reducers: {
    resetActivities: () => initialState,
    resetActivityEmail: (state) => {
      state.activityEmail = null;
    },
    prevPage: (state) => {
      if (state.currentPage <= 0) return;
      state.currentPage -= 1;
      state.items = state.pages[state.currentPage];
      state.next_cursor = state.cursors[state.currentPage] ?? null;
    },
  },
  extraReducers: (builder) => {
    /* ── fetch list ── */
    builder
      .addCase(fetchActivities.pending, (state) => {
        state.loading.list = true;
        state.error.list = null;
      })
      .addCase(fetchActivities.fulfilled, (state, action) => {
        state.loading.list = false;
        const { items, next_cursor } = action.payload.data;
        const params = action.payload.params;

        if (params?.cursor_id) {
          state.pages = state.pages.slice(0, state.currentPage + 1);
          state.cursors = state.cursors.slice(0, state.currentPage + 1);
          state.cursors[state.currentPage] = {
            cursor_scheduled_at: params.cursor_scheduled_at,
            cursor_id: params.cursor_id,
          };
          state.pages.push(items);
          state.currentPage = state.pages.length - 1;
        } else {
          state.pages = [items];
          state.cursors = [];
          state.currentPage = 0;
        }

        state.items = state.pages[state.currentPage];
        state.next_cursor = next_cursor;
      })
      .addCase(fetchActivities.rejected, (state, action) => {
        state.loading.list = false;
        state.error.list = action.payload || { message: "Failed" };
      });

    /* ── update activity ── */
    builder
      .addCase(updateActivity.pending, (state) => {
        state.loading.updateActivity = true;
        state.error.updateActivity = null;
      })
      .addCase(updateActivity.fulfilled, (state, action) => {
        state.loading.updateActivity = false;
        patchItemInPages(state, action.payload);
      })
      .addCase(updateActivity.rejected, (state, action) => {
        state.loading.updateActivity = false;
        state.error.updateActivity = action.payload;
      });

    /* ── update lifecycle ── */
    builder
      .addCase(updateActivityLifecycle.pending, (state) => {
        state.loading.updateLifecycle = true;
        state.error.updateLifecycle = null;
      })
      .addCase(updateActivityLifecycle.fulfilled, (state, action) => {
        state.loading.updateLifecycle = false;
        patchItemInPages(state, action.payload);
      })
      .addCase(updateActivityLifecycle.rejected, (state, action) => {
        state.loading.updateLifecycle = false;
        state.error.updateLifecycle = action.payload;
      });

    /* ── fetch email ── */
    builder
      .addCase(fetchActivityEmail.pending, (state) => {
        state.loading.email = true;
        state.error.email = null;
      })
      .addCase(fetchActivityEmail.fulfilled, (state, action) => {
        state.loading.email = false;
        state.activityEmail = action.payload;
      })
      .addCase(fetchActivityEmail.rejected, (state, action) => {
        state.loading.email = false;
        state.error.email = action.payload;
      });

    /* ── update email ── */
    builder
      .addCase(updateActivityEmail.pending, (state) => {
        state.loading.updateEmail = true;
        state.error.updateEmail = null;
      })
      .addCase(updateActivityEmail.fulfilled, (state, action) => {
        state.loading.updateEmail = false;
        state.activityEmail = action.payload;
      })
      .addCase(updateActivityEmail.rejected, (state, action) => {
        state.loading.updateEmail = false;
        state.error.updateEmail = action.payload;
      });
  },
});

export const { resetActivities, prevPage, resetActivityEmail } =
  activitiesSlice.actions;
export default activitiesSlice.reducer;

/* ============================
   Selectors
============================ */

const sel = (state) => state.activities;

export const selectActivities = createSelector([sel], (s) => s.items);
export const selectActivitiesLoading = createSelector(
  [sel],
  (s) => s.loading.list,
);
export const selectActivitiesError = createSelector([sel], (s) => s.error.list);
export const selectNextCursor = createSelector([sel], (s) => s.next_cursor);
export const selectCurrentPage = createSelector([sel], (s) => s.currentPage);
export const selectTotalPages = createSelector([sel], (s) => s.pages.length);
export const selectHasPrevPage = createSelector(
  [sel],
  (s) => s.currentPage > 0,
);
export const selectActivityEmail = createSelector(
  [sel],
  (s) => s.activityEmail,
);
export const selectMutationLoading = createSelector([sel], (s) => s.loading);
