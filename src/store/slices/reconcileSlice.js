import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  addChargeToTask,
  deleteTaskCharge,
  bulkUpdateTaskCharges,
  bulkUpdateChargeStatus,
} from "./chargesSlice";
import { createOrAppendInvoice } from "./invoiceSlice";

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
// INITIAL STATE
// ============================================

const createTabState = () => ({
  items: {}, // { 1: [...], 2: [...], 3: [...] }
  fetchedPages: {}, // Track which pages we have
  currentPage: 1,
  totalPages: 0,
  totalItems: 0,
  pageSize: 50,
  hasMore: false,
});

const initialState = {
  // Tabs
  unreconciled: createTabState(),
  nonBillable: createTabState(),

  // Current active tab
  activeTab: "unreconciled", // 'unreconciled' | 'nonBillable'

  // Bulk selection (per tab)
  selectedTaskIds: [], // Array of task IDs
  selectedTasks: [],

  // Loading states
  loading: {
    unreconciled: {
      fetch: false,
      fetchNext: false,
      fetchPrev: false,

      markNonBillable: false,
      addAdHocCharge: false,
      deleteAdHocCharge: false,
    },
    nonBillable: {
      fetch: false,
      fetchNext: false,
      fetchPrev: false,

      restoreBillable: false,
    },
  },

  // Errors
  error: {
    unreconciled: null,
    nonBillable: null,
    bulkAction: null, // { success: [], rejected: [{ id, reason }] }
  },
};

// ============================================
// ASYNC THUNKS
// ============================================

// Fetch Unreconciled Tasks
export const fetchUnreconciledTasks = createAsyncThunk(
  "reconcile/fetchUnreconciled",
  async (
    { filters, page = 1, isNext = false, isPrev = false },
    { rejectWithValue },
  ) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: filters?.page_size || "50",
        ...(filters?.entity_id && { entity_id: filters.entity_id }),
        ...(filters?.task_category_id && {
          task_category_id: filters.task_category_id,
        }),
        ...(filters?.task_status && { task_status: filters.task_status }),
        ...(filters?.from_date && { from_date: filters.from_date }),
        ...(filters?.to_date && { to_date: filters.to_date }),
        ...(filters?.order && { order: filters.order }),
      });

      const response = await fetch(
        `/api/admin_ops/tasks/reconcile/unreconciled?${params}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(
          formatErrorMessage(error) || "Failed to fetch unreconciled tasks",
        );
      }

      const data = await response.json();
      return {
        ...data.data,
        page,
        isNext,
        isPrev,
        isFilterChange: !isNext && !isPrev && page === 1,
      };
    } catch (error) {
      return rejectWithValue(formatErrorMessage(error));
    }
  },
);

// Fetch Non-Billable Tasks
export const fetchNonBillableTasks = createAsyncThunk(
  "reconcile/fetchNonBillable",
  async (
    { filters, page = 1, isNext = false, isPrev = false },
    { rejectWithValue },
  ) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: filters?.page_size || "50",
        ...(filters?.entity_id && { entity_id: filters.entity_id }),
        ...(filters?.task_category_id && {
          task_category_id: filters.task_category_id,
        }),
        ...(filters?.task_status && { task_status: filters.task_status }),
        ...(filters?.from_date && { from_date: filters.from_date }),
        ...(filters?.to_date && { to_date: filters.to_date }),
        ...(filters?.order && { order: filters.order }),
      });

      const response = await fetch(
        `/api/admin_ops/tasks/reconcile/non-billable?${params}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(
          formatErrorMessage(error) || "Failed to fetch non-billable tasks",
        );
      }

      const data = await response.json();
      return {
        ...data.data,
        page,
        isNext,
        isPrev,
        isFilterChange: !isNext && !isPrev && page === 1,
      };
    } catch (error) {
      return rejectWithValue(formatErrorMessage(error));
    }
  },
);

// Mark Tasks as Non-Billable
export const markTasksNonBillable = createAsyncThunk(
  "reconcile/markNonBillable",
  async (taskIds, { rejectWithValue }) => {
    try {
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw new Error("At least one task must be selected");
      }

      const response = await fetch(
        "/api/admin_ops/tasks/reconcile/mark-non-billable",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_ids: taskIds }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(
          formatErrorMessage(error) || "Failed to mark tasks as non-billable",
        );
      }

      const data = await response.json();
      return { result: data.data, taskIds };
    } catch (error) {
      return rejectWithValue(formatErrorMessage(error));
    }
  },
);

// Restore Tasks to Billable
export const restoreTasksBillable = createAsyncThunk(
  "reconcile/restoreBillable",
  async (taskIds, { rejectWithValue }) => {
    try {
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw new Error("At least one task must be selected");
      }

      const response = await fetch(
        "/api/admin_ops/tasks/reconcile/restore-non-billable",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_ids: taskIds }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(
          formatErrorMessage(error) || "Failed to restore tasks to billable",
        );
      }

      const data = await response.json();
      return { result: data.data, taskIds };
    } catch (error) {
      return rejectWithValue(formatErrorMessage(error));
    }
  },
);

// Create Ad-hoc Charge
export const createAdHocCharge = createAsyncThunk(
  "reconcile/createAdHocCharge",
  async ({ entityId, chargeData }, { rejectWithValue }) => {
    try {
      if (!entityId) {
        throw new Error("Entity ID is required");
      }
      if (!chargeData || !chargeData.title || !chargeData.amount) {
        throw new Error("Charge title and amount are required");
      }

      const response = await fetch(
        `/api/admin_ops/entity/${entityId}/adhoc-charges`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chargeData),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(
          formatErrorMessage(error) || "Failed to create ad-hoc charge",
        );
      }

      const data = await response.json();
      return data.data; // { item: {...} } - same shape as unreconciled item
    } catch (error) {
      return rejectWithValue(formatErrorMessage(error));
    }
  },
);

// Delete Ad-hoc Charge (Permanent - removes task + charge)
export const deleteAdHocCharge = createAsyncThunk(
  "reconcile/deleteAdHocCharge",
  async (chargeId, { rejectWithValue }) => {
    try {
      if (!chargeId) {
        throw new Error("Charge ID is required");
      }

      const response = await fetch(`/api/admin_ops/adhoc-charges/${chargeId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(
          formatErrorMessage(error) || "Failed to delete ad-hoc charge",
        );
      }

      const data = await response.json();
      return { ...data.data, chargeId };
    } catch (error) {
      return rejectWithValue(formatErrorMessage(error));
    }
  },
);

// ============================================
// SLICE
// ============================================

const reconcileSlice = createSlice({
  name: "reconcile",
  initialState,
  reducers: {
    // Set active tab
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
      // Clear selection when switching tabs
      state.selectedTasks = [];
      state.selectedTaskIds = [];
    },

    // Toggle task selection
    toggleTaskSelection: (state, action) => {
      const task = action.payload; // FULL task object

      const index = state.selectedTasks.findIndex((t) => t.id === task.id);

      if (index > -1) {
        state.selectedTasks.splice(index, 1);
      } else {
        state.selectedTasks.push({
          id: task.id,
          status: task.status,
          task_type: task.task_type,
          is_system: task.is_system,
          entity: {
            id: task.entity.id,
            name: task.entity.name,
          },
        });
      }

      // 🔁 keep ids in sync (temporary)
      state.selectedTaskIds = state.selectedTasks.map((t) => t.id);
    },

    // Bulk select/deselect tasks on current page
    togglePageSelection: (state, action) => {
      const { tasks, selectAll } = action.payload;

      if (selectAll) {
        tasks.forEach((item) => {
          const task = item.task;

          if (!state.selectedTasks.find((t) => t.id === task.id)) {
            state.selectedTasks.push({
              id: task.id,
              status: task.status,
              task_type: task.task_type,
              is_system: task.is_system,
              entity: {
                id: task.entity.id,
                name: task.entity.name,
              },
            });
          }
        });
      } else {
        const taskIds = tasks.map((i) => i.task.id);
        state.selectedTasks = state.selectedTasks.filter(
          (t) => !taskIds.includes(t.id),
        );
      }

      state.selectedTaskIds = state.selectedTasks.map((t) => t.id);
    },

    // Clear all selections (refresh button)
    clearSelections: (state) => {
      state.selectedTasks = [];
      state.selectedTaskIds = [];
    },

    // Clear all data and reset (when filters change significantly)
    resetTabData: (state, action) => {
      const tab = action.payload; // 'unreconciled' | 'nonBillable'
      state[tab] = createTabState();
      if (state.activeTab === tab) {
        state.selectedTasks = [];
        state.selectedTaskIds = [];
      }
    },

    // Clear errors
    clearError: (state, action) => {
      const errorType = action.payload; // 'unreconciled' | 'nonBillable' | 'bulkAction'
      state.error[errorType] = null;
    },
  },

  extraReducers: (builder) => {
    // ============================================
    // FETCH UNRECONCILED TASKS
    // ============================================
    builder
      .addCase(fetchUnreconciledTasks.pending, (state, action) => {
        const { isNext, isPrev, isFilterChange } = action.meta?.arg || {};

        if (isFilterChange) {
          state.loading.unreconciled.fetch = true;
        } else if (isNext) {
          state.loading.unreconciled.fetchNext = true;
        } else if (isPrev) {
          state.loading.unreconciled.fetchPrev = true;
        } else {
          state.loading.unreconciled.fetch = true;
        }

        state.error.unreconciled = null;
      })
      .addCase(fetchUnreconciledTasks.fulfilled, (state, action) => {
        const { items, pagination, page, isFilterChange } =
          action.payload || {};

        // If filter changed, reset all pages
        if (isFilterChange) {
          state.unreconciled = createTabState();
        }

        // Store items for this page
        if (items && page) {
          state.unreconciled.items[page] = items;
          state.unreconciled.fetchedPages[page] = true;
        }

        // Update pagination info
        if (pagination) {
          state.unreconciled.currentPage = pagination.page || 1;
          state.unreconciled.totalPages = pagination.total_pages || 0;
          state.unreconciled.totalItems = pagination.total_items || 0;
          state.unreconciled.pageSize = pagination.page_size || 50;
          state.unreconciled.hasMore = pagination.has_more || false;
        }

        // Reset loading
        Object.assign(state.loading.unreconciled, {
          fetch: false,
          fetchNext: false,
          fetchPrev: false,
        });
      })
      .addCase(fetchUnreconciledTasks.rejected, (state, action) => {
        Object.assign(state.loading.unreconciled, {
          fetch: false,
          fetchNext: false,
          fetchPrev: false,
        });
        state.error.unreconciled =
          action.payload || "Failed to fetch unreconciled tasks";
      });

    // ============================================
    // FETCH NON-BILLABLE TASKS
    // ============================================
    builder
      .addCase(fetchNonBillableTasks.pending, (state, action) => {
        const { isNext, isPrev, isFilterChange } = action.meta?.arg || {};

        if (isFilterChange) {
          state.loading.nonBillable.fetch = true;
        } else if (isNext) {
          state.loading.nonBillable.fetchNext = true;
        } else if (isPrev) {
          state.loading.nonBillable.fetchPrev = true;
        } else {
          state.loading.nonBillable.fetch = true;
        }

        state.error.nonBillable = null;
      })
      .addCase(fetchNonBillableTasks.fulfilled, (state, action) => {
        const { items, pagination, page, isFilterChange } =
          action.payload || {};

        if (isFilterChange) {
          state.nonBillable = createTabState();
        }

        if (items && page) {
          state.nonBillable.items[page] = items;
          state.nonBillable.fetchedPages[page] = true;
        }

        if (pagination) {
          state.nonBillable.currentPage = pagination.page || 1;
          state.nonBillable.totalPages = pagination.total_pages || 0;
          state.nonBillable.totalItems = pagination.total_items || 0;
          state.nonBillable.pageSize = pagination.page_size || 50;
          state.nonBillable.hasMore = pagination.has_more || false;
        }

        state.loading.nonBillable = {
          fetch: false,
          fetchNext: false,
          fetchPrev: false,
          bulkAction: false,
        };
      })
      .addCase(fetchNonBillableTasks.rejected, (state, action) => {
        state.loading.nonBillable = {
          fetch: false,
          fetchNext: false,
          fetchPrev: false,
          bulkAction: false,
        };
        state.error.nonBillable =
          action.payload || "Failed to fetch non-billable tasks";
      });

    // ============================================
    // MARK NON-BILLABLE
    // ============================================
    builder
      .addCase(markTasksNonBillable.pending, (state) => {
        state.loading.unreconciled.markNonBillable = true;
        state.error.bulkAction = null;
      })
      .addCase(markTasksNonBillable.fulfilled, (state, action) => {
        const { result, taskIds } = action.payload || {};

        // Store bulk action result
        state.error.bulkAction = {
          success: result?.updated || [],
          rejected: result?.rejected || [],
        };

        // Remove successfully marked tasks from unreconciled items
        if (
          result?.updated &&
          Array.isArray(result.updated) &&
          result.updated.length > 0
        ) {
          Object.keys(state.unreconciled.items).forEach((page) => {
            if (state.unreconciled.items[page]) {
              state.unreconciled.items[page] = state.unreconciled.items[
                page
              ].filter(
                (item) =>
                  item?.task?.id && !result.updated.includes(item.task.id),
              );
            }
          });

          // Update total items count
          state.unreconciled.totalItems = Math.max(
            0,
            state.unreconciled.totalItems - result.updated.length,
          );

          // Recalculate total pages
          state.unreconciled.totalPages = Math.ceil(
            state.unreconciled.totalItems / (state.unreconciled.pageSize || 50),
          );

          // Clear selection for successfully processed tasks
          state.selectedTaskIds = state.selectedTaskIds.filter(
            (id) => !result.updated.includes(id),
          );
        }

        state.loading.unreconciled.markNonBillable = false;
      })
      .addCase(markTasksNonBillable.rejected, (state, action) => {
        state.loading.unreconciled.markNonBillable = false;
        state.error.bulkAction = {
          success: [],
          rejected: [
            {
              message: action.payload || "Failed to mark tasks as non-billable",
            },
          ],
        };
      });

    // ============================================
    // RESTORE BILLABLE
    // ============================================
    builder
      .addCase(restoreTasksBillable.pending, (state) => {
        state.loading.nonBillable.restoreBillable = true;
        state.error.bulkAction = null;
      })
      .addCase(restoreTasksBillable.fulfilled, (state, action) => {
        const { result, taskIds } = action.payload || {};

        state.error.bulkAction = {
          success: result?.restored || [],
          rejected: result?.rejected || [],
        };

        // Remove successfully restored tasks from non-billable items
        if (
          result?.restored &&
          Array.isArray(result.restored) &&
          result.restored.length > 0
        ) {
          Object.keys(state.nonBillable.items).forEach((page) => {
            if (state.nonBillable.items[page]) {
              state.nonBillable.items[page] = state.nonBillable.items[
                page
              ].filter(
                (item) =>
                  item?.task?.id && !result.restored.includes(item.task.id),
              );
            }
          });

          // Update total items count
          state.nonBillable.totalItems = Math.max(
            0,
            state.nonBillable.totalItems - result.restored.length,
          );

          // Recalculate total pages
          state.nonBillable.totalPages = Math.ceil(
            state.nonBillable.totalItems / (state.nonBillable.pageSize || 50),
          );

          state.selectedTaskIds = state.selectedTaskIds.filter(
            (id) => !result.restored.includes(id),
          );
        }

        state.loading.nonBillable.restoreBillable = false;
      })
      .addCase(restoreTasksBillable.rejected, (state, action) => {
        state.loading.nonBillable.restoreBillable = false;
        state.error.bulkAction = {
          success: [],
          rejected: [
            {
              message: action.payload || "Failed to restore tasks to billable",
            },
          ],
        };
      });

    // ============================================
    // CREATE AD-HOC CHARGE
    // ============================================
    builder
      .addCase(createAdHocCharge.pending, (state) => {
        state.loading.unreconciled.addAdHocCharge = true;
        state.error.unreconciled = null;
      })
      .addCase(createAdHocCharge.fulfilled, (state, action) => {
        const newItem = action.payload?.item;

        if (newItem) {
          // Add to first page of unreconciled items
          if (state.unreconciled.items[1]) {
            state.unreconciled.items[1].unshift(newItem);
          } else {
            state.unreconciled.items[1] = [newItem];
            state.unreconciled.fetchedPages[1] = true;
          }

          // Update total items count
          state.unreconciled.totalItems += 1;

          // Recalculate total pages
          state.unreconciled.totalPages = Math.ceil(
            state.unreconciled.totalItems / (state.unreconciled.pageSize || 50),
          );
        }

        state.loading.unreconciled.addAdHocCharge = false;
      })
      .addCase(createAdHocCharge.rejected, (state, action) => {
        state.loading.unreconciled.addAdHocCharge = false;
        state.error.unreconciled =
          action.payload || "Failed to create ad-hoc charge";
      });

    // ============================================
    // DELETE AD-HOC CHARGE (PERMANENT)
    // ============================================
    builder
      .addCase(deleteAdHocCharge.pending, (state) => {
        state.loading.unreconciled.deleteAdHocCharge = true;
        state.error.unreconciled = null;
      })
      .addCase(deleteAdHocCharge.fulfilled, (state, action) => {
        const { task_id } = action.payload || {};

        if (task_id) {
          // Remove the ad-hoc charge from all cached pages
          Object.keys(state.unreconciled.items).forEach((page) => {
            if (state.unreconciled.items[page]) {
              state.unreconciled.items[page] = state.unreconciled.items[
                page
              ].filter((item) => item?.task?.id !== task_id);
            }
          });

          // Remove from selection if selected
          state.selectedTaskIds = state.selectedTaskIds.filter(
            (id) => id !== task_id,
          );

          // Update total items count
          state.unreconciled.totalItems = Math.max(
            0,
            state.unreconciled.totalItems - 1,
          );

          // Recalculate total pages
          state.unreconciled.totalPages = Math.ceil(
            state.unreconciled.totalItems / (state.unreconciled.pageSize || 50),
          );
        }

        state.loading.unreconciled.deleteAdHocCharge = false;
      })
      .addCase(deleteAdHocCharge.rejected, (state, action) => {
        state.loading.unreconciled.deleteAdHocCharge = false;
        state.error.unreconciled =
          action.payload || "Failed to delete ad-hoc charge";
      });

    // ============================================
    // CREATE/APPEND INVOICE - Remove invoiced tasks from unreconciled
    // ============================================
    builder.addCase(createOrAppendInvoice.fulfilled, (state, action) => {
      // Extract task IDs from the request payload
      const taskIds = action.meta?.arg?.task_ids || [];

      if (taskIds.length > 0) {
        // Remove invoiced tasks from all unreconciled pages
        Object.keys(state.unreconciled.items).forEach((page) => {
          if (state.unreconciled.items[page]) {
            state.unreconciled.items[page] = state.unreconciled.items[
              page
            ].filter(
              (item) => item?.task?.id && !taskIds.includes(item.task.id),
            );
          }
        });

        // Update total items count
        state.unreconciled.totalItems = Math.max(
          0,
          state.unreconciled.totalItems - taskIds.length,
        );

        // Recalculate total pages
        state.unreconciled.totalPages = Math.ceil(
          state.unreconciled.totalItems / (state.unreconciled.pageSize || 50),
        );

        // Clear selection for invoiced tasks
        state.selectedTaskIds = state.selectedTaskIds.filter(
          (id) => !taskIds.includes(id),
        );

        state.selectedTasks = state.selectedTasks.filter(
          (task) => !taskIds.includes(task.id),
        );
      }
    });

    // ============================================
    // MICRO SURGERY - ADD CHARGE
    // ============================================
    builder.addCase(addChargeToTask.fulfilled, (state, action) => {
      const { taskId, charges } = action.payload || {};

      if (taskId && charges) {
        // Update charges in all cached pages
        Object.keys(state.unreconciled.items).forEach((page) => {
          if (state.unreconciled.items[page]) {
            state.unreconciled.items[page] = state.unreconciled.items[page].map(
              (item) => {
                if (item?.task?.id === taskId) {
                  return { ...item, charges };
                }
                return item;
              },
            );
          }
        });
      }
    });

    // ============================================
    // MICRO SURGERY - DELETE CHARGE
    // ============================================
    builder.addCase(deleteTaskCharge.fulfilled, (state, action) => {
      const { taskId, remainingCharges } = action.payload || {};

      if (taskId && remainingCharges) {
        // Update charges in all cached pages
        Object.keys(state.unreconciled.items).forEach((page) => {
          if (state.unreconciled.items[page]) {
            state.unreconciled.items[page] = state.unreconciled.items[page].map(
              (item) => {
                if (item?.task?.id === taskId) {
                  return { ...item, charges: remainingCharges };
                }
                return item;
              },
            );
          }
        });
      }
    });

    // ============================================
    // MICRO SURGERY - BULK UPDATE CHARGES
    // ============================================
    builder.addCase(bulkUpdateTaskCharges.fulfilled, (state, action) => {
      const { taskId, charges } = action.payload || {};

      if (taskId && charges) {
        // Replace all charges for this task
        Object.keys(state.unreconciled.items).forEach((page) => {
          if (state.unreconciled.items[page]) {
            state.unreconciled.items[page] = state.unreconciled.items[page].map(
              (item) => {
                if (item?.task?.id === taskId) {
                  return { ...item, charges };
                }
                return item;
              },
            );
          }
        });
      }
    });

    // ============================================
    // MICRO SURGERY - BULK UPDATE STATUS
    // ============================================
    builder.addCase(bulkUpdateChargeStatus.fulfilled, (state, action) => {
      const { chargesByTask } = action.payload || {};

      if (chargesByTask && typeof chargesByTask === "object") {
        // Update charges for all affected tasks
        Object.keys(state.unreconciled.items).forEach((page) => {
          if (state.unreconciled.items[page]) {
            state.unreconciled.items[page] = state.unreconciled.items[page].map(
              (item) => {
                const taskId = item?.task?.id;
                if (taskId && chargesByTask[taskId]) {
                  return { ...item, charges: chargesByTask[taskId] };
                }
                return item;
              },
            );
          }
        });
      }
    });
  },
});

// ============================================
// ACTIONS & SELECTORS
// ============================================

export const {
  setActiveTab,
  toggleTaskSelection,
  togglePageSelection,
  clearSelections,
  resetTabData,
  clearError,
} = reconcileSlice.actions;

// Selectors
export const selectActiveTab = (state) =>
  state.reconcile?.activeTab || "unreconciled";
export const selectUnreconciledData = (state) =>
  state.reconcile?.unreconciled || createTabState();
export const selectNonBillableData = (state) =>
  state.reconcile?.nonBillable || createTabState();
export const selectSelectedTaskIds = (state) =>
  state.reconcile?.selectedTaskIds || [];
export const selectLoading = (state) =>
  state.reconcile?.loading || initialState.loading;
export const selectError = (state) =>
  state.reconcile?.error || initialState.error;

// Get items for current page
export const selectCurrentPageItems = (state) => {
  const tab = state.reconcile?.activeTab;
  const tabData = state.reconcile?.[tab];

  if (!tabData || !tabData.items) return [];

  return tabData.items[tabData.currentPage] || [];
};

export const selectMarkNonBillableLoading = (state) =>
  state.reconcile.loading.unreconciled.markNonBillable;

export const selectRestoreBillableLoading = (state) =>
  state.reconcile.loading.nonBillable.restoreBillable;

export const selectAddAdHocChargeLoading = (state) =>
  state.reconcile.loading.unreconciled.addAdHocCharge;

export const selectDeleteAdHocChargeLoading = (state) =>
  state.reconcile.loading.unreconciled.deleteAdHocCharge;

// Check if all items on current page are selected
export const selectIsCurrentPageSelected = (state) => {
  const items = selectCurrentPageItems(state);
  const selectedIds = state.reconcile?.selectedTaskIds || [];

  if (items.length === 0) return false;

  return items.every(
    (item) => item?.task?.id && selectedIds.includes(item.task.id),
  );
};

export const selectSelectedTasks = (state) =>
  state.reconcile?.selectedTasks || [];
export default reconcileSlice.reducer;
