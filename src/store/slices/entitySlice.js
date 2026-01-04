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

  // Handle error response: { success: false, error: { message, code, details } }
  if (!response.ok || !result.success) {
    throw {
      status: response.status,
      message: result.error?.message || result.message || "Request failed",
      code: result.error?.code || "UNKNOWN_ERROR",
      details: result.error?.details || null,
    };
  }

  // Return success response: { success: true, message, data, meta }
  return result;
};

// ============================================
// ASYNC THUNKS
// ============================================

/**
 * Fetch paginated entities with filters
 */
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

/**
 * Quick search for autocomplete/dropdowns
 * Searches cache first, then API
 */
export const quickSearchEntities = createAsyncThunk(
  "entity/quickSearchEntities",
  async (
    { search, forceRefresh = false, limit = 20 },
    { getState, rejectWithValue }
  ) => {
    try {
      // If not forcing refresh, check cache first
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

      // Fallback to API
      const params = new URLSearchParams({
        search: search || "",
        page_size: limit,
        page: 1,
      });

      const result = await apiFetch(
        `/api/admin_ops/entity?${params.toString()}`
      );
      return {
        data: result.data.data, // Extract entities array from pagination response
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

/**
 * Get single entity by ID
 */
export const fetchEntityById = createAsyncThunk(
  "entity/fetchEntityById",
  async (entityId, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/admin_ops/entity/${entityId}`);
      return result.data; // Single entity object
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch entity",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Create new entity
 */
export const createEntity = createAsyncThunk(
  "entity/createEntity",
  async (entityData, { rejectWithValue }) => {
    try {
      const result = await apiFetch("/api/admin_ops/entity", {
        method: "POST",
        body: JSON.stringify(entityData),
      });
      return result.data; // Newly created entity
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to create entity",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Update entity
 */
export const updateEntity = createAsyncThunk(
  "entity/updateEntity",
  async ({ id, data: entityData }, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/admin_ops/entity/${id}`, {
        method: "PUT",
        body: JSON.stringify(entityData),
      });
      return result.data; // Updated entity
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to update entity",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Delete entity (soft delete)
 */
export const deleteEntity = createAsyncThunk(
  "entity/deleteEntity",
  async (entityId, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/admin_ops/entity/${entityId}`, {
        method: "DELETE",
      });
      return { id: entityId, ...result.data }; // Deleted entity data
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
// HELPER FUNCTIONS
// ============================================

/**
 * Search entities in local cache
 */
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

/**
 * Normalize entities into object for O(1) lookup
 */
const normalizeEntities = (entities) => {
  return entities.reduce((acc, entity) => {
    acc[entity.id] = entity;
    return acc;
  }, {});
};

// ============================================
// SLICE
// ============================================

const initialState = {
  // Normalized entities { [id]: entity }
  entities: {},

  // Current list view
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

  // Quick search results (for autocomplete)
  quickSearch: {
    results: [],
    lastSearch: "",
    fromCache: false,
  },

  // Currently selected entity
  selectedEntity: null,

  // Loading states
  loading: {
    list: false,
    detail: false,
    create: false,
    update: false,
    delete: false,
    quickSearch: false,
  },

  // Error states
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
    // Set filters for list view
    setFilters: (state, action) => {
      state.list.filters = { ...state.list.filters, ...action.payload };
    },

    // Reset filters
    resetFilters: (state) => {
      state.list.filters = initialState.list.filters;
    },

    // Clear selected entity
    clearSelectedEntity: (state) => {
      state.selectedEntity = null;
    },

    // Clear quick search results
    clearQuickSearch: (state) => {
      state.quickSearch = initialState.quickSearch;
    },

    // Clear all errors
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

    // Manually add entity to cache (useful for optimistic updates)
    addEntityToCache: (state, action) => {
      const entity = action.payload;
      state.entities[entity.id] = entity;
    },

    // Manually remove entity from cache
    removeEntityFromCache: (state, action) => {
      const entityId = action.payload;
      delete state.entities[entityId];
      state.list.ids = state.list.ids.filter((id) => id !== entityId);
    },
  },

  extraReducers: (builder) => {
    // ============================================
    // FETCH ENTITIES (LIST)
    // ============================================
    builder
      .addCase(fetchEntities.pending, (state) => {
        state.loading.list = true;
        state.error.list = null;
      })
      .addCase(fetchEntities.fulfilled, (state, action) => {
        const { data, pagination } = action.payload;

        // Normalize and store entities
        state.entities = { ...state.entities, ...normalizeEntities(data) };

        // Update list view
        state.list.ids = data.map((entity) => entity.id);
        state.list.pagination = pagination;

        state.loading.list = false;
      })
      .addCase(fetchEntities.rejected, (state, action) => {
        state.loading.list = false;
        state.error.list =
          action.payload?.message || "Failed to fetch entities";
      });

    // ============================================
    // QUICK SEARCH
    // ============================================
    builder
      .addCase(quickSearchEntities.pending, (state) => {
        state.loading.quickSearch = true;
        state.error.quickSearch = null;
      })
      .addCase(quickSearchEntities.fulfilled, (state, action) => {
        const { data, fromCache, search } = action.payload;

        // If from API, add to cache
        if (!fromCache) {
          state.entities = { ...state.entities, ...normalizeEntities(data) };
        }

        state.quickSearch = {
          results: data,
          lastSearch: search,
          fromCache,
        };

        state.loading.quickSearch = false;
      })
      .addCase(quickSearchEntities.rejected, (state, action) => {
        state.loading.quickSearch = false;
        state.error.quickSearch = action.payload?.message || "Search failed";
      });

    // ============================================
    // FETCH ENTITY BY ID
    // ============================================
    builder
      .addCase(fetchEntityById.pending, (state) => {
        state.loading.detail = true;
        state.error.detail = null;
      })
      .addCase(fetchEntityById.fulfilled, (state, action) => {
        const entity = action.payload;
        state.entities[entity.id] = entity;
        state.selectedEntity = entity;
        state.loading.detail = false;
      })
      .addCase(fetchEntityById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error.detail =
          action.payload?.message || "Failed to fetch entity";
      });

    // ============================================
    // CREATE ENTITY
    // ============================================
    builder
      .addCase(createEntity.pending, (state) => {
        state.loading.create = true;
        state.error.create = null;
      })
      .addCase(createEntity.fulfilled, (state, action) => {
        const newEntity = action.payload;

        // Add to cache
        state.entities[newEntity.id] = newEntity;

        // Add to list if we're on first page
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

    // ============================================
    // UPDATE ENTITY
    // ============================================
    builder
      .addCase(updateEntity.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateEntity.fulfilled, (state, action) => {
        const updatedEntity = action.payload;

        // Update in cache
        state.entities[updatedEntity.id] = updatedEntity;

        // Update selected entity if it's the one being updated
        if (state.selectedEntity?.id === updatedEntity.id) {
          state.selectedEntity = updatedEntity;
        }

        state.loading.update = false;
      })
      .addCase(updateEntity.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update =
          action.payload?.message || "Failed to update entity";
      });

    // ============================================
    // DELETE ENTITY
    // ============================================
    builder
      .addCase(deleteEntity.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteEntity.fulfilled, (state, action) => {
        const entityId = action.payload.id;

        // Remove from cache
        delete state.entities[entityId];

        // Remove from list
        state.list.ids = state.list.ids.filter((id) => id !== entityId);

        // Clear selected if it was deleted
        if (state.selectedEntity?.id === entityId) {
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
// SELECTORS
// ============================================

// Get all entities as array
export const selectAllEntities = (state) =>
  Object.values(state.entity.entities);

// Get entity by ID
export const selectEntityById = (state, entityId) =>
  state.entity.entities[entityId];

// Get current list view entities (respects pagination)
export const selectListEntities = (state) =>
  state.entity.list.ids
    .map((id) => state?.entity?.entities[id])
    .filter(Boolean);

// Get pagination info
export const selectPagination = (state) => state.entity.list.pagination;

// Get current filters
export const selectFilters = (state) => state.entity.list.filters;

// Get selected entity
export const selectSelectedEntity = (state) => state.entity.selectedEntity;

// Get quick search results
export const selectQuickSearchResults = (state) =>
  state.entity.quickSearch.results;

// Get loading states
export const selectIsLoading = (state, type = "list") =>
  state.entity.loading[type];

// Get error states
export const selectError = (state, type = "list") => state.entity.error[type];

// Check if entity exists in cache
export const selectIsEntityCached = (state, entityId) =>
  !!state.entity.entities[entityId];

// Get entities count in cache
export const selectCachedEntitiesCount = (state) =>
  Object.keys(state.entity.entities).length;

// ============================================
// EXPORT REDUCER
// ============================================
export default entitySlice.reducer;
