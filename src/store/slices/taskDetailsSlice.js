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
// ASYNC THUNKS
// ============================================

/**
 * Fetch single task by ID (includes charges, checklist, assignments)
 */
export const fetchTaskById = createAsyncThunk(
  "taskDetail/fetchTaskById",
  async (taskId, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/tasks/${taskId}`);
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
      const result = await apiFetch(`/api/tasks/${taskId}/charges`, {
        method: "POST",
        body: JSON.stringify(chargeData),
      });
      return result.data; // { task_id, charges }
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
        `/api/tasks/${taskId}/charges/${chargeId}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
      return result.data; // { task_id, charges }
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to update charge",
        code: error.code,
        details: error.details,
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
        `/api/tasks/${taskId}/charges/${chargeId}`,
        {
          method: "DELETE",
        }
      );
      return result.data; // { task_id, charges }
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to delete charge",
        code: error.code,
        details: error.details,
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
      const result = await apiFetch(`/api/tasks/${taskId}/checklist`, {
        method: "POST",
        body: JSON.stringify({ items }),
      });
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
      const result = await apiFetch(`/api/tasks/${taskId}/assignments`, {
        method: "POST",
        body: JSON.stringify({ user_ids, assigned_to_all }),
      });
      return result.data; // { task_id, assigned_to_all, assignments }
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
        state.error.charges = null;
        state.success.chargeAdded = false;
      })
      .addCase(addCharge.fulfilled, (state, action) => {
        const { task_id, charges } = action.payload;

        // Update charges in current task
        if (state.currentTask && state.currentTask.id === task_id) {
          state.currentTask.charges = charges;
        }

        state.loading.charges = false;
        state.success.chargeAdded = true;
      })
      .addCase(addCharge.rejected, (state, action) => {
        state.loading.charges = false;
        state.error.charges = action.payload?.message || "Failed to add charge";
      });

    // ============================================
    // UPDATE CHARGE
    // ============================================
    builder
      .addCase(updateCharge.pending, (state) => {
        state.loading.charges = true;
        state.error.charges = null;
        state.success.chargeUpdated = false;
      })
      .addCase(updateCharge.fulfilled, (state, action) => {
        const { task_id, charges } = action.payload;

        // Update charges in current task
        if (state.currentTask && state.currentTask.id === task_id) {
          state.currentTask.charges = charges;
        }

        state.loading.charges = false;
        state.success.chargeUpdated = true;
      })
      .addCase(updateCharge.rejected, (state, action) => {
        state.loading.charges = false;
        state.error.charges =
          action.payload?.message || "Failed to update charge";
      });

    // ============================================
    // DELETE CHARGE
    // ============================================
    builder
      .addCase(deleteCharge.pending, (state) => {
        state.loading.charges = true;
        state.error.charges = null;
        state.success.chargeDeleted = false;
      })
      .addCase(deleteCharge.fulfilled, (state, action) => {
        const { task_id, charges } = action.payload;

        // Update charges in current task
        if (state.currentTask && state.currentTask.id === task_id) {
          state.currentTask.charges = charges;
        }

        state.loading.charges = false;
        state.success.chargeDeleted = true;
      })
      .addCase(deleteCharge.rejected, (state, action) => {
        state.loading.charges = false;
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
          state.currentTask.is_assigned_to_all = assigned_to_all;
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

// Get current task
export const selectCurrentTask = (state) => state.taskDetail.currentTask;

// Get charges
export const selectCharges = (state) =>
  state.taskDetail.currentTask?.charges || [];

// Get checklist items
export const selectChecklistItems = (state) =>
  state.taskDetail.currentTask?.checklist_items || [];

// Get assignments
export const selectAssignments = (state) =>
  state.taskDetail.currentTask?.assignments || [];

// Check if assigned to all
export const selectIsAssignedToAll = (state) =>
  state.taskDetail.currentTask?.is_assigned_to_all || false;

// Get loading states
export const selectIsLoading = (state, type = "task") =>
  state.taskDetail.loading[type];

// Get error states
export const selectError = (state, type = "task") =>
  state.taskDetail.error[type];

// Get success states
export const selectSuccess = (state, type) => state.taskDetail.success[type];

// ============================================
// EXPORT REDUCER
// ============================================
export default taskDetailSlice.reducer;
