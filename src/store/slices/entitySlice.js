import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

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
      result.error?.message || result.message || "Request failed"
    );
    err.status = response.status;
    err.code = result.error?.code || "UNKNOWN_ERROR";
    err.details = result.error?.details || null;
    throw err;
  }

  return result;
};

// ============================================
// ASYNC THUNKS
// ============================================

export const fetchEntities = createAsyncThunk(
  "entity/fetchEntities",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();

      if (filters.entity_type)
        params.append("entity_type", filters.entity_type);
      if (filters.status) params.append("status", filters.status);
      if (filters.state) params.append("state", filters.state);
      if (filters.search) params.append("search", filters.search);
      if (filters.page) params.append("page", filters.page);
      if (filters.page_size) params.append("page_size", filters.page_size);

      const result = await apiFetch(
        `/api/admin_ops/entity?${params.toString()}`
      );

      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch entities",
        code: error.code,
        details: error.details,
      });
    }
  }
);

export const quickSearchEntities = createAsyncThunk(
  "entity/quickSearchEntities",
  async (
    { search, forceRefresh = false, limit = 20 },
    { getState, rejectWithValue }
  ) => {
    try {
      if (!forceRefresh && search) {
        const state = getState().entity;
        const cachedResults = searchInCache(state.entities, search, limit);

        if (cachedResults.length > 0) {
          return {
            data: cachedResults,
            fromCache: true,
            search,
          };
        }
      }

      const params = new URLSearchParams({
        search: search || "",
        page_size: limit,
        page: 1,
      });

      const result = await apiFetch(
        `/api/admin_ops/entity?${params.toString()}`
      );

      const entities = Array.isArray(result.data?.data)
        ? result.data.data
        : Array.isArray(result.data)
        ? result.data
        : [];

      return {
        data: entities,
        fromCache: false,
        search,
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Search failed",
        code: error.code,
        details: error.details,
      });
    }
  }
);

export const fetchEntityById = createAsyncThunk(
  "entity/fetchEntityById",
  async (entityId, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/admin_ops/entity/${entityId}`);
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch entity",
        code: error.code,
        details: error.details,
      });
    }
  }
);

export const createEntity = createAsyncThunk(
  "entity/createEntity",
  async (entityData, { rejectWithValue }) => {
    try {
      const result = await apiFetch("/api/admin_ops/entity", {
        method: "POST",
        body: JSON.stringify(entityData),
      });
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to create entity",
        code: error.code,
        details: error.details,
      });
    }
  }
);

export const updateEntity = createAsyncThunk(
  "entity/updateEntity",
  async ({ id, data: entityData }, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/admin_ops/entity/${id}`, {
        method: "PUT",
        body: JSON.stringify(entityData),
      });
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to update entity",
        code: error.code,
        details: error.details,
      });
    }
  }
);

export const deleteEntity = createAsyncThunk(
  "entity/deleteEntity",
  async (entityId, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/admin_ops/entity/${entityId}`, {
        method: "DELETE",
      });
      return { id: entityId, ...result.data };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to delete entity",
        code: error.code,
        details: error.details,
      });
    }
  }
);

// ============================================
// HELPERS
// ============================================

const searchInCache = (entities, searchTerm, limit = 20) => {
  if (!searchTerm || !searchTerm.trim()) return [];

  const term = searchTerm.toLowerCase().trim();

  return Object.values(entities)
    .filter(
      (entity) =>
        entity.name?.toLowerCase().includes(term) ||
        entity.email?.toLowerCase().includes(term) ||
        entity.pan?.toLowerCase().includes(term) ||
        entity.primary_phone?.includes(term) ||
        entity.contact_person?.toLowerCase().includes(term)
    )
    .slice(0, limit);
};

// ============================================
// SLICE
// ============================================

const initialState = {
  entities: {},

  list: {
    ids: [],
    pagination: {
      page: 1,
      page_size: 20,
      total_items: 0,
      total_pages: 0,
      has_more: false,
    },
    filters: {
      entity_type: null,
      status: null,
      state: null,
      search: "",
    },
  },

  quickSearch: {
    results: [],
    lastSearch: "",
    fromCache: false,
  },

  selectedEntity: null,

  loading: {
    list: false,
    detail: false,
    create: false,
    update: false,
    delete: false,
    quickSearch: false,
  },

  error: {
    list: null,
    detail: null,
    create: null,
    update: null,
    delete: null,
    quickSearch: null,
  },
};

const entitySlice = createSlice({
  name: "entity",
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.list.filters = { ...state.list.filters, ...action.payload };
    },

    resetFilters: (state) => {
      state.list.filters = { ...initialState.list.filters };
    },

    clearSelectedEntity: (state) => {
      state.selectedEntity = null;
    },

    clearQuickSearch: (state) => {
      state.quickSearch = { ...initialState.quickSearch };
    },

    clearErrors: (state) => {
      state.error = { ...initialState.error };
    },

    clearError: (state, action) => {
      const key = action.payload;
      if (state.error[key]) state.error[key] = null;
    },

    addEntityToCache: (state, action) => {
      const entity = action.payload;
      state.entities[entity.id] = entity;
    },

    removeEntityFromCache: (state, action) => {
      const id = action.payload;
      delete state.entities[id];
      state.list.ids = state.list.ids.filter((x) => x !== id);
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchEntities.pending, (state) => {
        state.loading.list = true;
        state.error.list = null;
      })
      .addCase(fetchEntities.fulfilled, (state, action) => {
        const { data, pagination } = action.payload;

        data.forEach((entity) => {
          state.entities[entity.id] = {
            ...state.entities[entity.id],
            ...entity,
          };
        });

        state.list.ids = data.map((e) => e.id);
        state.list.pagination = { ...state.list.pagination, ...pagination };

        state.loading.list = false;
      })
      .addCase(fetchEntities.rejected, (state, action) => {
        state.loading.list = false;
        state.error.list =
          action.payload?.message || "Failed to fetch entities";
      });

    builder
      .addCase(quickSearchEntities.pending, (state) => {
        state.loading.quickSearch = true;
        state.error.quickSearch = null;
      })
      .addCase(quickSearchEntities.fulfilled, (state, action) => {
        const { data, fromCache, search } = action.payload;

        if (!fromCache) {
          data.forEach((entity) => {
            state.entities[entity.id] = {
              ...state.entities[entity.id],
              ...entity,
            };
          });
        }

        state.quickSearch = { results: data, lastSearch: search, fromCache };
        state.loading.quickSearch = false;
      })
      .addCase(quickSearchEntities.rejected, (state, action) => {
        state.loading.quickSearch = false;
        state.error.quickSearch = action.payload?.message || "Search failed";
      });

    builder
      .addCase(fetchEntityById.pending, (state) => {
        state.loading.detail = true;
        state.error.detail = null;
      })
      .addCase(fetchEntityById.fulfilled, (state, action) => {
        const entity = action.payload;
        state.entities[entity.id] = {
          ...state.entities[entity.id],
          ...entity,
        };
        state.selectedEntity = state.entities[entity.id];
        state.loading.detail = false;
      })
      .addCase(fetchEntityById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error.detail =
          action.payload?.message || "Failed to fetch entity";
      });

    builder
      .addCase(createEntity.pending, (state) => {
        state.loading.create = true;
        state.error.create = null;
      })
      .addCase(createEntity.fulfilled, (state, action) => {
        const newEntity = action.payload;
        state.entities[newEntity.id] = newEntity;

        if (state.list.pagination.page === 1) {
          state.list.ids.unshift(newEntity.id);
        }

        state.loading.create = false;
      })
      .addCase(createEntity.rejected, (state, action) => {
        state.loading.create = false;
        state.error.create =
          action.payload?.message || "Failed to create entity";
      });

    builder
      .addCase(updateEntity.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateEntity.fulfilled, (state, action) => {
        const updated = action.payload;
        state.entities[updated.id] = {
          ...state.entities[updated.id],
          ...updated,
        };

        if (state.selectedEntity?.id === updated.id) {
          state.selectedEntity = state.entities[updated.id];
        }

        state.loading.update = false;
      })
      .addCase(updateEntity.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update =
          action.payload?.message || "Failed to update entity";
      });

    builder
      .addCase(deleteEntity.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteEntity.fulfilled, (state, action) => {
        const id = action.payload.id;
        delete state.entities[id];
        state.list.ids = state.list.ids.filter((x) => x !== id);

        if (state.selectedEntity?.id === id) {
          state.selectedEntity = null;
        }

        state.loading.delete = false;
      })
      .addCase(deleteEntity.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete =
          action.payload?.message || "Failed to delete entity";
      });
  },
});

// ============================================
// ACTIONS
// ============================================

export const {
  setFilters,
  resetFilters,
  clearSelectedEntity,
  clearQuickSearch,
  clearErrors,
  clearError,
  addEntityToCache,
  removeEntityFromCache,
} = entitySlice.actions;

// ============================================
// BASE SELECTORS
// ============================================

export const selectAllEntities = createSelector(
  [(state) => state.entity.entities],
  (entities) => Object.values(entities)
);

export const selectEntityById = (state, entityId) =>
  state.entity.entities[entityId];

export const selectListEntities = createSelector(
  [(state) => state.entity.list.ids, (state) => state.entity.entities],
  (ids, entities) => ids.map((id) => entities[id]).filter(Boolean)
);

export const selectPagination = (state) => state.entity.list.pagination;
export const selectFilters = (state) => state.entity.list.filters;
export const selectSelectedEntity = (state) => state.entity.selectedEntity;

export const selectQuickSearchResults = createSelector(
  [(state) => state.entity.quickSearch.results],
  (results) => results
);

export const selectIsLoading = (state, type = "list") =>
  state.entity.loading[type];

export const selectError = (state, type = "list") => state.entity.error[type];

export const selectCachedEntitiesCount = createSelector(
  [(state) => state.entity.entities],
  (entities) => Object.keys(entities).length
);

// ============================================
// GENERIC ACTION BAR SELECTORS (MEMOIZED)
// ============================================

export const selectEntityStats = createSelector(
  [selectPagination, selectListEntities],
  (pagination, entities) => ({
    currentPage: pagination.page,
    itemsPerPage: pagination.page_size,
    canGoNext: pagination.has_more,
    canGoPrev: pagination.page > 1,
    needsMoreData: false,
    cursor: null,
    totalCached: pagination.total_items,
    currentPageSize: entities.length,
  })
);

export const selectEntityLoadingStates = createSelector(
  [
    (state) => selectIsLoading(state, "list"),
    (state) => selectIsLoading(state, "quickSearch"),
  ],
  (loading, searchLoading) => ({
    loading,
    searchLoading,
    exportLoading: false,
  })
);

export const selectEntityActiveStates = createSelector(
  [selectFilters],
  (filters) => ({
    isSearchActive: !!filters.search,
    isFilterActive: !!(filters.entity_type || filters.status || filters.state),
  })
);

export const selectEntitySearchState = createSelector(
  [(state) => state.entity.list.filters.search],
  (search) => ({
    query: search || "",
    field: "search",
  })
);

export const selectEntityFilterLoadingStates = createSelector(
  [(state) => selectIsLoading(state, "list")],
  (loading) => ({
    loading,
    exportLoading: false,
  })
);

// ============================================
// EXPORT REDUCER
// ============================================

export default entitySlice.reducer;
