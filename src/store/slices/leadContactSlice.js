import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

/* ============================================
   API FETCH
============================================ */

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
      result.error?.message || result.message || "Request failed",
    );
    err.status = response.status;
    err.code = result.error?.code || "UNKNOWN_ERROR";
    err.details = result.error?.details || null;
    throw err;
  }

  return result;
};

const BASE = "/api/admin_ops/leads-manager/lead-contacts";

/* ============================================
   HELPERS
============================================ */

/**
 * Stable cache key from filter+page combo.
 * `search` is intentionally excluded — search results live in quickSearch only.
 */
const buildPageCacheKey = ({
  entity_type = "",
  industry = "",
  page = 1,
  page_size = 20,
} = {}) => `${entity_type}|${industry}|${page}|${page_size}`;

const searchInCache = (contacts, term, limit = 20) => {
  if (!term?.trim()) return [];
  const t = term.toLowerCase().trim();

  return Object.values(contacts)
    .filter(
      (c) =>
        c.contact_person?.toLowerCase().includes(t) ||
        c.company_name?.toLowerCase().includes(t) ||
        c.primary_email?.toLowerCase().includes(t) ||
        c.primary_phone?.includes(t),
    )
    .slice(0, limit);
};

/* ============================================
   THUNKS
============================================ */

/* LIST */
export const fetchLeadContacts = createAsyncThunk(
  "leadContact/fetchList",
  async (filters = {}, { getState, rejectWithValue }) => {
    try {
      const page = filters.page ?? 1;
      const page_size = filters.page_size ?? 20;

      // Page cache check — skip for search queries
      if (!filters.search && !filters._forceRefresh) {
        const state = getState().leadContact;
        const cacheKey = buildPageCacheKey({ ...filters, page, page_size });
        const cached = state.pageCache[cacheKey];

        if (cached) {
          return { ...cached, fromCache: true, cacheKey, page };
        }
      }

      const params = new URLSearchParams();
      Object.entries({ ...filters, page, page_size }).forEach(([k, v]) => {
        if (
          v !== undefined &&
          v !== null &&
          v !== "" &&
          k !== "_forceRefresh"
        ) {
          params.append(k, v);
        }
      });

      const result = await apiFetch(`${BASE}?${params.toString()}`);
      const cacheKey = buildPageCacheKey({ ...filters, page, page_size });

      return { ...result.data, fromCache: false, cacheKey, page };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch lead contacts",
        code: error.code,
        details: error.details,
      });
    }
  },
);

/* QUICK SEARCH */
export const quickSearchLeadContacts = createAsyncThunk(
  "leadContact/quickSearch",
  async (
    { search, limit = 20, forceRefresh = false },
    { getState, rejectWithValue },
  ) => {
    try {
      if (!forceRefresh && search) {
        const state = getState().leadContact;
        const cached = searchInCache(state.contacts, search, limit);
        if (cached.length > 0) {
          return { data: cached, fromCache: true, search };
        }
      }

      const params = new URLSearchParams({
        search,
        page: 1,
        page_size: limit,
        compact: "1",
      });

      const result = await apiFetch(`${BASE}?${params.toString()}`);

      return {
        data: result.data.data || result.data,
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
  },
);

/* GET BY ID */
export const fetchLeadContactById = createAsyncThunk(
  "leadContact/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`${BASE}/${id}`);
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch contact",
        code: error.code,
        details: error.details,
      });
    }
  },
);

/* CREATE */
export const createLeadContact = createAsyncThunk(
  "leadContact/create",
  async (data, { rejectWithValue }) => {
    try {
      const result = await apiFetch(BASE, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Create failed",
        code: error.code,
        details: error.details,
      });
    }
  },
);

/* UPDATE */
export const updateLeadContact = createAsyncThunk(
  "leadContact/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`${BASE}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Update failed",
        code: error.code,
        details: error.details,
      });
    }
  },
);

/* DELETE */
export const deleteLeadContact = createAsyncThunk(
  "leadContact/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiFetch(`${BASE}/${id}`, { method: "DELETE" });
      return { id };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Delete failed",
        code: error.code,
        details: error.details,
      });
    }
  },
);

/* ============================================
   SLICE
============================================ */

const initialState = {
  // Master contact map — all fetched contacts, keyed by id
  contacts: {},

  // Page cache: { [cacheKey]: { data, pagination } }
  // Keyed by filter+page. Never contains search results.
  pageCache: {},

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
      search: "",
      entity_type: null,
      industry: null,
    },
  },

  // Isolated typeahead/search state — separate from list.ids & pageCache.
  // Cleared independently; never affects pagination or list view.
  quickSearch: {
    results: [],
    lastSearch: "",
    fromCache: false,
  },

  selectedContact: null,

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

const slice = createSlice({
  name: "leadContact",
  initialState,
  reducers: {
    setFilters: (state, action) => {
      const incoming = action.payload;
      const prev = state.list.filters;

      // Any filter change → bust page cache and reset list
      const filterChanged =
        (incoming.entity_type !== undefined &&
          incoming.entity_type !== prev.entity_type) ||
        (incoming.industry !== undefined &&
          incoming.industry !== prev.industry) ||
        (incoming.search !== undefined && incoming.search !== prev.search);

      if (filterChanged) {
        state.pageCache = {};
        state.list.ids = [];
        state.list.pagination = { ...initialState.list.pagination };
      }

      state.list.filters = { ...prev, ...incoming };
    },

    resetFilters: (state) => {
      state.list.filters = { ...initialState.list.filters };
      state.pageCache = {};
      state.list.ids = [];
      state.list.pagination = { ...initialState.list.pagination };
    },

    clearSelectedContact: (state) => {
      state.selectedContact = null;
    },

    clearQuickSearch: (state) => {
      state.quickSearch = { ...initialState.quickSearch };
    },

    clearErrors: (state) => {
      state.error = { ...initialState.error };
    },

    clearError: (state, action) => {
      const key = action.payload;
      if (key in state.error) state.error[key] = null;
    },

    invalidatePageCache: (state) => {
      state.pageCache = {};
    },
  },

  extraReducers: (builder) => {
    builder

      /* LIST */
      .addCase(fetchLeadContacts.pending, (state) => {
        state.loading.list = true;
        state.error.list = null;
      })
      .addCase(fetchLeadContacts.fulfilled, (state, action) => {
        const { data, pagination, fromCache, cacheKey, page } = action.payload;

        // Hydrate master map
        data.forEach((c) => {
          state.contacts[c.id] = { ...state.contacts[c.id], ...c };
        });

        state.list.ids = data.map((c) => c.id);
        state.list.pagination = {
          ...state.list.pagination,
          ...pagination,
          page,
        };

        // Persist to page cache if fresh
        if (!fromCache && cacheKey) {
          state.pageCache[cacheKey] = { data, pagination };
        }

        state.loading.list = false;
      })
      .addCase(fetchLeadContacts.rejected, (state, action) => {
        state.loading.list = false;
        state.error.list =
          action.payload?.message || "Failed to fetch contacts";
      })

      /* QUICK SEARCH */
      .addCase(quickSearchLeadContacts.pending, (state) => {
        state.loading.quickSearch = true;
        state.error.quickSearch = null;
      })
      .addCase(quickSearchLeadContacts.fulfilled, (state, action) => {
        const { data, fromCache, search } = action.payload;

        // Hydrate master map (good for later detail lookups)
        // but do NOT touch list.ids or pageCache
        if (!fromCache) {
          data.forEach((c) => {
            state.contacts[c.id] = { ...state.contacts[c.id], ...c };
          });
        }

        state.quickSearch = { results: data, lastSearch: search, fromCache };
        state.loading.quickSearch = false;
      })
      .addCase(quickSearchLeadContacts.rejected, (state, action) => {
        state.loading.quickSearch = false;
        state.error.quickSearch = action.payload?.message || "Search failed";
      })

      /* DETAIL */
      .addCase(fetchLeadContactById.pending, (state) => {
        state.loading.detail = true;
        state.error.detail = null;
      })
      .addCase(fetchLeadContactById.fulfilled, (state, action) => {
        const c = action.payload;
        state.contacts[c.id] = { ...state.contacts[c.id], ...c };
        state.selectedContact = state.contacts[c.id];
        state.loading.detail = false;
      })
      .addCase(fetchLeadContactById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error.detail =
          action.payload?.message || "Failed to fetch contact";
      })

      /* CREATE */
      .addCase(createLeadContact.pending, (state) => {
        state.loading.create = true;
        state.error.create = null;
      })
      .addCase(createLeadContact.fulfilled, (state, action) => {
        const c = action.payload;
        state.contacts[c.id] = c;
        // Bust cache — total count changed
        state.pageCache = {};
        if (state.list.pagination.page === 1) {
          state.list.ids.unshift(c.id);
        }
        state.loading.create = false;
      })
      .addCase(createLeadContact.rejected, (state, action) => {
        state.loading.create = false;
        state.error.create = action.payload?.message || "Create failed";
      })

      /* UPDATE */
      .addCase(updateLeadContact.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateLeadContact.fulfilled, (state, action) => {
        const c = action.payload;
        state.contacts[c.id] = { ...state.contacts[c.id], ...c };

        if (state.selectedContact?.id === c.id) {
          state.selectedContact = state.contacts[c.id];
        }

        // Patch cached pages in-place — no full bust needed
        Object.values(state.pageCache).forEach((cached) => {
          const idx = cached.data.findIndex((e) => e.id === c.id);
          if (idx !== -1) cached.data[idx] = { ...cached.data[idx], ...c };
        });

        state.loading.update = false;
      })
      .addCase(updateLeadContact.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update = action.payload?.message || "Update failed";
      })

      /* DELETE */
      .addCase(deleteLeadContact.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteLeadContact.fulfilled, (state, action) => {
        const { id } = action.payload;
        delete state.contacts[id];
        state.list.ids = state.list.ids.filter((x) => x !== id);

        if (state.selectedContact?.id === id) {
          state.selectedContact = null;
        }

        // Bust cache — counts shift after deletion
        state.pageCache = {};

        state.loading.delete = false;
      })
      .addCase(deleteLeadContact.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete = action.payload?.message || "Delete failed";
      });
  },
});

/* ============================================
   ACTIONS
============================================ */

export const {
  setFilters,
  resetFilters,
  clearSelectedContact,
  clearQuickSearch,
  clearErrors,
  clearError,
  invalidatePageCache,
} = slice.actions;

/* ============================================
   SELECTORS
============================================ */

export const selectLeadContacts = createSelector(
  [(s) => s.leadContact.list.ids, (s) => s.leadContact.contacts],
  (ids, map) => ids.map((id) => map[id]).filter(Boolean),
);

export const selectLeadContactById = (s, id) => s.leadContact.contacts[id];

export const selectLeadContactsPagination = (s) =>
  s.leadContact.list.pagination;

export const selectLeadContactsFilters = (s) => s.leadContact.list.filters;

export const selectLeadContactsLoading = (s) => s.leadContact.loading.list;

export const selectLeadContactsError = (s) => s.leadContact.error.list;

export const selectSelectedLeadContact = (s) => s.leadContact.selectedContact;

export const selectQuickSearchResults = (s) =>
  s.leadContact.quickSearch.results;

export const selectQuickSearchLoading = (s) =>
  s.leadContact.loading.quickSearch;

/** True if the requested page+filters combo is already cached. */
export const selectIsPageCached = (state, filters) =>
  !!state.leadContact.pageCache[buildPageCacheKey(filters)];

export const selectLeadContactStats = createSelector(
  [selectLeadContactsPagination, selectLeadContacts],
  (pagination, contacts) => ({
    currentPage: pagination.page,
    itemsPerPage: pagination.page_size,
    canGoNext: pagination.has_more,
    canGoPrev: pagination.page > 1,
    totalItems: pagination.total_items,
    currentPageSize: contacts.length,
  }),
);

export const selectLeadContactActiveStates = createSelector(
  [selectLeadContactsFilters],
  (filters) => ({
    isSearchActive: !!filters.search,
    isFilterActive: !!(filters.entity_type || filters.industry),
  }),
);

export default slice.reducer;
