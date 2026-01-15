import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Async thunks for API calls

// Fetch balance summary
export const fetchBalanceSummary = createAsyncThunk(
  "payments/fetchBalanceSummary",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/manage_website/payments/get_balance_summry");
      const data = await response.json();
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch downtime status
export const fetchDowntimeStatus = createAsyncThunk(
  "payments/fetchDowntimeStatus",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/manage_website/payments/get_downtime");
      const data = await response.json();
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch payments with filters (pagination endpoint)
export const fetchPayments = createAsyncThunk(
  "payments/fetchPayments",
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetch(
        "/api/manage_website/payments/get_payments_pagiation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        }
      );
      const data = await response.json();
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch payments with date filter
export const fetchPaymentsWithDateFilter = createAsyncThunk(
  "payments/fetchPaymentsWithDateFilter",
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetch(
        "/api/manage_website/payments/get_date_filter_payments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        }
      );
      const data = await response.json();
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch refunds (pagination endpoint)
export const fetchRefunds = createAsyncThunk(
  "payments/fetchRefunds",
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/manage_website/payments/refunds/get", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch refunds with date filter
export const fetchRefundsWithDateFilter = createAsyncThunk(
  "payments/fetchRefundsWithDateFilter",
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/manage_website/payments/refunds/date-wise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch refunds by payment/order ID
export const fetchRefundsByPaymentId = createAsyncThunk(
  "payments/fetchRefundsByPaymentId",
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/manage_website/payments/refunds/by-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch settlements (pagination endpoint)
export const fetchSettlements = createAsyncThunk(
  "payments/fetchSettlements",
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/manage_website/payments/settlements/get", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch settlements with date filter
export const fetchSettlementsWithDateFilter = createAsyncThunk(
  "payments/fetchSettlementsWithDateFilter",
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetch(
        "/api/manage_website/payments/settlements/date-wise",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        }
      );
      const data = await response.json();
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch settlement details by ID
export const fetchSettlementDetails = createAsyncThunk(
  "payments/fetchSettlementDetails",
  async (settlementId, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/manage_website/payments/settlements/by-id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: settlementId }),
      });
      const data = await response.json();
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Create refund (disabled as per your note)
export const createRefund = createAsyncThunk(
  "payments/createRefund",
  async (refundData, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/manage_website/payments/refund/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(refundData),
      });
      const data = await response.json();
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Export payments (disabled as per your note)
export const exportPayments = createAsyncThunk(
  "payments/exportPayments",
  async (exportParams, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/manage_website/payments/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exportParams),
      });
      const data = await response.json();
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  // Data states
  payments: {
    items: [],
    count: 0,
    has_more: false,
  },
  refunds: {
    items: [],
    count: 0,
    has_more: false,
  },
  settlements: {
    items: [],
    count: 0,
    has_more: false,
  },
  balance: null,
  downtime: [],
  selectedPayment: null,
  selectedRefund: null,
  selectedSettlement: null,

  // UI states
  loading: false,
  loadingPayments: false,
  loadingRefunds: false,
  loadingSettlements: false,
  loadingBalance: false,
  loadingDowntime: false,

  // Error states
  error: null,
  paymentsError: null,
  refundsError: null,
  settlementsError: null,
  balanceError: null,
  downtimeError: null,

  // Pagination states
  pagination: {
    payments: {
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    },
    refunds: {
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    },
    settlements: {
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    },
  },

  // Filter states
  filters: {
    payments: {
      dateRange: { from: null, to: null },
    },
    refunds: {
      dateRange: { from: null, to: null },
    },
    settlements: {
      dateRange: { from: null, to: null },
    },
  },
};

// Create slice
const paymentSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {
    // Clear errors
    clearError: (state) => {
      state.error = null;
      state.paymentsError = null;
      state.refundsError = null;
      state.settlementsError = null;
      state.balanceError = null;
      state.downtimeError = null;
    },

    // Set selected items
    setSelectedPayment: (state, action) => {
      state.selectedPayment = action.payload;
    },
    setSelectedRefund: (state, action) => {
      state.selectedRefund = action.payload;
    },
    setSelectedSettlement: (state, action) => {
      state.selectedSettlement = action.payload;
    },

    // Update filters
    setPaymentFilters: (state, action) => {
      state.filters.payments = { ...state.filters.payments, ...action.payload };
    },
    setRefundFilters: (state, action) => {
      state.filters.refunds = { ...state.filters.refunds, ...action.payload };
    },
    setSettlementFilters: (state, action) => {
      state.filters.settlements = {
        ...state.filters.settlements,
        ...action.payload,
      };
    },

    // Reset filters
    resetPaymentFilters: (state) => {
      state.filters.payments = { dateRange: { from: null, to: null } };
    },
    resetRefundFilters: (state) => {
      state.filters.refunds = { dateRange: { from: null, to: null } };
    },
    resetSettlementFilters: (state) => {
      state.filters.settlements = { dateRange: { from: null, to: null } };
    },

    // Update pagination
    setPaymentPagination: (state, action) => {
      state.pagination.payments = {
        ...state.pagination.payments,
        ...action.payload,
      };
    },
    setRefundPagination: (state, action) => {
      state.pagination.refunds = {
        ...state.pagination.refunds,
        ...action.payload,
      };
    },
    setSettlementPagination: (state, action) => {
      state.pagination.settlements = {
        ...state.pagination.settlements,
        ...action.payload,
      };
    },

    // Update data manually (for optimistic updates)
    updatePaymentInList: (state, action) => {
      const { paymentId, updates } = action.payload;
      const paymentIndex = state.payments.items.findIndex(
        (p) => p.id === paymentId
      );
      if (paymentIndex !== -1) {
        state.payments.items[paymentIndex] = {
          ...state.payments.items[paymentIndex],
          ...updates,
        };
      }
    },

    addRefundToList: (state, action) => {
      state.refunds.items.unshift(action.payload);
      state.refunds.count += 1;
    },

    // Clear data (useful for logout or reset scenarios)
    clearPaymentsData: (state) => {
      state.payments = { items: [], count: 0, has_more: false };
      state.pagination.payments = { ...initialState.pagination.payments };
    },
    clearRefundsData: (state) => {
      state.refunds = { items: [], count: 0, has_more: false };
      state.pagination.refunds = { ...initialState.pagination.refunds };
    },
    clearSettlementsData: (state) => {
      state.settlements = { items: [], count: 0, has_more: false };
      state.pagination.settlements = { ...initialState.pagination.settlements };
    },
  },
  extraReducers: (builder) => {
    // Balance Summary
    builder
      .addCase(fetchBalanceSummary.pending, (state) => {
        state.loadingBalance = true;
        state.balanceError = null;
      })
      .addCase(fetchBalanceSummary.fulfilled, (state, action) => {
        state.loadingBalance = false;
        state.balance = action.payload;
      })
      .addCase(fetchBalanceSummary.rejected, (state, action) => {
        state.loadingBalance = false;
        state.balanceError = action.payload;
      });

    // Downtime Status
    builder
      .addCase(fetchDowntimeStatus.pending, (state) => {
        state.loadingDowntime = true;
        state.downtimeError = null;
      })
      .addCase(fetchDowntimeStatus.fulfilled, (state, action) => {
        state.loadingDowntime = false;
        state.downtime = action.payload;
      })
      .addCase(fetchDowntimeStatus.rejected, (state, action) => {
        console.log("payload", action.payload);
        state.loadingDowntime = false;
        state.downtimeError = "Failed to Fethch Downtime Status";
      });

    // Payments
    builder
      .addCase(fetchPayments.pending, (state) => {
        state.loadingPayments = true;
        state.paymentsError = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loadingPayments = false;
        state.payments = action.payload;
        // Update pagination info
        state.pagination.payments.totalItems = action.payload.count;
        state.pagination.payments.totalPages = Math.ceil(
          action.payload.count / state.pagination.payments.pageSize
        );
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.loadingPayments = false;
        state.paymentsError = action.payload;
      });

    // Payments with date filter
    builder
      .addCase(fetchPaymentsWithDateFilter.pending, (state) => {
        state.loadingPayments = true;
        state.paymentsError = null;
      })
      .addCase(fetchPaymentsWithDateFilter.fulfilled, (state, action) => {
        state.loadingPayments = false;
        state.payments = action.payload;
        // Update pagination info for date filtered payments too
        state.pagination.payments.totalItems = action.payload.count;
        state.pagination.payments.totalPages = Math.ceil(
          action.payload.count / state.pagination.payments.pageSize
        );
      })
      .addCase(fetchPaymentsWithDateFilter.rejected, (state, action) => {
        state.loadingPayments = false;
        state.paymentsError = action.payload;
      });

    // Refunds
    builder
      .addCase(fetchRefunds.pending, (state) => {
        state.loadingRefunds = true;
        state.refundsError = null;
      })
      .addCase(fetchRefunds.fulfilled, (state, action) => {
        state.loadingRefunds = false;
        state.refunds = action.payload;
        // Update pagination info
        state.pagination.refunds.totalItems = action.payload.count;
        state.pagination.refunds.totalPages = Math.ceil(
          action.payload.count / state.pagination.refunds.pageSize
        );
      })
      .addCase(fetchRefunds.rejected, (state, action) => {
        state.loadingRefunds = false;
        state.refundsError = action.payload;
      });

    // Refunds with date filter
    builder
      .addCase(fetchRefundsWithDateFilter.pending, (state) => {
        state.loadingRefunds = true;
        state.refundsError = null;
      })
      .addCase(fetchRefundsWithDateFilter.fulfilled, (state, action) => {
        state.loadingRefunds = false;
        state.refunds = action.payload;
        // Update pagination info for date filtered refunds too
        state.pagination.refunds.totalItems = action.payload.count;
        state.pagination.refunds.totalPages = Math.ceil(
          action.payload.count / state.pagination.refunds.pageSize
        );
      })
      .addCase(fetchRefundsWithDateFilter.rejected, (state, action) => {
        state.loadingRefunds = false;
        state.refundsError = action.payload;
      });

    // Refunds by payment ID
    builder
      .addCase(fetchRefundsByPaymentId.pending, (state) => {
        state.loadingRefunds = true;
        state.refundsError = null;
      })
      .addCase(fetchRefundsByPaymentId.fulfilled, (state, action) => {
        state.loadingRefunds = false;
        state.refunds = action.payload;
        // Update pagination info
        state.pagination.refunds.totalItems = action.payload.count;
        state.pagination.refunds.totalPages = Math.ceil(
          action.payload.count / state.pagination.refunds.pageSize
        );
      })
      .addCase(fetchRefundsByPaymentId.rejected, (state, action) => {
        state.loadingRefunds = false;
        state.refundsError = action.payload;
      });

    // Settlements
    builder
      .addCase(fetchSettlements.pending, (state) => {
        state.loadingSettlements = true;
        state.settlementsError = null;
      })
      .addCase(fetchSettlements.fulfilled, (state, action) => {
        state.loadingSettlements = false;
        state.settlements = action.payload;
        // Update pagination info
        state.pagination.settlements.totalItems = action.payload.count;
        state.pagination.settlements.totalPages = Math.ceil(
          action.payload.count / state.pagination.settlements.pageSize
        );
      })
      .addCase(fetchSettlements.rejected, (state, action) => {
        state.loadingSettlements = false;
        state.settlementsError = action.payload;
      });

    // Settlements with date filter
    builder
      .addCase(fetchSettlementsWithDateFilter.pending, (state) => {
        state.loadingSettlements = true;
        state.settlementsError = null;
      })
      .addCase(fetchSettlementsWithDateFilter.fulfilled, (state, action) => {
        state.loadingSettlements = false;
        state.settlements = action.payload;
        // Update pagination info for date filtered settlements too
        state.pagination.settlements.totalItems = action.payload.count;
        state.pagination.settlements.totalPages = Math.ceil(
          action.payload.count / state.pagination.settlements.pageSize
        );
      })
      .addCase(fetchSettlementsWithDateFilter.rejected, (state, action) => {
        state.loadingSettlements = false;
        state.settlementsError = action.payload;
      });

    // Settlement details
    builder
      .addCase(fetchSettlementDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettlementDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedSettlement = action.payload;
      })
      .addCase(fetchSettlementDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create refund
    builder
      .addCase(createRefund.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRefund.fulfilled, (state, action) => {
        state.loading = false;
        // Add new refund to the list
        state.refunds.items.unshift(action.payload);
        state.refunds.count += 1;
      })
      .addCase(createRefund.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Export payments
    builder
      .addCase(exportPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportPayments.fulfilled, (state, action) => {
        state.loading = false;
        // Handle export success (maybe show success message)
      })
      .addCase(exportPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const {
  clearError,
  setSelectedPayment,
  setSelectedRefund,
  setSelectedSettlement,
  setPaymentFilters,
  setRefundFilters,
  setSettlementFilters,
  resetPaymentFilters,
  resetRefundFilters,
  resetSettlementFilters,
  setPaymentPagination,
  setRefundPagination,
  setSettlementPagination,
  updatePaymentInList,
  addRefundToList,
  clearPaymentsData,
  clearRefundsData,
  clearSettlementsData,
} = paymentSlice.actions;

// Enhanced selectors
export const selectPayments = (state) => state.payments.payments;
export const selectRefunds = (state) => state.payments.refunds;
export const selectSettlements = (state) => state.payments.settlements;
export const selectBalance = (state) => state.payments.balance;
export const selectDowntime = (state) => state.payments.downtime;
export const selectSelectedPayment = (state) => state.payments.selectedPayment;
export const selectSelectedRefund = (state) => state.payments.selectedRefund;
export const selectSelectedSettlement = (state) =>
  state.payments.selectedSettlement;

// Filter selectors
export const selectPaymentFilters = (state) => state.payments.filters.payments;
export const selectRefundFilters = (state) => state.payments.filters.refunds;
export const selectSettlementFilters = (state) =>
  state.payments.filters.settlements;

// Pagination selectors
export const selectPaymentsPagination = (state) =>
  state.payments.pagination.payments;
export const selectRefundsPagination = (state) =>
  state.payments.pagination.refunds;
export const selectSettlementsPagination = (state) =>
  state.payments.pagination.settlements;

// Loading selectors
export const selectIsLoadingPayments = (state) =>
  state.payments.loadingPayments;
export const selectIsLoadingRefunds = (state) => state.payments.loadingRefunds;
export const selectIsLoadingSettlements = (state) =>
  state.payments.loadingSettlements;
export const selectIsLoadingBalance = (state) => state.payments.loadingBalance;
export const selectIsLoadingDowntime = (state) =>
  state.payments.loadingDowntime;
export const selectIsLoading = (state) => state.payments.loading;

// Error selectors
export const selectPaymentsError = (state) => state.payments.paymentsError;
export const selectRefundsError = (state) => state.payments.refundsError;
export const selectSettlementsError = (state) =>
  state.payments.settlementsError;
export const selectBalanceError = (state) => state.payments.balanceError;
export const selectDowntimeError = (state) => state.payments.downtimeError;
export const selectError = (state) => state.payments.error;

// Export reducer
export default paymentSlice.reducer;
