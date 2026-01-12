import { createSlice, createAsyncThunk,createSelector  } from "@reduxjs/toolkit";

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
// HELPER FUNCTIONS
// ============================================

/**
 * Search categories in local cache
 */
const searchInCache = (categories, searchTerm, limit = 20) => {
  if (!searchTerm || !searchTerm.trim()) return [];

  const term = searchTerm.toLowerCase().trim();

  return Object.values(categories)
    .filter(
      (category) =>
        category.name?.toLowerCase().includes(term) ||
        category.description?.toLowerCase().includes(term)
    )
    .slice(0, limit);
};

/**
 * Normalize categories into object for O(1) lookup
 */
const normalizeCategories = (categories) => {
  return categories.reduce((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {});
};

// ============================================
// ASYNC THUNKS
// ============================================

/**
 * Fetch categories with pagination
 */
export const fetchCategories = createAsyncThunk(
  "taskCategory/fetchCategories",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();

      if (filters.search) params.append("search", filters.search);
      if (filters.page) params.append("page", filters.page);
      if (filters.page_size) params.append("page_size", filters.page_size);

      const result = await apiFetch(
        `/api/admin_ops/tasks/category?${params.toString()}`
      );

      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch categories",
        code: error.code,
        details: error.details,
      });
    }
  },
  {
    condition: (filters, { getState }) => {
      const { taskCategory } = getState();

      // already have data and not forcing refresh
      if (taskCategory.list.length > 0 && !filters?.force) {
        return false; // ⛔ stop thunk
      }
    },
  }
);

/**
 * Quick search for autocomplete/dropdowns
 * Searches cache first, then API
 */
export const quickSearchCategories = createAsyncThunk(
  "taskCategory/quickSearchCategories",
  async (
    { search, forceRefresh = false, limit = 20 },
    { getState, rejectWithValue }
  ) => {
    try {
      // If not forcing refresh, check cache first
      if (!forceRefresh && search) {
        const state = getState().taskCategory;
        const cachedResults = searchInCache(state.categories, search, limit);

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
        `/api/admin_ops/tasks/category?${params.toString()}`
      );

      return {
        data: result.data.data,
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
 * Get single category by ID
 */
export const fetchCategoryById = createAsyncThunk(
  "taskCategory/fetchCategoryById",
  async (categoryId, { rejectWithValue }) => {
    try {
      const result = await apiFetch(
        `/api/admin_ops/tasks/category/${categoryId}`
      );
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch category",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Create new category
 */
export const createCategory = createAsyncThunk(
  "taskCategory/createCategory",
  async (categoryData, { rejectWithValue }) => {
    try {
      const result = await apiFetch("/api/admin_ops/tasks/category", {
        method: "POST",
        body: JSON.stringify(categoryData),
      });
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to create category",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Update category
 */
export const updateCategory = createAsyncThunk(
  "taskCategory/updateCategory",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/admin_ops/tasks/category/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to update category",
        code: error.code,
        details: error.details,
      });
    }
  }
);

/**
 * Delete category
 */
export const deleteCategory = createAsyncThunk(
  "taskCategory/deleteCategory",
  async (categoryId, { rejectWithValue }) => {
    try {
      const result = await apiFetch(
        `/api/admin_ops/tasks/category/${categoryId}`,
        {
          method: "DELETE",
        }
      );
      return { id: categoryId, ...result.data };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to delete category",
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
  // Normalized categories { [id]: category }
  categories: {},

  // Current list view
  list: {
    ids: [],
    pagination: {
      page: 1,
      page_size: 10,
      total_items: 0,
      total_pages: 0,
      has_more: false,
    },
    filters: {
      search: "",
    },
  },

  // Quick search results (for autocomplete)
  quickSearch: {
    results: [],
    lastSearch: "",
    fromCache: false,
  },

  // Currently selected category
  selectedCategory: null,

  // Cache metadata
  cache: {
    isCached: false,
    lastFetched: null,
  },

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

// ============================================
// SLICE
// ============================================
const taskCategorySlice = createSlice({
  name: "taskCategory",
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

    // Clear selected category
    clearSelectedCategory: (state) => {
      state.selectedCategory = null;
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

    // Manually add category to cache
    addCategoryToCache: (state, action) => {
      const category = action.payload;
      state.categories[category.id] = category;
    },

    // Manually remove category from cache
    removeCategoryFromCache: (state, action) => {
      const categoryId = action.payload;
      delete state.categories[categoryId];
      state.list.ids = state.list.ids.filter((id) => id !== categoryId);
    },
  },

  extraReducers: (builder) => {
    // ============================================
    // FETCH CATEGORIES (LIST)
    // ============================================
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading.list = true;
        state.error.list = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        const { data, pagination } = action.payload;

        // Normalize and store categories
        state.categories = {
          ...state.categories,
          ...normalizeCategories(data),
        };

        // Update list view
        state.list.ids = data.map((category) => category.id);
        state.list.pagination = pagination;

        // Update cache metadata
        state.cache.isCached = true;
        state.cache.lastFetched = Date.now();

        state.loading.list = false;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading.list = false;
        state.error.list =
          action.payload?.message || "Failed to fetch categories";
      });

    // ============================================
    // QUICK SEARCH
    // ============================================
    builder
      .addCase(quickSearchCategories.pending, (state) => {
        state.loading.quickSearch = true;
        state.error.quickSearch = null;
      })
      .addCase(quickSearchCategories.fulfilled, (state, action) => {
        const { data, fromCache, search } = action.payload;

        // If from API, add to cache
        if (!fromCache) {
          state.categories = {
            ...state.categories,
            ...normalizeCategories(data),
          };
        }

        state.quickSearch = {
          results: data,
          lastSearch: search,
          fromCache,
        };

        state.loading.quickSearch = false;
      })
      .addCase(quickSearchCategories.rejected, (state, action) => {
        state.loading.quickSearch = false;
        state.error.quickSearch = action.payload?.message || "Search failed";
      });

    // ============================================
    // FETCH CATEGORY BY ID
    // ============================================
    builder
      .addCase(fetchCategoryById.pending, (state) => {
        state.loading.detail = true;
        state.error.detail = null;
      })
      .addCase(fetchCategoryById.fulfilled, (state, action) => {
        const category = action.payload;
        state.categories[category.id] = category;
        state.selectedCategory = category;
        state.loading.detail = false;
      })
      .addCase(fetchCategoryById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error.detail =
          action.payload?.message || "Failed to fetch category";
      });

    // ============================================
    // CREATE CATEGORY
    // ============================================
    builder
      .addCase(createCategory.pending, (state) => {
        state.loading.create = true;
        state.error.create = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        const newCategory = action.payload;

        // Add to cache
        state.categories[newCategory.id] = newCategory;

        // Add to list if we're on first page
        if (state.list.pagination.page === 1) {
          state.list.ids.unshift(newCategory.id);
        }

        state.loading.create = false;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading.create = false;
        state.error.create =
          action.payload?.message || "Failed to create category";
      });

    // ============================================
    // UPDATE CATEGORY
    // ============================================
    builder
      .addCase(updateCategory.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const updatedCategory = action.payload;

        // Update in cache
        state.categories[updatedCategory.id] = updatedCategory;

        // Update selected category if it's the one being updated
        if (state.selectedCategory?.id === updatedCategory.id) {
          state.selectedCategory = updatedCategory;
        }

        state.loading.update = false;
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update =
          action.payload?.message || "Failed to update category";
      });

    // ============================================
    // DELETE CATEGORY
    // ============================================
    builder
      .addCase(deleteCategory.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        const categoryId = action.payload.id;

        // Remove from cache
        delete state.categories[categoryId];

        // Remove from list
        state.list.ids = state.list.ids.filter((id) => id !== categoryId);

        // Clear selected if it was deleted
        if (state.selectedCategory?.id === categoryId) {
          state.selectedCategory = null;
        }

        state.loading.delete = false;
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete =
          action.payload?.message || "Failed to delete category";
      });
  },
});

// ============================================
// ACTIONS
// ============================================
export const {
  setFilters,
  resetFilters,
  clearSelectedCategory,
  clearQuickSearch,
  clearErrors,
  clearError,
  addCategoryToCache,
  removeCategoryFromCache,
} = taskCategorySlice.actions;

// ============================================
// SELECTORS
// ============================================
const selectTaskCategoryState = (state) => state.taskCategory || initialState;
export const selectAllCategories = createSelector(
  [selectTaskCategoryState],
  (s) => Object.values(s.categories)
);

export const selectCategoryById = (state, categoryId) =>
  state.taskCategory?.categories?.[categoryId];

export const selectListCategories = createSelector(
  [selectTaskCategoryState],
  (s) => s.list.ids.map((id) => s.categories[id]).filter(Boolean)
);

export const selectPagination = createSelector(
  [selectTaskCategoryState],
  (s) => s.list.pagination
);

export const selectFilters = createSelector(
  [selectTaskCategoryState],
  (s) => s.list.filters
);

export const selectSelectedCategory = createSelector(
  [selectTaskCategoryState],
  (s) => s.selectedCategory
);

export const selectQuickSearchResults = createSelector(
  [selectTaskCategoryState],
  (s) => s.quickSearch.results
);

export const selectIsCached = createSelector(
  [selectTaskCategoryState],
  (s) => s.cache.isCached
);

export const selectIsLoading = (state, type = "list") =>
  state?.taskCategory?.loading?.[type] ?? false;

export const selectError = (state, type = "list") =>
  state?.taskCategory?.error?.[type] ?? null;

export const selectIsCategoryCached = (state, categoryId) =>
  !!state?.taskCategory?.categories?.[categoryId];

export const selectCachedCategoriesCount = createSelector(
  [selectTaskCategoryState],
  (s) => Object.keys(s.categories).length
);


// ============================================
// EXPORT REDUCER
// ============================================
export default taskCategorySlice.reducer;
