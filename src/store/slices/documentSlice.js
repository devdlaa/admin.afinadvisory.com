// store/slices/documentSlice.js
import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

// ===============================
// Async Thunks
// ===============================

export const fetchDocuments = createAsyncThunk(
  "documents/fetchDocuments",
  async (
    { scope, scopeId, page = 1, sort = "created_at", order = "desc", forceRefresh = false },
    { rejectWithValue, getState },
  ) => {
    try {
      const scopeKey = `${scope}_${scopeId}`;
      const state = getState();
      const existingData = state.documents.data[scopeKey];
      
      // Skip fetch if data exists and not forcing refresh and on page 1
      if (existingData && existingData.items.length > 0 && !forceRefresh && page === 1) {
        return {
          items: existingData.items,
          pagination: existingData.pagination,
          page,
          cached: true,
        };
      }

      const params = new URLSearchParams({
        scope,
        scope_id: scopeId,
        page: page.toString(),
        page_size: "20",
        sort,
        order,
      });

      const response = await fetch(`/api/admin_ops/documents?${params}`);
      const result = await response.json();

      if (!result.success) {
        return rejectWithValue(result.error.message);
      }

      return {
        items: result.data.items,
        pagination: result.data.pagination,
        page,
        cached: false,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const uploadDocument = createAsyncThunk(
  "documents/uploadDocument",
  async ({ file, scope, scopeId }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("scope", scope);
      formData.append("scope_id", scopeId);

      const response = await fetch("/api/admin_ops/documents", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        return rejectWithValue(result.error.message);
      }

      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const deleteDocument = createAsyncThunk(
  "documents/deleteDocument",
  async ({ documentId }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/admin_ops/documents/${documentId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!result.success) {
        return rejectWithValue(result.error.message);
      }

      return documentId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const downloadDocument = createAsyncThunk(
  "documents/downloadDocument",
  async ({ objectKey, originalName }, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/api/admin_ops/documents/download?key=${encodeURIComponent(objectKey)}`,
      );

      if (!response.ok) {
        return rejectWithValue("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// ===============================
// Slice
// ===============================

const documentSlice = createSlice({
  name: "documents",
  initialState: {
    // Data organized by scope + scopeId
    data: {}, // { "TASK_uuid-123": { items: [], pagination: {}, loading: false } }

    // Upload states
    uploadingFiles: {}, // { "TASK_uuid-123": { file: File, progress: 0 } }

    // Download states
    downloadingIds: [], // ["doc-id-1", "doc-id-2"]

    // Delete states
    deletingIds: [], // ["doc-id-3"]

    // Sort state
    sortConfig: {}, // { "TASK_uuid-123": { sort: "created_at", order: "desc" } }

    // Search state
    searchQuery: {}, // { "TASK_uuid-123": "search text" }

    // Error state
    error: null,
  },
  reducers: {
    setSearchQuery: (state, action) => {
      const { scopeKey, query } = action.payload;
      state.searchQuery[scopeKey] = query;
    },

    setSortConfig: (state, action) => {
      const { scopeKey, sort, order } = action.payload;
      state.sortConfig[scopeKey] = { sort, order };
    },

    clearError: (state) => {
      state.error = null;
    },

    resetScopeData: (state, action) => {
      const { scopeKey } = action.payload;
      delete state.data[scopeKey];
      delete state.uploadingFiles[scopeKey];
      delete state.sortConfig[scopeKey];
      delete state.searchQuery[scopeKey];
    },
  },
  extraReducers: (builder) => {
    // ===============================
    // Fetch Documents
    // ===============================
    builder
      .addCase(fetchDocuments.pending, (state, action) => {
        const { scope, scopeId } = action.meta.arg;
        const scopeKey = `${scope}_${scopeId}`;

        if (!state.data[scopeKey]) {
          state.data[scopeKey] = { items: [], pagination: null, loading: true };
        } else {
          state.data[scopeKey].loading = true;
        }

        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        const { scope, scopeId, page } = action.meta.arg;
        const scopeKey = `${scope}_${scopeId}`;
        const { items, pagination, cached } = action.payload;

        // Don't modify if using cached data
        if (cached) {
          state.data[scopeKey].loading = false;
          return;
        }

        if (page === 1) {
          state.data[scopeKey].items = items;
        } else {
          // Append for "load more"
          state.data[scopeKey].items = [
            ...state.data[scopeKey].items,
            ...items,
          ];
        }

        state.data[scopeKey].pagination = pagination;
        state.data[scopeKey].loading = false;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        const { scope, scopeId } = action.meta.arg;
        const scopeKey = `${scope}_${scopeId}`;

        if (state.data[scopeKey]) {
          state.data[scopeKey].loading = false;
        }

        state.error = action.payload;
      });

    // ===============================
    // Upload Document
    // ===============================
    builder
      .addCase(uploadDocument.pending, (state, action) => {
        const { scope, scopeId, file } = action.meta.arg;
        const scopeKey = `${scope}_${scopeId}`;

        state.uploadingFiles[scopeKey] = {
          fileName: file.name,
          uploading: true,
        };
        state.error = null;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        const { scope, scopeId } = action.meta.arg;
        const scopeKey = `${scope}_${scopeId}`;
        const newDocument = action.payload;

        // Add to beginning of list
        if (state.data[scopeKey]) {
          state.data[scopeKey].items = [
            newDocument,
            ...state.data[scopeKey].items,
          ];

          // Update pagination count
          if (state.data[scopeKey].pagination) {
            state.data[scopeKey].pagination.total_items += 1;
          }
        }

        delete state.uploadingFiles[scopeKey];
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        const { scope, scopeId } = action.meta.arg;
        const scopeKey = `${scope}_${scopeId}`;

        delete state.uploadingFiles[scopeKey];
        state.error = action.payload;
      });

    // ===============================
    // Delete Document
    // ===============================
    builder
      .addCase(deleteDocument.pending, (state, action) => {
        const { documentId } = action.meta.arg;
        state.deletingIds.push(documentId);
        state.error = null;
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        const documentId = action.payload;

        // Remove from all scope data
        Object.keys(state.data).forEach((scopeKey) => {
          state.data[scopeKey].items = state.data[scopeKey].items.filter(
            (doc) => doc.id !== documentId,
          );

          // Update pagination count
          if (state.data[scopeKey].pagination) {
            state.data[scopeKey].pagination.total_items -= 1;
          }
        });

        state.deletingIds = state.deletingIds.filter((id) => id !== documentId);
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        const { documentId } = action.meta.arg;
        state.deletingIds = state.deletingIds.filter((id) => id !== documentId);
        state.error = action.payload;
      });

    // ===============================
    // Download Document
    // ===============================
    builder
      .addCase(downloadDocument.pending, (state, action) => {
        const { objectKey } = action.meta.arg;
        state.downloadingIds.push(objectKey);
      })
      .addCase(downloadDocument.fulfilled, (state, action) => {
        const { objectKey } = action.meta.arg;
        state.downloadingIds = state.downloadingIds.filter(
          (key) => key !== objectKey,
        );
      })
      .addCase(downloadDocument.rejected, (state, action) => {
        const { objectKey } = action.meta.arg;
        state.downloadingIds = state.downloadingIds.filter(
          (key) => key !== objectKey,
        );
        state.error = action.payload;
      });
  },
});

export const { setSearchQuery, setSortConfig, clearError, resetScopeData } =
  documentSlice.actions;

// ===============================
// Base Selectors
// ===============================

const selectDocumentsState = (state) => state.documents;
const selectScopeKey = (_, scope, scopeId) => `${scope}_${scopeId}`;

// ===============================
// Memoized Selectors
// ===============================

export const selectDocumentsForScope = createSelector(
  [selectDocumentsState, selectScopeKey],
  (documentsState, scopeKey) => {
    return (
      documentsState.data[scopeKey] || {
        items: [],
        pagination: null,
        loading: false,
      }
    );
  },
);

export const selectSearchQuery = createSelector(
  [selectDocumentsState, selectScopeKey],
  (documentsState, scopeKey) => {
    return documentsState.searchQuery[scopeKey] || "";
  },
);

export const selectSortConfig = createSelector(
  [selectDocumentsState, selectScopeKey],
  (documentsState, scopeKey) => {
    return (
      documentsState.sortConfig[scopeKey] || {
        sort: "created_at",
        order: "desc",
      }
    );
  },
);

export const selectIsUploading = createSelector(
  [selectDocumentsState, selectScopeKey],
  (documentsState, scopeKey) => {
    return documentsState.uploadingFiles[scopeKey] || null;
  },
);

export const selectIsDownloading = createSelector(
  [selectDocumentsState, (_, objectKey) => objectKey],
  (documentsState, objectKey) => {
    return documentsState.downloadingIds.includes(objectKey);
  },
);

export const selectIsDeleting = createSelector(
  [selectDocumentsState, (_, documentId) => documentId],
  (documentsState, documentId) => {
    return documentsState.deletingIds.includes(documentId);
  },
);

export const selectError = createSelector(
  [selectDocumentsState],
  (documentsState) => documentsState.error,
);

export default documentSlice.reducer;