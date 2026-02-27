import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const searchTasksAsync = createAsyncThunk(
  "taskSearch/search",
  async (params, { rejectWithValue, signal }) => {
    try {
      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          searchParams.append(key, value);
        }
      });

      const response = await fetch(
        `/api/admin_ops/tasks/search?${searchParams.toString()}`,
        {
          headers: { "Content-Type": "application/json" },
          signal, // ← abort signal passed here
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw {
          message: result.error?.message || result.message || "Search failed",
          code: result.error?.code || "SEARCH_ERROR",
        };
      }

      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Search failed",
        code: error.code || "UNKNOWN_ERROR",
      });
    }
  },
);

// ============================================
// INITIAL STATE
// ============================================
const initialState = {
  isOpen: false,

  // Search query
  query: "",

  // Filters
  filters: {
    entity_id: null,
    task_category_id: null,
    assigned_to: null,
    status: null,
    priority: null,
    created_date_from: null,
    created_date_to: null,
  },

  // Results
  results: [],
  page: 1,
  page_size: 10,
  hasSearched: false,

  // Loading & error
  loading: false,
  error: null,
};

// ============================================
// SLICE
// ============================================
const taskSearchSlice = createSlice({
  name: "taskSearch",
  initialState,
  reducers: {
    openSearchDialog: (state) => {
      state.isOpen = true;
    },

    closeSearchDialog: (state) => {
      state.isOpen = false;
      // Reset everything on close
      state.query = "";
      state.filters = initialState.filters;
      state.results = [];
      state.hasSearched = false;
      state.error = null;
      state.loading = false;
      state.page = 1;
    },

    setSearchQuery: (state, action) => {
      state.query = action.payload;
    },

    setSearchFilter: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1;
    },

    clearSearchFilters: (state) => {
      state.filters = initialState.filters;
      state.page = 1;
    },

    setSearchPage: (state, action) => {
      state.page = action.payload;
    },

    clearSearchError: (state) => {
      state.error = null;
    },

    // ← new: clears results + resets search state when query is cleared
    clearSearchResults: (state) => {
      state.results = [];
      state.hasSearched = false;
      state.error = null;
      state.loading = false;
      state.page = 1;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(searchTasksAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchTasksAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload.results || [];
        state.page = action.payload.page || 1;
        state.page_size = action.payload.page_size || 10;
        state.hasSearched = true;
      })
      .addCase(searchTasksAsync.rejected, (state, action) => {
        // Silently ignore aborted requests — no error, no state change
        if (action.meta.aborted) return;
        state.loading = false;
        state.error = action.payload?.message || "Search failed";
        state.results = [];
        state.hasSearched = true;
      });
  },
});

// ============================================
// ACTIONS
// ============================================
export const {
  openSearchDialog,
  closeSearchDialog,
  setSearchQuery,
  setSearchFilter,
  clearSearchFilters,
  setSearchPage,
  clearSearchError,
  clearSearchResults,
} = taskSearchSlice.actions;

// ============================================
// SELECTORS
// ============================================
export const selectSearchIsOpen = (state) => state.taskSearch?.isOpen ?? false;
export const selectSearchQuery = (state) => state.taskSearch?.query ?? "";
export const selectSearchFilters = (state) =>
  state.taskSearch?.filters ?? initialState.filters;
export const selectSearchResults = (state) => state.taskSearch?.results ?? [];
export const selectSearchLoading = (state) =>
  state.taskSearch?.loading ?? false;
export const selectSearchError = (state) => state.taskSearch?.error ?? null;
export const selectSearchHasSearched = (state) =>
  state.taskSearch?.hasSearched ?? false;
export const selectSearchPage = (state) => state.taskSearch?.page ?? 1;
export const selectSearchPageSize = (state) =>
  state.taskSearch?.page_size ?? 10;

// ============================================
// EXPORT REDUCER
// ============================================
export default taskSearchSlice.reducer;
