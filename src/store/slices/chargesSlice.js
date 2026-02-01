import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ============================================
// HELPER - ERROR MESSAGE FORMATTER
// ============================================

const formatErrorMessage = (error) => {
  // Handle Zod validation errors
  if (error?.details && Array.isArray(error.details)) {
    const fieldErrors = error.details
      .map((detail) => {
        const field = detail.path?.slice(-1)[0] || "field";
        return `${field}: ${detail.message}`;
      })
      .join(", ");
    return fieldErrors || error.message || "Validation failed";
  }

  return error?.message || error || "An unexpected error occurred";
};

// ============================================
// HELPER - API FETCH WRAPPER
// ============================================

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

// ============================================
// ASYNC THUNKS - MICRO SURGERY OPERATIONS
// ============================================

// Add Charge to Task
export const addChargeToTask = createAsyncThunk(
  "charges/addToTask",
  async ({ taskId, chargeData }, { rejectWithValue }) => {
    try {
      // Validate inputs
      if (!taskId) {
        throw new Error("Task ID is required");
      }
      if (!chargeData || !chargeData.title || !chargeData.amount) {
        throw new Error("Charge title and amount are required");
      }

      const result = await apiFetch(`/api/admin_ops/tasks/${taskId}/charges/override`, {
        method: "POST",
        body: JSON.stringify(chargeData),
      });

      return {
        taskId,
        charges: result.data?.charges || [],
      };
    } catch (error) {
      return rejectWithValue({
        message: formatErrorMessage(error),
        code: error.code,
        details: error.details,
      });
    }
  },
);

// Delete Single Charge
export const deleteTaskCharge = createAsyncThunk(
  "charges/deleteCharge",
  async ({ taskId, chargeId }, { rejectWithValue }) => {
    try {
      // Validate inputs
      if (!taskId || !chargeId) {
        throw new Error("Task ID and Charge ID are required");
      }

      const result = await apiFetch(
        `/api/admin_ops/tasks/${taskId}/charges/${chargeId}/override`,
        { method: "DELETE" },
      );

      return {
        taskId,
        chargeId,
        remainingCharges: result.data?.charges || [],
      };
    } catch (error) {
      return rejectWithValue({
        message: formatErrorMessage(error),
        code: error.code,
        details: error.details,
        chargeId,
      });
    }
  },
);

// Bulk Update Charges in a Task
export const bulkUpdateTaskCharges = createAsyncThunk(
  "charges/bulkUpdate",
  async ({ taskId, updates }, { rejectWithValue }) => {
    try {
      // Validate inputs
      if (!taskId) {
        throw new Error("Task ID is required");
      }
      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        throw new Error("Updates array is required");
      }

      const result = await apiFetch(
        `/api/admin_ops/tasks/${taskId}/charges/bulk-update`,
        {
          method: "PATCH",
          body: JSON.stringify({ updates }),
        },
      );

      return {
        taskId,
        charges: result.data?.charges || [],
      };
    } catch (error) {
      return rejectWithValue({
        message: formatErrorMessage(error),
        code: error.code,
        details: error.details,
      });
    }
  },
);

// Bulk Update Charge Status
export const bulkUpdateChargeStatus = createAsyncThunk(
  "charges/bulkUpdateStatus",
  async ({ taskId, chargeIds, status }, { rejectWithValue }) => {
    try {
      // Validate inputs
      if (!taskId) {
        throw new Error("Task ID is required");
      }
      if (!chargeIds || !Array.isArray(chargeIds) || chargeIds.length === 0) {
        throw new Error("At least one charge must be selected");
      }
      if (!status) {
        throw new Error("Status is required");
      }

      const result = await apiFetch(
        `/api/admin_ops/tasks/${taskId}/charges/bulk-status`,
        {
          method: "POST",
          body: JSON.stringify({
            charge_ids: chargeIds,
            status,
          }),
        },
      );

      return {
        taskId,
        chargesByTask: result.data?.charges_by_task || {},
      };
    } catch (error) {
      return rejectWithValue({
        message: formatErrorMessage(error),
        code: error.code,
        details: error.details,
      });
    }
  },
);

// ============================================
// INITIAL STATE
// ============================================

const initialState = {
  // Loading states per charge ID
  loadingByChargeId: {},

  // Bulk operation loading
  bulkLoading: false,

  // Status update loading

  statusUpdateLoadingByStatus: {
    PAID: false,
    NOT_PAID: false,
  },
  // Errors
  error: null,

  // Last operation info (for UI feedback)
  lastOperation: null,
};

// ============================================
// SLICE
// ============================================

const chargesSlice = createSlice({
  name: "charges",
  initialState,

  reducers: {
    clearChargesError: (state) => {
      state.error = null;
    },

    clearLastOperation: (state) => {
      state.lastOperation = null;
    },
  },

  extraReducers: (builder) => {
    // Helper to set/clear charge loading
    const setChargeLoading = (state, chargeId, value) => {
      if (value) {
        state.loadingByChargeId[chargeId] = true;
      } else {
        delete state.loadingByChargeId[chargeId];
      }
    };

    // ============================================
    // ADD CHARGE TO TASK
    // ============================================
    builder
      .addCase(addChargeToTask.pending, (state) => {
        state.bulkLoading = true;
        state.error = null;
      })
      .addCase(addChargeToTask.fulfilled, (state, action) => {
        state.bulkLoading = false;
        state.lastOperation = {
          type: "add",
          taskId: action.payload?.taskId,
          success: true,
          timestamp: Date.now(),
        };
      })
      .addCase(addChargeToTask.rejected, (state, action) => {
        state.bulkLoading = false;
        state.error = action.payload?.message || "Failed to add charge";
        state.lastOperation = {
          type: "add",
          success: false,
          timestamp: Date.now(),
        };
      });

    // ============================================
    // UPDATE CHARGE
    // ============================================
    builder;

    // ============================================
    // DELETE CHARGE
    // ============================================
    builder
      .addCase(deleteTaskCharge.pending, (state, action) => {
        const chargeId = action.meta?.arg?.chargeId;
        if (chargeId) {
          setChargeLoading(state, chargeId, true);
        }
        state.error = null;
      })
      .addCase(deleteTaskCharge.fulfilled, (state, action) => {
        const chargeId = action.payload?.chargeId;
        if (chargeId) {
          setChargeLoading(state, chargeId, false);
        }
        state.lastOperation = {
          type: "delete",
          taskId: action.payload?.taskId,
          chargeId: action.payload?.chargeId,
          success: true,
          timestamp: Date.now(),
        };
      })
      .addCase(deleteTaskCharge.rejected, (state, action) => {
        const chargeId = action.payload?.chargeId || action.meta?.arg?.chargeId;
        if (chargeId) {
          setChargeLoading(state, chargeId, false);
        }
        state.error = action.payload?.message || "Failed to delete charge";
        state.lastOperation = {
          type: "delete",
          chargeId: chargeId,
          success: false,
          timestamp: Date.now(),
        };
      });

    // ============================================
    // BULK UPDATE CHARGES
    // ============================================
    builder
      .addCase(bulkUpdateTaskCharges.pending, (state) => {
        state.bulkLoading = true;
        state.error = null;
      })
      .addCase(bulkUpdateTaskCharges.fulfilled, (state, action) => {
        state.bulkLoading = false;
        state.lastOperation = {
          type: "bulkUpdate",
          taskId: action.payload?.taskId,
          success: true,
          timestamp: Date.now(),
        };
      })
      .addCase(bulkUpdateTaskCharges.rejected, (state, action) => {
        state.bulkLoading = false;
        state.error =
          action.payload?.message || "Failed to bulk update charges";
        state.lastOperation = {
          type: "bulkUpdate",
          success: false,
          timestamp: Date.now(),
        };
      });

    // ============================================
    // BULK UPDATE STATUS
    // ============================================
    builder
      .addCase(bulkUpdateChargeStatus.pending, (state, action) => {
        const status = action.meta?.arg?.status;

        if (status) {
          state.statusUpdateLoadingByStatus[status] = true;
        }

        state.error = null;
      })
      .addCase(bulkUpdateChargeStatus.fulfilled, (state, action) => {
        const status = action.meta?.arg?.status;

        if (status) {
          state.statusUpdateLoadingByStatus[status] = false;
        }

        state.lastOperation = {
          type: "bulkUpdateStatus",
          taskId: action.payload?.taskId,
          status,
          success: true,
          timestamp: Date.now(),
        };
      })
      .addCase(bulkUpdateChargeStatus.rejected, (state, action) => {
        const status = action.meta?.arg?.status;

        if (status) {
          state.statusUpdateLoadingByStatus[status] = false;
        }

        state.error = action.payload?.message || "Failed to bulk update status";

        state.lastOperation = {
          type: "bulkUpdateStatus",
          status,
          success: false,
          timestamp: Date.now(),
        };
      });
  },
});

// ============================================
// ACTIONS & SELECTORS
// ============================================

export const { clearChargesError, clearLastOperation } = chargesSlice.actions;

// Selectors
export const selectChargeLoadingMap = (state) =>
  state.charges?.loadingByChargeId || {};
export const selectIsChargeLoading = (state, chargeId) =>
  !!state.charges?.loadingByChargeId?.[chargeId];
export const selectChargesBulkLoading = (state) =>
  state.charges?.bulkLoading || false;

export const selectStatusUpdateLoadingByStatus = (state) =>
  state.charges?.statusUpdateLoadingByStatus || {};

export const selectIsMarkPaidLoading = (state) =>
  !!state.charges?.statusUpdateLoadingByStatus?.PAID;

export const selectIsMarkUnpaidLoading = (state) =>
  !!state.charges?.statusUpdateLoadingByStatus?.NOT_PAID;

export const selectChargesError = (state) => state.charges?.error;
export const selectLastChargeOperation = (state) =>
  state.charges?.lastOperation;

export default chargesSlice.reducer;
