// store/slices/commissionsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Async thunks
export const fetchCommissions = createAsyncThunk(
  "commissions/fetchCommissions",
  async ({ limit = 10, cursor = null }, { rejectWithValue }) => {
    const payload = cursor ? { limit, cursor } : { limit };
    try {
      const response = await fetch("/api/admin/commissions/get", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Failed to fetch commissions");
      }

      return data;
    } catch (error) {
      console.log("error", error);
      return rejectWithValue(error.message);
    }
  }
);

export const searchCommissions = createAsyncThunk(
  "commissions/searchCommissions",
  async ({ value }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/commissions/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Search failed");
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const filterCommissions = createAsyncThunk(
  "commissions/filterCommissions",
  async (
    { quickRange, startDate, endDate, extraFilter },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/admin/commissions/filter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quickRange, startDate, endDate, extraFilter }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Filter failed");
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCommissionStatus = createAsyncThunk(
  "commissions/updateStatus",
  async ({ actionType, ids }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/commissions/toggleStatus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ actionType, ids }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Update failed");
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  commissions: [],
  allCommissions: [], // Store all fetched commissions for client-side filtering
  selectedCommissions: [], // For bulk operations
  filters: {
    statusFilter: "all", // 'all', 'paid', 'unpaid'
    quickRange: null,
    startDate: null,
    endDate: null,
    extraFilter: null,
    searchValue: null,
  },
  pagination: {
    cursor: null,
    hasMore: false,
    limit: 10,
  },
  loading: false,
  searchLoading: false,
  updateLoading: false,
  error: null,
  isSearchMode: false,
  isFilterMode: false,
  selectAll: false,
  stats: {
    total: 0,
    paid: 0,
    unpaid: 0,
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
  },
};

const commissionsSlice = createSlice({
  name: "commissions",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSearch: (state) => {
      state.isSearchMode = false;
      state.filters.searchValue = null;
      state.commissions = state.allCommissions;
    },
    clearFilters: (state) => {
      state.isFilterMode = false;
      state.filters = {
        ...state.filters,
        quickRange: null,
        startDate: null,
        endDate: null,
        extraFilter: null,
      };
      state.commissions = state.allCommissions;
    },
    setStatusFilter: (state, action) => {
      state.filters.statusFilter = action.payload;
      state.selectedCommissions = [];
      state.selectAll = false;

      // Apply client-side filtering
      const baseCommissions =
        state.isSearchMode || state.isFilterMode
          ? state.commissions
          : state.allCommissions;

      if (action.payload === "all") {
        state.commissions = baseCommissions;
      } else {
        state.commissions = baseCommissions.filter(
          (c) => c.status === action.payload
        );
      }
    },
    toggleCommissionSelection: (state, action) => {
      const commissionId = action.payload;
      const isSelected = state.selectedCommissions.includes(commissionId);

      if (isSelected) {
        state.selectedCommissions = state.selectedCommissions.filter(
          (id) => id !== commissionId
        );
      } else {
        state.selectedCommissions.push(commissionId);
      }

      // Update selectAll state
      state.selectAll =
        state.selectedCommissions.length === state.commissions.length;
    },
    toggleSelectAll: (state) => {
      if (state.selectAll) {
        state.selectedCommissions = [];
        state.selectAll = false;
      } else {
        state.selectedCommissions = state.commissions.map((c) => c.id);
        state.selectAll = true;
      }
    },
    clearSelections: (state) => {
      state.selectedCommissions = [];
      state.selectAll = false;
    },
    resetPagination: (state) => {
      state.pagination.cursor = null;
      state.pagination.hasMore = false;
    },
    updateStats: (state) => {
      const commissions = state.allCommissions;
      state.stats.total = commissions.length;
      state.stats.paid = commissions.filter((c) => c.status === "paid").length;
      state.stats.unpaid = commissions.filter(
        (c) => c.status === "unpaid"
      ).length;
      state.stats.totalAmount = commissions.reduce(
        (sum, c) => sum + (c.amount || 0),
        0
      );
      state.stats.paidAmount = commissions
        .filter((c) => c.status === "paid")
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      state.stats.unpaidAmount = commissions
        .filter((c) => c.status === "unpaid")
        .reduce((sum, c) => sum + (c.amount || 0), 0);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch commissions
      .addCase(fetchCommissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommissions.fulfilled, (state, action) => {
        state.loading = false;
        const { commissions, hasMore, cursor } = action.payload;

        if (state.pagination.cursor) {
          // Append new data for pagination
          state.allCommissions = [...state.allCommissions, ...commissions];
        } else {
          // Fresh fetch
          state.allCommissions = commissions;
        }

        state.pagination.hasMore = hasMore;
        state.pagination.cursor = cursor;

        // Apply current filters
        commissionsSlice.caseReducers.setStatusFilter(state, {
          payload: state.filters.statusFilter,
        });
        commissionsSlice.caseReducers.updateStats(state);
      })
      .addCase(fetchCommissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Search commissions
      .addCase(searchCommissions.pending, (state) => {
        state.searchLoading = true;
        state.error = null;
      })
      .addCase(searchCommissions.fulfilled, (state, action) => {
        state.searchLoading = false;
        const { commissions } = action.payload;
        state.commissions = commissions;
        state.isSearchMode = true;
        state.selectedCommissions = [];
        state.selectAll = false;
        commissionsSlice.caseReducers.setStatusFilter(state, {
          payload: state.filters.statusFilter,
        });
      })
      .addCase(searchCommissions.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.payload;
      })

      // Filter commissions
      .addCase(filterCommissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(filterCommissions.fulfilled, (state, action) => {
        state.loading = false;
        const { commissions } = action.payload;
        state.commissions = commissions;
        state.isFilterMode = true;
        state.selectedCommissions = [];
        state.selectAll = false;
        commissionsSlice.caseReducers.setStatusFilter(state, {
          payload: state.filters.statusFilter,
        });
      })
      .addCase(filterCommissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload?.error?.formErrors || "Faild to Filter Results!";
      })

      // Update commission status
      .addCase(updateCommissionStatus.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateCommissionStatus.fulfilled, (state, action) => {
        state.updateLoading = false;
        const { updatedIds, newStatus } = action.payload;

        // Update commissions in all arrays
        const updateCommission = (commission) => {
          if (updatedIds.includes(commission.id)) {
            return {
              ...commission,
              status: newStatus,
              paidAt: newStatus === "paid" ? new Date().toISOString() : null,
              updatedAt: new Date().toISOString(),
            };
          }
          return commission;
        };

        state.allCommissions = state.allCommissions.map(updateCommission);
        state.commissions = state.commissions.map(updateCommission);

        // Clear selections after successful update
        state.selectedCommissions = [];
        state.selectAll = false;

        // Update stats
        commissionsSlice.caseReducers.updateStats(state);
      })
      .addCase(updateCommissionStatus.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  clearSearch,
  clearFilters,
  setStatusFilter,
  toggleCommissionSelection,
  toggleSelectAll,
  clearSelections,
  resetPagination,
  updateStats,
} = commissionsSlice.actions;

export default commissionsSlice.reducer;
