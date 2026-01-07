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
 * Fetch tasks with filters and pagination
 */
export const fetchTasks = createAsyncThunk(
  "task/fetchTasks",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState().task;
      const { currentPage, pageSize, filters } = state;

      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("page_size", pageSize);

      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== "" && value !== undefined) {
          params.append(key, value);
        }
      });

      const result = await apiFetch(`/api/tasks?${params.toString()}`);
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch tasks",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Create new task
 */
export const createTask = createAsyncThunk(
  "task/createTask",
  async (taskData, { rejectWithValue }) => {
    try {
      const result = await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify(taskData),
      });
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to create task",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Update task
 */
export const updateTask = createAsyncThunk(
  "task/updateTask",
  async ({ taskId, data }, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to update task",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Delete task
 */
export const deleteTask = createAsyncThunk(
  "task/deleteTask",
  async (taskId, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      return { taskId, ...result.data };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to delete task",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Bulk update task status
 */
export const bulkUpdateTaskStatus = createAsyncThunk(
  "task/bulkUpdateTaskStatus",
  async ({ task_ids, status }, { rejectWithValue }) => {
    try {
      const result = await apiFetch("/api/tasks/bulk?action=status", {
        method: "POST",
        body: JSON.stringify({ task_ids, status }),
      });
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to update task statuses",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Bulk update task priority
 */
export const bulkUpdateTaskPriority = createAsyncThunk(
  "task/bulkUpdateTaskPriority",
  async ({ task_ids, priority }, { rejectWithValue }) => {
    try {
      const result = await apiFetch("/api/tasks/bulk?action=priority", {
        method: "POST",
        body: JSON.stringify({ task_ids, priority }),
      });
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to update task priorities",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Bulk assign tasks
 */
export const bulkAssignTasks = createAsyncThunk(
  "task/bulkAssignTasks",
  async ({ task_ids, user_ids }, { rejectWithValue }) => {
    try {
      const result = await apiFetch("/api/tasks/assignments/bulk", {
        method: "POST",
        body: JSON.stringify({ task_ids, user_ids }),
      });
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to assign tasks",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Fetch assignment report (workload)
 */
export const fetchAssignmentReport = createAsyncThunk(
  "task/fetchAssignmentReport",
  async (_, { rejectWithValue }) => {
    try {
      const result = await apiFetch("/api/tasks/assignments/report");
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch assignment report",
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
  // Task list
  tasks: [],
  totalTasks: 0,
  currentPage: 1,
  pageSize: 20,
  totalPages: 0,

  // Filters
  filters: {
    entity_id: null,
    status: null,
    priority: null,
    task_category_id: null,
    created_by: null,
    assigned_to: null,
    due_date_from: null,
    due_date_to: null,
    search: null,
    is_billable: null,
    billed_from_firm: null,
  },

  // Active filter count (computed in reducer)
  activeFilterCount: 0,

  // Bulk selection
  selectedTaskIds: [],
  bulkActionInProgress: false,

  // Dialog state
  dialog: {
    open: false,
    mode: null, // 'create' | 'edit'
    step: 1, // Only for create mode (step 1 or 2)
    taskId: null, // For edit mode
  },

  // Assignment report (workload)
  assignmentReport: null,
  assignmentReportLoading: false,

  // Loading states
  loading: {
    list: false,
    create: false,
    update: false,
    delete: false,
    bulkStatus: false,
    bulkPriority: false,
    bulkAssign: false,
  },

  // Error states
  error: {
    list: null,
    create: null,
    update: null,
    delete: null,
    bulkStatus: null,
    bulkPriority: null,
    bulkAssign: null,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Count active filters
 */
const countActiveFilters = (filters) => {
  return Object.values(filters).filter(
    (value) => value !== null && value !== "" && value !== undefined
  ).length;
};

/**
 * Update task in list by ID
 */
const updateTaskInList = (tasks, updatedTask) => {
  return tasks.map((task) =>
    task.id === updatedTask.id ? { ...task, ...updatedTask } : task
  );
};

/**
 * Update multiple tasks in list by IDs
 */
const updateMultipleTasksInList = (tasks, taskIds, updates) => {
  return tasks.map((task) =>
    taskIds.includes(task.id) ? { ...task, ...updates } : task
  );
};

/**
 * Remove task from list by ID
 */
const removeTaskFromList = (tasks, taskId) => {
  return tasks.filter((task) => task.id !== taskId);
};

// ============================================
// SLICE
// ============================================
const taskSlice = createSlice({
  name: "task",
  initialState,
  reducers: {
    // Set filters
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.activeFilterCount = countActiveFilters(state.filters);
      // Reset to page 1 when filters change
      state.currentPage = 1;
    },

    // Reset filters
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.activeFilterCount = 0;
      state.currentPage = 1;
    },

    // Set page
    setPage: (state, action) => {
      state.currentPage = action.payload;
    },

    // Toggle task selection
    toggleTaskSelection: (state, action) => {
      const taskId = action.payload;
      const index = state.selectedTaskIds.indexOf(taskId);

      if (index > -1) {
        state.selectedTaskIds.splice(index, 1);
      } else {
        state.selectedTaskIds.push(taskId);
      }
    },

    // Select all tasks on current page
    selectAllTasks: (state) => {
      const currentTaskIds = state.tasks.map((task) => task.id);
      state.selectedTaskIds = [
        ...new Set([...state.selectedTaskIds, ...currentTaskIds]),
      ];
    },

    // Deselect all tasks
    deselectAllTasks: (state) => {
      state.selectedTaskIds = [];
    },

    // Open dialog
    openDialog: (state, action) => {
      const { mode, taskId } = action.payload;
      state.dialog = {
        open: true,
        mode,
        step: mode === "create" ? 1 : 1,
        taskId: taskId || null,
      };
    },

    // Close dialog
    closeDialog: (state) => {
      state.dialog = initialState.dialog;
    },

    // Set dialog step (for create mode)
    setDialogStep: (state, action) => {
      state.dialog.step = action.payload;
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
  },

  extraReducers: (builder) => {
    // ============================================
    // FETCH TASKS
    // ============================================
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading.list = true;
        state.error.list = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        const { tasks, page, page_size, total, total_pages } = action.payload;

        state.tasks = tasks;
        state.totalTasks = total;
        state.currentPage = page;
        state.pageSize = page_size;
        state.totalPages = total_pages;

        state.loading.list = false;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading.list = false;
        state.error.list = action.payload?.message || "Failed to fetch tasks";
      });

    // ============================================
    // CREATE TASK
    // ============================================
    builder
      .addCase(createTask.pending, (state) => {
        state.loading.create = true;
        state.error.create = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        const newTask = action.payload;

        // Add to list if on first page
        if (state.currentPage === 1) {
          state.tasks.unshift(newTask);
        }

        // Move to step 2 in create dialog
        if (state.dialog.mode === "create") {
          state.dialog.step = 2;
          state.dialog.taskId = newTask.id;
        }

        state.loading.create = false;
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading.create = false;
        state.error.create = action.payload?.message || "Failed to create task";
      });

    // ============================================
    // UPDATE TASK
    // ============================================
    builder
      .addCase(updateTask.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const updatedTask = action.payload;

        // Update in list
        state.tasks = updateTaskInList(state.tasks, updatedTask);

        state.loading.update = false;
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update = action.payload?.message || "Failed to update task";
      });

    // ============================================
    // DELETE TASK
    // ============================================
    builder
      .addCase(deleteTask.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        const { taskId } = action.payload;

        // Remove from list
        state.tasks = removeTaskFromList(state.tasks, taskId);

        // Remove from selection if selected
        state.selectedTaskIds = state.selectedTaskIds.filter(
          (id) => id !== taskId
        );

        state.loading.delete = false;
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete = action.payload?.message || "Failed to delete task";
      });

    // ============================================
    // BULK UPDATE STATUS
    // ============================================
    builder
      .addCase(bulkUpdateTaskStatus.pending, (state) => {
        state.loading.bulkStatus = true;
        state.error.bulkStatus = null;
        state.bulkActionInProgress = true;
      })
      .addCase(bulkUpdateTaskStatus.fulfilled, (state, action) => {
        const { updated_task_ids, new_status } = action.payload;

        // Update tasks in list
        state.tasks = updateMultipleTasksInList(state.tasks, updated_task_ids, {
          status: new_status,
        });

        // Clear selection after success
        state.selectedTaskIds = [];

        state.loading.bulkStatus = false;
        state.bulkActionInProgress = false;
      })
      .addCase(bulkUpdateTaskStatus.rejected, (state, action) => {
        state.loading.bulkStatus = false;
        state.bulkActionInProgress = false;
        state.error.bulkStatus =
          action.payload?.message || "Failed to update task statuses";
      });

    // ============================================
    // BULK UPDATE PRIORITY
    // ============================================
    builder
      .addCase(bulkUpdateTaskPriority.pending, (state) => {
        state.loading.bulkPriority = true;
        state.error.bulkPriority = null;
        state.bulkActionInProgress = true;
      })
      .addCase(bulkUpdateTaskPriority.fulfilled, (state, action) => {
        const { updated_task_ids, new_priority } = action.payload;

        // Update tasks in list
        state.tasks = updateMultipleTasksInList(state.tasks, updated_task_ids, {
          priority: new_priority,
        });

        // Clear selection after success
        state.selectedTaskIds = [];

        state.loading.bulkPriority = false;
        state.bulkActionInProgress = false;
      })
      .addCase(bulkUpdateTaskPriority.rejected, (state, action) => {
        state.loading.bulkPriority = false;
        state.bulkActionInProgress = false;
        state.error.bulkPriority =
          action.payload?.message || "Failed to update task priorities";
      });

    // ============================================
    // BULK ASSIGN TASKS
    // ============================================
    builder
      .addCase(bulkAssignTasks.pending, (state) => {
        state.loading.bulkAssign = true;
        state.error.bulkAssign = null;
        state.bulkActionInProgress = true;
      })
      .addCase(bulkAssignTasks.fulfilled, (state, action) => {
        // Clear selection after success
        state.selectedTaskIds = [];

        state.loading.bulkAssign = false;
        state.bulkActionInProgress = false;
      })
      .addCase(bulkAssignTasks.rejected, (state, action) => {
        state.loading.bulkAssign = false;
        state.bulkActionInProgress = false;
        state.error.bulkAssign =
          action.payload?.message || "Failed to assign tasks";
      });

    // ============================================
    // FETCH ASSIGNMENT REPORT
    // ============================================
    builder
      .addCase(fetchAssignmentReport.pending, (state) => {
        state.assignmentReportLoading = true;
      })
      .addCase(fetchAssignmentReport.fulfilled, (state, action) => {
        state.assignmentReport = action.payload;
        state.assignmentReportLoading = false;
      })
      .addCase(fetchAssignmentReport.rejected, (state) => {
        state.assignmentReportLoading = false;
      });
  },
});

// ============================================
// ACTIONS
// ============================================
export const {
  setFilters,
  resetFilters,
  setPage,
  toggleTaskSelection,
  selectAllTasks,
  deselectAllTasks,
  openDialog,
  closeDialog,
  setDialogStep,
  clearErrors,
  clearError,
} = taskSlice.actions;

// ============================================
// SELECTORS
// ============================================

// Get all tasks
export const selectTasks = (state) => state.task.tasks;

// Get pagination info
export const selectPagination = (state) => ({
  currentPage: state.task.currentPage,
  pageSize: state.task.pageSize,
  totalTasks: state.task.totalTasks,
  totalPages: state.task.totalPages,
});

// Get filters
export const selectFilters = (state) => state.task.filters;

// Get active filter count
export const selectActiveFilterCount = (state) => state.task.activeFilterCount;

// Get selected task IDs
export const selectSelectedTaskIds = (state) => state.task.selectedTaskIds;

// Get selected tasks count
export const selectSelectedTasksCount = (state) =>
  state.task.selectedTaskIds.length;

// Check if any tasks are selected
export const selectHasSelectedTasks = (state) =>
  state.task.selectedTaskIds.length > 0;

// Get dialog state
export const selectDialogState = (state) => state.task.dialog;

// Get assignment report
export const selectAssignmentReport = (state) => state.task.assignmentReport;

// Get loading states
export const selectIsLoading =
  ({ type = "list" } = {}) =>
  (state) =>
    state?.task?.loading?.[type] ?? false;

// Get error states
export const selectError = (state, type = "list") => state.task.error[type];

// Check if bulk action in progress
export const selectBulkActionInProgress = (state) =>
  state.task.bulkActionInProgress;

// ============================================
// EXPORT REDUCER
// ============================================
export default taskSlice.reducer;
