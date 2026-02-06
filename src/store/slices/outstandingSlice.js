import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

/* ============================================
   API helper
============================================ */

const apiFetch = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  let result;
  try {
    result = await response.json();
  } catch {
    const err = new Error("Invalid server response");
    err.status = response.status;
    throw err;
  }

  if (!response.ok || !result.success) {
    const err = new Error(
      result.error?.message || result.message || "Request failed",
    );
    err.status = response.status;
    err.code = result.error?.code || "UNKNOWN_ERROR";
    err.details = result.error?.details || null;
    throw err;
  }

  return result;
};

/* ============================================
   Async thunks
============================================ */

/**
 * 1️⃣ Global stats (cards)
 * GET /api/admin_ops/outstanding/stats
 */
export const fetchOutstandingStats = createAsyncThunk(
  "outstanding/fetchOutstandingStats",
  async (_, { rejectWithValue }) => {
    try {
      const result = await apiFetch("/api/admin_ops/outstanding/stats");
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch outstanding stats",
        code: error.code,
        details: error.details,
      });
    }
  },
);

/**
 * 2️⃣ Outstanding list (filters + pagination)
 * GET /api/admin_ops/outstanding
 */
export const fetchOutstanding = createAsyncThunk(
  "outstanding/fetchOutstanding",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();

      if (Array.isArray(filters.entity_ids)) {
        filters.entity_ids.forEach((id) => params.append("entity_ids", id));
      }

      if (filters.sort_by) params.append("sort_by", filters.sort_by);
      if (filters.sort_order) params.append("sort_order", filters.sort_order);
      if (filters.page) params.append("page", filters.page);
      if (filters.page_size) params.append("page_size", filters.page_size);

      const result = await apiFetch(
        `/api/admin_ops/outstanding?${params.toString()}`,
      );

      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch outstanding list",
        code: error.code,
        details: error.details,
      });
    }
  },
);

/**
 * 3️⃣ Entity expand breakdown
 * GET /api/admin_ops/outstanding/:id/breakdown
 */
export const fetchEntityBreakdown = createAsyncThunk(
  "outstanding/fetchEntityBreakdown",
  async (entityId, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/admin_ops/outstanding/${entityId}`);

      return {
        entityId,
        breakdown: result.data.breakdown,
      };
    } catch (error) {
      return rejectWithValue({
        entityId,
        message: error.message || "Failed to fetch entity breakdown",
        code: error.code,
        details: error.details,
      });
    }
  },
);

/* ============================================
   Initial state
============================================ */

const initialState = {
  // List
  items: [],
  pagination: {
    page: 1,
    page_size: 20,
    total_items: 0,
    total_pages: 0,
    has_more: false,
  },

  // Cards (global stats)
  cards: {
    total_recoverable: 0,
    uninvoiced: 0,
    draft_invoices: 0,
    issued_pending: 0,
  },

  // Filters
  filters: {
    entity_ids: [],
    sort_by: "total_outstanding",
    sort_order: "desc",
  },

  // Entity expand breakdowns
  breakdowns: {},

  // Loading states
  loadingList: false,
  loadingStats: false,

  error: null,
};

/* ============================================
   Slice
============================================ */

const outstandingSlice = createSlice({
  name: "outstanding",
  initialState,

  reducers: {
    setOutstandingFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetOutstandingFilters: (state) => {
      state.filters = { ...initialState.filters };
    },

    clearOutstandingError: (state) => {
      state.error = null;
    },

    clearEntityBreakdown: (state, action) => {
      delete state.breakdowns[action.payload];
    },

    clearAllBreakdowns: (state) => {
      state.breakdowns = {};
    },
  },

  extraReducers: (builder) => {
    builder
      // ==============================
      // GLOBAL STATS
      // ==============================
      .addCase(fetchOutstandingStats.pending, (state) => {
        state.loadingStats = true;
        state.error = null;
      })
      .addCase(fetchOutstandingStats.fulfilled, (state, action) => {
        state.cards = action.payload;
        state.loadingStats = false;
      })
      .addCase(fetchOutstandingStats.rejected, (state, action) => {
        state.loadingStats = false;
        state.error =
          action.payload?.message || "Failed to fetch outstanding stats";
      })

      // ==============================
      // LIST
      // ==============================
      .addCase(fetchOutstanding.pending, (state) => {
        state.loadingList = true;
        state.error = null;
      })
      .addCase(fetchOutstanding.fulfilled, (state, action) => {
        const { list } = action.payload;
        state.items = list.data;
        state.pagination = list.pagination;
        state.loadingList = false;
      })
      .addCase(fetchOutstanding.rejected, (state, action) => {
        state.loadingList = false;
        state.error =
          action.payload?.message || "Failed to fetch outstanding list";
      })

      // ==============================
      // ENTITY BREAKDOWN
      // ==============================
      .addCase(fetchEntityBreakdown.pending, (state, action) => {
        const entityId = action.meta.arg;
        state.breakdowns[entityId] = {
          data: null,
          loading: true,
          error: null,
        };
      })
      .addCase(fetchEntityBreakdown.fulfilled, (state, action) => {
        const { entityId, breakdown } = action.payload;
        state.breakdowns[entityId] = {
          data: breakdown,
          loading: false,
          error: null,
        };
      })
      .addCase(fetchEntityBreakdown.rejected, (state, action) => {
        const { entityId, message } = action.payload || {};
        if (entityId) {
          state.breakdowns[entityId] = {
            data: null,
            loading: false,
            error: message || "Failed to load breakdown",
          };
        }
      });
  },
});

/* ============================================
   Actions
============================================ */

export const {
  setOutstandingFilters,
  resetOutstandingFilters,
  clearOutstandingError,
  clearEntityBreakdown,
  clearAllBreakdowns,
} = outstandingSlice.actions;

/* ============================================
   Selectors
============================================ */

export const selectOutstandingItems = (state) => state.outstanding.items;

export const selectOutstandingPagination = (state) =>
  state.outstanding.pagination;

export const selectOutstandingFilters = (state) => state.outstanding.filters;

export const selectOutstandingCards = (state) => state.outstanding.cards;

export const selectOutstandingLoadingList = (state) =>
  state.outstanding.loadingList;

export const selectOutstandingLoadingStats = (state) =>
  state.outstanding.loadingStats;

export const selectOutstandingError = (state) => state.outstanding.error;

// Entity breakdown selectors
export const selectEntityBreakdown = (entityId) => (state) =>
  state.outstanding.breakdowns[entityId] || {
    data: null,
    loading: false,
    error: null,
  };

export const selectOutstandingStats = createSelector(
  [selectOutstandingPagination, selectOutstandingItems],
  (pagination, items) => ({
    currentPage: pagination.page,
    itemsPerPage: pagination.page_size,
    totalItems: pagination.total_items,
    totalPages: pagination.total_pages,
    canGoNext: pagination.has_more,
    canGoPrev: pagination.page > 1,
    currentPageSize: items.length,
  }),
);

/* ============================================
   Export reducer
============================================ */

export default outstandingSlice.reducer;
