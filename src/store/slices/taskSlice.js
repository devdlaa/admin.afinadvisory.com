import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ============================================
// CACHE CONFIGURATION
// ============================================
const CACHE_CONFIG = {
  // Cache duration in milliseconds (5 minutes)
  TASK_LIST_TTL: 2 * 60 * 1000,
  // Maximum cache entries to prevent memory bloat
  MAX_CACHE_ENTRIES: 50,
};

// ============================================
// CACHE KEY GENERATOR
// ============================================
const generateCacheKey = (filters, page, pageSize) => {
  const filterStr = Object.entries(filters)
    .filter(
      ([_, value]) => value !== null && value !== "" && value !== undefined
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");

  return `tasks_${filterStr}_p${page}_ps${pageSize}`;
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
 * Fetch tasks with filters and pagination (with caching)
 */
export const fetchTasks = createAsyncThunk(
  "task/fetchTasks",
  async (forceRefresh = false, { getState, rejectWithValue }) => {
    try {
      const state = getState().task;
      const { currentPage, pageSize, filters, cache } = state;

      // Generate cache key
      const cacheKey = generateCacheKey(filters, currentPage, pageSize);

      // Check cache if not forcing refresh
      if (!forceRefresh && cache[cacheKey]) {
        const cachedData = cache[cacheKey];
        const now = Date.now();

        // Return cached data if still valid
        if (now - cachedData.timestamp < CACHE_CONFIG.TASK_LIST_TTL) {
          return {
            ...cachedData.data,
            fromCache: true,
            cacheKey,
          };
        }
      }

      // Build API URL
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("page_size", pageSize);


      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== "" && value !== undefined) {
          params.append(key, value);
        }
      });

      const result = await apiFetch(
        `/api/admin_ops/tasks?${params.toString()}`
      );

      return {
        ...result.data,
        fromCache: false,
        cacheKey,
      };
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
      const result = await apiFetch("/api/admin_ops/tasks", {
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
      const result = await apiFetch(`/api/admin_ops/tasks/${taskId}`, {
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
      const result = await apiFetch(`/api/admin_ops/tasks/${taskId}`, {
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
      const result = await apiFetch("/api/admin_ops/tasks/bulk?action=status", {
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
      const result = await apiFetch(
        "/api/admin_ops/tasks/bulk?action=priority",
        {
          method: "POST",
          body: JSON.stringify({ task_ids, priority }),
        }
      );
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
      const result = await apiFetch("/api/admin_ops/tasks/assignments/bulk", {
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
      const result = await apiFetch("/api/admin_ops/tasks/assignments/report");
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

  // Status counts for filters
  statusCounts: {
    filtered: {
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      ON_HOLD: 0,
      PENDING_CLIENT_INPUT: 0,
    },
    global: {
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      ON_HOLD: 0,
      PENDING_CLIENT_INPUT: 0,
    },
  },

  // Cache management
  cache: {},
  cacheKeys: [],
  lastCacheCleanup: Date.now(),

  // Filters
  filters: {
    entity_id: null,
    status: "PENDING", // null means "All"
    priority: null, // null means "All"
    task_category_id: null,
    created_by: null,
    assigned_to: null,
    due_date_from: null,
    due_date_to: null,
    search: null,
    is_billable: null,
    billed_from_firm: null,
  },

  // Active filter count
  activeFilterCount: 0,

  // Bulk selection
  selectedTaskIds: [],
  bulkActionInProgress: false,

  // Dialog states
  createDialogOpen: false,
  manageDialogOpen: false,
  manageDialogTaskId: null,

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

/**
 * Clean old cache entries
 */
const cleanCache = (cache, cacheKeys) => {
  const now = Date.now();
  const validKeys = [];
  const newCache = {};

  // Keep only valid cache entries
  cacheKeys.forEach((key) => {
    if (cache[key] && now - cache[key].timestamp < CACHE_CONFIG.TASK_LIST_TTL) {
      validKeys.push(key);
      newCache[key] = cache[key];
    }
  });

  // If still too many entries, keep only the most recent ones
  if (validKeys.length > CACHE_CONFIG.MAX_CACHE_ENTRIES) {
    const sorted = validKeys
      .map((key) => ({ key, timestamp: cache[key].timestamp }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, CACHE_CONFIG.MAX_CACHE_ENTRIES);

    const finalCache = {};
    const finalKeys = [];

    sorted.forEach(({ key }) => {
      finalCache[key] = newCache[key];
      finalKeys.push(key);
    });

    return { cache: finalCache, cacheKeys: finalKeys };
  }

  return { cache: newCache, cacheKeys: validKeys };
};

/**
 * Invalidate cache (when mutations occur)
 */
const invalidateCache = (state) => {
  state.cache = {};
  state.cacheKeys = [];
  state.lastCacheCleanup = Date.now();
};

// ============================================
// SLICE
// ============================================
const taskSlice = createSlice({
  name: "task",
  initialState,
  reducers: {
    updateTaskAssignmentsInList: (state, action) => {
      const {
        task_id,
        assigned_to_all,
        assignments,
        remaining_assignee_count,
      } = action.payload;

      const task = state.tasks.find((t) => t.id === task_id);
      if (task) {
        task.assigned_to_all = assigned_to_all;
        task.assignments = assignments;
        if (remaining_assignee_count !== undefined) {
          task.remaining_assignee_count = remaining_assignee_count;
        }
      }

      // Invalidate cache on update
      invalidateCache(state);
    },

    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.activeFilterCount = countActiveFilters(state.filters);
      state.currentPage = 1;
    },

    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.activeFilterCount = 0;
      state.currentPage = 1;
    },

    setPage: (state, action) => {
      state.currentPage = action.payload;
    },

    toggleTaskSelection: (state, action) => {
      const taskId = action.payload;
      const index = state.selectedTaskIds.indexOf(taskId);

      if (index > -1) {
        state.selectedTaskIds.splice(index, 1);
      } else {
        state.selectedTaskIds.push(taskId);
      }
    },

    selectAllTasks: (state) => {
      const currentTaskIds = state.tasks.map((task) => task.id);
      state.selectedTaskIds = [
        ...new Set([...state.selectedTaskIds, ...currentTaskIds]),
      ];
    },

    deselectAllTasks: (state) => {
      state.selectedTaskIds = [];
    },

    openCreateDialog: (state) => {
      state.createDialogOpen = true;
    },

    closeCreateDialog: (state) => {
      state.createDialogOpen = false;
    },

    openManageDialog: (state, action) => {
      state.manageDialogOpen = true;
      state.manageDialogTaskId = action.payload;
    },

    closeManageDialog: (state) => {
      state.manageDialogOpen = false;
      state.manageDialogTaskId = null;
    },

    clearErrors: (state) => {
      state.error = initialState.error;
    },

    clearError: (state, action) => {
      const errorKey = action.payload;
      if (state.error[errorKey]) {
        state.error[errorKey] = null;
      }
    },

    // Manual cache invalidation
    invalidateTaskCache: (state) => {
      invalidateCache(state);
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
        const {
          tasks,
          page,
          page_size,
          total,
          total_pages,
          status_counts,
          fromCache,
          cacheKey,
        } = action.payload;

        state.tasks = tasks;
        state.totalTasks = total;
        state.currentPage = page;
        state.pageSize = page_size;
        state.totalPages = total_pages;
        state.statusCounts = status_counts || state.statusCounts;

        // Update cache if not from cache
        if (!fromCache && cacheKey) {
          state.cache[cacheKey] = {
            data: action.payload,
            timestamp: Date.now(),
          };

          if (!state.cacheKeys.includes(cacheKey)) {
            state.cacheKeys.push(cacheKey);
          }

          // Periodic cache cleanup
          const now = Date.now();
          if (now - state.lastCacheCleanup > 60000) {
            const cleaned = cleanCache(state.cache, state.cacheKeys);
            state.cache = cleaned.cache;
            state.cacheKeys = cleaned.cacheKeys;
            state.lastCacheCleanup = now;
          }
        }

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

        if (state.currentPage === 1) {
          state.tasks.unshift(newTask);
        }

        state.createDialogOpen = false;
        state.loading.create = false;

        // Invalidate cache
        invalidateCache(state);
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
        state.tasks = updateTaskInList(state.tasks, updatedTask);
        state.loading.update = false;

        // Invalidate cache
        invalidateCache(state);
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

        state.tasks = removeTaskFromList(state.tasks, taskId);
        state.selectedTaskIds = state.selectedTaskIds.filter(
          (id) => id !== taskId
        );

        state.manageDialogOpen = false;
        state.manageDialogTaskId = null;
        state.loading.delete = false;

        // Invalidate cache
        invalidateCache(state);
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

        state.tasks = updateMultipleTasksInList(state.tasks, updated_task_ids, {
          status: new_status,
        });

        state.selectedTaskIds = [];
        state.loading.bulkStatus = false;
        state.bulkActionInProgress = false;

        // Invalidate cache
        invalidateCache(state);
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

        state.tasks = updateMultipleTasksInList(state.tasks, updated_task_ids, {
          priority: new_priority,
        });

        state.selectedTaskIds = [];
        state.loading.bulkPriority = false;
        state.bulkActionInProgress = false;

        // Invalidate cache
        invalidateCache(state);
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
      .addCase(bulkAssignTasks.fulfilled, (state) => {
        state.selectedTaskIds = [];
        state.loading.bulkAssign = false;
        state.bulkActionInProgress = false;

        // Invalidate cache
        invalidateCache(state);
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
  updateTaskAssignmentsInList,
  setFilters,
  resetFilters,
  setPage,
  toggleTaskSelection,
  selectAllTasks,
  deselectAllTasks,
  openCreateDialog,
  closeCreateDialog,
  openManageDialog,
  closeManageDialog,
  clearErrors,
  clearError,
  invalidateTaskCache,
} = taskSlice.actions;

// ============================================
// SELECTORS
// ============================================
export const selectTasks = (state) => state.task.tasks;
export const selectPagination = (state) => ({
  currentPage: state.task.currentPage,
  pageSize: state.task.pageSize,
  totalTasks: state.task.totalTasks,
  totalPages: state.task.totalPages,
});
export const selectFilters = (state) => state.task.filters;
export const selectActiveFilterCount = (state) => state.task.activeFilterCount;
export const selectSelectedTaskIds = (state) => state.task.selectedTaskIds;
export const selectSelectedTasksCount = (state) =>
  state.task.selectedTaskIds.length;
export const selectHasSelectedTasks = (state) =>
  state.task.selectedTaskIds.length > 0;
export const selectCreateDialogOpen = (state) => state.task.createDialogOpen;
export const selectManageDialogOpen = (state) => state.task.manageDialogOpen;
export const selectManageDialogTaskId = (state) =>
  state.task.manageDialogTaskId;
export const selectAssignmentReport = (state) => state.task.assignmentReport;
export const selectIsLoading =
  ({ type = "list" } = {}) =>
  (state) =>
    state?.task?.loading?.[type] ?? false;
export const selectError = (state, type = "list") => state.task.error[type];
export const selectBulkActionInProgress = (state) =>
  state.task.bulkActionInProgress;
export const selectAssignmentReportLoading = (state) =>
  state.task.assignmentReportLoading;
export const selectHasAssignmentReportData = (state) =>
  state.task.assignmentReport && state.task.assignmentReport.length > 0;
export const selectStatusCounts = (state) => state.task.statusCounts;

// ============================================
// EXPORT REDUCER
// ============================================
export default taskSlice.reducer;
