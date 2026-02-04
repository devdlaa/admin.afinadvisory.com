"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import InvoiceTable from "./components/InvoiceTable/InvoiceTable";
import InvoiceDetailsDrawer from "./components/InvoiceDetailsDrawer/InvoiceDetailsDrawer";
import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";
import styles from "./InvoicesPage.module.scss";
import { useSearchParams, useRouter } from "next/navigation";

import {
  fetchCompanyProfiles,
  selectListProfiles,
  selectIsLoading as selectCompanyProfileLoading,
  selectCachedProfilesCount,
} from "@/store/slices/companyProfileSlice";

import {
  fetchInvoices,
  selectInvoiceList,
  selectCurrentPageInvoices,
  selectSelectedInvoiceIds,
  selectInvoiceLoading,
  selectIsCurrentPageSelected,
  toggleInvoiceSelection,
  togglePageSelection,
  clearInvoiceSelections,
  bulkInvoiceAction,
  updateInvoiceInfo,
  updateInvoiceStatus,
  cancelInvoice,
  unlinkTasksFromInvoice,
} from "@/store/slices/invoiceSlice";

import { quickSearchEntities } from "@/store/slices/entitySlice";

import {
  addChargeToTask,
  bulkUpdateTaskCharges,
  deleteTaskCharge,
  bulkUpdateChargeStatus,
  deleteAdHocCharge,
} from "@/store/slices/chargesSlice";

// ============================================
// CONSTANTS
// ============================================
const STATUS_MAP = {
  DRAFT: "DRAFT",
  Issued: "ISSUED",
  Paid: "PAID",
  Cancelled: "CANCELLED",
};

const DEFAULT_PAGE_SIZE = "25";

const INITIAL_FILTERS = {
  entity_id: null,
  company_profile_id: null,
  from_date: null,
  to_date: null,
  date_field: "created_at",
  status: "DRAFT",
  page_size: DEFAULT_PAGE_SIZE,
  sort_by: null,
  sort_order: null,
  search: "",
};

// ============================================
// HELPER FUNCTIONS
// ============================================
const updateURLParams = (filters, router, searchParams) => {
  const params = new URLSearchParams(searchParams);

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      params.set(key, value.toString());
    } else if (params.has(key)) {
      params.delete(key);
    }
  });

  router.replace(`?${params.toString()}`, { scroll: false });
};

const InvoicesPage = () => {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const router = useRouter();

  // ============================================
  // REDUX STATE
  // ============================================
  const listData = useSelector(selectInvoiceList);
  const currentPageInvoices = useSelector(selectCurrentPageInvoices);
  const selectedInvoiceIds = useSelector(selectSelectedInvoiceIds);
  const loading = useSelector(selectInvoiceLoading);
  const isCurrentPageSelected = useSelector(selectIsCurrentPageSelected);
  const companyProfiles = useSelector(selectListProfiles);
  const cachedProfilesCount = useSelector(selectCachedProfilesCount);
  const companyProfilesLoading = useSelector((state) =>
    selectCompanyProfileLoading(state, "list"),
  );

  // ============================================
  // LOCAL STATE - Organized by Purpose
  // ============================================

  // Tab & Filter State
  const [activeTab, setActiveTab] = useState("DRAFT");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [tempDateRange, setTempDateRange] = useState({
    from_date: "",
    to_date: "",
  });
  const [searchInput, setSearchInput] = useState("");

  // Entity Search State
  const [entitySearchResults, setEntitySearchResults] = useState([]);
  const [isSearchingEntities, setIsSearchingEntities] = useState(false);

  // Invoice Details Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  // Confirmation Dialog State
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    type: null,
    data: null,
  });

  // ============================================
  // DERIVED STATE
  // ============================================
  const selectedEntity = useSelector((state) => {
    const entityId = filters.entity_id;
    if (!entityId) return null;
    return state.entity?.entities?.[entityId] || null;
  });

  const entityOptions = useMemo(() => {
    if (!selectedEntity) return entitySearchResults;
    return [
      selectedEntity,
      ...entitySearchResults.filter((e) => e?.id !== selectedEntity?.id),
    ];
  }, [selectedEntity, entitySearchResults]);

  const hasActiveFilters = useMemo(
    () =>
      filters.entity_id !== null ||
      filters.company_profile_id !== null ||
      filters.from_date !== null ||
      filters.to_date !== null ||
      filters.search !== "",
    [filters],
  );

  const isTableLoading = loading.list && !loading.listNext && !loading.listPrev;

  const companyProfileOptions = useMemo(
    () =>
      companyProfiles.map((profile) => ({
        value: profile.id,
        label: profile.name,
      })),
    [companyProfiles],
  );

  // ============================================
  // UNIFIED FETCH FUNCTION
  // ============================================
  const fetchInvoicesWithFilters = useCallback(
    (page = listData.currentPage, additionalOptions = {}) => {
      dispatch(
        fetchInvoices({
          filters,
          page,
          ...additionalOptions,
        }),
      );
    },
    [dispatch, filters, listData.currentPage],
  );

  // ============================================
  // EFFECTS - Optimized to prevent infinite loops
  // ============================================

  // 1. Initialize filters from URL ONCE on mount
  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    const initialFilters = { ...INITIAL_FILTERS };

    if (params.entity_id) initialFilters.entity_id = params.entity_id;
    if (params.company_profile_id)
      initialFilters.company_profile_id = params.company_profile_id;
    if (params.from_date) initialFilters.from_date = params.from_date;
    if (params.to_date) initialFilters.to_date = params.to_date;
    if (params.date_field) initialFilters.date_field = params.date_field;
    if (params.status) initialFilters.status = params.status;
    if (params.page_size) initialFilters.page_size = params.page_size;
    if (params.sort_by) initialFilters.sort_by = params.sort_by;
    if (params.sort_order) initialFilters.sort_order = params.sort_order;
    if (params.search) initialFilters.search = params.search;

    setFilters(initialFilters);
    if (params.search) setSearchInput(params.search);

    const tabKey =
      Object.keys(STATUS_MAP).find(
        (key) => STATUS_MAP[key] === initialFilters.status,
      ) || "DRAFT";
    setActiveTab(tabKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // 2. Sync tempDateRange with filters (no API calls)
  useEffect(() => {
    setTempDateRange({
      from_date: filters.from_date || "",
      to_date: filters.to_date || "",
    });
  }, [filters.from_date, filters.to_date]);

  // 3. Fetch invoices when filters change (dependency array optimized)
  useEffect(() => {
    fetchInvoicesWithFilters(listData.currentPage, { isFilterChange: true });
    updateURLParams(filters, router, searchParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.entity_id,
    filters.company_profile_id,
    filters.from_date,
    filters.to_date,
    filters.date_field,
    filters.status,
    filters.sort_by,
    filters.sort_order,
    filters.search,
  ]);

  // 4. Handle invoice URL parameter (open drawer)
  useEffect(() => {
    const invoiceFromUrl = searchParams.get("invoice");

    if (invoiceFromUrl) {
      setSelectedInvoiceId(invoiceFromUrl);
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  // 5. Fetch company profiles ONCE if not cached
  useEffect(() => {
    if (cachedProfilesCount === 0) {
      dispatch(fetchCompanyProfiles({ is_active: true, page_size: 50 }));
    }
  }, [dispatch, cachedProfilesCount]);

  // ============================================
  // HANDLERS - FILTERS & TABS
  // ============================================
  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab);
      setFilters((prev) => ({ ...prev, status: STATUS_MAP[tab] || "DRAFT" }));
      dispatch(clearInvoiceSelections());
    },
    [dispatch],
  );

  const handleFilterChange = useCallback((filterKey, value) => {
    setFilters((prev) => ({ ...prev, [filterKey]: value }));
  }, []);

  const handleSort = useCallback((column) => {
    setFilters((prev) => {
      if (prev.sort_by === column) {
        if (prev.sort_order === "asc") return { ...prev, sort_order: "desc" };
        if (prev.sort_order === "desc")
          return { ...prev, sort_by: null, sort_order: null };
      }
      return { ...prev, sort_by: column, sort_order: "asc" };
    });
  }, []);

  const handleApplyDateFilter = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      from_date: tempDateRange.from_date || null,
      to_date: tempDateRange.to_date || null,
    }));
  }, [tempDateRange]);

  const handleClearDateFilter = useCallback(() => {
    setTempDateRange({ from_date: "", to_date: "" });
    setFilters((prev) => ({
      ...prev,
      from_date: null,
      to_date: null,
    }));
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilters({
      ...INITIAL_FILTERS,
      status: filters.status,
      page_size: DEFAULT_PAGE_SIZE,
    });
    setTempDateRange({ from_date: "", to_date: "" });
    setEntitySearchResults([]);
    setSearchInput("");
  }, [filters.status]);

  // ============================================
  // HANDLERS - ENTITY SEARCH
  // ============================================
  const handleEntitySearch = useCallback(
    async (query) => {
      if (!query?.trim()) {
        setEntitySearchResults([]);
        return;
      }

      setIsSearchingEntities(true);
      try {
        const result = await dispatch(
          quickSearchEntities({ search: query, limit: 20, forceRefresh: true }),
        ).unwrap();

        const safeData = Array.isArray(result?.data)
          ? result.data.filter((e) => e?.id && e?.name)
          : [];

        setEntitySearchResults(safeData);
      } catch (err) {
        console.error("Entity search failed:", err);
        setEntitySearchResults([]);
      } finally {
        setIsSearchingEntities(false);
      }
    },
    [dispatch],
  );

  // ============================================
  // HANDLERS - SELECTION
  // ============================================
  const handleSelectionChange = useCallback(
    (invoiceId) => {
      dispatch(toggleInvoiceSelection(invoiceId));
    },
    [dispatch],
  );

  const handleSelectAll = useCallback(() => {
    const invoiceIds = currentPageInvoices.map((inv) => inv.id);
    dispatch(
      togglePageSelection({ invoiceIds, selectAll: !isCurrentPageSelected }),
    );
  }, [dispatch, currentPageInvoices, isCurrentPageSelected]);

  const handleRemoveSelection = useCallback(() => {
    dispatch(clearInvoiceSelections());
  }, [dispatch]);

  // ============================================
  // CONFIRMATION DIALOG HANDLERS
  // ============================================
  const closeConfirmation = useCallback(() => {
    setConfirmationState({
      isOpen: false,
      type: null,
      data: null,
    });
  }, []);

  const getConfirmationConfig = useCallback(() => {
    const { type, data } = confirmationState;

    switch (type) {
      case "bulkMarkPaid":
        return {
          actionName: "Mark Invoices as Paid",
          actionInfo: `You are about to mark ${data?.count} invoice${data?.count !== 1 ? "s" : ""} as PAID. Please ensure payment has been received for all selected invoices before proceeding.`,
          confirmText: "Mark as Paid",
          variant: "warning",
        };

      case "bulkMarkDraft":
        const hasIssued = data?.hasIssued;
        const hasPaid = data?.hasPaid;

        if (hasPaid) {
          return {
            actionName: "Revert Paid Invoices to Draft",
            actionInfo: `You are about to revert ${data?.count} invoice${data?.count !== 1 ? "s" : ""} back to DRAFT status. This includes invoices that are currently marked as PAID. Please ensure this is intentional as it may affect your financial records.`,
            confirmText: "Revert to Draft",
            variant: "danger",
          };
        }

        if (hasIssued) {
          return {
            actionName: "Revert Issued Invoices to Draft",
            actionInfo: `You are about to revert ${data?.count} issued invoice${data?.count !== 1 ? "s" : ""} back to DRAFT status. This action should only be taken if the invoice${data?.count !== 1 ? "s have" : " has"} not been sent to clients yet.`,
            confirmText: "Revert to Draft",
            variant: "warning",
          };
        }

        return {
          actionName: "Mark as Draft",
          actionInfo: `Mark ${data?.count} invoice${data?.count !== 1 ? "s" : ""} as draft.`,
          confirmText: "Mark as Draft",
          variant: "default",
        };

      default:
        return {
          actionName: "Confirm Action",
          actionInfo: "Are you sure you want to proceed?",
          confirmText: "Confirm",
          variant: "default",
        };
    }
  }, [confirmationState]);

  const executeBulkAction = useCallback(async () => {
    const { type, data } = confirmationState;

    try {
      await dispatch(
        bulkInvoiceAction({
          invoiceIds: selectedInvoiceIds,
          action: data.action,
        }),
      ).unwrap();

      // Refetch to update the list
      fetchInvoicesWithFilters();
    } catch (err) {
      console.error("Bulk action failed:", err);
    } finally {
      closeConfirmation();
    }
  }, [
    confirmationState,
    selectedInvoiceIds,
    dispatch,
    fetchInvoicesWithFilters,
    closeConfirmation,
  ]);

  // ============================================
  // HANDLERS - BULK ACTIONS WITH VALIDATION
  // ============================================
  const handleBulkAction = useCallback(
    (action, requiresConfirmation = false) => {
      if (!selectedInvoiceIds.length) return;

      // Get selected invoices details for validation
      const selectedInvoices = currentPageInvoices.filter((inv) =>
        selectedInvoiceIds.includes(inv.id),
      );

      const hasIssued = selectedInvoices.some((inv) => inv.status === "ISSUED");
      const hasPaid = selectedInvoices.some((inv) => inv.status === "PAID");

      if (requiresConfirmation) {
        let confirmationType = null;

        if (action === "MARK_PAID") {
          confirmationType = "bulkMarkPaid";
        } else if (action === "MARK_DRAFT") {
          confirmationType = "bulkMarkDraft";
        }

        if (confirmationType) {
          setConfirmationState({
            isOpen: true,
            type: confirmationType,
            data: {
              action,
              count: selectedInvoiceIds.length,
              hasIssued,
              hasPaid,
            },
          });
          return;
        }
      }

      // Execute without confirmation
      dispatch(
        bulkInvoiceAction({
          invoiceIds: selectedInvoiceIds,
          action,
        }),
      ).then(() => {
        fetchInvoicesWithFilters();
      });
    },
    [
      selectedInvoiceIds,
      currentPageInvoices,
      dispatch,
      fetchInvoicesWithFilters,
    ],
  );

  const handleMarkIssued = useCallback(
    () => handleBulkAction("MARK_ISSUED", false),
    [handleBulkAction],
  );
  const handleMarkPaid = useCallback(
    () => handleBulkAction("MARK_PAID", true),
    [handleBulkAction],
  );
  const handleMarkDraft = useCallback(
    () => handleBulkAction("MARK_DRAFT", true),
    [handleBulkAction],
  );

  // ============================================
  // HANDLERS - PAGINATION
  // ============================================
  const handlePageChange = useCallback(
    (page) => {
      fetchInvoicesWithFilters(page, {
        isNext: page > listData.currentPage,
        isPrev: page < listData.currentPage,
      });
    },
    [fetchInvoicesWithFilters, listData.currentPage],
  );

  const handleItemsPerPageChange = useCallback(
    (pageSize) => {
      const updatedFilters = { ...filters, page_size: pageSize.toString() };
      setFilters(updatedFilters);
      dispatch(fetchInvoices({ filters: updatedFilters }));
    },
    [filters, dispatch],
  );

  const handleSearchApply = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchInput.trim() || "",
    }));
  }, [searchInput]);

  const handleSearchClear = useCallback(() => {
    setSearchInput("");
    setFilters((prev) => ({ ...prev, search: "" }));
  }, []);

  // ============================================
  // HANDLERS - ROW CLICK & DRAWER
  // ============================================
  const handleRowClick = useCallback((invoice) => {
    const invoiceId = invoice.internal_number;

    setSelectedInvoiceId(invoiceId);
    setIsDrawerOpen(true);

    const params = new URLSearchParams(window.location.search);
    params.set("invoice", invoiceId);

    const url = new URL(window.location.href);
    url.search = params.toString();

    window.history.pushState({}, "", url);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedInvoiceId(null);

    const params = new URLSearchParams(window.location.search);
    params.delete("invoice");

    const url = new URL(window.location.href);
    url.search = params.toString();

    window.history.replaceState({}, "", url);
  }, []);

  // ============================================
  // DRAWER HANDLERS - Centralized from InvoiceDetailsDrawer
  // ============================================
  const drawerHandlers = useMemo(
    () => ({
      onAddCharge: async (taskId, newCharge) => {
        try {
          await dispatch(
            addChargeToTask({ taskId, chargeData: newCharge }),
          ).unwrap();
        } catch (err) {
          console.error("Failed to add charge:", err);
        }
      },

      onUpdateCharges: async (taskId, updates) => {
        try {
          await dispatch(bulkUpdateTaskCharges({ taskId, updates })).unwrap();
        } catch (err) {
          console.error("Failed to update charges:", err);
        }
      },

      onDeleteCharge: async (taskId, chargeId) => {
        try {
          await dispatch(deleteTaskCharge({ taskId, chargeId })).unwrap();
        } catch (err) {
          console.error("Failed to delete charge:", err);
        }
      },

      onUpdateChargeStatus: async (taskId, chargeIds, status) => {
        try {
          await dispatch(
            bulkUpdateChargeStatus({ taskId, chargeIds, status }),
          ).unwrap();
        } catch (err) {
          console.error("Failed to update charge status:", err);
        }
      },

      onUnlinkTasks: async (invoiceId, taskIds) => {
        if (!invoiceId) return;
        try {
          await dispatch(
            unlinkTasksFromInvoice({
              invoiceId: invoiceId,
              taskIds,
            }),
          ).unwrap();
        } catch (err) {
          console.error("Failed to unlink tasks:", err);
        }
      },

      onDeleteAdHoc: async (taskId) => {
        try {
          await dispatch(deleteAdHocCharge({ taskId })).unwrap();
        } catch (err) {
          console.error("Failed to delete ad-hoc task:", err);
        }
      },

      onUpdateInvoiceInfo: async (invoiceId, updateData) => {
        try {
          await dispatch(updateInvoiceInfo({ invoiceId, updateData })).unwrap();
        } catch (err) {
          console.error("Failed to update invoice info:", err);
          throw err;
        }
      },

      onUpdateInvoiceStatus: async (invoiceId, status, external_number) => {
        try {
          await dispatch(
            updateInvoiceStatus({ invoiceId, status, external_number }),
          ).unwrap();
        } catch (err) {
          console.error("Failed to update invoice status:", err);
          throw err;
        }
      },

      onCancelInvoice: async (invoiceId) => {
        try {
          await dispatch(cancelInvoice(invoiceId)).unwrap();
        } catch (err) {
          console.error("Failed to cancel invoice:", err);
          throw err;
        }
      },
    }),
    [dispatch, selectedInvoiceId],
  );

  // ============================================
  // FILTER DROPDOWNS CONFIG
  // ============================================
  const filterDropdowns = useMemo(
    () => [
      {
        label: "Entity",
        placeholder: "Search client",
        filterKey: "entity_id",
        options: entityOptions.map((e) => ({
          value: e?.id,
          label: e?.name || "Unknown",
          subtitle: e?.email || "",
        })),
        onSearchChange: handleEntitySearch,
        isSearching: isSearchingEntities,
        enableLocalSearch: false,
        emptyStateMessage: "No entities found. Try a different search.",
      },
      {
        label: "Company",
        placeholder: "Select Company",
        filterKey: "company_profile_id",
        options: companyProfileOptions,
        enableLocalSearch: true,
        isLoading: companyProfilesLoading,
        emptyStateMessage: "No company profiles found.",
      },
    ],
    [
      entityOptions,
      handleEntitySearch,
      isSearchingEntities,
      companyProfileOptions,
      companyProfilesLoading,
    ],
  );

  // Get confirmation config
  const confirmationConfig = getConfirmationConfig();

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className={styles.pageContainer}>
      <InvoiceTable
        // Data props
        invoices={currentPageInvoices}
        totalCount={listData.totalItems}
        currentPage={listData.currentPage}
        itemsPerPage={parseInt(filters.page_size)}
        filterDropdowns={filterDropdowns}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchApply={handleSearchApply}
        onSearchClear={handleSearchClear}
        // Tab state
        activeTab={activeTab}
        onTabChange={handleTabChange}
        // Selection state
        selectedInvoices={selectedInvoiceIds}
        allSelected={isCurrentPageSelected}
        onSelectionChange={handleSelectionChange}
        onSelectAll={handleSelectAll}
        onRemoveSelection={handleRemoveSelection}
        // Filter state
        filters={filters}
        tempDateRange={tempDateRange}
        onTempDateRangeChange={setTempDateRange}
        onFilterChange={handleFilterChange}
        onApplyDateFilter={handleApplyDateFilter}
        onClearDateFilter={handleClearDateFilter}
        onClearAllFilters={handleClearAllFilters}
        hasActiveFilters={hasActiveFilters}
        // Sorting state
        sortBy={filters.sort_by}
        sortOrder={filters.sort_order}
        onSort={handleSort}
        // Bulk actions
        onMarkIssued={handleMarkIssued}
        onMarkPaid={handleMarkPaid}
        onMarkDraft={handleMarkDraft}
        // Loading states - Separated for each action
        isMarkingIssued={loading.bulkUpdateStatus?.action === "MARK_ISSUED"}
        isMarkingPaid={loading.bulkUpdateStatus?.action === "MARK_PAID"}
        isMarkingDraft={loading.bulkUpdateStatus?.action === "MARK_DRAFT"}
        isLoading={isTableLoading}
        isLoadingNext={loading.listNext}
        isLoadingPrev={loading.listPrev}
        // Pagination
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        // Row click
        onRowClick={handleRowClick}
      />

      {/* Invoice Details Drawer */}
      <InvoiceDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        invoiceId={selectedInvoiceId}
        companyProfiles={companyProfiles}
        companyProfilesLoading={companyProfilesLoading}
        handlers={drawerHandlers}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationState.isOpen}
        onClose={closeConfirmation}
        actionName={confirmationConfig.actionName}
        actionInfo={confirmationConfig.actionInfo}
        confirmText={confirmationConfig.confirmText}
        cancelText={confirmationConfig.cancelText || "Cancel"}
        variant={confirmationConfig.variant}
        onConfirm={executeBulkAction}
        onCancel={closeConfirmation}
      />
    </div>
  );
};

export default InvoicesPage;
