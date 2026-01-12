import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

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

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw {
      status: response.status,
      message: result.error?.message || result.message || "Request failed",
      code: result.error?.code || "UNKNOWN_ERROR",
      details: result.error?.details || null,
    };
  }

  return result;
};

// ============================================
// HELPER - Extract charges array from API response
// ============================================
const extractChargesArray = (chargesData) => {
  // If it's already an array, return it
  if (Array.isArray(chargesData)) {
    return chargesData;
  }

  // If it has the spec structure, return empty array (server will return fresh list)
  if (chargesData?.spec) {
    return [];
  }

  return [];
};

// ============================================
// ASYNC THUNKS
// ============================================

/**
 * Fetch single task by ID (includes charges, checklist, assignments)
 */
export const fetchTaskById = createAsyncThunk(
  "taskDetail/fetchTaskById",
  async (taskId, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/admin_ops/tasks/${taskId}`);
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch task",
        code: error.code,
        details: error.details,
      });
    }
  }
);

// ============================================
// CHARGES
// ============================================

/**
 * Add charge to task
 */
export const addCharge = createAsyncThunk(
  "taskDetail/addCharge",
  async ({ taskId, chargeData }, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/admin_ops/tasks/${taskId}/charges`, {
        method: "POST",
        body: JSON.stringify(chargeData),
      });

      // Return task_id and extracted charges array
      return {
        task_id: result.data.task_id,
        charges: result.data.charges,
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to add charge",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Update charge
 */
export const updateCharge = createAsyncThunk(
  "taskDetail/updateCharge",
  async ({ taskId, chargeId, data }, { rejectWithValue }) => {
    try {
      const result = await apiFetch(
        `/api/admin_ops/tasks/${taskId}/charges/${chargeId}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );

      return {
        task_id: result.data.task_id,
        charges: result.data.charges,
        chargeId,
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to update charge",
        code: error.code,
        details: error.details,
        chargeId,
      });
    }
  }
);

/**
 * Delete charge
 */
export const deleteCharge = createAsyncThunk(
  "taskDetail/deleteCharge",
  async ({ taskId, chargeId }, { rejectWithValue }) => {
    try {
      const result = await apiFetch(
        `/api/admin_ops/tasks/${taskId}/charges/${chargeId}`,
        {
          method: "DELETE",
        }
      );

      return {
        task_id: result.data.task_id,
        charges: extractChargesArray(result.data.charges),
        chargeId, // Include chargeId for loading state tracking
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to delete charge",
        code: error.code,
        details: error.details,
        chargeId, // Include chargeId for error tracking
      });
    }
  }
);

// ============================================
// CHECKLIST
// ============================================

/**
 * Sync checklist (add/update/delete items)
 */
export const syncChecklist = createAsyncThunk(
  "taskDetail/syncChecklist",
  async ({ taskId, items }, { rejectWithValue }) => {
    try {
      const result = await apiFetch(
        `/api/admin_ops/tasks/${taskId}/checklist`,
        {
          method: "POST",
          body: JSON.stringify({ items }),
        }
      );
      return result.data; // { task_id, updated }
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to sync checklist",
        code: error.code,
        details: error.details,
      });
    }
  }
);

// ============================================
// ASSIGNMENTS
// ============================================

/**
 * Sync task assignments
 */
export const syncAssignments = createAsyncThunk(
  "taskDetail/syncAssignments",
  async ({ taskId, user_ids, assigned_to_all }, { rejectWithValue }) => {
    try {
      const result = await apiFetch(
        `/api/admin_ops/tasks/${taskId}/assignments`,
        {
          method: "POST",
          body: JSON.stringify({ user_ids, assigned_to_all }),
        }
      );

      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to sync assignments",
        code: error.code,
        details: error.details,
      });
    }
  }
);

// ============================================
// INITIAL STATE
// ============================================
const initialState = {
  // Current task detail
  currentTask: null,

  // Loading states
  loading: {
    task: false,
    charges: false,
    checklist: false,
    assignments: false,
    // Track loading per charge ID
    chargeOperations: {}, // { [chargeId]: 'adding' | 'updating' | 'deleting' }
  },

  // Error states
  error: {
    task: null,
    charges: null,
    checklist: null,
    assignments: null,
  },

  // Success flags (for UI feedback)
  success: {
    chargeAdded: false,
    chargeUpdated: false,
    chargeDeleted: false,
    checklistSynced: false,
    assignmentsSynced: false,
  },
};

// ============================================
// SLICE
// ============================================
const taskDetailSlice = createSlice({
  name: "taskDetail",
  initialState,
  reducers: {
    // Clear current task
    clearCurrentTask: (state) => {
      state.currentTask = null;
    },

    // Clear errors
    clearErrors: (state) => {
      state.error = initialState.error;
    },

    // Clear specific error
    clearError: (state, action) => {
      const errorKey = action.payload;
      if (state.error[errorKey]) {
        state.error[errorKey] = null;
      }
    },

    // Clear success flags
    clearSuccessFlags: (state) => {
      state.success = initialState.success;
    },

    // Clear specific success flag
    clearSuccessFlag: (state, action) => {
      const successKey = action.payload;
      if (state.success[successKey] !== undefined) {
        state.success[successKey] = false;
      }
    },
  },

  extraReducers: (builder) => {
    // ============================================
    // FETCH TASK BY ID
    // ============================================
    builder
      .addCase(fetchTaskById.pending, (state) => {
        state.loading.task = true;
        state.error.task = null;
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.currentTask = action.payload;
        state.loading.task = false;
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.loading.task = false;
        state.error.task = action.payload?.message || "Failed to fetch task";
      });

    // ============================================
    // ADD CHARGE
    // ============================================
    builder
      .addCase(addCharge.pending, (state) => {
        state.loading.charges = true;
        state.loading.chargeOperations["new"] = "adding";
        state.error.charges = null;
        state.success.chargeAdded = false;
      })
      .addCase(addCharge.fulfilled, (state, action) => {
        const { task_id, charges } = action.payload;

        if (state.currentTask && state.currentTask.id === task_id) {
          state.currentTask.charges = charges;
        }

        state.loading.charges = false;
        delete state.loading.chargeOperations["new"];
        state.success.chargeAdded = true;
      })
      .addCase(addCharge.rejected, (state, action) => {
        state.loading.charges = false;
        delete state.loading.chargeOperations["new"];
        state.error.charges = action.payload?.message || "Failed to add charge";
      });

    // ============================================
    // UPDATE CHARGE
    // ============================================
    builder
      .addCase(updateCharge.pending, (state, action) => {
        const chargeId = action.meta.arg.chargeId;
        state.loading.charges = true;
        state.loading.chargeOperations[chargeId] = "updating";
        state.error.charges = null;
        state.success.chargeUpdated = false;
      })
      .addCase(updateCharge.fulfilled, (state, action) => {
        const { task_id, charges, chargeId } = action.payload;

        // Update charges in current task with fresh array from server
        if (state.currentTask && state.currentTask.id === task_id) {
          state.currentTask.charges = charges;
        }

        state.loading.charges = false;
        delete state.loading.chargeOperations[chargeId];
        state.success.chargeUpdated = true;
      })
      .addCase(updateCharge.rejected, (state, action) => {
        const chargeId = action.payload?.chargeId;
        state.loading.charges = false;
        if (chargeId) {
          delete state.loading.chargeOperations[chargeId];
        }
        state.error.charges =
          action.payload?.message || "Failed to update charge";
      });

    // ============================================
    // DELETE CHARGE
    // ============================================
    builder
      .addCase(deleteCharge.pending, (state, action) => {
        const chargeId = action.meta.arg.chargeId;
        state.loading.charges = true;
        state.loading.chargeOperations[chargeId] = "deleting";
        state.error.charges = null;
        state.success.chargeDeleted = false;
      })
      .addCase(deleteCharge.fulfilled, (state, action) => {
        const { task_id, charges, chargeId } = action.payload;

        // Update charges in current task with fresh array from server
        if (state.currentTask && state.currentTask.id === task_id) {
          state.currentTask.charges = charges;
        }

        state.loading.charges = false;
        delete state.loading.chargeOperations[chargeId];
        state.success.chargeDeleted = true;
      })
      .addCase(deleteCharge.rejected, (state, action) => {
        const chargeId = action.payload?.chargeId;
        state.loading.charges = false;
        if (chargeId) {
          delete state.loading.chargeOperations[chargeId];
        }
        state.error.charges =
          action.payload?.message || "Failed to delete charge";
      });

    // ============================================
    // SYNC CHECKLIST
    // ============================================
    builder
      .addCase(syncChecklist.pending, (state) => {
        state.loading.checklist = true;
        state.error.checklist = null;
        state.success.checklistSynced = false;
      })
      .addCase(syncChecklist.fulfilled, (state, action) => {
        const { task_id, updated } = action.payload;

        // Update checklist in current task
        if (state.currentTask && state.currentTask.id === task_id) {
          state.currentTask.checklist_items = updated;
        }

        state.loading.checklist = false;
        state.success.checklistSynced = true;
      })
      .addCase(syncChecklist.rejected, (state, action) => {
        state.loading.checklist = false;
        state.error.checklist =
          action.payload?.message || "Failed to sync checklist";
      });

    // ============================================
    // SYNC ASSIGNMENTS
    // ============================================
    builder
      .addCase(syncAssignments.pending, (state) => {
        state.loading.assignments = true;
        state.error.assignments = null;
        state.success.assignmentsSynced = false;
      })
      .addCase(syncAssignments.fulfilled, (state, action) => {
        const { task_id, assigned_to_all, assignments } = action.payload;

        // Update assignments in current task
        if (state.currentTask && state.currentTask.id === task_id) {
          state.currentTask.assigned_to_all = assigned_to_all;
          state.currentTask.assignments = assignments;
        }

        state.loading.assignments = false;
        state.success.assignmentsSynced = true;
      })
      .addCase(syncAssignments.rejected, (state, action) => {
        state.loading.assignments = false;
        state.error.assignments =
          action.payload?.message || "Failed to sync assignments";
      });
  },
});

// ============================================
// ACTIONS
// ============================================
export const {
  clearCurrentTask,
  clearErrors,
  clearError,
  clearSuccessFlags,
  clearSuccessFlag,
} = taskDetailSlice.actions;

// ============================================
// SELECTORS
// ============================================

const selectTaskDetailState = (state) => state.taskDetail || initialState;

export const selectCurrentTask = (state) =>
  selectTaskDetailState(state).currentTask;

export const selectCharges = (state) => {
  const charges = selectTaskDetailState(state).currentTask?.charges;
  return Array.isArray(charges) ? charges : [];
};

export const selectChecklistItems = (state) =>
  selectTaskDetailState(state).currentTask?.checklist_items || [];

export const selectAssignments = (state) =>
  selectTaskDetailState(state).currentTask?.assignments || [];

export const selectIsAssignedToAll = (state) =>
  selectTaskDetailState(state).currentTask?.assigned_to_all || false;

export const selectIsLoading = (state, type = "task") =>
  selectTaskDetailState(state).loading?.[type] ?? false;

export const selectError = (state, type = "task") =>
  selectTaskDetailState(state).error?.[type] ?? null;

export const selectSuccess = (state, type) =>
  selectTaskDetailState(state).success?.[type] ?? false;

// New selector for charge-specific loading states
export const selectChargeOperation = (state, chargeId) =>
  selectTaskDetailState(state).loading?.chargeOperations?.[chargeId] ?? null;

// ============================================
// EXPORT REDUCER
// ============================================
export default taskDetailSlice.reducer;
