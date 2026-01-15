import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Async thunks for API calls
export const fetchInfluencers = createAsyncThunk(
  "influencers/fetchInfluencers",
  async (
    { cursor = null, limit = 10, fresh = false },
    { rejectWithValue, getState }
  ) => {
    const state = getState().influencers;

 
    const payload = cursor ? { limit, cursor } : { limit };
    try {
      const response = await fetch("/api/manage_website/influencers/get", {
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
        throw new Error(data.error || "Failed to fetch influencers");
      }

      return {
        influencers: data.influncers,
        hasMore: data.hasMore,
        cursor: data.cursor,
        resultsCount: data.resultsCount,
        fresh,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const searchInfluencers = createAsyncThunk(
  "influencers/searchInfluencers",
  async ({ value, field }, { getState, rejectWithValue }) => {
    try {
      const state = getState().influencers;
      const { allInfluencers } = state;

      // --- 1. Local Search First ---
      function getNestedValue(obj, path) {
        return path.split(".").reduce((acc, key) => acc?.[key], obj);
      }

      const query = value.toLowerCase();
      const localMatches = allInfluencers.filter((influencer) => {
        const fieldValue = getNestedValue(influencer, field);
        return fieldValue?.toString().toLowerCase().includes(query);
      });

      if (localMatches.length > 0) {
        // ✅ Found locally → return directly
        return {
          success: true,
          matchedField: field,
          queryValue: value,
          resultsCount: localMatches.length,
          influencers: localMatches,
          fromCache: true,
        };
      }

      const response = await fetch("/api/manage_website/influencers/search", {
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
        influencers: data.influencers || [],
        meta: data.meta,
        fromCache: false,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const filterInfluencers = createAsyncThunk(
  "influencers/filterInfluencers",
  async ({ mode = "filter", filters }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/manage_website/influencers/filter", {
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
        influencers: data.influencers,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateInfluencer = createAsyncThunk(
  "influencers/updateInfluencer",
  async ({ id, updateData }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/manage_website/influencers/update?id=${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to update influencer");
      }

      return {
        id,
        updatedInfluencer: data,
        updateData,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteInfluencer = createAsyncThunk(
  "influencers/deleteInfluencer",
  async ({ id }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/manage_website/influencers/delete?id=${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Return structured error with code and details from API
        return rejectWithValue({
          message:
            data.error?.message || `HTTP error! status: ${response.status}`,
          code: data.error?.code || "HTTP_ERROR",
          details: data.error?.details || null,
        });
      }

      if (!data.success) {
        return rejectWithValue({
          message: data.error?.message || "Failed to delete influencer",
          code: data.error?.code || "DELETE_FAILED",
          details: data.error?.details || null,
        });
      }

      return {
        id,
        message: data.message,
        deletedData: data.data, // Includes deletedId, authDeleted, email, name
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Network error occurred",
        code: "NETWORK_ERROR",
      });
    }
  }
);

export const addNewInfluencer = createAsyncThunk(
  "influencers/addNewInfluencer",
  async (influencerData, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/manage_website/influencers/create_new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(influencerData),
      });

      const data = await response.json();

      // Handle HTTP errors and API errors
      if (!response.ok || !data.success) {
        // Create detailed error object based on response
        const errorDetails = {
          status: response.status,
          type: "api_error",
          message: data.error || `HTTP error! status: ${response.status}`,
          details: data.details || null,
          originalData: data,
        };

        // Handle specific error types
        if (response.status === 409) {
          errorDetails.type = "duplicate_data";
          if (data.details && Array.isArray(data.details)) {
            errorDetails.message = data.details.join(", ");
          }
        } else if (response.status === 400) {
          errorDetails.type = "validation_error";
          if (data.details && Array.isArray(data.details)) {
            errorDetails.message = data.details
              .map((err) => err.message || err)
              .join(", ");
          }
        } else if (response.status === 500) {
          errorDetails.type = "server_error";
          errorDetails.message =
            "Internal server error. Please try again later.";
        }

        return rejectWithValue(errorDetails);
      }

      return {
        newInfluencer: data.influencer,
        message: data.message,
        meta: data.meta,
      };
    } catch (error) {
      console.error("addNewInfluencer thunk error:", error);

      // Handle network errors or other unexpected errors
      return rejectWithValue({
        type: "network_error",
        message: "Network error. Please check your connection and try again.",
        originalError: error.message,
      });
    }
  }
);

// Initial state
const initialState = {
  influencers: [], // Current page influencers to display
  allInfluencers: [], // All fetched influencers cache

  // Pagination
  currentPage: 1,
  itemsPerPage: 10,
  hasMore: false,
  cursor: null,

  // Loading
  loading: false,
  loadingNext: false,
  selectedInfluencer: null,

  // Add fetching state management
  hasFetched: false,
  isFetching: false,

  // Other states
  filteredInfluencers: [],
  searchedInfluencers: [],

  isSearchActive: false,
  isFilterActive: false,
  currentSearch: {
    query: "",
    field: "id",
  },
  currentFilters: null,
  exportData: [],
  exportCount: null,
  error: null,
  searchLoading: false,
  filterLoading: false,
  exportLoading: false,

  // Update influencer states
  isUpdatingInfluencer: false,
  updateError: null,
  isInfluencerDrawerOpen: false,

  // Delete influencer states
  isDeletingInfluencer: false,
  deleteError: null,

  // Add new influencer states
  isAddingNewInfluencer: false,
  addInfluencerError: null,
  newInfluencerData: null,
};

const influencersSlice = createSlice({
  name: "influencers",
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
        state.influencers = state.searchedInfluencers.slice(
          startIndex,
          endIndex
        );
        return;
      }

      if (state.isFilterActive) {
        // Paginate through filtered results
        state.currentPage = nextPage;
        state.influencers = state.filteredInfluencers.slice(
          startIndex,
          endIndex
        );
        return;
      }

      // Regular pagination
      if (state.allInfluencers.length >= endIndex) {
        state.influencers = state.allInfluencers.slice(startIndex, endIndex);
        state.currentPage = nextPage;
      } else if (state.allInfluencers.length >= startIndex) {
        state.influencers = state.allInfluencers.slice(startIndex);
        state.currentPage = nextPage;
      } else {
        state.influencers = [];
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
        state.influencers = state.searchedInfluencers.slice(
          startIndex,
          endIndex
        );
        return;
      }

      if (state.isFilterActive) {
        state.influencers = state.filteredInfluencers.slice(
          startIndex,
          endIndex
        );
        return;
      }

      // Regular pagination
      state.influencers = state.allInfluencers.slice(startIndex, endIndex);
    },

    setItemsPerPage: (state, action) => {
      const newLimit = action.payload;
      state.itemsPerPage = newLimit;
      state.currentPage = 1;

      // Update current view with new limit
      const endIndex = newLimit;
      if (state.isSearchActive) {
        state.influencers = state.searchedInfluencers.slice(0, endIndex);
      } else if (state.isFilterActive) {
        state.influencers = state.filteredInfluencers.slice(0, endIndex);
      } else {
        state.influencers = state.allInfluencers.slice(0, endIndex);
      }
    },

    // Selection actions
    selectInfluencer: (state, action) => {
      const influencerId = action.payload;
      const found = state.influencers.find((i) => i.id === influencerId);

      if (found) {
        state.selectedInfluencer = found;
      } else {
        state.selectedInfluencer = null;
      }
    },
    selectAllInfluencers: (state, action) => {},
    clearSelection: (state) => {
      state.selectedInfluencer = null;
    },
    setInfluencerDrawer: (state) => {
      state.isInfluencerDrawerOpen = !state.isInfluencerDrawerOpen;
    },

    // Search actions
    clearSearch: (state) => {
      state.searchedInfluencers = [];
      state.isSearchActive = false;
      state.currentSearch = { query: "", field: "id" };

      // Reset to showing regular influencers
      state.currentPage = 1;
      const endIndex = state.itemsPerPage;

      // If filter is active, show filtered results, otherwise show all influencers
      if (state.isFilterActive) {
        state.influencers = state.filteredInfluencers.slice(0, endIndex);
      } else {
        state.influencers = state.allInfluencers.slice(0, endIndex);
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
      state.filteredInfluencers = [];
      state.isFilterActive = false;
      state.currentFilters = null;

      // Reset to showing regular influencers
      state.currentPage = 1;
      const endIndex = state.itemsPerPage;

      // If search is active, show search results, otherwise show all influencers
      if (state.isSearchActive) {
        state.influencers = state.searchedInfluencers.slice(0, endIndex);
      } else {
        state.influencers = state.allInfluencers.slice(0, endIndex);
      }
    },

    // Reset all states (for refresh) - updated to match commissions pattern
    resetState: (state) => {
      return {
        ...initialState,
      };
    },

    // Error handling
    clearError: (state) => {
      state.error = null;
      state.updateError = null;
      state.addInfluencerError = null;
      state.deleteError = null;
    },

    // Update cursor for next fetch
    setCursor: (state, action) => {
      state.cursor = action.payload;
    },

    // Handle edit close influencer
    handleEditCloseInfluencer: (state) => {
      state.isUpdatingInfluencer = false;
      state.updateError = null;
    },

    // Handle delete close influencer
    handleDeleteCloseInfluencer: (state) => {
      state.isDeletingInfluencer = false;
      state.deleteError = null;
    },

    // Add new influencer actions
    clearAddInfluencerData: (state) => {
      state.newInfluencerData = null;
      state.addInfluencerError = null;
    },

    handleAddInfluencerClose: (state) => {
      state.isAddingNewInfluencer = false;
      state.addInfluencerError = null;
    },
  },

  extraReducers: (builder) => {
    // Fetch influencers - Updated to match commissions pattern
    builder
      .addCase(fetchInfluencers.pending, (state, action) => {
        const { cursor, fresh } = action.meta.arg || {};

        // Prevent concurrent fetches
        if (state.isFetching && !cursor) {
          return;
        }

        state.loading = true;
        state.isFetching = true;
        state.error = null;

        // Reset everything for fresh fetches (no cursor)
        if (!cursor || fresh) {
          state.cursor = null;
          state.hasMore = false;
          state.allInfluencers = [];
          state.influencers = [];
          state.hasFetched = false;
        }
      })
      .addCase(fetchInfluencers.fulfilled, (state, action) => {
        state.loading = false;
        state.isFetching = false;
        state.hasFetched = true;

        const { influencers, hasMore, cursor, fresh } = action.payload;
        const isLoadMore = action.meta.arg?.cursor && !fresh;

        if (isLoadMore) {
          // For load more: append new data and dedupe
          const existingIds = new Set(state.allInfluencers.map((i) => i.id));
          const newInfluencers = influencers.filter(
            (i) => !existingIds.has(i.id)
          );
          state.allInfluencers = [...state.allInfluencers, ...newInfluencers];
        } else {
          // For fresh fetch: replace all data
          state.allInfluencers = influencers;
        }

        state.cursor = cursor;
        state.hasMore = hasMore;

        // Update current page display only if we're not in search/filter mode
        if (!state.isSearchActive && !state.isFilterActive) {
          const startIndex = (state.currentPage - 1) * state.itemsPerPage;
          const endIndex = startIndex + state.itemsPerPage;
          state.influencers = state.allInfluencers.slice(startIndex, endIndex);
        }
      })
      .addCase(fetchInfluencers.rejected, (state, action) => {
        state.loading = false;
        state.isFetching = false;
        state.hasFetched = true;
        state.error = action.payload || "Failed to fetch influencers";
      });

    // Search influencers
    builder
      .addCase(searchInfluencers.pending, (state) => {
        state.searchLoading = true;
        state.searchedInfluencers = [];
        state.error = null;
      })
      .addCase(searchInfluencers.fulfilled, (state, action) => {
        state.searchLoading = false;
        const { influencers, queryValue } = action.payload;

        // Store search results
        state.searchedInfluencers = influencers;
        state.isSearchActive = true;
        state.currentSearch.query = queryValue;

        // Reset to first page and show search results
        state.currentPage = 1;
        const endIndex = Math.min(state.itemsPerPage, influencers.length);
        state.influencers = influencers.slice(0, endIndex);
      })
      .addCase(searchInfluencers.rejected, (state, action) => {
        state.searchLoading = false;
        state.isSearchActive = true;
        state.error = "No results Found";
      });

    // Filter influencers
    builder
      .addCase(filterInfluencers.pending, (state) => {
        state.filterLoading = true;
        state.error = null;
      })
      .addCase(filterInfluencers.fulfilled, (state, action) => {
        state.filterLoading = false;
        const { mode, influencers, filters, resultsCount } = action.payload;

        if (mode === "filter") {
          state.filteredInfluencers = influencers;
          state.isFilterActive = true;
          state.currentFilters = filters;

          // Show first page of filtered results
          state.currentPage = 1;
          const endIndex = Math.min(state.itemsPerPage, influencers.length);
          state.influencers = influencers.slice(0, endIndex);
        }

        if (mode === "export") {
          state.exportData = influencers;
          state.exportCount = resultsCount;
        }
      })
      .addCase(filterInfluencers.rejected, (state, action) => {
        state.filterLoading = false;
        state.error = action.payload || "Filter failed";
      });

    // Update influencer
    builder
      .addCase(updateInfluencer.pending, (state) => {
        state.isUpdatingInfluencer = true;
        state.updateError = null;
      })
      .addCase(updateInfluencer.fulfilled, (state, action) => {
        state.isUpdatingInfluencer = false;

        const updatedInfluencer = action.payload.updatedInfluencer?.data;
        if (!updatedInfluencer?.id) return;

        const id = updatedInfluencer.id;

        // helper to replace influencer in arrays
        const updateArray = (arr) =>
          arr?.map((i) => (i.id === id ? { ...i, ...updatedInfluencer } : i));

        state.allInfluencers = updateArray(state.allInfluencers);
        state.influencers = updateArray(state.influencers);
        if (state.isSearchActive)
          state.searchedInfluencers = updateArray(state.searchedInfluencers);
        if (state.isFilterActive)
          state.filteredInfluencers = updateArray(state.filteredInfluencers);

        if (state.selectedInfluencer?.id === id) {
          state.selectedInfluencer = {
            ...state.selectedInfluencer,
            ...updatedInfluencer,
          };
        }
      })

      .addCase(updateInfluencer.rejected, (state, action) => {
        state.isUpdatingInfluencer = false;
        state.updateError = action?.payload || "Failed to update influencer";
      });

    // Delete influencer
    builder
      .addCase(deleteInfluencer.pending, (state) => {
        state.isDeletingInfluencer = true;
        state.deleteError = null;
      })
      .addCase(deleteInfluencer.fulfilled, (state, action) => {
        state.isDeletingInfluencer = false;
        const { id } = action.payload;

        // Helper function to remove influencer from array
        const removeInfluencerFromArray = (influencers) => {
          return influencers.filter((i) => i.id !== id);
        };

        // Remove influencer from all relevant arrays
        state.allInfluencers = removeInfluencerFromArray(state.allInfluencers);
        state.influencers = removeInfluencerFromArray(state.influencers);

        if (state.isSearchActive) {
          state.searchedInfluencers = removeInfluencerFromArray(
            state.searchedInfluencers
          );
        }

        if (state.isFilterActive) {
          state.filteredInfluencers = removeInfluencerFromArray(
            state.filteredInfluencers
          );
        }

        // Clear selected influencer if it's the deleted one
        if (state.selectedInfluencer?.id === id) {
          state.selectedInfluencer = null;
        }
      })
      .addCase(deleteInfluencer.rejected, (state, action) => {
        state.isDeletingInfluencer = false;
        state.deleteError = action?.payload || "Failed to delete influencer";
      });

    // Add new influencer
    builder
      .addCase(addNewInfluencer.pending, (state) => {
        state.isAddingNewInfluencer = true;
        state.addInfluencerError = null;
        state.newInfluencerData = null;
      })
      .addCase(addNewInfluencer.fulfilled, (state, action) => {
        state.isAddingNewInfluencer = false;
        const { newInfluencer, message } = action.payload;

        // Store the new influencer data
        state.newInfluencerData = newInfluencer;

        // Add the new influencer to the beginning of allInfluencers array
        state.allInfluencers = [newInfluencer, ...state.allInfluencers];

        // If we're not in search/filter mode, update the current view
        if (!state.isSearchActive && !state.isFilterActive) {
          const startIndex = (state.currentPage - 1) * state.itemsPerPage;
          const endIndex = startIndex + state.itemsPerPage;
          state.influencers = state.allInfluencers.slice(startIndex, endIndex);
        }
      })
      .addCase(addNewInfluencer.rejected, (state, action) => {
        state.isAddingNewInfluencer = false;

        // Handle structured error object
        if (action.payload && typeof action.payload === "object") {
          const errorPayload = action.payload;
         
          switch (errorPayload.type) {
            case "duplicate_data":
              state.addInfluencerError = {
                type: "duplicate",
                message: errorPayload?.message?.message,
                details: errorPayload?.message?.details,
              };
              break;

            case "validation_error":
              state.addInfluencerError = {
                type: "validation",
                message: `Validation failed: ${errorPayload.message}`,
                details: errorPayload?.message?.details,
              };
              break;

            case "server_error":
              state.addInfluencerError = {
                type: "server",
                message: "Server error occurred. Please try again later.",
                details: null,
              };
              break;

            case "network_error":
              state.addInfluencerError = {
                type: "network",
                message: "Network error. Please check your connection.",
                details: null,
              };
              break;

            default:
              state.addInfluencerError = {
                type: "unknown",
                message: errorPayload.message || "An unexpected error occurred",
                details: errorPayload?.message?.details,
              };
          }
        } else {
          // Fallback for string errors
          state.addInfluencerError = {
            type: "unknown",
            message: action.payload || "Failed to add new influencer",
            details: null,
          };
        }

        state.newInfluencerData = null;
      });
  },
});

export const {
  goToNextPage,
  goToPrevPage,
  setItemsPerPage,
  selectInfluencer,
  selectAllInfluencers,
  clearSelection,
  clearSearch,
  setSearchField,
  setSearchQuery,
  clearFilters,
  resetState,
  clearError,
  setCursor,
  setInfluencerDrawer,
  handleEditCloseInfluencer,
  handleDeleteCloseInfluencer,
  clearAddInfluencerData,
  handleAddInfluencerClose,
} = influencersSlice.actions;

// Selectors
export const selectCurrentInfluencers = (state) => {
  return state.influencers.influencers;
};

export const selectInfluencersStats = (state) => {
  const { influencers } = state;

  // Helper function to check if we need more data
  const needsMoreData = () => {
    if (influencers.isFilterActive || influencers.isSearchActive) {
      return false; // No pagination for filtered/searched results
    }

    const currentPageStart =
      (influencers.currentPage - 1) * influencers.itemsPerPage;
    const currentPageEnd = currentPageStart + influencers.itemsPerPage;

    // We need more data if we don't have enough for the current page and server has more
    return (
      influencers.allInfluencers.length < currentPageEnd && influencers.hasMore
    );
  };

  // Helper function to check if we can go to next page
  const canGoNext = () => {
    if (influencers.isSearchActive) {
      const totalSearchPages = Math.ceil(
        influencers.searchedInfluencers.length / influencers.itemsPerPage
      );
      return influencers.currentPage < totalSearchPages;
    }

    if (influencers.isFilterActive) {
      const totalFilteredPages = Math.ceil(
        influencers.filteredInfluencers.length / influencers.itemsPerPage
      );
      return influencers.currentPage < totalFilteredPages;
    }

    // For regular pagination, we can go next if:
    // 1. We have more data locally for next page, OR
    // 2. Server has more data (hasMore = true)
    const nextPageStart = influencers.currentPage * influencers.itemsPerPage;
    return (
      influencers.allInfluencers.length > nextPageStart || influencers.hasMore
    );
  };

  // Helper function to get total count for current view
  const getTotalCount = () => {
    if (influencers.isSearchActive) {
      return influencers.searchedInfluencers.length;
    }
    if (influencers.isFilterActive) {
      return influencers.filteredInfluencers.length;
    }
    return influencers.allInfluencers.length;
  };

  return {
    currentPage: influencers.currentPage,
    itemsPerPage: influencers.itemsPerPage,
    hasMore: influencers.hasMore,
    canGoNext: canGoNext(),
    canGoPrev: influencers.currentPage > 1,
    needsMoreData: needsMoreData(),
    cursor: influencers.cursor,
    totalCached: getTotalCount(),
    currentPageSize: influencers.influencers.length,
  };
};

export const selectInfluencersLoadingStates = (state) => ({
  loading: state.influencers.loading,
  searchLoading: state.influencers.searchLoading,
  filterLoading: state.influencers.filterLoading,
  exportLoading: state.influencers.exportLoading,
  isUpdatingInfluencer: state.influencers.isUpdatingInfluencer,
  isDeletingInfluencer: state.influencers.isDeletingInfluencer,
  isAddingNewInfluencer: state.influencers.isAddingNewInfluencer,
});

export const selectInfluencersActiveStates = (state) => ({
  isSearchActive: state.influencers.isSearchActive,
  isFilterActive: state.influencers.isFilterActive,
});

export const selectInfluencersSearchState = (state) => ({
  query: state.influencers.currentSearch.query,
  field: state.influencers.currentSearch.field,
});

// Updated selector to provide better error information
export const selectAddInfluencerStates = (state) => ({
  isAddingNewInfluencer: state.influencers.isAddingNewInfluencer,
  addInfluencerError: state.influencers.addInfluencerError,
  newInfluencerData: state.influencers.newInfluencerData,
});

export const selectUpdateInfluencerStates = (state) => ({
  isUpdatingInfluencer: state.influencers.isUpdatingInfluencer,
  updateError: state.influencers.updateError,
});

export const selectDeleteInfluencerStates = (state) => ({
  isDeletingInfluencer: state.influencers.isDeletingInfluencer,
  deleteError: state.influencers.deleteError,
});

// Helper selector to get user-friendly error message
export const selectAddInfluencerErrorMessage = (state) => {
  const error = state?.influencers?.addInfluencerError;
  if (!error) return null;

  switch (error?.type) {
    case "duplicate":
      return {
        title: "Account Already Exists",
        message: error?.message,
        type: "warning",
      };

    case "validation":
      return {
        title: "Invalid Data",
        message: error?.message,
        type: "error",
      };

    case "server":
      return {
        title: "Server Error",
        message: "Something went wrong on our end. Please try again later.",
        type: "error",
      };

    case "network":
      return {
        title: "Connection Error",
        message: "Please check your internet connection and try again.",
        type: "error",
      };

    default:
      return {
        title: "Error",
        message: error?.message || "An unexpected error occurred",
        type: "error",
      };
  }
};

export default influencersSlice.reducer;
