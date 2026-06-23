import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

const BASE = "/api/admin_ops/leads-manager/influencers";

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
    err.details = json?.error?.details;
    err.status = res.status;
    throw err;
  }

  return json.data;
}

export const fetchInfluencers = createAsyncThunk(
  "influencers/fetchList",
  async (params = {}, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams();
      if (params.cursor) qs.append("cursor", params.cursor);
      if (params.page_size) qs.append("page_size", params.page_size);
      if (params.search) qs.append("search", params.search);
      if (params.sort_by) qs.append("sort_by", params.sort_by);
      if (params.sort_order) qs.append("sort_order", params.sort_order);
      const query = qs.toString() ? `?${qs.toString()}` : "";
      return await apiFetch(`${BASE}${query}`);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const searchInfluencers = createAsyncThunk(
  "influencers/search",
  async (params = {}, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams();
      if (params.search) qs.append("search", params.search);
      if (params.page_size) qs.append("page_size", params.page_size);
      qs.append("compact", "1");
      return await apiFetch(`${BASE}?${qs.toString()}`);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const fetchInfluencerById = createAsyncThunk(
  "influencers/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await apiFetch(`${BASE}/${id}`);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const createInfluencer = createAsyncThunk(
  "influencers/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await apiFetch(`${BASE}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const updateInfluencer = createAsyncThunk(
  "influencers/update",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      return await apiFetch(`${BASE}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const deleteInfluencer = createAsyncThunk(
  "influencers/delete",
  async (id, { rejectWithValue }) => {
    try {
      const data = await apiFetch(`${BASE}/${id}`, { method: "DELETE" });
      return { ...data, id };
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

const initialState = {
  list: {
    items: [],
    loading: false,
    error: null,
    pagination: { next_cursor: null, has_more: false },
  },
  searchList: {
    items: [],
    loading: false,
    error: null,
  },
  current: {
    data: null,
    loading: false,
    error: null,
  },
  submitting: false,
};

const influencerSlice = createSlice({
  name: "influencers",
  initialState,

  reducers: {
    clearInfluencerError(state) {
      state.list.error = null;
      state.current.error = null;
      state.searchList.error = null;
    },
    clearCurrentInfluencer(state) {
      state.current.data = null;
    },
    resetInfluencerList(state) {
      state.list.items = [];
      state.list.pagination = { next_cursor: null, has_more: false };
    },
  },

  extraReducers: (builder) => {
    /* ── LIST ── */
    builder
      .addCase(fetchInfluencers.pending, (state) => {
        state.list.loading = true;
        state.list.error = null;
      })
      .addCase(fetchInfluencers.fulfilled, (state, { payload, meta }) => {
        state.list.loading = false;
        const incoming = payload.data;
        // Only append when a cursor was sent (load-more). Fresh fetches always replace.
        if (meta.arg.cursor) {
          state.list.items = [...state.list.items, ...incoming];
        } else {
          state.list.items = incoming;
        }
        state.list.pagination = payload.pagination;
      })
      .addCase(fetchInfluencers.rejected, (state, { payload }) => {
        state.list.loading = false;
        state.list.error = payload;
      });

    /* ── SEARCH ── */
    builder
      .addCase(searchInfluencers.pending, (state) => {
        state.searchList.loading = true;
        state.searchList.error = null;
      })
      .addCase(searchInfluencers.fulfilled, (state, { payload }) => {
        state.searchList.loading = false;
        state.searchList.items = payload.data;
      })
      .addCase(searchInfluencers.rejected, (state, { payload }) => {
        state.searchList.loading = false;
        state.searchList.error = payload;
      });

    /* ── GET BY ID ── */
    builder
      .addCase(fetchInfluencerById.pending, (state) => {
        state.current.loading = true;
        state.current.error = null;
      })
      .addCase(fetchInfluencerById.fulfilled, (state, { payload }) => {
        state.current.loading = false;
        state.current.data = payload;
      })
      .addCase(fetchInfluencerById.rejected, (state, { payload }) => {
        state.current.loading = false;
        state.current.error = payload;
      });

    /* ── CREATE ──
       FIX 5: Don't optimistically unshift into a mid-pagination list.
       The page component always calls doFetch({ reset: true }) after a
       successful create, so the list will be refreshed with correct server
       ordering. We only clear submitting here. */
    builder
      .addCase(createInfluencer.pending, (state) => {
        state.submitting = true;
      })
      .addCase(createInfluencer.fulfilled, (state) => {
        state.submitting = false;
        // List refresh is handled by the page component to keep pagination consistent.
      })
      .addCase(createInfluencer.rejected, (state, { payload }) => {
        state.submitting = false;
        state.list.error = payload;
      });

    /* ── UPDATE ── */
    builder
      .addCase(updateInfluencer.pending, (state) => {
        state.submitting = true;
      })
      .addCase(updateInfluencer.fulfilled, (state, { payload }) => {
        state.submitting = false;
        const idx = state.list.items.findIndex((i) => i.id === payload.id);
        if (idx !== -1) state.list.items[idx] = payload;
        if (state.current.data?.id === payload.id) state.current.data = payload;
      })
      .addCase(updateInfluencer.rejected, (state, { payload }) => {
        state.submitting = false;
        state.list.error = payload;
      });

    /* ── DELETE ──
       FIX 3 (slice side): only remove the item on success. Error handling
       (showing message, keeping dialog open) is done in the page component. */
    builder
      .addCase(deleteInfluencer.pending, (state) => {
        state.submitting = true;
      })
      .addCase(deleteInfluencer.fulfilled, (state, { payload }) => {
        state.submitting = false;
        state.list.items = state.list.items.filter((i) => i.id !== payload.id);
      })
      .addCase(deleteInfluencer.rejected, (state, { payload }) => {
        state.submitting = false;
        // Do NOT write to list.error here — the page component surfaces the
        // error in the confirmation dialog instead.
        state.list.error = payload;
      });
  },
});

export const {
  clearInfluencerError,
  clearCurrentInfluencer,
  resetInfluencerList,
} = influencerSlice.actions;

const selectInfluencers = (state) => state.influencers_new;

export const selectInfluencerList = createSelector(
  selectInfluencers,
  (s) => s.list.items,
);
export const selectInfluencerPagination = createSelector(
  selectInfluencers,
  (s) => s.list.pagination,
);
export const selectInfluencerLoading = createSelector(
  selectInfluencers,
  (s) => s.list.loading,
);
export const selectInfluencerSearchList = createSelector(
  selectInfluencers,
  (s) => s.searchList.items,
);
export const selectInfluencerSearchLoading = createSelector(
  selectInfluencers,
  (s) => s.searchList.loading,
);
export const selectCurrentInfluencer = createSelector(
  selectInfluencers,
  (s) => s.current.data,
);
export const selectCurrentInfluencerLoading = createSelector(
  selectInfluencers,
  (s) => s.current.loading,
);
export const selectSubmittingInfluencer = createSelector(
  selectInfluencers,
  (s) => s.submitting,
);

export default influencerSlice.reducer;
