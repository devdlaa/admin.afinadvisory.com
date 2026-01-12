import { Building2, UserPlus } from "lucide-react";

import {
  fetchEntities,
  setFilters,
  resetFilters,
  selectEntityStats,
  selectEntityLoadingStates,
  selectEntityActiveStates,
  selectEntitySearchState,
  selectPagination,
  selectFilters,
} from "@/store/slices/entitySlice";

// Clients / Entity Action Bar Configuration (PATCHED)
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
    selectStats: selectEntityStats,
    selectLoadingStates: selectEntityLoadingStates,
    selectActiveStates: selectEntityActiveStates,
    selectSearchState: selectEntitySearchState,
  },

  actions: {
    fetchData: ({ limit }) =>
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

  detectField: (value) => {
    if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(value)) return "search";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "search";
    if (/^\d{10}$/.test(value)) return "search";
    return "search";
  },
};
