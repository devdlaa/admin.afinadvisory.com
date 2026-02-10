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
  // Invoice list - separate lists per status
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
    entity: null,
    company_profile: null,
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
    bulkUpdateStatus: null, // Will store { isLoading: boolean, action: string }
    unlinkTasks: false,
    reconciled: false,
    reconciledNext: false,
    reconciledPrev: false,
    export: false,
  },

  // Errors
  error: {
    list: null,
    details: null,
    create: null,
    update: null,
    bulkUpdate: null, // { success: [], rejected: [{ id, reason }] }
    reconciled: null,
    export: null, // ADD THIS
  },
};

// ============================================
// ASYNC THUNKS
// ============================================

// Fetch Invoices List
export const fetchInvoices = createAsyncThunk(
  "invoice/fetchList",
  async (
    {
      filters,
      page = 1,
      isNext = false,
      isPrev = false,
      isFilterChange = false,
    },
    { rejectWithValue },
  ) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: filters.page_size || "50",

        ...(filters.entity_id && { entity_id: filters.entity_id }),
        ...(filters.company_profile_id && {
          company_profile_id: filters.company_profile_id,
        }),

        ...(filters.status && { status: filters.status }),

        ...(filters.from_date && { from_date: filters.from_date }),
        ...(filters.to_date && { to_date: filters.to_date }),

        ...(filters.search && { search: filters.search }),

        ...(filters.sort_by && { sort_by: filters.sort_by }),
        ...(filters.sort_order && { sort_order: filters.sort_order }),
      });
      const response = await fetch(`/api/admin_ops/invoices?${params}`, {
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
        isFilterChange,
        currentStatus: filters.status, // Track which status tab this is for
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

// Add to ASYNC THUNKS section
export const exportInvoice = createAsyncThunk(
  "invoice/export",
  async (invoiceId, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/api/admin_ops/invoices/${invoiceId}/export`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        const result = await response.json();
        return rejectWithValue(
          result.error?.message || "Failed to export invoice",
        );
      }

      // Get the blob data
      const blob = await response.blob();

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `invoice-${invoiceId}.xlsx`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { invoiceId, filename };
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

      return result.data;
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

      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const cancelInvoice = createAsyncThunk(
  "invoice/cancel",
  async (invoiceId, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/api/admin_ops/invoices/${invoiceId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(
          result.error?.message || "Failed to cancel invoice",
        );
      }

      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const bulkInvoiceAction = createAsyncThunk(
  "invoice/bulkAction",
  async ({ invoiceIds, action }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin_ops/invoices/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_ids: invoiceIds,
          action,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(
          result.error?.message || "Failed to perform bulk invoice action",
        );
      }

      return {
        action,
        ...result.data, // { success, ignored, rejected }
      };
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

      return result;
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
        entity: null,
        company_profile: null,
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
    // EXPORT INVOICE
    // ============================================
    builder
      .addCase(exportInvoice.pending, (state) => {
        state.loading.export = true;
        state.error.export = null;
      })
      .addCase(exportInvoice.fulfilled, (state) => {
        state.loading.export = false;
      })
      .addCase(exportInvoice.rejected, (state, action) => {
        state.loading.export = false;
        state.error.export = action.payload || "Failed to export invoice";
      });

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
    // BULK INVOICE ACTION - FIXED TO REMOVE FROM CURRENT LIST
    // ============================================
    builder
      .addCase(bulkInvoiceAction.pending, (state, action) => {
        const { action: bulkAction } = action.meta.arg;
        state.loading.bulkUpdateStatus = {
          isLoading: true,
          action: bulkAction,
        };
        state.error.bulkUpdate = null;
      })

      .addCase(bulkInvoiceAction.fulfilled, (state, action) => {
        const {
          action: bulkAction,
          success,
          ignored,
          rejected,
        } = action.payload;

        state.error.bulkUpdate = {
          success: success || [],
          ignored: ignored || [],
          rejected: rejected || [],
        };

        // Determine resulting status
        let nextStatus = null;
        if (bulkAction === "MARK_ISSUED") nextStatus = "ISSUED";
        if (bulkAction === "MARK_PAID") nextStatus = "PAID";
        if (bulkAction === "MARK_DRAFT") nextStatus = "DRAFT";

        if (nextStatus && success.length > 0) {
          // FIXED: Remove successfully updated invoices from current list pages
          // This prevents them from showing in the wrong status tab
          Object.keys(state.list.items).forEach((page) => {
            state.list.items[page] = state.list.items[page].filter(
              (invoice) => !success.includes(invoice.id),
            );
          });

          // Update reconciled invoices status (if applicable)
          Object.keys(state.reconciledInvoices.items).forEach((page) => {
            state.reconciledInvoices.items[page] =
              state.reconciledInvoices.items[page].map((item) =>
                success.includes(item.invoice.id)
                  ? {
                      ...item,
                      invoice: { ...item.invoice, status: nextStatus },
                    }
                  : item,
              );
          });

          // Clear selection for successfully processed invoices
          state.selectedInvoiceIds = state.selectedInvoiceIds.filter(
            (id) => !success.includes(id),
          );
        }

        state.loading.bulkUpdateStatus = null;
      })

      .addCase(bulkInvoiceAction.rejected, (state, action) => {
        state.loading.bulkUpdateStatus = null;
        state.error.bulkUpdate = {
          success: [],
          ignored: [],
          rejected: [
            {
              message:
                action.payload || "Failed to perform bulk invoice action",
            },
          ],
        };
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
        const invoiceId = action?.payload?.invoice?.id;
        const data = action.payload;

        if (
          state.selectedInvoice.invoice &&
          state.selectedInvoice.invoice.id === invoiceId
        ) {
          state.selectedInvoice = {
            ...state.selectedInvoice,
            invoice: data.invoice,
            entity: data.entity || state.selectedInvoice.entity,
            company_profile:
              data.company_profile || state.selectedInvoice.company_profile,
          };
        }

        Object.keys(state.list.items).forEach((page) => {
          state.list.items[page] = state.list.items[page].map((invoice) =>
            invoice.id === invoiceId ? data.invoice : invoice,
          );
        });

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
        const invoiceId = action?.payload?.invoice?.id;
        const data = action.payload;

        // Update in selected invoice if it matches
        if (
          state.selectedInvoice.invoice &&
          state.selectedInvoice.invoice.id === invoiceId
        ) {
          state.selectedInvoice = {
            ...state.selectedInvoice,
            invoice: data.invoice,
            entity: data.entity || state.selectedInvoice.entity,
            company_profile:
              data.company_profile || state.selectedInvoice.company_profile,
          };
        }

        // FIXED: Remove from current list instead of updating
        // (forces user to refresh to see in new status tab)
        Object.keys(state.list.items).forEach((page) => {
          state.list.items[page] = state.list.items[page].filter(
            (invoice) => invoice.id !== invoiceId,
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
    // CANCEL INVOICE (SPECIAL FLOW)
    // ============================================
    builder
      .addCase(cancelInvoice.pending, (state) => {
        state.loading.updateStatus = true;
        state.error.update = null;
      })
      .addCase(cancelInvoice.fulfilled, (state, action) => {
        const { invoice_id, status, groups } = action.payload;

        // Update selected invoice
        if (
          state.selectedInvoice.invoice &&
          state.selectedInvoice.invoice.id === invoice_id
        ) {
          state.selectedInvoice = {
            ...state.selectedInvoice,
            invoice: {
              ...state.selectedInvoice.invoice,
              status,
            },
            groups: groups || [],
          };
        }

        // FIXED: Remove from current list
        Object.keys(state.list.items).forEach((page) => {
          state.list.items[page] = state.list.items[page].filter(
            (invoice) => invoice.id !== invoice_id,
          );
        });

        state.loading.updateStatus = false;
      })
      .addCase(cancelInvoice.rejected, (state, action) => {
        state.loading.updateStatus = false;
        state.error.update = action.payload || "Failed to cancel invoice";
      });

    // ============================================
    // UNLINK TASKS FROM INVOICE
    // ============================================
    builder
      .addCase(unlinkTasksFromInvoice.pending, (state) => {
        state.loading.unlinkTasks = true;
        state.error.update = null;
      })

      .addCase(unlinkTasksFromInvoice.rejected, (state, action) => {
        state.loading.unlinkTasks = false;
        state.error.update = action.payload || "Failed to unlink tasks";
      });

    // ============================================
    // MICRO SURGERY - ADD CHARGE
    // ============================================
    builder.addCase(addChargeToTask.fulfilled, (state, action) => {
      if (!action.payload || !state.selectedInvoice.groups) return;

      const { taskId, charges } = action.payload;

      state.selectedInvoice.groups = state.selectedInvoice.groups.map(
        (group) => (group.id === taskId ? { ...group, charges } : group),
      );
    });

    // ============================================
    // MICRO SURGERY - DELETE CHARGE
    // ============================================
    builder.addCase(deleteTaskCharge.fulfilled, (state, action) => {
      if (!action.payload || !state.selectedInvoice.groups) return;

      const { taskId, remainingCharges } = action.payload;

      state.selectedInvoice.groups = state.selectedInvoice.groups.map(
        (group) =>
          group.id === taskId ? { ...group, charges: remainingCharges } : group,
      );
    });

    // ============================================
    // MICRO SURGERY - BULK UPDATE CHARGES (FIELDS)
    // ============================================
    builder.addCase(bulkUpdateTaskCharges.fulfilled, (state, action) => {
      if (!action.payload || !state.selectedInvoice.groups) return;

      const { taskId, charges } = action.payload;

      state.selectedInvoice.groups = state.selectedInvoice.groups.map(
        (group) => (group.id === taskId ? { ...group, charges } : group),
      );
    });

    // ============================================
    // MICRO SURGERY - BULK UPDATE CHARGE STATUS
    // ============================================
    builder.addCase(bulkUpdateChargeStatus.fulfilled, (state, action) => {
      if (!action.payload || !state.selectedInvoice.groups) return;

      const chargesByTask = action.payload?.chargesByTask || {};

      state.selectedInvoice.groups = state.selectedInvoice.groups.map(
        (group) =>
          chargesByTask[group.id]
            ? { ...group, charges: chargesByTask[group.id] }
            : group,
      );
    });

    // ============================================
    // MICRO SURGERY - UNLINK TASKS (NO REFETCH)
    // ============================================
    builder.addCase(unlinkTasksFromInvoice.fulfilled, (state, action) => {
      if (!action.payload || !state.selectedInvoice.groups) return;
      const { invoice_id, unlinked_task_ids } = action.payload?.data;

      if (invoice_id !== state.selectedInvoice?.invoice?.id) {
        return;
      }

      state.selectedInvoice.groups = state.selectedInvoice.groups.filter(
        (group) => !unlinked_task_ids.includes(group.id),
      );

      state.loading.unlinkTasks = false;
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
