// store/slices/couponsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Async thunks
export const fetchCoupons = createAsyncThunk(
  "coupons/fetchCoupons",
  async ({ page = 1, limit = 10, filters = {} }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });

      const response = await fetch(`/api/admin/coupons/get_coupons?${params}`);
      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Failed to fetch coupons");
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const searchCoupons = createAsyncThunk(
  "coupons/searchCoupons",
  async ({ searchTerm, searchType }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/coupons/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ searchTerm, searchType }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Search failed");
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const searchCouponsByDateRange = createAsyncThunk(
  "coupons/searchCouponsByDateRange",
  async ({ startDate, endDate }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/coupons/search-date-range", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ startDate, endDate }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Date range search failed");
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createCoupon = createAsyncThunk(
  "coupons/createCoupon",
  async (couponData, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/coupons/create_new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(couponData),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Failed to create coupon");
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCoupon = createAsyncThunk(
  "coupons/updateCoupon",
  async ({ id, updateData }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Failed to update coupon");
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteCoupon = createAsyncThunk(
  "coupons/deleteCoupon",
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/api/admin/coupons/delete_coupon?id=${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Failed to delete coupon");
      }

      return { id };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchServices = createAsyncThunk(
  "coupons/fetchServices",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/service_pricing/get");
      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Failed to fetch services");
      }

      return data.services;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const searchInfluencer = createAsyncThunk(
  "coupons/searchInfluencer",
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/influencers/get_by_email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
   

      if (!response.ok) {
        return rejectWithValue(data.error || "Influencer not found");
      }

      return data;
    } catch (error) {
 
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  coupons: [],
  allCoupons: [],
  services: [],
  currentInfluencer: null,
  hasFeched: false,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  loading: false,
  searchLoading: false,
  serviceLoading: false,
  influencerLoading: false,
  error: null,
  searchResults: [],
  isSearchMode: false,
  updateError: null,
  updatingCoupon: false,
};

const couponsSlice = createSlice({
  name: "coupons",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.isSearchMode = false;
      state.hasFeched = false;
    },
    clearInfluencer: (state) => {
      state.currentInfluencer = null;
    },
    setCurrentPage: (state, action) => {
      state.pagination.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch coupons
      .addCase(fetchCoupons.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.hasFeched = true;
      })
      .addCase(fetchCoupons.fulfilled, (state, action) => {
        state.loading = false;

        state.coupons = action.payload.data.coupons;
        state.pagination = action.payload.data.pagination;
        state.hasFeched = true;

        // Store all coupons (merge with existing if pagination)
        const existingIds = new Set(state.allCoupons.map((c) => c._id));
        const newCoupons = action.payload.data.coupons.filter(
          (c) => !existingIds.has(c._id)
        );
        state.allCoupons = [...state.allCoupons, ...newCoupons];
      })
      .addCase(fetchCoupons.rejected, (state, action) => {
        state.loading = false;
        state.hasFeched = true;
        state.error = action.payload;
      })

      // Search coupons
      .addCase(searchCoupons.pending, (state) => {
        state.searchLoading = true;
        state.error = null;
      })
      .addCase(searchCoupons.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.data.coupons;
        state.isSearchMode = true;
      })
      .addCase(searchCoupons.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.payload;
      })

      // Search by date range
      .addCase(searchCouponsByDateRange.pending, (state) => {
        state.searchLoading = true;
        state.error = null;
      })
      .addCase(searchCouponsByDateRange.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.data.coupons;
        state.isSearchMode = true;
      })
      .addCase(searchCouponsByDateRange.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.payload;
      })

      // Create coupon
      .addCase(createCoupon.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCoupon.fulfilled, (state, action) => {
        state.loading = false;
        state.coupons = [action.payload.coupon, ...state.coupons];
        state.allCoupons = [action.payload.coupon, ...state.allCoupons];
      })
      .addCase(createCoupon.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update coupon
      .addCase(updateCoupon.pending, (state, action) => {
        state.updateError = null;
        state.updatingCoupon = true;
      })

      // Update coupon
      .addCase(updateCoupon.fulfilled, (state, action) => {
        state.updatingCoupon = false;
        const updatedCoupon = action.payload.coupon;
        state.coupons = state.coupons.map((c) =>
          c._id === updatedCoupon._id ? updatedCoupon : c
        );
        state.allCoupons = state.allCoupons.map((c) =>
          c._id === updatedCoupon._id ? updatedCoupon : c
        );
      })

      // Update coupon
      .addCase(updateCoupon.rejected, (state, action) => {
        state.updateError = "Failed to Update Coupon Details";
        state.updatingCoupon = false;
      })

      // Delete coupon
      .addCase(deleteCoupon.fulfilled, (state, action) => {
        const id = action.payload.id;
        state.coupons = state.coupons.filter((c) => c._id !== id);
        state.allCoupons = state.allCoupons.filter((c) => c._id !== id);
      })

      // Fetch services
      .addCase(fetchServices.pending, (state) => {
        state.serviceLoading = true;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.serviceLoading = false;
        state.services = action.payload;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.serviceLoading = false;
        state.error = action.payload;
      })

      // Search influencer
      .addCase(searchInfluencer.pending, (state) => {
        state.influencerLoading = true;
      })
      .addCase(searchInfluencer.fulfilled, (state, action) => {
        state.influencerLoading = false;
  
        state.currentInfluencer = action.payload?.influencer || null;
      })
      .addCase(searchInfluencer.rejected, (state, action) => {
        state.influencerLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  clearSearchResults,
  clearInfluencer,
  setCurrentPage,
} = couponsSlice.actions;
export default couponsSlice.reducer;
