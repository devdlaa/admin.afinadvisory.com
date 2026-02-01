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
   Async thunk
============================================ */

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
      if (filters.charge_type)
        params.append("charge_type", filters.charge_type);

      const result = await apiFetch(
        `/api/admin_ops/outstanding?${params.toString()}`,
      );

      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch outstanding data",
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
  items: [],

  cards: {
    total_pending: 0,
    service_fee_pending: 0,
    government_fee_pending: 0,
    external_charges_pending: 0,
  },

  pagination: {
    page: 1,
    page_size: 20,
    total_items: 0,
    total_pages: 0,
    has_more: false,
  },

  filters: {
    entity_ids: [],
    sort_by: "client_total_outstanding",
    sort_order: "desc",
    charge_type: undefined,
  },

  loading: false,
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
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchOutstanding.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchOutstanding.fulfilled, (state, action) => {
        const { cards, list } = action.payload;
        state.cards = cards;
        state.items = list.data;
        state.pagination = list.pagination;
        state.loading = false;
      })

      .addCase(fetchOutstanding.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload?.message || "Failed to fetch outstanding data";
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
} = outstandingSlice.actions;

/* ============================================
   Selectors
============================================ */

export const selectOutstandingItems = (state) => state.outstanding.items;

export const selectOutstandingCards = (state) => state.outstanding.cards;

export const selectOutstandingPagination = (state) =>
  state.outstanding.pagination;

export const selectOutstandingFilters = (state) => state.outstanding.filters;

export const selectOutstandingLoading = (state) => state.outstanding.loading;

export const selectOutstandingError = (state) => state.outstanding.error;

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
   Card helpers
============================================ */

export const selectOutstandingCardMetrics = createSelector(
  [selectOutstandingCards],
  (cards) => {
    const totalReimbursements =
      cards.government_fee_pending + cards.external_charges_pending;

    return {
      total_pending: cards.total_pending,
      service_fee_pending: cards.service_fee_pending,
      government_fee_pending: cards.government_fee_pending,
      external_charges_pending: cards.external_charges_pending,
      total_reimbursements_pending: totalReimbursements,
    };
  },
);

export const selectOutstandingByCategory = createSelector(
  [selectOutstandingCards],
  (cards) => {
    return [
      {
        label: "Service Fees",
        amount: cards.service_fee_pending,
        percentage:
          cards.total_pending > 0
            ? (cards.service_fee_pending / cards.total_pending) * 100
            : 0,
      },
      {
        label: "Government Fees",
        amount: cards.government_fee_pending,
        percentage:
          cards.total_pending > 0
            ? (cards.government_fee_pending / cards.total_pending) * 100
            : 0,
      },
      {
        label: "External Charges",
        amount: cards.external_charges_pending,
        percentage:
          cards.total_pending > 0
            ? (cards.external_charges_pending / cards.total_pending) * 100
            : 0,
      },
    ];
  },
);

export const setOutstandingChargeType = (type) =>
  setOutstandingFilters({ charge_type: type });

/* ============================================
   Export reducer
============================================ */

export default outstandingSlice.reducer;
