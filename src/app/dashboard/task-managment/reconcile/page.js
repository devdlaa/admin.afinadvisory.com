"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";

import ReconcileActionBar from "./components/ReconcileActionBar/ReconcileActionBar.jsx";
import BillingTable from "./newComponents/BillingTable/BillingTable";
import CreateInvoiceDialog from "./components/CreateInvoiceDialog/CreateInvoiceDialog.jsx";
import CreateAdHocChargeDialog from "./components/CreateAdHocChargeDialog/CreateAdHocChargeDialog.jsx";
import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog.js";

import {
  createNonBillableConfig,
  createUnReconciledConfig,
} from "./newComponents/Billingtableconfig";
import {
  fetchUnreconciledTasks,
  fetchNonBillableTasks,
  markTasksNonBillable,
  restoreTasksBillable,
  deleteAdHocCharge,
  setActiveTab,
  clearSelections,
  resetTabData,
  clearError,
  selectActiveTab,
  selectUnreconciledData,
  selectNonBillableData,
  selectSelectedTaskIds,
  selectLoading,
  selectError,
  selectCurrentPageItems,
  selectMarkNonBillableLoading,
  selectRestoreBillableLoading,
  selectAddAdHocChargeLoading,
  selectDeleteAdHocChargeLoading,
  selectSelectedTasks,
  toggleTaskSelection,
} from "@/store/slices/reconcileSlice";

import {
  addChargeToTask,
  deleteTaskCharge,
  bulkUpdateTaskCharges,
  bulkUpdateChargeStatus,
} from "@/store/slices/chargesSlice";

import {
  quickSearchEntities,
  fetchEntityById,
} from "@/store/slices/entitySlice";

import {
  fetchCategories,
  selectAllCategories,
  selectIsLoading as selectCategoryLoading,
  selectCachedCategoriesCount,
} from "@/store/slices/taskCategorySlice";

import styles from "./ReconcilePage.module.scss";

const TABS = {
  UNRECONCILED: "unreconciled",
  NON_BILLABLE: "nonBillable",
};

const TASK_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "PENDING_CLIENT_INPUT", label: "Pending Client Input" },
];

const URL_FILTER_KEYS = [
  "entity_id",
  "task_category_id",
  "task_status",
  "from_date",
  "to_date",
  "page",
  "page_size",
  "order",
];

const DEFAULT_FILTERS = {
  entity_id: null,
  task_category_id: null,
  task_status: null,
  from_date: null,
  to_date: null,
  order: "desc",
  page_size: "50",
};

/**
 * Updates URL without triggering navigation/re-render
 */
const updateURLSilently = (params) => {
  const url = new URL(window.location);
  url.search = params.toString();
  window.history.replaceState({}, "", url);
};

/**
 * Parses URL params into filters and page number
 */
const parseURLParams = (searchParams) => {
  const filters = { ...DEFAULT_FILTERS };
  let page = 1;
  let tab = TABS.UNRECONCILED;

  // Parse tab
  const tabParam = searchParams.get("tab");
  if (tabParam && Object.values(TABS).includes(tabParam)) {
    tab = tabParam;
  }

  // Parse page
  const pageParam = searchParams.get("page");
  if (pageParam) {
    const parsed = Number(pageParam);
    if (!Number.isNaN(parsed) && parsed > 0) {
      page = parsed;
    }
  }

  // Parse filters
  URL_FILTER_KEYS.forEach((key) => {
    if (key === "page") return; // Already handled
    const value = searchParams.get(key);
    if (value) {
      filters[key] = value;
    }
  });

  return { filters, page, tab };
};

export default function ReconcilePage() {
  const searchParams = useSearchParams();
  const dispatch = useDispatch();

  // ============================================================================
  // REDUX SELECTORS
  // ============================================================================
  const activeTab = useSelector(selectActiveTab);
  const unreconciledData = useSelector(selectUnreconciledData);
  const nonBillableData = useSelector(selectNonBillableData);
  const selectedTasks = useSelector(selectSelectedTasks);
  const selectedTaskIds = selectedTasks.map((t) => t.id);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  const currentPageItems = useSelector(selectCurrentPageItems);
  const categories = useSelector(selectAllCategories);
  const categoriesLoading = useSelector((state) =>
    selectCategoryLoading(state, "list"),
  );
  const cachedCategoriesCount = useSelector(selectCachedCategoriesCount);
  const isMarkNonBillableLoading = useSelector(selectMarkNonBillableLoading);
  const isRestoreBillableLoading = useSelector(selectRestoreBillableLoading);
  const isAddAdHocChargeLoading = useSelector(selectAddAdHocChargeLoading);
  const isDeleteAdHocChargeLoading = useSelector(
    selectDeleteAdHocChargeLoading,
  );

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());
  const [entitySearchResults, setEntitySearchResults] = useState([]);
  const [isSearchingEntities, setIsSearchingEntities] = useState(false);

  // Dialog states
  const [showCreateInvoiceDialog, setShowCreateInvoiceDialog] = useState(false);
  const [showAdHocChargeDialog, setShowAdHocChargeDialog] = useState(false);
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    type: null,
    data: null,
  });

  // Refs to prevent initial duplicate fetch
  const isInitialized = useRef(false);
  const lastFetchParams = useRef(null);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
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

  const currentData =
    activeTab === TABS.UNRECONCILED ? unreconciledData : nonBillableData;

  const isLoading =
    activeTab === TABS.UNRECONCILED
      ? loading?.unreconciled?.fetch
      : loading?.nonBillable?.fetch;

  const isPaginationLoading =
    activeTab === TABS.UNRECONCILED
      ? loading?.unreconciled?.fetchNext || loading?.unreconciled?.fetchPrev
      : loading?.nonBillable?.fetchNext || loading?.nonBillable?.fetchPrev;

  // ============================================================================
  // URL SYNC HELPER
  // ============================================================================
  const syncURL = useCallback((tab, filters, page) => {
    const params = new URLSearchParams(window.location.search);

    params.set("tab", tab);

    params.set("page", String(page));

    URL_FILTER_KEYS.forEach((key) => {
      if (key === "page") return;

      const value = filters[key];
      if (value !== null && value !== "" && value !== undefined) {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    });

    updateURLSilently(params);
  }, []);

  // ============================================================================
  // INITIALIZATION - Parse URL once on mount
  // ============================================================================
  useEffect(() => {
    const {
      filters: urlFilters,
      page: urlPage,
      tab: urlTab,
    } = parseURLParams(searchParams);

    setFilters(urlFilters);
    setCurrentPage(urlPage);
    dispatch(setActiveTab(urlTab));

    // If entity_id exists in URL, fetch that entity to populate the dropdown
    if (urlFilters.entity_id) {
      fetchEntityForDeepLink(urlFilters.entity_id);
    }

    isInitialized.current = true;
  }, []); // Run only once on mount

  // ============================================================================
  // FETCH ENTITY BY ID (for deep links)
  // ============================================================================
  const fetchEntityForDeepLink = useCallback(
    async (entityId) => {
      if (!entityId) return;

      try {
        // Fetch the specific entity by ID
        const result = await dispatch(fetchEntityById(entityId)).unwrap();

        // Add it to the search results so it appears in the dropdown
        if (result) {
          setEntitySearchResults([result]);
        }
      } catch (err) {
        console.error("Failed to fetch entity for deep link:", err);
        // Silently fail - the filter will still work, just won't show the name
      }
    },
    [dispatch],
  );

  // ============================================================================
  // LOAD CATEGORIES
  // ============================================================================
  useEffect(() => {
    if (cachedCategoriesCount === 0) {
      dispatch(fetchCategories({ page: 1, page_size: 100 }));
    }
  }, [dispatch, cachedCategoriesCount]);

  // ============================================================================
  // DATA LOADING - Single source of truth
  // ============================================================================
  const loadData = useCallback(
    (page, isNext = false, isPrev = false) => {
      // Create fetch signature to prevent duplicate calls
      const fetchSignature = JSON.stringify({
        tab: activeTab,
        filters,
        page,
      });

      // Skip if same as last fetch
      if (lastFetchParams.current === fetchSignature) {
        return;
      }

      lastFetchParams.current = fetchSignature;

      const fetchParams = {
        filters: { ...filters, page_size: filters.page_size || "50" },
        page,
        isNext,
        isPrev,
      };

      if (activeTab === TABS.UNRECONCILED) {
        dispatch(fetchUnreconciledTasks(fetchParams));
      } else {
        dispatch(fetchNonBillableTasks(fetchParams));
      }
    },
    [activeTab, filters, dispatch],
  );

  // ============================================================================
  // EFFECT: Fetch data when tab, filters, or page changes
  // ============================================================================
  useEffect(() => {
    if (!isInitialized.current) return;

    loadData(currentPage, false, false);
    syncURL(activeTab, filters, currentPage);
  }, [activeTab, filters, currentPage, loadData, syncURL]);

  // ============================================================================
  // TAB HANDLERS
  // ============================================================================
  const handleTabChange = (tab) => {
    dispatch(setActiveTab(tab));
    dispatch(clearSelections());
    setCurrentPage(1); // Reset to page 1 when changing tabs
  };

  // ============================================================================
  // FILTER HANDLERS
  // ============================================================================
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1); // Reset to page 1 when filters change
    dispatch(resetTabData(activeTab));
  };

  const handleClearAllFilters = () => {
    // Reset state
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
    dispatch(resetTabData(activeTab));
    setEntitySearchResults([]);

    const params = new URLSearchParams();

    params.set("tab", activeTab);
    params.set("page", "1");
    params.set("page_size", DEFAULT_FILTERS.page_size);
    params.set("order", DEFAULT_FILTERS.order);

    updateURLSilently(params);
  };

  const handleEntitySearch = useCallback(
    async (query) => {
      if (!query || !query.trim()) {
        setEntitySearchResults([]);
        return;
      }

      setIsSearchingEntities(true);
      try {
        const result = await dispatch(
          quickSearchEntities({ search: query, limit: 20, forceRefresh: true }),
        ).unwrap();

        const safeData = Array.isArray(result?.data)
          ? result.data.filter((e) => e && e.id && e.name)
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

  // ============================================================================
  // PAGINATION HANDLERS
  // ============================================================================
  const handleRefresh = () => {
    if (
      isMarkNonBillableLoading ||
      isRestoreBillableLoading ||
      isAddAdHocChargeLoading ||
      isDeleteAdHocChargeLoading
    ) {
      return;
    }

    // Clear last fetch signature to force refresh
    lastFetchParams.current = null;
    loadData(currentPage);
    dispatch(clearSelections());
  };

  const handlePageChange = (page) => {
    const isNext = page > currentPage;
    const isPrev = page < currentPage;

    setCurrentPage(page);
    loadData(page, isNext, isPrev);
  };

  // ============================================================================
  // EXPAND/COLLAPSE HANDLERS
  // ============================================================================
  const handleToggleExpand = (taskId) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedTaskIds(
      expandedTaskIds.size
        ? new Set()
        : new Set(currentPageItems.map((i) => i.task.id)),
    );
  };

  // ============================================================================
  // CONFIRMATION DIALOG HANDLERS
  // ============================================================================
  const closeConfirmation = () => {
    setConfirmationState({
      isOpen: false,
      type: null,
      data: null,
    });
  };

  const handleMarkAsNonBillable = (selectedIds, context) => {
    if (isMarkNonBillableLoading) return;
    if (!selectedIds || selectedIds.length === 0) {
      console.error("No tasks selected");
      return;
    }

    setConfirmationState({
      isOpen: true,
      type: "markNonBillable",
      data: {
        taskIds: selectedIds.map((t) => t.id),
        context,
      },
    });
  };

  const handleRestoreBillable = (selectedIds, context) => {
    if (isRestoreBillableLoading) return;
    if (!selectedIds || selectedIds.length === 0) {
      console.error("No tasks selected");
      return;
    }

    setConfirmationState({
      isOpen: true,
      type: "restoreBillable",
      data: {
        taskIds: selectedIds.map((t) => t.id),
        context,
      },
    });
  };

  const handleDeleteSystemTask = (taskId) => {
    const item = currentPageItems.find((i) => i?.task?.id === taskId);
    if (!item || !item.charges || item.charges.length === 0) {
      console.error("Unable to find charge for this task");
      return;
    }

    const chargeId = item.charges[0]?.id;
    if (!chargeId) {
      console.error("Unable to find charge ID");
      return;
    }

    setConfirmationState({
      isOpen: true,
      type: "deleteAdHoc",
      data: { chargeId },
    });
  };

  const handleDeleteCharge = (taskId, chargeId) => {
    if (!taskId || !chargeId) {
      console.error("Invalid task or charge ID");
      return;
    }

    setConfirmationState({
      isOpen: true,
      type: "deleteCharge",
      data: { taskId, chargeId },
    });
  };

  const executeConfirmation = async () => {
    const { type, data } = confirmationState;

    try {
      if (type === "markNonBillable") {
        await dispatch(markTasksNonBillable(data.taskIds)).unwrap();
        data.context?.clearSelection?.();
      } else if (type === "restoreBillable") {
        await dispatch(restoreTasksBillable(data.taskIds)).unwrap();
        data.context?.clearSelection?.();
      } else if (type === "deleteAdHoc") {
        await dispatch(deleteAdHocCharge(data.chargeId)).unwrap();
      } else if (type === "deleteCharge") {
        await dispatch(
          deleteTaskCharge({
            taskId: data.taskId,
            chargeId: data.chargeId,
          }),
        ).unwrap();
      }

      closeConfirmation();
    } catch (err) {
      console.error(`Failed to ${type}:`, err);
      closeConfirmation();
    }
  };

  // ============================================================================
  // CHARGE HANDLERS
  // ============================================================================
  const chargeHandlers = {
    onAddCharge: async (taskId, chargeData) => {
      if (!taskId || !chargeData) {
        console.error("Invalid task or charge data");
        return;
      }

      try {
        await dispatch(addChargeToTask({ taskId, chargeData })).unwrap();
      } catch (err) {
        console.error("Failed to add charge:", err);
      }
    },

    onUpdateCharges: async (taskId, updates) => {
      if (!taskId || !updates) {
        console.error("Invalid task or updates data");
        return;
      }

      try {
        await dispatch(bulkUpdateTaskCharges({ taskId, updates })).unwrap();
      } catch (err) {
        console.error("Failed to update charges:", err);
      }
    },

    onDeleteCharge: async (taskId, chargeId) => {
      handleDeleteCharge(taskId, chargeId);
    },

    onUpdateChargeStatus: async (taskId, chargeIds, status) => {
      if (!taskId || !chargeIds || !status) {
        console.error("Invalid parameters");
        return;
      }

      try {
        await dispatch(
          bulkUpdateChargeStatus({ taskId, chargeIds, status }),
        ).unwrap();
      } catch (err) {
        console.error("Failed to update charge status:", err);
      }
    },

    onDeleteSystemTask: handleDeleteSystemTask,

    onUnlinkSystemTask: async (taskId) => {
      console.log("Unlink system task:", taskId);
    },
  };

  // ============================================================================
  // CONFIG SETUP
  // ============================================================================
  const tableConfig = useMemo(() => {
    const baseHandlers = {
      ...chargeHandlers,
      onToggleExpandAll: handleExpandAll,
      onMarkAsBillable: handleRestoreBillable,
      onMarkAsNonBillable: handleMarkAsNonBillable,

      onCreateInvoice: () => {
        if (!selectedTasks.length) return;

        if (!filters.entity_id) {
          setConfirmationState({
            isOpen: true,
            type: "createInvoiceEntityRequired",
            data: {},
          });
          return;
        }

        const entityId = selectedTasks[0].entity.id;
        const mismatch = selectedTasks.some((t) => t.entity.id !== entityId);

        if (mismatch) {
          setConfirmationState({
            isOpen: true,
            type: "createInvoiceEntityMismatch",
            data: {},
          });
          return;
        }

        const invalidStatus = selectedTasks.some((task) => {
          const isAdhoc = task.task_type === "SYSTEM_ADHOC" && task.is_system;
          return !isAdhoc && task.status !== "COMPLETED";
        });

        if (invalidStatus) {
          setConfirmationState({
            isOpen: true,
            type: "createInvoiceInvalidStatus",
            data: {},
          });
          return;
        }

        setShowCreateInvoiceDialog(true);
      },

      onAddAdHocCharge: () => {
        if (isAddAdHocChargeLoading) return;
        setShowAdHocChargeDialog(true);
      },

      isMarkNonBillableLoading,
      isRestoreBillableLoading,
      isAddAdHocChargeLoading,
    };

    if (activeTab === TABS.NON_BILLABLE) {
      return createNonBillableConfig(baseHandlers);
    } else {
      return createUnReconciledConfig(baseHandlers);
    }
  }, [activeTab, chargeHandlers, selectedTasks, filters.entity_id]);

  // ============================================================================
  // FILTER DROPDOWNS CONFIG
  // ============================================================================
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
        label: "Category",
        placeholder: "Category",
        filterKey: "task_category_id",
        options: categories.map((cat) => ({
          value: cat?.id,
          label: cat?.name || "Unknown",
          tag: cat?._count?.tasks || null,
        })),
        enableLocalSearch: true,
        isLoading: categoriesLoading,
        emptyStateMessage: "No categories found",
      },
      {
        label: "Status",
        placeholder: "Task status",
        filterKey: "task_status",
        options: TASK_STATUSES,
        enableLocalSearch: true,
      },
    ],
    [
      entityOptions,
      handleEntitySearch,
      isSearchingEntities,
      categories,
      categoriesLoading,
    ],
  );

  // ============================================================================
  // CONFIRMATION DIALOG CONFIG
  // ============================================================================
  const getConfirmationConfig = () => {
    const { type, data } = confirmationState;

    switch (type) {
      case "markNonBillable":
        return {
          actionName: "Mark as Non-Billable",
          actionInfo: `Are you sure you want to mark ${data?.taskIds?.length || 0} task${data?.taskIds?.length !== 1 ? "s" : ""} as non-billable? This action can be reversed later.`,
          confirmText: "Mark as Non-Billable",
          variant: "warning",
        };
      case "restoreBillable":
        return {
          actionName: "Restore to Billable",
          actionInfo: `Are you sure you want to restore ${data?.taskIds?.length || 0} task${data?.taskIds?.length !== 1 ? "s" : ""} to billable status?`,
          confirmText: "Restore to Billable",
          variant: "default",
        };
      case "deleteAdHoc":
        return {
          actionName: "Delete Ad-hoc Charge",
          actionInfo:
            "This will permanently delete the ad-hoc task and its charge. This action cannot be undone.",
          confirmText: "Delete Permanently",
          variant: "danger",
        };
      case "deleteCharge":
        return {
          actionName: "Delete Charge",
          actionInfo:
            "Are you sure you want to delete this charge? This action cannot be undone.",
          confirmText: "Delete Charge",
          variant: "danger",
        };
      case "createInvoiceEntityRequired":
        return {
          actionName: "Select a Client",
          actionInfo:
            "Invoices can be created for one client at a time. Please select a client using the Entity filter before creating an invoice.",
          confirmText: "OK",
          variant: "default",
          hideCancel: true,
        };
      case "createInvoiceEntityMismatch":
        return {
          actionName: "Multiple Clients Selected",
          actionInfo:
            "Some selected tasks belong to a different client. Please filter by a single client and then select tasks again.",
          confirmText: "OK",
          variant: "warning",
          hideCancel: true,
        };
      case "createInvoiceInvalidStatus":
        return {
          actionName: "Incomplete Tasks Selected",
          actionInfo:
            "Only completed tasks can be invoiced. Please complete or deselect pending tasks before creating an invoice.",
          confirmText: "OK",
          variant: "warning",
          hideCancel: true,
        };
      default:
        return {
          actionName: "Confirm Action",
          actionInfo: "Are you sure you want to proceed?",
          confirmText: "Confirm",
          variant: "default",
        };
    }
  };

  const confirmationConfig = getConfirmationConfig();

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Action Bar */}
        <div className={styles.stickyHeader}>
          <ReconcileActionBar
            filterDropdowns={filterDropdowns}
            activeFilters={filters}
            onFilterChange={handleFilterChange}
            onClearAllFilters={handleClearAllFilters}
            onRefresh={handleRefresh}
            totalCount={currentData?.totalItems || 0}
            currentPage={currentPage}
            totalPages={currentData?.totalPages || 1}
            onPageChange={handlePageChange}
            isPaginationLoading={isPaginationLoading}
            isLoading={isLoading}
            selectedCount={selectedTasks.length}
          />

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === TABS.NON_BILLABLE ? styles.active : ""}`}
              onClick={() => handleTabChange(TABS.NON_BILLABLE)}
            >
              Non-Billable
              {nonBillableData?.totalItems > 0 && (
                <span className={styles.tabCount}>
                  {nonBillableData.totalItems}
                </span>
              )}
            </button>
            <button
              className={`${styles.tab} ${activeTab === TABS.UNRECONCILED ? styles.active : ""}`}
              onClick={() => handleTabChange(TABS.UNRECONCILED)}
            >
              Unreconciled
              {unreconciledData?.totalItems > 0 && (
                <span className={styles.tabCount}>
                  {unreconciledData.totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Billing Table */}
        <div className={styles.tableContainer}>
          {isLoading && currentPageItems.length === 0 ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Loading tasks...</p>
            </div>
          ) : (
            <BillingTable
              config={tableConfig}
              data={currentPageItems}
              selectedTaskIds={selectedTaskIds}
              expandedTaskIds={expandedTaskIds}
              onToggleTask={(task) => dispatch(toggleTaskSelection(task))}
              onToggleExpand={handleToggleExpand}
              onExpandAll={handleExpandAll}
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      {showCreateInvoiceDialog && (
        <CreateInvoiceDialog
          selectedTasks={selectedTasks}
          entityId={filters.entity_id}
          onClose={() => {
            setShowCreateInvoiceDialog(false);
            dispatch(clearSelections());
          }}
        />
      )}

      {showAdHocChargeDialog && (
        <CreateAdHocChargeDialog
          entityId={filters.entity_id}
          onClose={() => setShowAdHocChargeDialog(false)}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationState.isOpen}
        onClose={closeConfirmation}
        actionName={confirmationConfig.actionName}
        actionInfo={confirmationConfig.actionInfo}
        confirmText={confirmationConfig.confirmText}
        cancelText={confirmationConfig.hideCancel ? undefined : "Cancel"}
        variant={confirmationConfig.variant}
        onConfirm={
          confirmationConfig.hideCancel
            ? closeConfirmation
            : executeConfirmation
        }
        onCancel={closeConfirmation}
      />
    </div>
  );
}
