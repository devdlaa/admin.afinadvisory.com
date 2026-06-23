import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Async thunk to fetch payment links
export const fetchPaymentLinks = createAsyncThunk(
  "paymentLinks/fetchPaymentLinks",
  async (
    { limit = 20, cursor = null, append = false },
    { rejectWithValue }
  ) => {
    try {
      const payload = cursor ? { limit, cursor } : { limit };
      const response = await fetch("/api/manage_website/services/payment_links/get", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        return rejectWithValue(data.error);
      }

      return { ...data, append };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // Data
  allPaymentLinks: [],
  filteredLinks: [],
  searchResults: [],
  selectedLink: null,

  // Pagination
  hasMore: false,
  cursor: null,

  // UI State
  activeTab: "all",
  searchTerm: "",
  isSearchActive: false,
  showLinkDialog: false,

  // Loading states
  loading: false,
  loadingMore: false,

  // Error
  error: null,
};

const paymentLinksSlice = createSlice({
  name: "paymentLinks",
  initialState,
  reducers: {
    // Tab management
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
      state.filteredLinks = filterLinksByStatus(
        state.allPaymentLinks,
        action.payload
      );
    },

    // Search management
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
      if (action.payload.trim()) {
        state.isSearchActive = true;
        state.searchResults = searchPaymentLinks(
          state.allPaymentLinks,
          action.payload
        );
      } else {
        state.isSearchActive = false;
        state.searchResults = [];
      }
    },

    clearSearch: (state) => {
      state.searchTerm = "";
      state.isSearchActive = false;
      state.searchResults = [];
    },

    // Dialog management
    openLinkDialog: (state, action) => {
      state.selectedLink = action.payload;
      state.showLinkDialog = true;
    },

    closeLinkDialog: (state) => {
      state.selectedLink = null;
      state.showLinkDialog = false;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Reset state
    resetPaymentLinks: (state) => {
      return { ...initialState };
    },
  },

  extraReducers: (builder) => {
    builder
      // Fetch payment links
      .addCase(fetchPaymentLinks.pending, (state, action) => {
        if (action.meta.arg.append) {
          state.loadingMore = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchPaymentLinks.fulfilled, (state, action) => {
        const { payment_links, hasMore, cursor, append } = action.payload;

        if (append) {
          // Append new links for pagination
          state.allPaymentLinks = [...state.allPaymentLinks, ...payment_links];
          state.loadingMore = false;
        } else {
          // Replace links for initial load
          state.allPaymentLinks = payment_links;
          state.loading = false;
        }

        state.hasMore = hasMore;
        state.cursor = cursor;

        // Update filtered links based on active tab
        state.filteredLinks = filterLinksByStatus(
          state.allPaymentLinks,
          state.activeTab
        );

        // Update search results if search is active
        if (state.isSearchActive) {
          state.searchResults = searchPaymentLinks(
            state.allPaymentLinks,
            state.searchTerm
          );
        }
      })
      .addCase(fetchPaymentLinks.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload;
      });
  },
});

// Helper functions
const filterLinksByStatus = (links, status) => {
  if (status === "all") return links;
  return links.filter((link) => link.status === status);
};

const searchPaymentLinks = (links, searchTerm) => {
  if (!searchTerm.trim()) return [];

  const term = searchTerm.toLowerCase();
  return links.filter(
    (link) =>
      link.id?.toLowerCase().includes(term) ||
      link.razorpay_id?.toLowerCase().includes(term) ||
      link.pid?.toLowerCase().includes(term) ||
      link.short_url?.toLowerCase().includes(term)
  );
};

// Export actions
export const {
  setActiveTab,
  setSearchTerm,
  clearSearch,
  openLinkDialog,
  closeLinkDialog,
  clearError,
  resetPaymentLinks,
} = paymentLinksSlice.actions;

// Selectors
export const selectAllPaymentLinks = (state) =>
  state.paymentLinks.allPaymentLinks;
export const selectFilteredLinks = (state) => state.paymentLinks.filteredLinks;
export const selectSearchResults = (state) => state.paymentLinks.searchResults;
export const selectSelectedLink = (state) => state.paymentLinks.selectedLink;
export const selectActiveTab = (state) => state.paymentLinks.activeTab;
export const selectSearchTerm = (state) => state.paymentLinks.searchTerm;
export const selectIsSearchActive = (state) =>
  state.paymentLinks.isSearchActive;
export const selectShowLinkDialog = (state) =>
  state.paymentLinks.showLinkDialog;
export const selectHasMore = (state) => state.paymentLinks.hasMore;
export const selectCursor = (state) => state.paymentLinks.cursor;
export const selectLoading = (state) => state.paymentLinks.loading;
export const selectLoadingMore = (state) => state.paymentLinks.loadingMore;
export const selectError = (state) => state.paymentLinks.error;

// Current display data selector (search results or filtered links)
export const selectCurrentDisplayData = (state) => {
  if (state.paymentLinks.isSearchActive) {
    return state.paymentLinks.searchResults;
  }
  return state.paymentLinks.filteredLinks;
};

// Tab counts selector
export const selectTabCounts = (state) => {
  const links = state.paymentLinks.allPaymentLinks;
  return {
    all: links.length,
    created: links.filter((l) => l.status === "created").length,
    paid: links.filter((l) => l.status === "paid").length,
    expired: links.filter((l) => l.status === "expired").length,
    failed: links.filter((l) => l.status === "failed").length,
  };
};

export default paymentLinksSlice.reducer;
