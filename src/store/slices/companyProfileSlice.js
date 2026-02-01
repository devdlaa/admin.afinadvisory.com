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
      result.error?.message || result.message || "Request failed",
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

export const fetchCompanyProfiles = createAsyncThunk(
  "companyProfile/fetchCompanyProfiles",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();

      if (filters.is_default !== undefined)
        params.append("is_default", filters.is_default);
      if (filters.is_active !== undefined)
        params.append("is_active", filters.is_active);
      if (filters.state) params.append("state", filters.state);
      if (filters.search) params.append("search", filters.search);
      if (filters.page) params.append("page", filters.page);
      if (filters.page_size) params.append("page_size", filters.page_size);

      const result = await apiFetch(
        `/api/admin_ops/company-profiles?${params.toString()}`,
      );

      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch company profiles",
        code: error.code,
        details: error.details,
      });
    }
  },
);

export const fetchCompanyProfileById = createAsyncThunk(
  "companyProfile/fetchCompanyProfileById",
  async (profileId, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/admin_ops/company-profiles/${profileId}`);
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch company profile",
        code: error.code,
        details: error.details,
      });
    }
  },
);

export const fetchDefaultCompanyProfile = createAsyncThunk(
  "companyProfile/fetchDefaultCompanyProfile",
  async (_, { rejectWithValue }) => {
    try {
      const result = await apiFetch(
        "/api/admin_ops/company-profiles?is_default=true&page_size=1",
      );

      if (result.data?.data && result.data.data.length > 0) {
        return result.data.data[0];
      }

      throw new Error("No default company profile found");
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to fetch default company profile",
        code: error.code,
        details: error.details,
      });
    }
  },
);

export const createCompanyProfile = createAsyncThunk(
  "companyProfile/createCompanyProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      const result = await apiFetch("/api/admin_ops/company-profiles", {
        method: "POST",
        body: JSON.stringify(profileData),
      });
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to create company profile",
        code: error.code,
        details: error.details,
      });
    }
  },
);

export const updateCompanyProfile = createAsyncThunk(
  "companyProfile/updateCompanyProfile",
  async ({ id, data: profileData }, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/admin_ops/company-profiles/${id}`, {
        method: "PATCH",
        body: JSON.stringify(profileData),
      });
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to update company profile",
        code: error.code,
        details: error.details,
      });
    }
  },
);

export const deleteCompanyProfile = createAsyncThunk(
  "companyProfile/deleteCompanyProfile",
  async (profileId, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/admin_ops/company-profiles/${profileId}`, {
        method: "DELETE",
      });
      return { id: profileId, ...result.data };
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to delete company profile",
        code: error.code,
        details: error.details,
      });
    }
  },
);

export const setDefaultCompanyProfile = createAsyncThunk(
  "companyProfile/setDefaultCompanyProfile",
  async (profileId, { rejectWithValue }) => {
    try {
      const result = await apiFetch(
        `/api/admin_ops/company-profiles/${profileId}/set-default`,
        {
          method: "POST",
        },
      );
      return result.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to set default company profile",
        code: error.code,
        details: error.details,
      });
    }
  },
);

export const quickSearchCompanyProfiles = createAsyncThunk(
  "companyProfile/quickSearchCompanyProfiles",
  async (
    { search, forceRefresh = false, limit = 20 },
    { getState, rejectWithValue },
  ) => {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh && search) {
        const state = getState().companyProfile;
        const cachedResults = searchInCache(state.profiles, search, limit);

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
        is_active: "true",
      });

      const result = await apiFetch(
        `/api/admin_ops/company-profiles?${params.toString()}`,
      );

      const profiles = Array.isArray(result.data?.data)
        ? result.data.data
        : Array.isArray(result.data)
          ? result.data
          : [];

      return {
        data: profiles,
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

// ============================================
// HELPERS
// ============================================

const searchInCache = (profiles, searchTerm, limit = 20) => {
  if (!searchTerm || !searchTerm.trim()) return [];

  const term = searchTerm.toLowerCase().trim();

  return Object.values(profiles)
    .filter(
      (profile) =>
        profile.name?.toLowerCase().includes(term) ||
        profile.legal_name?.toLowerCase().includes(term) ||
        profile.pan?.toLowerCase().includes(term) ||
        profile.gst_number?.toLowerCase().includes(term) ||
        profile.email?.toLowerCase().includes(term) ||
        profile.city?.toLowerCase().includes(term),
    )
    .slice(0, limit);
};

// ============================================
// SLICE
// ============================================

const initialState = {
  // Normalized profiles storage
  profiles: {},

  // List state
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
      is_default: null,
      is_active: null,
      state: null,
      search: "",
    },
  },

  // Quick search state
  quickSearch: {
    results: [],
    lastSearch: "",
    fromCache: false,
  },

  // Selected profile
  selectedProfile: null,

  // Default profile
  defaultProfile: null,

  // Loading states
  loading: {
    list: false,
    detail: false,
    create: false,
    update: false,
    delete: false,
    setDefault: false,
    quickSearch: false,
    fetchDefault: false,
  },

  // Error states
  error: {
    list: null,
    detail: null,
    create: null,
    update: null,
    delete: null,
    setDefault: null,
    quickSearch: null,
    fetchDefault: null,
  },
};

const companyProfileSlice = createSlice({
  name: "companyProfile",
  initialState,
  reducers: {
    // Set filters
    setFilters: (state, action) => {
      state.list.filters = { ...state.list.filters, ...action.payload };
    },

    // Reset filters
    resetFilters: (state) => {
      state.list.filters = { ...initialState.list.filters };
    },

    // Clear selected profile
    clearSelectedProfile: (state) => {
      state.selectedProfile = null;
    },

    // Clear quick search
    clearQuickSearch: (state) => {
      state.quickSearch = { ...initialState.quickSearch };
    },

    // Clear all errors
    clearErrors: (state) => {
      state.error = { ...initialState.error };
    },

    // Clear specific error
    clearError: (state, action) => {
      const key = action.payload;
      if (state.error[key]) state.error[key] = null;
    },

    // Add profile to cache
    addProfileToCache: (state, action) => {
      const profile = action.payload;
      state.profiles[profile.id] = profile;
    },

    // Remove profile from cache
    removeProfileFromCache: (state, action) => {
      const id = action.payload;
      delete state.profiles[id];
      state.list.ids = state.list.ids.filter((x) => x !== id);
    },

    // Update default profile in cache
    updateDefaultInCache: (state, action) => {
      const newDefaultId = action.payload;

      // Clear all defaults
      Object.values(state.profiles).forEach((profile) => {
        if (profile.is_default && profile.id !== newDefaultId) {
          state.profiles[profile.id] = { ...profile, is_default: false };
        }
      });

      // Set new default
      if (state.profiles[newDefaultId]) {
        state.profiles[newDefaultId] = {
          ...state.profiles[newDefaultId],
          is_default: true,
        };
      }
    },
  },

  extraReducers: (builder) => {
    // ============================================
    // FETCH COMPANY PROFILES
    // ============================================
    builder
      .addCase(fetchCompanyProfiles.pending, (state) => {
        state.loading.list = true;
        state.error.list = null;
      })
      .addCase(fetchCompanyProfiles.fulfilled, (state, action) => {
        const { data, pagination } = action.payload;

        // Normalize and cache profiles
        data.forEach((profile) => {
          state.profiles[profile.id] = {
            ...state.profiles[profile.id],
            ...profile,
          };
        });

        state.list.ids = data.map((p) => p.id);
        state.list.pagination = { ...state.list.pagination, ...pagination };

        state.loading.list = false;
      })
      .addCase(fetchCompanyProfiles.rejected, (state, action) => {
        state.loading.list = false;
        state.error.list =
          action.payload?.message || "Failed to fetch company profiles";
      });

    // ============================================
    // FETCH COMPANY PROFILE BY ID
    // ============================================
    builder
      .addCase(fetchCompanyProfileById.pending, (state) => {
        state.loading.detail = true;
        state.error.detail = null;
      })
      .addCase(fetchCompanyProfileById.fulfilled, (state, action) => {
        const profile = action.payload;
        state.profiles[profile.id] = {
          ...state.profiles[profile.id],
          ...profile,
        };
        state.selectedProfile = state.profiles[profile.id];
        state.loading.detail = false;
      })
      .addCase(fetchCompanyProfileById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error.detail =
          action.payload?.message || "Failed to fetch company profile";
      });

    // ============================================
    // FETCH DEFAULT COMPANY PROFILE
    // ============================================
    builder
      .addCase(fetchDefaultCompanyProfile.pending, (state) => {
        state.loading.fetchDefault = true;
        state.error.fetchDefault = null;
      })
      .addCase(fetchDefaultCompanyProfile.fulfilled, (state, action) => {
        const profile = action.payload;
        state.profiles[profile.id] = profile;
        state.defaultProfile = profile;
        state.loading.fetchDefault = false;
      })
      .addCase(fetchDefaultCompanyProfile.rejected, (state, action) => {
        state.loading.fetchDefault = false;
        state.error.fetchDefault =
          action.payload?.message || "Failed to fetch default company profile";
      });

    // ============================================
    // QUICK SEARCH
    // ============================================
    builder
      .addCase(quickSearchCompanyProfiles.pending, (state) => {
        state.loading.quickSearch = true;
        state.error.quickSearch = null;
      })
      .addCase(quickSearchCompanyProfiles.fulfilled, (state, action) => {
        const { data, fromCache, search } = action.payload;

        // Cache profiles if not from cache
        if (!fromCache) {
          data.forEach((profile) => {
            state.profiles[profile.id] = {
              ...state.profiles[profile.id],
              ...profile,
            };
          });
        }

        state.quickSearch = { results: data, lastSearch: search, fromCache };
        state.loading.quickSearch = false;
      })
      .addCase(quickSearchCompanyProfiles.rejected, (state, action) => {
        state.loading.quickSearch = false;
        state.error.quickSearch = action.payload?.message || "Search failed";
      });

    // ============================================
    // CREATE COMPANY PROFILE
    // ============================================
    builder
      .addCase(createCompanyProfile.pending, (state) => {
        state.loading.create = true;
        state.error.create = null;
      })
      .addCase(createCompanyProfile.fulfilled, (state, action) => {
        const newProfile = action.payload;
        state.profiles[newProfile.id] = newProfile;

        // Add to list if on first page
        if (state.list.pagination.page === 1) {
          state.list.ids.unshift(newProfile.id);
        }

        // Update default if this is set as default
        if (newProfile.is_default) {
          state.defaultProfile = newProfile;

          // Clear other defaults
          Object.values(state.profiles).forEach((profile) => {
            if (profile.is_default && profile.id !== newProfile.id) {
              state.profiles[profile.id] = { ...profile, is_default: false };
            }
          });
        }

        state.loading.create = false;
      })
      .addCase(createCompanyProfile.rejected, (state, action) => {
        state.loading.create = false;
        state.error.create =
          action.payload?.message || "Failed to create company profile";
      });

    // ============================================
    // UPDATE COMPANY PROFILE
    // ============================================
    builder
      .addCase(updateCompanyProfile.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateCompanyProfile.fulfilled, (state, action) => {
        const updated = action.payload;
        state.profiles[updated.id] = {
          ...state.profiles[updated.id],
          ...updated,
        };

        // Update selected profile if it matches
        if (state.selectedProfile?.id === updated.id) {
          state.selectedProfile = state.profiles[updated.id];
        }

        // Update default if this is set as default
        if (updated.is_default) {
          state.defaultProfile = updated;

          // Clear other defaults
          Object.values(state.profiles).forEach((profile) => {
            if (profile.is_default && profile.id !== updated.id) {
              state.profiles[profile.id] = { ...profile, is_default: false };
            }
          });
        }

        state.loading.update = false;
      })
      .addCase(updateCompanyProfile.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update =
          action.payload?.message || "Failed to update company profile";
      });

    // ============================================
    // DELETE COMPANY PROFILE
    // ============================================
    builder
      .addCase(deleteCompanyProfile.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteCompanyProfile.fulfilled, (state, action) => {
        const id = action.payload.id;
        delete state.profiles[id];
        state.list.ids = state.list.ids.filter((x) => x !== id);

        // Clear selected profile if it matches
        if (state.selectedProfile?.id === id) {
          state.selectedProfile = null;
        }

        // Clear default profile if it matches
        if (state.defaultProfile?.id === id) {
          state.defaultProfile = null;
        }

        state.loading.delete = false;
      })
      .addCase(deleteCompanyProfile.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete =
          action.payload?.message || "Failed to delete company profile";
      });

    // ============================================
    // SET DEFAULT COMPANY PROFILE
    // ============================================
    builder
      .addCase(setDefaultCompanyProfile.pending, (state) => {
        state.loading.setDefault = true;
        state.error.setDefault = null;
      })
      .addCase(setDefaultCompanyProfile.fulfilled, (state, action) => {
        const updated = action.payload;

        // Update all profiles - clear old defaults
        Object.values(state.profiles).forEach((profile) => {
          if (profile.is_default && profile.id !== updated.id) {
            state.profiles[profile.id] = { ...profile, is_default: false };
          }
        });

        // Set new default
        state.profiles[updated.id] = {
          ...state.profiles[updated.id],
          ...updated,
          is_default: true,
        };

        state.defaultProfile = state.profiles[updated.id];

        state.loading.setDefault = false;
      })
      .addCase(setDefaultCompanyProfile.rejected, (state, action) => {
        state.loading.setDefault = false;
        state.error.setDefault =
          action.payload?.message || "Failed to set default company profile";
      });
  },
});

// ============================================
// ACTIONS
// ============================================

export const {
  setFilters,
  resetFilters,
  clearSelectedProfile,
  clearQuickSearch,
  clearErrors,
  clearError,
  addProfileToCache,
  removeProfileFromCache,
  updateDefaultInCache,
} = companyProfileSlice.actions;

// ============================================
// BASE SELECTORS
// ============================================

export const selectAllProfiles = createSelector(
  [(state) => state.companyProfile.profiles],
  (profiles) => Object.values(profiles),
);

export const selectProfileById = (state, profileId) =>
  state.companyProfile.profiles[profileId];

export const selectListProfiles = createSelector(
  [
    (state) => state.companyProfile.list.ids,
    (state) => state.companyProfile.profiles,
  ],
  (ids, profiles) => ids.map((id) => profiles[id]).filter(Boolean),
);

export const selectPagination = (state) => state.companyProfile.list.pagination;
export const selectFilters = (state) => state.companyProfile.list.filters;
export const selectSelectedProfile = (state) =>
  state.companyProfile.selectedProfile;
export const selectDefaultProfile = (state) =>
  state.companyProfile.defaultProfile;

export const selectQuickSearchResults = createSelector(
  [(state) => state.companyProfile.quickSearch.results],
  (results) => results,
);

export const selectIsLoading = (state, type = "list") =>
  state.companyProfile.loading[type];

export const selectError = (state, type = "list") =>
  state.companyProfile.error[type];

export const selectCachedProfilesCount = createSelector(
  [(state) => state.companyProfile.profiles],
  (profiles) => Object.keys(profiles).length,
);

// ============================================
// DERIVED SELECTORS
// ============================================

// Get active profiles only
export const selectActiveProfiles = createSelector(
  [selectAllProfiles],
  (profiles) => profiles.filter((profile) => profile.is_active),
);

// Get default profile (from cache)
export const selectDefaultProfileFromCache = createSelector(
  [selectAllProfiles],
  (profiles) => profiles.find((profile) => profile.is_default) || null,
);

// Get profiles by state
export const selectProfilesByState = createSelector(
  [selectAllProfiles, (state, stateName) => stateName],
  (profiles, stateName) =>
    profiles.filter((profile) => profile.state === stateName),
);

// Check if a profile is default
export const selectIsDefaultProfile = createSelector(
  [selectDefaultProfile, (state, profileId) => profileId],
  (defaultProfile, profileId) => defaultProfile?.id === profileId,
);

// Get profile count by status
export const selectProfileStatsCount = createSelector(
  [selectAllProfiles],
  (profiles) => ({
    total: profiles.length,
    active: profiles.filter((p) => p.is_active).length,
    inactive: profiles.filter((p) => !p.is_active).length,
    withGST: profiles.filter((p) => p.gst_number).length,
    withBankDetails: profiles.filter((p) => p.bank_account_no).length,
  }),
);

// ============================================
// GENERIC ACTION BAR SELECTORS (MEMOIZED)
// ============================================


export const selectProfileStats = createSelector(
  [selectPagination, selectListProfiles],
  (pagination, profiles) => ({
    currentPage: pagination.page,
    itemsPerPage: pagination.page_size,
    canGoNext: pagination.has_more,
    canGoPrev: pagination.page > 1,
    needsMoreData: false,
    cursor: null,
    totalCached: pagination.total_items,
    currentPageSize: profiles.length,
  }),
);
export const selectProfileLoadingStates = createSelector(
  [
    (state) => selectIsLoading(state, "list"),
    (state) => selectIsLoading(state, "quickSearch"),
    (state) => selectIsLoading(state, "create"),
    (state) => selectIsLoading(state, "update"),
    (state) => selectIsLoading(state, "delete"),
  ],
  (loading, searchLoading, createLoading, updateLoading, deleteLoading) => ({
    loading,
    searchLoading,
    createLoading,
    updateLoading,
    deleteLoading,
    exportLoading: false,
  }),
);

export const selectProfileActiveStates = createSelector(
  [selectFilters],
  (filters) => ({
    isSearchActive: !!filters.search,
    isFilterActive: !!(
      filters.is_default !== null ||
      filters.is_active !== null ||
      filters.state
    ),
  }),
);

export const selectProfileSearchState = createSelector(
  [(state) => state.companyProfile.list.filters.search],
  (search) => ({
    query: search || "",
    field: "search",
  }),
);

export const selectProfileFilterLoadingStates = createSelector(
  [(state) => selectIsLoading(state, "list")],
  (loading) => ({
    loading,
    exportLoading: false,
  }),
);

export const selectSetDefaultLoading = createSelector(
  [(state) => state.companyProfile.loading.setDefault],
  (loading) => loading,
);

export const selectSetDefaultError = createSelector(
  [(state) => state.companyProfile.error.setDefault],
  (error) => error,
);

export const selectFetchDefaultLoading = createSelector(
  [(state) => state.companyProfile.loading.fetchDefault],
  (loading) => loading,
);

export const selectFetchDefaultError = createSelector(
  [(state) => state.companyProfile.error.fetchDefault],
  (error) => error,
);

// ============================================
// COMPOSITE SELECTORS FOR UI COMPONENTS
// ============================================

// Selector for profile dropdown/selector components
export const selectProfileOptions = createSelector(
  [selectActiveProfiles],
  (profiles) =>
    profiles.map((profile) => ({
      value: profile.id,
      label: profile.name,
      isDefault: profile.is_default,
      gst: profile.gst_number,
    })),
);

// Selector for profile form initial values
export const selectProfileFormData = createSelector(
  [selectSelectedProfile],
  (profile) => {
    if (!profile) return null;

    return {
      name: profile.name || "",
      legal_name: profile.legal_name || "",
      pan: profile.pan || "",
      gst_number: profile.gst_number || "",
      email: profile.email || "",
      phone: profile.phone || "",
      address_line1: profile.address_line1 || "",
      address_line2: profile.address_line2 || "",
      city: profile.city || "",
      state: profile.state || "",
      pincode: profile.pincode || "",
      bank_name: profile.bank_name || "",
      bank_account_no: profile.bank_account_no || "",
      bank_ifsc: profile.bank_ifsc || "",
      bank_branch: profile.bank_branch || "",
      is_default: profile.is_default || false,
      is_active: profile.is_active ?? true,
    };
  },
);

// Selector for profile card display
export const selectProfileCardData = createSelector(
  [selectListProfiles],
  (profiles) =>
    profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      legalName: profile.legal_name,
      pan: profile.pan,
      gst: profile.gst_number,
      email: profile.email,
      phone: profile.phone,
      location: [profile.city, profile.state].filter(Boolean).join(", "),
      isDefault: profile.is_default,
      isActive: profile.is_active,
      hasInvoices: profile._count?.invoices > 0,
      invoiceCount: profile._count?.invoices || 0,
    })),
);

// ============================================
// EXPORT REDUCER
// ============================================

export default companyProfileSlice.reducer;
