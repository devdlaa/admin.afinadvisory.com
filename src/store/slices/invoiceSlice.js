import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  addChargeToTask,
  deleteTaskCharge,
  bulkUpdateTaskCharges,
  bulkUpdateChargeStatus,
} from "./chargesSlice";

// ============================================
// INITIAL STATE
// ============================================

const initialState = {
  // Invoice list
  list: {
    items: {}, // { 1: [...], 2: [...], 3: [...] }
    fetchedPages: {}, // Track which pages we have
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    pageSize: 50,
    hasMore: false,
  },

  // Selected invoice details (when opening an invoice)
  selectedInvoice: {
    invoice: null,
    groups: [],
    attachments: [],
  },

  // Reconciled invoices from reconcile page
  reconciledInvoices: {
    items: {},
    fetchedPages: {},
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    pageSize: 50,
    hasMore: false,
  },

  // Bulk selection
  selectedInvoiceIds: [], // Array of invoice IDs

  // Loading states
  loading: {
    list: false,
    listNext: false,
    listPrev: false,
    details: false,
    create: false,
    updateInfo: false,
    updateStatus: false,
    bulkUpdateStatus: false,
    unlinkTasks: false,
    reconciled: false,
    reconciledNext: false,
    reconciledPrev: false,
  },

  // Errors
  error: {
    list: null,
    details: null,
    create: null,
    update: null,
    bulkUpdate: null, // { success: [], rejected: [{ id, reason }] }
    reconciled: null,
  },
};

// ============================================
// ASYNC THUNKS
// ============================================

// Fetch Invoices List
export const fetchInvoices = createAsyncThunk(
  "invoice/fetchList",
  async (
    { filters, page = 1, isNext = false, isPrev = false },
    { rejectWithValue },
  ) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: filters.page_size || "50",
        ...(filters.entity_id && { entity_id: filters.entity_id }),
        ...(filters.status && { status: filters.status }),
        ...(filters.from_date && { from_date: filters.from_date }),
        ...(filters.to_date && { to_date: filters.to_date }),
      });

      const response = await fetch(`/api/invoices?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(
          result.error?.message || "Failed to fetch invoices",
        );
      }

      return {
        ...result.data,
        page,
        isNext,
        isPrev,
        isFilterChange: !isNext && !isPrev && page === 1,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Fetch Reconciled Invoices (from reconcile page)
export const fetchReconciledInvoices = createAsyncThunk(
  "invoice/fetchReconciled",
  async (
    { filters, page = 1, isNext = false, isPrev = false },
    { rejectWithValue },
  ) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: filters.page_size || "50",
        ...(filters.entity_id && { entity_id: filters.entity_id }),
        ...(filters.invoice_status && {
          invoice_status: filters.invoice_status,
        }),
        ...(filters.from_date && { from_date: filters.from_date }),
        ...(filters.to_date && { to_date: filters.to_date }),
      });

      const response = await fetch(`/api/reconcile/invoiced?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(
          result.error?.message || "Failed to fetch reconciled invoices",
        );
      }

      return {
        ...result.data,
        page,
        isNext,
        isPrev,
        isFilterChange: !isNext && !isPrev && page === 1,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Fetch Invoice Details
export const fetchInvoiceDetails = createAsyncThunk(
  "invoice/fetchDetails",
  async (invoiceId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/admin_ops/invoices/${invoiceId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(
          result.error?.message || "Failed to fetch invoice details",
        );
      }

      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Create or Append Invoice
export const createOrAppendInvoice = createAsyncThunk(
  "invoice/createOrAppend",
  async (invoiceData, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin_ops/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(
          result.error?.message || "Failed to create/append invoice",
        );
      }

      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Update Invoice Info
export const updateInvoiceInfo = createAsyncThunk(
  "invoice/updateInfo",
  async ({ invoiceId, updateData }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/admin_ops/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(
          result.error?.message || "Failed to update invoice",
        );
      }

      return { invoiceId, ...result.data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Update Invoice Status (Single)
export const updateInvoiceStatus = createAsyncThunk(
  "invoice/updateStatus",
  async ({ invoiceId, status, external_number }, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/api/admin_ops/invoices/${invoiceId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, external_number }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(
          result.error?.message || "Failed to update invoice status",
        );
      }

      return { invoiceId, ...result.data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Bulk Update Invoice Status
export const bulkUpdateInvoiceStatus = createAsyncThunk(
  "invoice/bulkUpdateStatus",
  async (
    { invoiceIds, status, external_number_map, force_to_draft = false },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch("/api/admin_ops/invoices/bulk-invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_ids: invoiceIds,
          status,
          external_number_map,
          force_to_draft,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(
          result.error?.message || "Failed to bulk update invoices",
        );
      }

      return { result: result.data, invoiceIds, status };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Unlink Tasks from Invoice
export const unlinkTasksFromInvoice = createAsyncThunk(
  "invoice/unlinkTasks",
  async ({ invoiceId, taskIds }, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/api/admin_ops/invoices/${invoiceId}/unlink-tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_ids: taskIds }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(
          result.error?.message || "Failed to unlink tasks",
        );
      }

      // Fetch updated invoice details after unlinking
      const detailsResponse = await fetch(
        `/api/admin_ops/invoices/${invoiceId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!detailsResponse.ok) {
        // If fetching details fails, just return the unlink result
        return { invoiceId, taskIds };
      }

      const detailsData = await detailsResponse.json();
      return { invoiceId, taskIds, updatedInvoice: detailsData.data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// ============================================
// SLICE
// ============================================

const invoiceSlice = createSlice({
  name: "invoice",
  initialState,
  reducers: {
    // Toggle invoice selection
    toggleInvoiceSelection: (state, action) => {
      const invoiceId = action.payload;
      const index = state.selectedInvoiceIds.indexOf(invoiceId);

      if (index > -1) {
        state.selectedInvoiceIds.splice(index, 1);
      } else {
        state.selectedInvoiceIds.push(invoiceId);
      }
    },

    // Bulk select/deselect invoices on current page
    togglePageSelection: (state, action) => {
      const { invoiceIds, selectAll } = action.payload;

      if (selectAll) {
        invoiceIds.forEach((invoiceId) => {
          if (!state.selectedInvoiceIds.includes(invoiceId)) {
            state.selectedInvoiceIds.push(invoiceId);
          }
        });
      } else {
        state.selectedInvoiceIds = state.selectedInvoiceIds.filter(
          (id) => !invoiceIds.includes(id),
        );
      }
    },

    // Clear all selections
    clearInvoiceSelections: (state) => {
      state.selectedInvoiceIds = [];
    },

    // Clear selected invoice details
    clearSelectedInvoice: (state) => {
      state.selectedInvoice = {
        invoice: null,
        groups: [],
        attachments: [],
      };
    },

    // Reset list data
    resetListData: (state) => {
      state.list = {
        items: {},
        fetchedPages: {},
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        pageSize: 50,
        hasMore: false,
      };
      state.selectedInvoiceIds = [];
    },

    // Reset reconciled data
    resetReconciledData: (state) => {
      state.reconciledInvoices = {
        items: {},
        fetchedPages: {},
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        pageSize: 50,
        hasMore: false,
      };
    },

    // Clear errors
    clearError: (state, action) => {
      const errorType = action.payload;
      state.error[errorType] = null;
    },
  },

  extraReducers: (builder) => {
    // ============================================
    // FETCH INVOICES LIST
    // ============================================
    builder
      .addCase(fetchInvoices.pending, (state, action) => {
        const { isNext, isPrev, isFilterChange } = action.meta.arg;

        if (isFilterChange) {
          state.loading.list = true;
        } else if (isNext) {
          state.loading.listNext = true;
        } else if (isPrev) {
          state.loading.listPrev = true;
        } else {
          state.loading.list = true;
        }

        state.error.list = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        const { items, pagination, page, isFilterChange } = action.payload;

        if (isFilterChange) {
          state.list = {
            items: {},
            fetchedPages: {},
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            pageSize: 50,
            hasMore: false,
          };
        }

        state.list.items[page] = items;
        state.list.fetchedPages[page] = true;
        state.list.currentPage = pagination.page;
        state.list.totalPages = pagination.total_pages;
        state.list.totalItems = pagination.total_items;
        state.list.pageSize = pagination.page_size;
        state.list.hasMore = pagination.has_more;

        state.loading.list = false;
        state.loading.listNext = false;
        state.loading.listPrev = false;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading.list = false;
        state.loading.listNext = false;
        state.loading.listPrev = false;
        state.error.list = action.payload || "Failed to fetch invoices";
      });

    // ============================================
    // FETCH RECONCILED INVOICES
    // ============================================
    builder
      .addCase(fetchReconciledInvoices.pending, (state, action) => {
        const { isNext, isPrev, isFilterChange } = action.meta.arg;

        if (isFilterChange) {
          state.loading.reconciled = true;
        } else if (isNext) {
          state.loading.reconciledNext = true;
        } else if (isPrev) {
          state.loading.reconciledPrev = true;
        } else {
          state.loading.reconciled = true;
        }

        state.error.reconciled = null;
      })
      .addCase(fetchReconciledInvoices.fulfilled, (state, action) => {
        const { invoices, pagination, page, isFilterChange } = action.payload;

        if (isFilterChange) {
          state.reconciledInvoices = {
            items: {},
            fetchedPages: {},
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            pageSize: 50,
            hasMore: false,
          };
        }

        state.reconciledInvoices.items[page] = invoices;
        state.reconciledInvoices.fetchedPages[page] = true;
        state.reconciledInvoices.currentPage = pagination.page;
        state.reconciledInvoices.totalPages = pagination.total_pages;
        state.reconciledInvoices.totalItems = pagination.total_items;
        state.reconciledInvoices.pageSize = pagination.page_size;
        state.reconciledInvoices.hasMore = pagination.has_more;

        state.loading.reconciled = false;
        state.loading.reconciledNext = false;
        state.loading.reconciledPrev = false;
      })
      .addCase(fetchReconciledInvoices.rejected, (state, action) => {
        state.loading.reconciled = false;
        state.loading.reconciledNext = false;
        state.loading.reconciledPrev = false;
        state.error.reconciled =
          action.payload || "Failed to fetch reconciled invoices";
      });

    // ============================================
    // FETCH INVOICE DETAILS
    // ============================================
    builder
      .addCase(fetchInvoiceDetails.pending, (state) => {
        state.loading.details = true;
        state.error.details = null;
      })
      .addCase(fetchInvoiceDetails.fulfilled, (state, action) => {
        state.selectedInvoice = action.payload;
        state.loading.details = false;
      })
      .addCase(fetchInvoiceDetails.rejected, (state, action) => {
        state.loading.details = false;
        state.error.details =
          action.payload || "Failed to fetch invoice details";
      });

    // ============================================
    // CREATE OR APPEND INVOICE
    // ============================================
    builder
      .addCase(createOrAppendInvoice.pending, (state) => {
        state.loading.create = true;
        state.error.create = null;
      })
      .addCase(createOrAppendInvoice.fulfilled, (state, action) => {
        // New invoice created, optionally set it as selected
        state.selectedInvoice = action.payload;
        state.loading.create = false;
      })
      .addCase(createOrAppendInvoice.rejected, (state, action) => {
        state.loading.create = false;
        state.error.create = action.payload || "Failed to create invoice";
      });

    // ============================================
    // UPDATE INVOICE INFO
    // ============================================
    builder
      .addCase(updateInvoiceInfo.pending, (state) => {
        state.loading.updateInfo = true;
        state.error.update = null;
      })
      .addCase(updateInvoiceInfo.fulfilled, (state, action) => {
        // If this is the currently selected invoice, update it
        if (
          state.selectedInvoice.invoice &&
          state.selectedInvoice.invoice.id === action.payload.invoiceId
        ) {
          // Refetch to get updated data - handled by component
          // Or optimistically update specific fields if passed
        }

        state.loading.updateInfo = false;
      })
      .addCase(updateInvoiceInfo.rejected, (state, action) => {
        state.loading.updateInfo = false;
        state.error.update = action.payload || "Failed to update invoice";
      });

    // ============================================
    // UPDATE INVOICE STATUS
    // ============================================
    builder
      .addCase(updateInvoiceStatus.pending, (state) => {
        state.loading.updateStatus = true;
        state.error.update = null;
      })
      .addCase(updateInvoiceStatus.fulfilled, (state, action) => {
        const { invoiceId, status } = action.payload;

        // Update in selected invoice if it matches
        if (
          state.selectedInvoice.invoice &&
          state.selectedInvoice.invoice.id === invoiceId
        ) {
          state.selectedInvoice.invoice.status = status;
        }

        // Update in list items
        Object.keys(state.list.items).forEach((page) => {
          state.list.items[page] = state.list.items[page].map((invoice) =>
            invoice.id === invoiceId ? { ...invoice, status } : invoice,
          );
        });

        // Update in reconciled items
        Object.keys(state.reconciledInvoices.items).forEach((page) => {
          state.reconciledInvoices.items[page] = state.reconciledInvoices.items[
            page
          ].map((item) =>
            item.invoice.id === invoiceId
              ? { ...item, invoice: { ...item.invoice, status } }
              : item,
          );
        });

        state.loading.updateStatus = false;
      })
      .addCase(updateInvoiceStatus.rejected, (state, action) => {
        state.loading.updateStatus = false;
        state.error.update =
          action.payload || "Failed to update invoice status";
      });

    // ============================================
    // BULK UPDATE INVOICE STATUS
    // ============================================
    builder
      .addCase(bulkUpdateInvoiceStatus.pending, (state) => {
        state.loading.bulkUpdateStatus = true;
        state.error.bulkUpdate = null;
      })
      .addCase(bulkUpdateInvoiceStatus.fulfilled, (state, action) => {
        const { result, status } = action.payload;

        state.error.bulkUpdate = {
          success: result.success || [],
          rejected: result.rejected || [],
        };

        // Update status for successful invoices
        if (result.success && result.success.length > 0) {
          Object.keys(state.list.items).forEach((page) => {
            state.list.items[page] = state.list.items[page].map((invoice) =>
              result.success.includes(invoice.id)
                ? { ...invoice, status }
                : invoice,
            );
          });

          Object.keys(state.reconciledInvoices.items).forEach((page) => {
            state.reconciledInvoices.items[page] =
              state.reconciledInvoices.items[page].map((item) =>
                result.success.includes(item.invoice.id)
                  ? { ...item, invoice: { ...item.invoice, status } }
                  : item,
              );
          });

          // Clear selection for successfully processed invoices
          state.selectedInvoiceIds = state.selectedInvoiceIds.filter(
            (id) => !result.success.includes(id),
          );
        }

        state.loading.bulkUpdateStatus = false;
      })
      .addCase(bulkUpdateInvoiceStatus.rejected, (state, action) => {
        state.loading.bulkUpdateStatus = false;
        state.error.bulkUpdate = {
          success: [],
          rejected: [
            { message: action.payload || "Failed to bulk update invoices" },
          ],
        };
      });

    // ============================================
    // UNLINK TASKS FROM INVOICE
    // ============================================
    builder
      .addCase(unlinkTasksFromInvoice.pending, (state) => {
        state.loading.unlinkTasks = true;
        state.error.update = null;
      })
      .addCase(unlinkTasksFromInvoice.fulfilled, (state, action) => {
        const { invoiceId, updatedInvoice } = action.payload;

        // If we got updated invoice data, swap it
        if (
          updatedInvoice &&
          state.selectedInvoice.invoice &&
          state.selectedInvoice.invoice.id === invoiceId
        ) {
          state.selectedInvoice = updatedInvoice;
        }

        state.loading.unlinkTasks = false;
      })
      .addCase(unlinkTasksFromInvoice.rejected, (state, action) => {
        state.loading.unlinkTasks = false;
        state.error.update = action.payload || "Failed to unlink tasks";
      });

    // ============================================
    // MICRO SURGERY - ADD CHARGE (Invoice Details)
    // ============================================
    builder.addCase(addChargeToTask.fulfilled, (state, action) => {
      const { taskId, charges } = action.payload;

      // Update charges in selected invoice groups
      if (state.selectedInvoice.groups) {
        state.selectedInvoice.groups = state.selectedInvoice.groups.map(
          (group) => {
            if (group.task_id === taskId) {
              return { ...group, charges };
            }
            return group;
          },
        );
      }
    });

    // ============================================
    // MICRO SURGERY - DELETE CHARGE (Invoice Details)
    // ============================================
    builder.addCase(deleteTaskCharge.fulfilled, (state, action) => {
      const { taskId, remainingCharges } = action.payload;

      // Update charges in selected invoice groups
      if (state.selectedInvoice.groups) {
        state.selectedInvoice.groups = state.selectedInvoice.groups.map(
          (group) => {
            if (group.task_id === taskId) {
              return { ...group, charges: remainingCharges };
            }
            return group;
          },
        );
      }
    });

    // ============================================
    // MICRO SURGERY - BULK UPDATE CHARGES (Invoice Details)
    // ============================================
    builder.addCase(bulkUpdateTaskCharges.fulfilled, (state, action) => {
      const { taskId, charges } = action.payload;

      // Replace all charges for this task in selected invoice
      if (state.selectedInvoice.groups) {
        state.selectedInvoice.groups = state.selectedInvoice.groups.map(
          (group) => {
            if (group.task_id === taskId) {
              return { ...group, charges };
            }
            return group;
          },
        );
      }
    });

    // ============================================
    // MICRO SURGERY - BULK UPDATE STATUS (Invoice Details)
    // ============================================
    builder.addCase(bulkUpdateChargeStatus.fulfilled, (state, action) => {
      const { chargesByTask } = action.payload;

      // Update charges for all affected tasks in selected invoice
      if (state.selectedInvoice.groups) {
        state.selectedInvoice.groups = state.selectedInvoice.groups.map(
          (group) => {
            const taskId = group.task_id;
            if (chargesByTask[taskId]) {
              return { ...group, charges: chargesByTask[taskId] };
            }
            return group;
          },
        );
      }
    });
  },
});

// ============================================
// ACTIONS & SELECTORS
// ============================================

export const {
  toggleInvoiceSelection,
  togglePageSelection,
  clearInvoiceSelections,
  clearSelectedInvoice,
  resetListData,
  resetReconciledData,
  clearError,
} = invoiceSlice.actions;

// Selectors
export const selectInvoiceList = (state) => state.invoice.list;
export const selectReconciledInvoices = (state) =>
  state.invoice.reconciledInvoices;
export const selectSelectedInvoice = (state) => state.invoice.selectedInvoice;
export const selectSelectedInvoiceIds = (state) =>
  state.invoice.selectedInvoiceIds;
export const selectInvoiceLoading = (state) =>
  state.invoice?.loading || initialState.loading;

export const selectInvoiceError = (state) =>
  state.invoice?.error || initialState.error;

// Get items for current page
export const selectCurrentPageInvoices = (state) => {
  const listData = state.invoice.list;
  return listData.items[listData.currentPage] || [];
};

// Get reconciled items for current page
export const selectCurrentPageReconciledInvoices = (state) => {
  const reconciledData = state.invoice.reconciledInvoices;
  return reconciledData.items[reconciledData.currentPage] || [];
};

// Check if all items on current page are selected
export const selectIsCurrentPageSelected = (state) => {
  const items = selectCurrentPageInvoices(state);
  const selectedIds = state.invoice.selectedInvoiceIds;

  if (items.length === 0) return false;

  return items.every((item) => selectedIds.includes(item.id));
};

export default invoiceSlice.reducer;
