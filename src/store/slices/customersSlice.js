import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

// Async thunks for API calls
export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async ({ cursor = null, limit = 10 }, { rejectWithValue }) => {
    const payload = cursor ? { limit, cursor } : { limit };
    try {
      const response = await fetch("/api/manage_website/customers/get_customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch customers");
      }

      return {
        customers: data.customers,
        hasMore: data.hasMore,
        cursor: data.cursor,
        resultsCount: data.resultsCount,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const searchCustomers = createAsyncThunk(
  "customers/searchCustomers",
  async ({ value, field }, { getState, rejectWithValue }) => {
    try {
      const state = getState().customers;
      const { allCustomers } = state;

      // --- 1. Local Search First ---
      function getNestedValue(obj, path) {
        return path.split(".").reduce((acc, key) => acc?.[key], obj);
      }

      const query = value.toLowerCase();
      const localMatches = allCustomers.filter((customer) => {
        const fieldValue = getNestedValue(customer, field);
        return fieldValue?.toString().toLowerCase().includes(query);
      });

      if (localMatches.length > 0) {
        // ✅ Found locally → return directly
        return {
          success: true,
          matchedField: field,
          queryValue: value,
          resultsCount: localMatches.length,
          customers: localMatches,
          fromCache: true,
        };
      }

      const response = await fetch("/api/manage_website/customers/search_customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Search failed");
      }

      return {
        success: data.success,
        matchedField: data.matchedField || field,
        queryValue: data.queryValue || value,
        resultsCount: data.resultsCount,
        customers: data.customers || [],
        meta: data.meta,
        fromCache: false,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const filterCustomers = createAsyncThunk(
  "customers/filterCustomers",
  async ({ mode = "filter", filters }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/manage_website/customers/filter_customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Filter failed");
      }

      return {
        mode,
        filters: data?.meta?.filters,
        resultsCount: data,
        customers: data,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCustomer = createAsyncThunk(
  "customers/updateCustomer",
  async ({ id, updateData }, { rejectWithValue }) => {
    try {
      const response = await fetch(
        "/api/manage_website/customers/update_customer_details",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: id,
            updateData,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to update customer");
      }

      return {
        id,
        updatedCustomer: data,
        updateData,
      };
    } catch (error) {
      console.log("error.message", error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const addNewUser = createAsyncThunk(
  "customers/addNewUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/manage_website/customers/add_new_customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      // Handle HTTP errors and API errors
      if (!response.ok || !data.success) {
        // Create detailed error object based on response
        const errorDetails = {
          status: response.status,
          type: "api_error",
          message: data.error || `HTTP error! status: ${response.status}`,
          details: data?.details || null,
          originalData: data,
        };

        // Handle specific error types
        if (response.status === 409) {
          errorDetails.type = "duplicate_data";
          if (data?.details && Array.isArray(data?.details)) {
            errorDetails.message = data.details.join(", ");
          }
        } else if (response.status === 400) {
          errorDetails.type = "validation_error";
          if (data?.details && Array.isArray(data?.details)) {
            errorDetails.message = data?.details
              .map((err) => err.message || err)
              .join(", ");
          }
        } else if (response.status === 500) {
          errorDetails.type = "server_error";
          errorDetails.message =
            "Internal server error. Please try again later.";
        }

        return rejectWithValue(errorDetails);
      }

      return {
        newUser: data,
        passwordResetLink: data,
        message: data.message,
        meta: data.meta,
      };
    } catch (error) {
      // Handle network errors or other unexpected errors
      return rejectWithValue({
        type: "network_error",
        message: "Network error. Please check your connection and try again.",
        originalError: error.message,
      });
    }
  }
);

// Initial state
const initialState = {
  customers: [], // Current page customers to display
  allCustomers: [], // All fetched customers cache

  // Pagination
  currentPage: 1,
  itemsPerPage: 10,
  hasMore: false,
  cursor: null,

  // Loading
  loading: false,
  loadingNext: false,
  selectedCustomers: null,

  // Other states
  filteredCustomers: [],
  searchedCustomers: [],

  isSearchActive: false,
  isFilterActive: false,
  currentSearch: {
    query: "",
    field: "uid",
  },
  currentFilters: null,
  exportData: [],
  exportCount: null,
  error: null,
  searchLoading: false,
  filterLoading: false,
  exportLoading: false,

  // Update customer states
  isUpdatingCustomer: false,
  updateError: null,
  isCustomerDrawnOpen: false,

  // Add new user states
  isAddingNewUser: false,
  addUserError: null,
  newUserData: null,
  passwordResetLink: null,
};

const customersSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
    // Pagination actions
    goToNextPage: (state) => {
      const nextPage = state.currentPage + 1;
      const startIndex = (nextPage - 1) * state.itemsPerPage;
      const endIndex = startIndex + state.itemsPerPage;

      // Handle pagination for different states
      if (state.isSearchActive) {
        // Paginate through search results
        state.currentPage = nextPage;
        state.customers = state.searchedCustomers.slice(startIndex, endIndex);
        return;
      }

      if (state.isFilterActive) {
        // Paginate through filtered results
        state.currentPage = nextPage;
        state.customers = state.filteredCustomers.slice(startIndex, endIndex);
        return;
      }

      // Regular pagination
      if (state.allCustomers.length >= endIndex) {
        state.customers = state.allCustomers.slice(startIndex, endIndex);
        state.currentPage = nextPage;
      } else if (state.allCustomers.length >= startIndex) {
        state.customers = state.allCustomers.slice(startIndex);
        state.currentPage = nextPage;
      } else {
        state.customers = [];
        state.currentPage = nextPage;
      }
    },

    goToPrevPage: (state) => {
      if (state.currentPage <= 1) return;

      const prevPage = state.currentPage - 1;
      const startIndex = (prevPage - 1) * state.itemsPerPage;
      const endIndex = startIndex + state.itemsPerPage;

      state.currentPage = prevPage;

      // Handle pagination for different states
      if (state.isSearchActive) {
        state.customers = state.searchedCustomers.slice(startIndex, endIndex);
        return;
      }

      if (state.isFilterActive) {
        state.customers = state.filteredCustomers.slice(startIndex, endIndex);
        return;
      }

      // Regular pagination
      state.customers = state.allCustomers.slice(startIndex, endIndex);
    },

    setItemsPerPage: (state, action) => {
      const newLimit = action.payload;
      state.itemsPerPage = newLimit;
      state.currentPage = 1;

      // Update current view with new limit
      const endIndex = newLimit;
      if (state.isSearchActive) {
        state.customers = state.searchedCustomers.slice(0, endIndex);
      } else if (state.isFilterActive) {
        state.customers = state.filteredCustomers.slice(0, endIndex);
      } else {
        state.customers = state.allCustomers.slice(0, endIndex);
      }
    },

    // Selection actions
    selectCustomer: (state, action) => {
      const customerId = action.payload;
      const found = state.customers.find((c) => c.id === customerId);

      if (found) {
        state.selectedCustomers = found;
      } else {
        state.selectedCustomers = null;
      }
    },
    selectAllCustomers: (state, action) => {},
    clearSelection: (state) => {
      state.selectedCustomers = null;
    },
    setCustomerDrawr: (state) => {
      state.isCustomerDrawnOpen = !state.isCustomerDrawnOpen;
    },

    // Search actions
    clearSearch: (state) => {
      state.searchedCustomers = [];
      state.isSearchActive = false;
      state.currentSearch = { query: "", field: "uid" };

      // Reset to showing regular customers
      state.currentPage = 1;
      const endIndex = state.itemsPerPage;

      // If filter is active, show filtered results, otherwise show all customers
      if (state.isFilterActive) {
        state.customers = state.filteredCustomers.slice(0, endIndex);
      } else {
        state.customers = state.allCustomers.slice(0, endIndex);
      }
    },

    setSearchField: (state, action) => {
      state.currentSearch.field = action.payload;
    },

    setSearchQuery: (state, action) => {
      state.currentSearch.query = action.payload;
    },

    // Filter actions
    clearFilters: (state) => {
      state.filteredCustomers = [];
      state.isFilterActive = false;
      state.currentFilters = null;

      // Reset to showing regular customers
      state.currentPage = 1;
      const endIndex = state.itemsPerPage;

      // If search is active, show search results, otherwise show all customers
      if (state.isSearchActive) {
        state.customers = state.searchedCustomers.slice(0, endIndex);
      } else {
        state.customers = state.allCustomers.slice(0, endIndex);
      }
    },

    // Reset all states (for refresh)
    resetState: (state) => {
      return {
        ...initialState,
      };
    },

    // Error handling
    clearError: (state) => {
      state.error = null;
      state.updateError = null;
      state.addUserError = null;
    },

    // Update cursor for next fetch
    setCursor: (state, action) => {
      state.cursor = action.payload;
    },

    // Handle edit close customer
    handleEditCloseCustomer: (state) => {
      state.isUpdatingCustomer = false;
      state.updateError = null;
    },

    // Add new user actions
    clearAddUserData: (state) => {
      state.newUserData = null;
      state.passwordResetLink = null;
      state.addUserError = null;
    },

    handleAddUserClose: (state) => {
      state.isAddingNewUser = false;
      state.addUserError = null;
    },
  },

  extraReducers: (builder) => {
    // Fetch customers
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        const { customers, hasMore, cursor } = action.payload;

        // Add new customers to our cache
        state.allCustomers = [...state.allCustomers, ...customers];
        state.cursor = cursor;
        state.hasMore = hasMore;

        // Update current page display only if we're not in search/filter mode
        if (!state.isSearchActive && !state.isFilterActive) {
          const startIndex = (state.currentPage - 1) * state.itemsPerPage;
          const endIndex = startIndex + state.itemsPerPage;
          state.customers = state.allCustomers.slice(startIndex, endIndex);
        }
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch customers";
      });

    // Search customers
    builder
      .addCase(searchCustomers.pending, (state) => {
        state.searchLoading = true;
        state.searchedCustomers = [];
        state.error = null;
      })
      .addCase(searchCustomers.fulfilled, (state, action) => {
        state.searchLoading = false;
        const { customers, queryValue } = action.payload;

        // Store search results
        state.searchedCustomers = customers;
        state.isSearchActive = true;
        state.currentSearch.query = queryValue;

        // Reset to first page and show search results
        state.currentPage = 1;
        const endIndex = Math.min(state.itemsPerPage, customers.length);
        state.customers = customers.slice(0, endIndex);
      })
      .addCase(searchCustomers.rejected, (state, action) => {
        state.searchLoading = false;
        state.isSearchActive = true;
        state.error = "No results Found";
      });

    // Filter customers
    builder
      .addCase(filterCustomers.pending, (state) => {
        state.filterLoading = true;
        state.error = null;
      })
      .addCase(filterCustomers.fulfilled, (state, action) => {
        state.filterLoading = false;
        const { mode, customers, filters, resultsCount } = action.payload;

        if (mode === "filter") {
          state.filteredCustomers = customers?.data?.customers;
          state.isFilterActive = true;
          state.currentFilters = filters;

          // Show first page of filtered results
          state.currentPage = 1;
          const endIndex = Math.min(
            state.itemsPerPage,
            customers?.data?.customers.length
          );
          state.customers = customers?.data?.customers.slice(0, endIndex);
        }

        if (mode === "export") {
          state.exportData = customers?.data?.customers;
          state.exportCount = customers?.data?.customers.length;
        }
      })
      .addCase(filterCustomers.rejected, (state, action) => {
        state.filterLoading = false;
        state.error = action.payload || "Filter failed";
      });

    // Update customer
    builder
      .addCase(updateCustomer.pending, (state) => {
        state.isUpdatingCustomer = true;
        state.updateError = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.isUpdatingCustomer = false;
        const { id, updatedCustomer } = action.payload;

        // Helper function to update customer in array
        const updateCustomerInArray = (customers) => {
          const index = customers.findIndex((c) => c.id === id);
          if (index !== -1) {
            customers[index] = {
              ...customers[index],
              ...updatedCustomer?.data?.customer,
            };
          }
        };

        // Update customer in all relevant arrays
        updateCustomerInArray(state.allCustomers);
        updateCustomerInArray(state.customers);

        if (state.isSearchActive) {
          updateCustomerInArray(state.searchedCustomers);
        }

        if (state.isFilterActive) {
          updateCustomerInArray(state.filteredCustomers);
        }

        // Update selected customer if it's the same one
        if (state.selectedCustomers?.id === id) {
          state.selectedCustomers = {
            ...state.selectedCustomers,
            ...updatedCustomer,
          };
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.isUpdatingCustomer = false;
        state.updateError = action?.payload || "Failed to update customer";
      });

    // Add new user
    builder
      .addCase(addNewUser.pending, (state) => {
        state.isAddingNewUser = true;
        state.addUserError = null;
        state.newUserData = null;
        state.passwordResetLink = null;
      })
      .addCase(addNewUser.fulfilled, (state, action) => {
        state.isAddingNewUser = false;
        const { newUser } = action.payload;

        state.newUserData = newUser.data.user;
        state.passwordResetLink = newUser?.data?.passwordResetLink;

        if (newUser?.data?.user) {
          state.allCustomers = [newUser?.data?.user, ...state.allCustomers];
          // If we're not in search/filter mode, update the current view
          if (!state.isSearchActive && !state.isFilterActive) {
            const startIndex = (state.currentPage - 1) * state.itemsPerPage;
            const endIndex = startIndex + state.itemsPerPage;
            state.customers = state.allCustomers.slice(startIndex, endIndex);
          }
        }
      })
      .addCase(addNewUser.rejected, (state, action) => {
        state.isAddingNewUser = false;

        // Handle structured error object
        if (action.payload && typeof action.payload === "object") {
          const errorPayload = action.payload;
          const erroMsgStr =
            action.payload.message?.details?.errors?.join(",") || "N/a";

          switch (errorPayload.type) {
            case "duplicate_data":
              state.addUserError = {
                type: "duplicate",
                message: `User already exists: ${erroMsgStr}`,
                details: errorPayload?.details,
              };
              break;

            case "validation_error":
              state.addUserError = {
                type: "validation",
                message: `Validation failed: ${erroMsgStr}`,
                details: errorPayload?.details,
              };
              break;

            case "server_error":
              state.addUserError = {
                type: "server",
                message: "Server error occurred. Please try again later.",
                details: null,
              };
              break;

            case "network_error":
              state.addUserError = {
                type: "network",
                message: "Network error. Please check your connection.",
                details: null,
              };
              break;

            default:
              state.addUserError = {
                type: "unknown",
                message: erroMsgStr || "An unexpected error occurred",
                details: errorPayload?.details,
              };
          }
        } else {
          // Fallback for string errors
          state.addUserError = {
            type: "unknown",
            message: action.payload || "Failed to add new user",
            details: null,
          };
        }

        state.newUserData = null;
        state.passwordResetLink = null;
      });
  },
});

export const {
  goToNextPage,
  goToPrevPage,
  setItemsPerPage,
  selectCustomer,
  selectAllCustomers,
  clearSelection,
  clearSearch,
  setSearchField,
  setSearchQuery,
  clearFilters,
  resetState,
  clearError,
  setCursor,
  setCustomerDrawr,
  handleEditCloseCustomer,
  clearAddUserData,
  handleAddUserClose,
} = customersSlice.actions;

// Selectors
export const selectCurrentCustomers = (state) => {
  return state.customers.customers;
};

export const selectCustomersStats = (state) => {
  const { customers } = state;

  // Helper function to check if we need more data
  const needsMoreData = () => {
    if (customers.isFilterActive || customers.isSearchActive) {
      return false; // No pagination for filtered/searched results
    }

    const currentPageStart =
      (customers.currentPage - 1) * customers.itemsPerPage;
    const currentPageEnd = currentPageStart + customers.itemsPerPage;

    // We need more data if we don't have enough for the current page and server has more
    return customers.allCustomers.length < currentPageEnd && customers.hasMore;
  };

  // Helper function to check if we can go to next page
  const canGoNext = () => {
    if (customers.isSearchActive) {
      const totalSearchPages = Math.ceil(
        customers.searchedCustomers.length / customers.itemsPerPage
      );
      return customers.currentPage < totalSearchPages;
    }

    if (customers.isFilterActive) {
      const totalFilteredPages = Math.ceil(
        customers.filteredCustomers.length / customers.itemsPerPage
      );
      return customers.currentPage < totalFilteredPages;
    }

    // For regular pagination, we can go next if:
    // 1. We have more data locally for next page, OR
    // 2. Server has more data (hasMore = true)
    const nextPageStart = customers.currentPage * customers.itemsPerPage;
    return customers.allCustomers.length > nextPageStart || customers.hasMore;
  };

  // Helper function to get total count for current view
  const getTotalCount = () => {
    if (customers.isSearchActive) {
      return customers.searchedCustomers.length;
    }
    if (customers.isFilterActive) {
      return customers.filteredCustomers.length;
    }
    return customers.allCustomers.length;
  };

  return {
    currentPage: customers.currentPage,
    itemsPerPage: customers.itemsPerPage,
    hasMore: customers.hasMore,
    canGoNext: canGoNext(),
    canGoPrev: customers.currentPage > 1,
    needsMoreData: needsMoreData(),
    cursor: customers.cursor,
    totalCached: getTotalCount(),
    currentPageSize: customers.customers.length,
  };
};

// ✅ CORRECT - Memoized selectors
export const selectLoadingStates = createSelector(
  [
    (state) => state.customers.loading,
    (state) => state.customers.searchLoading,
    (state) => state.customers.filterLoading,
    (state) => state.customers.exportLoading,
    (state) => state.customers.isUpdatingCustomer,
    (state) => state.customers.isAddingNewUser,
  ],
  (
    loading,
    searchLoading,
    filterLoading,
    exportLoading,
    isUpdatingCustomer,
    isAddingNewUser
  ) => ({
    loading,
    searchLoading,
    filterLoading,
    exportLoading,
    isUpdatingCustomer,
    isAddingNewUser,
  })
);

export const selectActiveStates = createSelector(
  [
    (state) => state.customers.isSearchActive,
    (state) => state.customers.isFilterActive,
  ],
  (isSearchActive, isFilterActive) => ({
    isSearchActive,
    isFilterActive,
  })
);

export const selectSearchState = createSelector(
  [
    (state) => state.customers.currentSearch.query,
    (state) => state.customers.currentSearch.field,
  ],
  (query, field) => ({
    query,
    field,
  })
);

// Updated selector to provide better error information
export const selectAddUserStates = (state) => ({
  isAddingNewUser: state.customers.isAddingNewUser,
  addUserError: state.customers.addUserError,
  newUserData: state.customers.newUserData,
  passwordResetLink: state.customers.passwordResetLink,
});

// Helper selector to get user-friendly error message
export const selectAddUserErrorMessage = (state) => {
  const error = state?.customers?.addUserError?.message;
  if (!error) return null;

  switch (error?.type) {
    case "duplicate":
      return {
        title: error || "User Already Exists",
        message: error?.message,
        type: "warning",
      };

    case "validation":
      return {
        title: error || "Invalid Data",
        message: error?.message,
        type: "error",
      };

    case "server":
      return {
        title: error || "Server Error",
        message: "Something went wrong on our end. Please try again later.",
        type: "error",
      };

    case "network":
      return {
        title: error || "Connection Error",
        message: "Please check your internet connection and try again.",
        type: "error",
      };

    default:
      return {
        title: error || "Error",
        message: error?.message || "An unexpected error occurred",
        type: "error",
      };
  }
};

export default customersSlice.reducer;
