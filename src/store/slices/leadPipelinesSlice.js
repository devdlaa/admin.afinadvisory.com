import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

const BASE = "/api/admin_ops/leads-manager/lead-pipelines";

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

/* ─────────────────────────────────────────────
   THUNKS — PIPELINES
───────────────────────────────────────────── */

export const fetchLeadPipelines = createAsyncThunk(
  "leadPipelines/fetchList",
  async (params = {}, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams();
      if (params.page) qs.append("page", params.page);
      if (params.page_size) qs.append("page_size", params.page_size);
      if (params.search) qs.append("search", params.search);
      if (params.company_profile_id)
        qs.append("company_profile_id", params.company_profile_id);

      const query = qs.toString() ? `?${qs.toString()}` : "";
      return await apiFetch(`${BASE}${query}`);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const fetchLeadPipelineById = createAsyncThunk(
  "leadPipelines/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await apiFetch(`${BASE}/${id}`);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

/**
 * Fetches a pipeline by ID and injects it into the list if not already present.
 * Also sets it as the active pipeline (with stages).
 * Used for: initial URL-based selection, and when user clicks a pipeline in sidebar.
 */
export const fetchAndSetActivePipeline = createAsyncThunk(
  "leadPipelines/fetchAndSetActive",
  async (id, { getState, rejectWithValue }) => {
    try {
      // Check if we already have the full record (with stages) in the current slice
      const state = getState();
      const existing = state.leadPipelines.current.data;
      if (existing?.id === id && Array.isArray(existing.stages)) {
        // Already loaded — just return it so the reducer can set it active
        return existing;
      }
      return await apiFetch(`${BASE}/${id}`);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const createLeadPipeline = createAsyncThunk(
  "leadPipelines/create",
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

export const updateLeadPipeline = createAsyncThunk(
  "leadPipelines/update",
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

export const deleteLeadPipeline = createAsyncThunk(
  "leadPipelines/delete",
  async (id, { rejectWithValue }) => {
    try {
      const data = await apiFetch(`${BASE}/${id}`, { method: "DELETE" });
      return { ...data, id };
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const deleteLeadPipelineStage = createAsyncThunk(
  "leadPipelines/deleteStage",
  async (
    { pipelineId, stageId, migrate_to_stage_id, migrate_to_new_stage_name },
    { rejectWithValue },
  ) => {
    try {
      return await apiFetch(`${BASE}/${pipelineId}/delete-stage`, {
        method: "POST",
        body: JSON.stringify({
          stage_id: stageId,
          ...(migrate_to_stage_id && { migrate_to_stage_id }),
          ...(migrate_to_new_stage_name && { migrate_to_new_stage_name }),
        }),
      });
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const searchLeads = createAsyncThunk(
  "leadPipelines/searchLeads",
  async (params = {}, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams();

      // required
      qs.append("search", params.search);
      qs.append("pipeline_id", params.pipeline_id);
      qs.append("stage_id", params.stage_id);

      // optional
      if (params.priority) qs.append("priority", params.priority);
      if (params.created_by) qs.append("created_by", params.created_by);
      if (params.company_profile_id)
        qs.append("company_profile_id", params.company_profile_id);

      if (params.user_id) qs.append("user_id", params.user_id);

      if (params.page) qs.append("page", params.page);
      if (params.page_size) qs.append("page_size", params.page_size);

      if (params.tags?.length) {
        params.tags.forEach((tag) => qs.append("tags", tag));
      }

      return await apiFetch(
        `/api/admin_ops/leads-manager/leads/search?${qs.toString()}`,
      );
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

/* ─────────────────────────────────────────────
   INITIAL STATE
───────────────────────────────────────────── */

const initialState = {
  list: {
    items: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      page_size: 20,
      total_items: 0,
      total_pages: 1,
      has_more: false,
    },
    search: {
      query: "",
      active: false,
    },
    leadSearch: {
      results: [],
      loading: false,
      error: null,
      page: 1,
      page_size: 10,
      query: "",
    },
  },

  // Full pipeline detail (with stages) for the currently active/viewed pipeline
  current: {
    data: null,
    loading: false,
    error: null,
  },

  submitting: false,
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

/**
 * Upsert a pipeline into the list items array.
 * If already present (by id), replace it; otherwise prepend.
 * Preserves the is_default sort order: default always first.
 */
function upsertIntoList(items, pipeline) {
  const idx = items.findIndex((p) => p.id === pipeline.id);
  let next;
  if (idx !== -1) {
    next = [...items];
    next[idx] = { ...next[idx], ...pipeline };
  } else {
    // Not in list yet (e.g. injected from URL param) — add it
    next = [pipeline, ...items];
  }
  // Re-sort: default always first
  return next.sort((a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return 0;
  });
}

/* ─────────────────────────────────────────────
   SLICE
───────────────────────────────────────────── */

const leadPipelinesSlice = createSlice({
  name: "leadPipelines",
  initialState,

  reducers: {
    setPipelineSearchQuery(state, action) {
      const query = action.payload ?? "";
      state.list.search.query = query;
      state.list.search.active = query.trim().length > 0;
    },

    clearPipelineSearch(state) {
      state.list.search = initialState.list.search;
    },

    clearPipelineError(state) {
      state.list.error = null;
      state.current.error = null;
    },

    clearCurrentPipeline(state) {
      state.current.data = null;
    },
    setLeadSearchQuery(state, action) {
      state.leadSearch.query = action.payload ?? "";
    },

    clearLeadSearch(state) {
      state.leadSearch = initialState.leadSearch;
    },
  },

  extraReducers: (builder) => {
    /* ───── FETCH LIST ───── */
    builder
      .addCase(fetchLeadPipelines.pending, (state) => {
        state.list.loading = true;
        state.list.error = null;
      })
      .addCase(fetchLeadPipelines.fulfilled, (state, { payload }) => {
        state.list.loading = false;
        state.list.items = payload.data;
        state.list.pagination = payload.pagination;

        if (!state.current.data && payload.data?.length > 0) {
          const first = payload.data[0];
          if (Array.isArray(first.stages)) {
            state.current.data = first;
          }
        }
      })
      .addCase(fetchLeadPipelines.rejected, (state, { payload }) => {
        state.list.loading = false;
        state.list.error = payload;
      });

    /* ───── FETCH BY ID (raw, used internally by drawer) ───── */
    builder
      .addCase(fetchLeadPipelineById.pending, (state) => {
        state.current.loading = true;
        state.current.error = null;
      })
      .addCase(fetchLeadPipelineById.fulfilled, (state, { payload }) => {
        state.current.loading = false;
        state.current.data = payload;
      })
      .addCase(fetchLeadPipelineById.rejected, (state, { payload }) => {
        state.current.loading = false;
        state.current.error = payload;
      });

    /* ───── FETCH AND SET ACTIVE (sets current + injects into list) ───── */
    builder
      .addCase(fetchAndSetActivePipeline.pending, (state) => {
        state.current.loading = true;
        state.current.error = null;
      })
      .addCase(fetchAndSetActivePipeline.fulfilled, (state, { payload }) => {
        state.current.loading = false;
        state.current.data = payload;
        // Inject the full object into the list so sidebar shows it
        state.list.items = upsertIntoList(state.list.items, payload);
      })
      .addCase(fetchAndSetActivePipeline.rejected, (state, { payload }) => {
        state.current.loading = false;
        state.current.error = payload;
      });

    /* ───── CREATE ───── */
    builder
      .addCase(createLeadPipeline.pending, (state) => {
        state.submitting = true;
      })
      .addCase(createLeadPipeline.fulfilled, (state, { payload }) => {
        state.submitting = false;
        // The create response wraps the pipeline — handle both shapes
        const pipeline = payload?.pipeline ?? payload;
        state.list.items = upsertIntoList(state.list.items, pipeline);
      })
      .addCase(createLeadPipeline.rejected, (state, { payload }) => {
        state.submitting = false;
        state.list.error = payload;
      });

    /* ───── UPDATE ───── */
    builder
      .addCase(updateLeadPipeline.pending, (state) => {
        state.submitting = true;
      })
      .addCase(updateLeadPipeline.fulfilled, (state, { payload }) => {
        state.submitting = false;

        // When marking default, flip all others off in the list
        if (payload.is_default) {
          state.list.items = state.list.items.map((p) =>
            p.id === payload.id
              ? { ...p, ...payload }
              : { ...p, is_default: false },
          );
        } else {
          const idx = state.list.items.findIndex((p) => p.id === payload.id);
          if (idx !== -1)
            state.list.items[idx] = { ...state.list.items[idx], ...payload };
        }

        // Re-sort so default stays first
        state.list.items = [...state.list.items].sort((a, b) => {
          if (a.is_default && !b.is_default) return -1;
          if (!a.is_default && b.is_default) return 1;
          return 0;
        });

        // Update current if it's the same pipeline
        if (state.current.data?.id === payload.id) {
          state.current.data = { ...state.current.data, ...payload };
        }
      })
      .addCase(updateLeadPipeline.rejected, (state, { payload }) => {
        state.submitting = false;
        state.list.error = payload;
      });

    /* ───── DELETE ───── */
    builder
      .addCase(deleteLeadPipeline.pending, (state) => {
        state.submitting = true;
      })
      .addCase(deleteLeadPipeline.fulfilled, (state, { payload }) => {
        state.submitting = false;
        state.list.items = state.list.items.filter((p) => p.id !== payload.id);
        if (state.current.data?.id === payload.id) {
          state.current.data = null;
        }
      })
      .addCase(deleteLeadPipeline.rejected, (state, { payload }) => {
        state.submitting = false;
        state.list.error = payload;
      });
    /* ───── DELETE STAGE ───── */
    builder
      .addCase(deleteLeadPipelineStage.pending, (state) => {
        state.submitting = true;
      })
      .addCase(deleteLeadPipelineStage.fulfilled, (state, { payload }) => {
        state.submitting = false;
        // API returns the full updated pipeline — replace current and upsert into list
        if (state.current.data?.id === payload.id) {
          state.current.data = payload;
        }
        state.list.items = upsertIntoList(state.list.items, payload);
      })
      .addCase(deleteLeadPipelineStage.rejected, (state, { payload }) => {
        state.submitting = false;
        state.current.error = payload;
      });
    /* ───── LEAD SEARCH ───── */
    builder
      .addCase(searchLeads.pending, (state) => {
        state.leadSearch.loading = true;
        state.leadSearch.error = null;
      })
      .addCase(searchLeads.fulfilled, (state, { payload }) => {
        state.leadSearch.loading = false;
        state.leadSearch.results = payload.results;
        state.leadSearch.page = payload.page;
        state.leadSearch.page_size = payload.page_size;
      })
      .addCase(searchLeads.rejected, (state, { payload }) => {
        state.leadSearch.loading = false;
        state.leadSearch.error = payload;
      });
  },
});

/* ─────────────────────────────────────────────
   ACTIONS
───────────────────────────────────────────── */
export const {
  setPipelineSearchQuery,
  clearPipelineSearch,
  clearPipelineError,
  clearCurrentPipeline,

  setLeadSearchQuery,
  clearLeadSearch,
} = leadPipelinesSlice.actions;

/* ─────────────────────────────────────────────
   SELECTORS
───────────────────────────────────────────── */

const selectPipelines = (state) => state.leadPipelines;

export const selectPipelineList = createSelector(
  selectPipelines,
  (s) => s.list.items,
);

export const selectPipelinePagination = createSelector(
  selectPipelines,
  (s) => s.list.pagination,
);

export const selectPipelineLoading = createSelector(
  selectPipelines,
  (s) => s.list.loading,
);

export const selectPipelineError = createSelector(
  selectPipelines,
  (s) => s.list.error,
);

/** Full pipeline detail currently active (includes stages array) */
export const selectCurrentPipeline = createSelector(
  selectPipelines,
  (s) => s.current.data,
);

export const selectCurrentPipelineLoading = createSelector(
  selectPipelines,
  (s) => s.current.loading,
);

// Stable empty array — returned when there are no stages so the selector
// never produces a new reference on successive calls with the same input.
const EMPTY_STAGES = [];

/** Stages of the active pipeline (open stages only, sorted by order) */
export const selectActivePipelineStages = createSelector(
  selectCurrentPipeline,
  (pipeline) => {
    if (!pipeline?.stages?.length) return EMPTY_STAGES;

    return [...pipeline.stages].sort((a, b) => a.stage_order - b.stage_order);
  },
);

export const selectSubmittingPipeline = createSelector(
  selectPipelines,
  (s) => s.submitting,
);

export const selectPipelineSearchQuery = createSelector(
  selectPipelines,
  (s) => s.list.search.query,
);

export const selectActivePipelineLoading = createSelector(
  selectPipelines,
  (s) => s.current.loading,
);

export const selectLeadSearchResults = createSelector(
  selectPipelines,
  (s) => s.leadSearch.results,
);

export const selectLeadSearchLoading = createSelector(
  selectPipelines,
  (s) => s.leadSearch.loading,
);

export const selectLeadSearchError = createSelector(
  selectPipelines,
  (s) => s.leadSearch.error,
);

export const selectLeadSearchQuery = createSelector(
  selectPipelines,
  (s) => s.leadSearch.query,
);

/* ───────────────────────────────────────────── */

export default leadPipelinesSlice.reducer;
