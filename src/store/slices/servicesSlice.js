import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Async thunks for API calls
export const fetchBookings = createAsyncThunk(
  "services/fetchBookings",
  async ({ cursor = null, limit = 10 }, { rejectWithValue }) => {
    const payload = cursor ? { limit, cursor } : { limit };
    try {
      const response = await fetch("/api/admin/services/get_services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch bookings");
      }

      return {
        bookings: data.bookings,
        hasMore: data.hasMore,
        cursor: data.cursor,
        resultsCount: data.resultsCount,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const searchBookings = createAsyncThunk(
  "services/searchBookings",
  async ({ value, field }, { getState, rejectWithValue }) => {
    try {
      const state = getState().services;
      const { allBookings } = state;

      // --- 1. Local Search First ---
      function getNestedValue(obj, path) {
        return path.split(".").reduce((acc, key) => acc?.[key], obj);
      }

      const query = value.toLowerCase();
      const localMatches = allBookings.filter((booking) => {
        const fieldValue = getNestedValue(booking, field);
        return fieldValue?.toString().toLowerCase().includes(query);
      });

      if (localMatches.length > 0) {
        // ✅ Found locally → return directly
        return {
          success: true,
          matchedField: field,
          queryValue: value,
          resultsCount: localMatches.length,
          bookings: localMatches,
          fromCache: true,
        };
      }

      const response = await fetch("/api/admin/services/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Search failed");
      }

      return {
        success: data.success,
        matchedField: data.matchedField || field,
        queryValue: data.queryValue || value,
        resultsCount: data.resultsCount,
        bookings: data.bookings || [],
        meta: data.meta,
        fromCache: false,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const filterBookings = createAsyncThunk(
  "services/filterBookings",
  async ({ mode = "filter", filters }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/services/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Filter failed");
      }

      return {
        mode,
        filters: data.filters,
        resultsCount: data.resultsCount,
        bookings: data.bookings,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  bookings: [], // Current page bookings to display
  allBookings: [], // All fetched bookings cache

  // Pagination
  currentPage: 1,
  itemsPerPage: 10,
  hasMore: false,
  cursor: null,

  // Loading
  loading: false,
  loadingNext: false,
  selectedBookings: null,
  // Other states
  filteredBookings: [],
  searchedBookings: [],
  quickViewData: null,

  isSearchActive: false,
  isFilterActive: false,
  currentSearch: {
    query: "",
    field: "service_booking_id",
  },
  currentFilters: null,
  exportData: [],
  exportCount: null,
  error: null,
  searchLoading: false,
  filterLoading: false,
  exportLoading: false,
};

const servicesSlice = createSlice({
  name: "services",
  initialState,
  reducers: {
    // Pagination actions
    goToNextPage: (state) => {
      const nextPage = state.currentPage + 1;
      const startIndex = (nextPage - 1) * state.itemsPerPage;
      const endIndex = startIndex + state.itemsPerPage;

      // Handle pagination for different states
      if (state.isSearchActive) {
        // Paginate through search results
        state.currentPage = nextPage;
        state.bookings = state.searchedBookings.slice(startIndex, endIndex);
        return;
      }

      if (state.isFilterActive) {
        // Paginate through filtered results
        state.currentPage = nextPage;
        state.bookings = state.filteredBookings.slice(startIndex, endIndex);
        return;
      }

      // Regular pagination
      if (state.allBookings.length >= endIndex) {
        state.bookings = state.allBookings.slice(startIndex, endIndex);
        state.currentPage = nextPage;
      } else if (state.allBookings.length >= startIndex) {
        state.bookings = state.allBookings.slice(startIndex);
        state.currentPage = nextPage;
      } else {
        state.bookings = [];
        state.currentPage = nextPage;
      }
    },

    goToPrevPage: (state) => {
      if (state.currentPage <= 1) return;

      const prevPage = state.currentPage - 1;
      const startIndex = (prevPage - 1) * state.itemsPerPage;
      const endIndex = startIndex + state.itemsPerPage;

      state.currentPage = prevPage;

      // Handle pagination for different states
      if (state.isSearchActive) {
        state.bookings = state.searchedBookings.slice(startIndex, endIndex);
        return;
      }

      if (state.isFilterActive) {
        state.bookings = state.filteredBookings.slice(startIndex, endIndex);
        return;
      }

      // Regular pagination
      state.bookings = state.allBookings.slice(startIndex, endIndex);
    },

    setItemsPerPage: (state, action) => {
      const newLimit = action.payload;
      state.itemsPerPage = newLimit;
      state.currentPage = 1;

      // Update current view with new limit
      const endIndex = newLimit;
      if (state.isSearchActive) {
        state.bookings = state.searchedBookings.slice(0, endIndex);
      } else if (state.isFilterActive) {
        state.bookings = state.filteredBookings.slice(0, endIndex);
      } else {
        state.bookings = state.allBookings.slice(0, endIndex);
      }
    },

    // Selection actions
    selectBooking: (state, action) => {
      const bookingId = action.payload;
      const found = state.bookings.find((b) => b.id === bookingId);

      if (found) {
        state.selectedBookings = found;
      } else {
        state.selectedBookings = null;
      }
    },
    selectAllBookings: (state, action) => {},
    clearSelection: (state) => {},

    // Quick view actions
    setQuickViewData: (state, action) => {
      state.quickViewData = action.payload;
    },

    clearQuickViewData: (state) => {
      state.quickViewData = null;
    },

    // Search actions
    clearSearch: (state) => {
      state.searchedBookings = [];
      state.isSearchActive = false;
      state.currentSearch = { query: "", field: "service_booking_id" };

      // Reset to showing regular bookings
      state.currentPage = 1;
      const endIndex = state.itemsPerPage;

      // If filter is active, show filtered results, otherwise show all bookings
      if (state.isFilterActive) {
        state.bookings = state.filteredBookings.slice(0, endIndex);
      } else {
        state.bookings = state.allBookings.slice(0, endIndex);
      }
    },

    setSearchField: (state, action) => {
      state.currentSearch.field = action.payload;
    },

    setSearchQuery: (state, action) => {
      state.currentSearch.query = action.payload;
    },

    // Filter actions
    clearFilters: (state) => {
      state.filteredBookings = [];
      state.isFilterActive = false;
      state.currentFilters = null;

      // Reset to showing regular bookings
      state.currentPage = 1;
      const endIndex = state.itemsPerPage;

      // If search is active, show search results, otherwise show all bookings
      if (state.isSearchActive) {
        state.bookings = state.searchedBookings.slice(0, endIndex);
      } else {
        state.bookings = state.allBookings.slice(0, endIndex);
      }
    },

    // Reset all states (for refresh)
    resetState: (state) => {
      return {
        ...initialState,
      };
    },

    // Error handling
    clearError: (state) => {
      state.error = null;
    },

    // Update cursor for next fetch
    setCursor: (state, action) => {
      state.cursor = action.payload;
    },
  },

  extraReducers: (builder) => {
    // Fetch bookings
    builder
      .addCase(fetchBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.loading = false;
        const { bookings, hasMore, cursor } = action.payload;

        // Add new bookings to our cache
        state.allBookings = [...state.allBookings, ...bookings];
        state.cursor = cursor;
        state.hasMore = hasMore;

        // Update current page display only if we're not in search/filter mode
        if (!state.isSearchActive && !state.isFilterActive) {
          const startIndex = (state.currentPage - 1) * state.itemsPerPage;
          const endIndex = startIndex + state.itemsPerPage;
          state.bookings = state.allBookings.slice(startIndex, endIndex);
        }
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch bookings";
      });

    // Search bookings
    builder
      .addCase(searchBookings.pending, (state) => {
        state.searchLoading = true;
        state.searchedBookings = [];
        state.error = null;
      })
      .addCase(searchBookings.fulfilled, (state, action) => {
        state.searchLoading = false;
        const { bookings, queryValue } = action.payload;

        // Store search results
        state.searchedBookings = bookings;
        state.isSearchActive = true;
        state.currentSearch.query = queryValue;

        // Reset to first page and show search results
        state.currentPage = 1;
        const endIndex = Math.min(state.itemsPerPage, bookings.length);
        state.bookings = bookings.slice(0, endIndex);
      })
      .addCase(searchBookings.rejected, (state, action) => {
        state.searchLoading = false;
        state.isSearchActive = true;
        state.error = "No results Found";
      });

    // Filter bookings
    builder
      .addCase(filterBookings.pending, (state) => {
        state.filterLoading = true;
        state.error = null;
      })
      .addCase(filterBookings.fulfilled, (state, action) => {
        state.filterLoading = false;
        const { mode, bookings, filters, resultsCount } = action.payload;

        if (mode === "filter") {
          state.filteredBookings = bookings;
          state.isFilterActive = true;
          state.currentFilters = filters;

          // Show first page of filtered results
          state.currentPage = 1;
          const endIndex = Math.min(state.itemsPerPage, bookings.length);
          state.bookings = bookings.slice(0, endIndex);
        }

        if (mode === "export") {
          state.exportData = bookings;
          state.exportCount = resultsCount;
        }
      })
      .addCase(filterBookings.rejected, (state, action) => {
        state.filterLoading = false;
        state.error = action.payload || "Filter failed";
      });
  },
});

export const {
  goToNextPage,
  goToPrevPage,
  setItemsPerPage,
  selectBooking,
  selectAllBookings,
  clearSelection,
  setQuickViewData,
  clearQuickViewData,
  clearSearch,
  setSearchField,
  setSearchQuery,
  clearFilters,
  resetState,
  clearError,
  setCursor,
} = servicesSlice.actions;

// Selectors
export const selectCurrentBookings = (state) => {
  return state.services.bookings;
};

export const selectBookingsStats = (state) => {
  const { services } = state;

  // Helper function to check if we need more data
  const needsMoreData = () => {
    if (services.isFilterActive || services.isSearchActive) {
      return false; // No pagination for filtered/searched results
    }

    const currentPageStart = (services.currentPage - 1) * services.itemsPerPage;
    const currentPageEnd = currentPageStart + services.itemsPerPage;

    // We need more data if we don't have enough for the current page and server has more
    return services.allBookings.length < currentPageEnd && services.hasMore;
  };

  // Helper function to check if we can go to next page
  const canGoNext = () => {
    if (services.isSearchActive) {
      const totalSearchPages = Math.ceil(
        services.searchedBookings.length / services.itemsPerPage
      );
      return services.currentPage < totalSearchPages;
    }

    if (services.isFilterActive) {
      const totalFilteredPages = Math.ceil(
        services.filteredBookings.length / services.itemsPerPage
      );
      return services.currentPage < totalFilteredPages;
    }

    // For regular pagination, we can go next if:
    // 1. We have more data locally for next page, OR
    // 2. Server has more data (hasMore = true)
    const nextPageStart = services.currentPage * services.itemsPerPage;
    return services.allBookings.length > nextPageStart || services.hasMore;
  };

  // Helper function to get total count for current view
  const getTotalCount = () => {
    if (services.isSearchActive) {
      return services.searchedBookings.length;
    }
    if (services.isFilterActive) {
      return services.filteredBookings.length;
    }
    return services.allBookings.length;
  };

  return {
    currentPage: services.currentPage,
    itemsPerPage: services.itemsPerPage,
    hasMore: services.hasMore,
    canGoNext: canGoNext(),
    canGoPrev: services.currentPage > 1,
    needsMoreData: needsMoreData(),
    cursor: services.cursor,
    totalCached: getTotalCount(),
    currentPageSize: services.bookings.length,
  };
};

export const selectLoadingStates = (state) => ({
  loading: state.services.loading,
  searchLoading: state.services.searchLoading,
  filterLoading: state.services.filterLoading,
  exportLoading: state.services.exportLoading,
});

export const selectActiveStates = (state) => ({
  isSearchActive: state.services.isSearchActive,
  isFilterActive: state.services.isFilterActive,
});

export const selectSearchState = (state) => ({
  query: state.services.currentSearch.query,
  field: state.services.currentSearch.field,
});

export default servicesSlice.reducer;
