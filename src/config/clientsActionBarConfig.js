import { Building2, UserPlus } from "lucide-react";

import {
  fetchEntities,
  setFilters,
  resetFilters,
  selectListEntities,
  selectPagination,
  selectFilters,
  selectIsLoading,
} from "@/store/slices/entitySlice";

// Clients/Entity Action Bar Configuration
export const clientsActionBarConfig = {
  config: {
    entityName: "Client",
    entityNamePlural: "Clients",
    description: "Manage your clients and their details",
    icon: Building2,
    className: "clients-ab",
    showAddButton: true,
    addButtonText: "Add New Client",
    addButtonIcon: UserPlus,
  },

  selectors: {
    selectStats: (state) => {
      const pagination = selectPagination(state);
      const filters = selectFilters(state);
      const entities = selectListEntities(state);

      return {
        currentPage: pagination.page,
        itemsPerPage: pagination.page_size,
        canGoNext: pagination.has_more,
        canGoPrev: pagination.page > 1,
        needsMoreData: false,
        cursor: null,
        totalCached: pagination.total_items,
        currentPageSize: entities.length,
      };
    },

    selectLoadingStates: (state) => ({
      loading: selectIsLoading(state, "list"),
      searchLoading: selectIsLoading(state, "quickSearch"),
      exportLoading: false,
    }),

    selectActiveStates: (state) => {
      const filters = selectFilters(state);
      return {
        isSearchActive: !!filters.search,
        isFilterActive: !!(
          filters.entity_type ||
          filters.status ||
          filters.state
        ),
      };
    },

    selectSearchState: (state) => {
      const filters = selectFilters(state);
      return {
        query: filters.search || "",
        field: "search",
      };
    },
  },

  actions: {
    fetchData: ({ cursor, limit }) =>
      fetchEntities({
        page: 1,
        page_size: limit,
      }),

    searchData:
      ({ value }) =>
      (dispatch, getState) => {
        dispatch(setFilters({ search: value, page: 1 }));
        const filters = selectFilters(getState());
        dispatch(fetchEntities(filters));
      },

    resetState: () => (dispatch) => {
      dispatch(resetFilters());
      dispatch(fetchEntities({ page: 1, page_size: 20 }));
    },

    clearSearch: () => (dispatch, getState) => {
      dispatch(setFilters({ search: "", page: 1 }));
      const filters = selectFilters(getState());
      dispatch(fetchEntities(filters));
    },

    clearFilters: () => (dispatch) => {
      dispatch(resetFilters());
      dispatch(fetchEntities({ page: 1, page_size: 20 }));
    },

    setSearchField: () => {}, 

    setSearchQuery: (query) => setFilters({ search: query }),

    goToNextPage: () => (dispatch, getState) => {
      const filters = selectFilters(getState());
      const pagination = selectPagination(getState());
      const nextPage = pagination.page + 1;

      dispatch(setFilters({ page: nextPage }));
      dispatch(fetchEntities({ ...filters, page: nextPage }));
    },

    goToPrevPage: () => (dispatch, getState) => {
      const filters = selectFilters(getState());
      const pagination = selectPagination(getState());
      const prevPage = Math.max(1, pagination.page - 1);

      dispatch(setFilters({ page: prevPage }));
      dispatch(fetchEntities({ ...filters, page: prevPage }));
    },
  },

  searchOptions: [{ value: "search", label: "All Fields" }],

  // Auto-detect what user is searching for
  detectField: (value) => {
    // PAN format: ABCDE1234F
    if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(value)) return "search";
    // Email format
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "search";
    // Phone number (10 digits)
    if (/^\d{10}$/.test(value)) return "search";
    // Default to general search
    return "search";
  },
};

// Clients Filter Dialog Configuration
export const clientsFilterConfig = {
  config: {
    entityName: "Client",
    entityNamePlural: "Clients",
    className: "clients-filter",
  },

  selectors: {
    selectLoadingStates: (state) => ({
      loading: selectIsLoading(state, "list"),
      exportLoading: false,
    }),
    selectExportData: (state) => selectListEntities(state),
  },

  actions: {
    filterDataAction: (filters) => (dispatch) => {
      dispatch(setFilters({ ...filters, page: 1 }));
      dispatch(fetchEntities({ ...filters, page: 1 }));
    },
  },

  fieldOptions: [
    { label: "Entity Type", value: "entity_type" },
    { label: "Status", value: "status" },
    { label: "State", value: "state" },
  ],

  entityTypes: [
    { label: "All Types", value: "" },
    { label: "Unregistered", value: "UN_REGISTRED" },
    { label: "Individual", value: "INDIVIDUAL" },
    { label: "Private Limited Company", value: "PRIVATE_LIMITED_COMPANY" },
    { label: "Public Limited Company", value: "PUBLIC_LIMITED_COMPANY" },
    { label: "One Person Company", value: "ONE_PERSON_COMPANY" },
    { label: "Section 8 Company", value: "SECTION_8_COMPANY" },
    { label: "Producer Company", value: "PRODUCER_COMPANY" },
    { label: "Sole Proprietorship", value: "SOLE_PROPRIETORSHIP" },
    { label: "Partnership Firm", value: "PARTNERSHIP_FIRM" },
    {
      label: "Limited Liability Partnership",
      value: "LIMITED_LIABILITY_PARTNERSHIP",
    },
    {
      label: "Association Of Person",
      value: "ASSOCIATION_OF_PERSON",
    },
    { label: "HUF", value: "HUF" },
    { label: "Trust", value: "TRUST" },
    { label: "Society", value: "SOCIETY" },
    { label: "Cooperative Society", value: "COOPERATIVE_SOCIETY" },
    { label: "Foreign Company", value: "FOREIGN_COMPANY" },
    { label: "Government Company", value: "GOVERNMENT_COMPANY" },
  ],

  statusOptions: [
    { label: "All Status", value: "" },
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
    { label: "Suspended", value: "SUSPENDED" },
  ],

  exportFunction: null,
};
