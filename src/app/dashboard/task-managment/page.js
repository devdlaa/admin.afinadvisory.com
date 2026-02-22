"use client";
import { Building2, Tag, Users } from "lucide-react";
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  useRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";

import ForceNotification from "./components/ForceNotification/ForceNotification.jsx";
import TaskTable from "./components/TasksTable/TasksTable.jsx";
import TaskActionBar from "./components/TaskActionBar/TaskActionBar.jsx";
import TaskManageDrawer from "./components/TaskManageDrawer/TaskManageDrawer.jsx";

import SLAAttentionDialog, {
  readSuppress,
  readCache,
} from "./components/SLAAttentionDialog/SLAAttentionDialog.jsx";

import TaskCategoryBoard from "@/app/components/pages/TaskCategoryBoard/TaskCategoryBoard.jsx";
import TaskWorkload from "./components/TaskWorkload/TaskWorkload.jsx";
import TaskStatusBoard from "./components/TaskStatusBoard/TaskStatusBoard.jsx";
import TaskCreateDialog from "./components/TaskCreateDialog/Taskcreatedialog.jsx";

import {
  openCreateDialog,
  openManageDialog,
  fetchTasks,
  setFilters,
  setPage,
  selectFilters,
  selectTasks,
  selectPagination,
  selectStatusCounts,
  selectIsLoading,
  selectManageDialogTaskId,
  selectUnassignedTasksCount,
  selectUnassignedTasksCountLoading,
  selectSLASummary,
  fetchUnassignedTasksCount,
  fetchSLASummary,
} from "@/store/slices/taskSlice";

import { quickSearchEntities } from "@/store/slices/entitySlice";

import {
  fetchCategories,
  selectAllCategories,
  selectIsLoading as selectCategoryLoading,
} from "@/store/slices/taskCategorySlice";

import { fetchUsers } from "@/store/slices/userSlice";

import style from "./page.module.scss";

const SLA_FILTER_KEYS = [
  "sla_status",
  "sla_due_date_from",
  "sla_due_date_to",
  "sla_paused_before",
];

const STANDARD_FILTER_KEYS = [
  "entity_id",
  "task_category_id",
  "assigned_to",
  "status",
  "priority",
  "search",
  "is_billable",
  "created_date_from",
  "created_date_to",
  "entity_missing",
  "due_date_from",
  "due_date_to",
  "is_magic_sort",
  ...SLA_FILTER_KEYS,
];

// Keys whose Redux default should NOT be nulled-out when absent from URL.
// is_magic_sort: we want Focus Assist ON on first visit (slice default = null,
// but the UI treats null as "on"). If the user explicitly turns it off, the
// URL will carry the value, so this branch only fires on a clean first load.
const URL_ABSENT_PRESERVE_KEYS = new Set(["is_magic_sort"]);

function TasksPageContent() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Selectors ──────────────────────────────────────────────────────────────
  const currentFilters = useSelector(selectFilters);
  const categories = useSelector(selectAllCategories);
  const categoriesLoading = useSelector((state) =>
    selectCategoryLoading(state, "list"),
  );
  const users = useSelector((state) => state.user?.users || []);
  const usersLoading = useSelector((state) => state.user?.loading || false);
  const tasks = useSelector(selectTasks);
  const { currentPage, totalPages } = useSelector(selectPagination);
  const totalCount = useSelector((state) => state.task?.totalTasks || 0);
  const statusCounts = useSelector(selectStatusCounts);
  const tasksLoading = useSelector(selectIsLoading({ type: "list" }));
  const currentTaskId = useSelector(selectManageDialogTaskId);
  const unassignedCount = useSelector(selectUnassignedTasksCount);
  const unassignedCountLoading = useSelector(selectUnassignedTasksCountLoading);
  const slaSummary = useSelector(selectSLASummary);

  const globalCounts = statusCounts?.global || {};
  const actualTotal =
    Object.values(globalCounts).reduce((sum, count) => sum + count, 0) ||
    totalCount ||
    0;
  const filteredCount = tasks?.length || 0;

  // ── Local state ────────────────────────────────────────────────────────────
  const [entitySearchResults, setEntitySearchResults] = useState([]);
  const [isSearchingEntities, setIsSearchingEntities] = useState(false);
  const [showWorkload, setShowWorkload] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSLADialog, setShowSLADialog] = useState(false);

  const hasLoadedCategories = useRef(false);
  const hasLoadedUsers = useRef(false);
  const isUpdatingFromUrl = useRef(false);

  const deepLinkTaskId = searchParams.get("taskId");

  // ── Derived ────────────────────────────────────────────────────────────────
  const hasSLACritical = useMemo(() => {
    if (!slaSummary?.critical) return false;
    return Object.values(slaSummary.critical).some((i) => i.count > 0);
  }, [slaSummary]);

  // ── SLA init on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    if (readSuppress()) return;

    const cached = readCache();
    if (cached) {
      dispatch({ type: "task/fetchSLASummary/fulfilled", payload: cached });
      setShowSLADialog(true);
      return;
    }

    dispatch(fetchSLASummary()).then(() => {
      setShowSLADialog(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── URL → Redux filter sync ────────────────────────────────────────────────
  // Rules:
  //   • Most filter keys: if absent from URL → null out in Redux
  //   • Keys in URL_ABSENT_PRESERVE_KEYS: if absent from URL → leave Redux
  //     default intact (e.g. is_magic_sort stays ON on first visit)
  useEffect(() => {
    const urlFilters = {};
    const urlPage = searchParams.get("page");

    let hasChanges = false;

    STANDARD_FILTER_KEYS.forEach((key) => {
      const value = searchParams.get(key);

      if (value !== null) {
        // Key is present in URL — parse and apply it
        let parsed;
        if (key === "is_billable" || key === "entity_missing") {
          parsed = value === "true";
        } else if (key === "is_magic_sort") {
          parsed = value === "true";
        } else {
          parsed = value;
        }
        urlFilters[key] = parsed;
        if (currentFilters[key] !== parsed) hasChanges = true;
      } else {
        // Key is absent from URL
        if (URL_ABSENT_PRESERVE_KEYS.has(key)) {
          // Don't null it out — preserve the slice default.
          return;
        }
        if (currentFilters[key] !== null) {
          urlFilters[key] = null;
          hasChanges = true;
        }
      }
    });

    const parsedPage = urlPage ? parseInt(urlPage) : 1;
    if (currentPage !== parsedPage) hasChanges = true;

    if (hasChanges || !isInitialized) {
      isUpdatingFromUrl.current = true;
      dispatch(setFilters(urlFilters));
      // setFilters already resets currentPage to 1 in the slice,
      // so only dispatch setPage when the URL specifically asks for another page.
      if (parsedPage !== 1) dispatch(setPage(parsedPage));
      dispatch(fetchTasks());
      setTimeout(() => {
        isUpdatingFromUrl.current = false;
      }, 0);
    }

    if (!isInitialized) setIsInitialized(true);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch unassigned count on mount ───────────────────────────────────────
  useEffect(() => {
    dispatch(fetchUnassignedTasksCount());
  }, [dispatch]);

  // ── Redux → URL sync ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isInitialized || isUpdatingFromUrl.current) return;

    const params = new URLSearchParams(window.location.search);

    STANDARD_FILTER_KEYS.forEach((key) => {
      const value = currentFilters[key];
      if (value !== null && value !== "" && value !== undefined) {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });

    if (currentPage > 1) params.set("page", currentPage.toString());
    else params.delete("page");

    if (currentTaskId) params.set("taskId", currentTaskId);
    else {
      params.delete("taskId");
      params.delete("tab");
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    if (newUrl !== window.location.pathname + window.location.search) {
      router.replace(newUrl, { scroll: false });
    }
  }, [currentFilters, currentPage, currentTaskId, router, isInitialized]);

  // ── Deep link task open ────────────────────────────────────────────────────
  useEffect(() => {
    if (window.__closingTaskDrawer) {
      window.__closingTaskDrawer = false;
      return;
    }
    if (!deepLinkTaskId || currentTaskId === deepLinkTaskId) return;
    dispatch(openManageDialog(deepLinkTaskId));
  }, [deepLinkTaskId, currentTaskId, dispatch]);

  // ── Entity search ──────────────────────────────────────────────────────────
  const handleEntitySearch = useCallback(
    async (query) => {
      if (!query?.trim()) {
        setEntitySearchResults([]);
        return;
      }
      setIsSearchingEntities(true);
      try {
        const result = await dispatch(
          quickSearchEntities({ search: query, limit: 20 }),
        ).unwrap();
        const safeData = Array.isArray(result?.data)
          ? result.data.filter((e) => e && e.id && e.name)
          : [];
        setEntitySearchResults(safeData);
      } catch {
        setEntitySearchResults([]);
      } finally {
        setIsSearchingEntities(false);
      }
    },
    [dispatch],
  );

  const selectedEntity = useSelector((state) => {
    const entityId = currentFilters.entity_id;
    if (!entityId) return null;
    return state.entity?.entities?.[entityId] || null;
  });

  const entityOptions = useMemo(() => {
    return selectedEntity
      ? [
          selectedEntity,
          ...entitySearchResults.filter((e) => e.id !== selectedEntity.id),
        ]
      : entitySearchResults;
  }, [selectedEntity, entitySearchResults]);

  // ── Lazy loaders ───────────────────────────────────────────────────────────
  const handleLoadCategories = useCallback(() => {
    if (hasLoadedCategories.current) return;
    hasLoadedCategories.current = true;
    dispatch(fetchCategories({ page: 1, page_size: 100 }));
  }, [dispatch]);

  const handleLoadUsers = useCallback(() => {
    if (hasLoadedUsers.current) return;
    hasLoadedUsers.current = true;
    dispatch(fetchUsers({ page: 1, limit: 100 }));
  }, [dispatch]);

  // ── Filter dropdowns config ────────────────────────────────────────────────
  const filterDropdowns = useMemo(
    () => [
      {
        filterKey: "entity_id",
        label: "Client",
        placeholder: "Select Client",
        icon: Building2,
        options: entityOptions.map((entity) => ({
          value: entity.id,
          label: entity.name,
          subtitle: entity.pan || entity.email || "",
        })),
        onSearchChange: handleEntitySearch,
        enableLocalSearch: false,
        emptyStateMessage: "No clients found",
        hintMessage: "Start typing to search clients...",
        isSearching: isSearchingEntities,
      },
      {
        filterKey: "task_category_id",
        label: "Category",
        placeholder: "Select Category",
        icon: Tag,
        options: categories.map((cat) => ({
          value: cat.id,
          label: cat.name,
          tag: cat?._count?.tasks || null,
        })),
        enableLocalSearch: true,
        onAddNew: () => setShowCategoryDialog(true),
        addNewLabel: "New Category",
        isLoading: categoriesLoading,
        lazyLoad: true,
        onLazyLoad: handleLoadCategories,
      },
      {
        filterKey: "assigned_to",
        label: "Users",
        placeholder: "Select User",
        icon: Users,
        options: users.map((user) => ({
          value: user.id,
          label: user.name,
          subtitle: user.email,
          tag: user.status || null,
        })),
        enableLocalSearch: true,
        isLoading: usersLoading,
        lazyLoad: true,
        onLazyLoad: handleLoadUsers,
      },
      {
        filterKey: "entity_missing",
        label: "Client",
        placeholder: "Client Linked",
        icon: Building2,
        options: [
          { value: false, label: "With Client" },
          { value: true, label: "Without Client" },
        ],
      },
    ],
    [
      entityOptions,
      categories,
      users,
      handleEntitySearch,
      isSearchingEntities,
      categoriesLoading,
      usersLoading,
      handleLoadCategories,
      handleLoadUsers,
    ],
  );

  // ── Filter handlers ────────────────────────────────────────────────────────
  // Note: setFilters in the slice already resets currentPage to 1,
  // so we never need to dispatch setPage(1) here separately.

  const handleFilterChange = useCallback(
    (filterKey, value) => {
      dispatch(setFilters({ [filterKey]: value }));
      dispatch(fetchTasks(true));
    },
    [dispatch],
  );

  const handleClearAllFilters = useCallback(() => {
    dispatch(
      setFilters({
        entity_id: null,
        task_category_id: null,
        unassigned_only: null,
        assigned_to: null,
        is_magic_sort: null,
        entity_missing: null,
        priority: null,
        search: null,
        is_billable: null,
        due_date_from: null,
        due_date_to: null,
        created_date_from: null,
        created_date_to: null,
        // ✅ FIX: clear all SLA filters too
        sla_status: null,
        sla_due_date_from: null,
        sla_due_date_to: null,
        sla_paused_before: null,
      }),
    );
    dispatch(fetchTasks(true));
  }, [dispatch]);

  const handleToggleUnassigned = useCallback(() => {
    const isActive = currentFilters.unassigned_only === true;
    dispatch(setFilters({ unassigned_only: isActive ? null : true }));
    dispatch(fetchTasks(true));
  }, [dispatch, currentFilters.unassigned_only]);

  const handleToggleMagicSort = useCallback(() => {
    const isActive = currentFilters.is_magic_sort === true;
    dispatch(setFilters({ is_magic_sort: isActive ? null : true }));
    dispatch(fetchTasks(true));
  }, [dispatch, currentFilters.is_magic_sort]);

  // ── Other handlers ─────────────────────────────────────────────────────────
  const handleCreateTask = useCallback(
    () => dispatch(openCreateDialog()),
    [dispatch],
  );

  const handleToggleWorkload = useCallback(
    () => setShowWorkload((prev) => !prev),
    [],
  );

  const handleRefresh = useCallback(() => {
    dispatch(fetchTasks(true));
    dispatch(fetchUnassignedTasksCount());
  }, [dispatch]);

  const handlePageChange = useCallback(
    (page) => {
      dispatch(setPage(page));
      dispatch(fetchTasks());
    },
    [dispatch],
  );

  const handleTaskClick = useCallback(
    (task) => dispatch(openManageDialog(task.id)),
    [dispatch],
  );

  const handleShowSLASummary = useCallback(() => setShowSLADialog(true), []);
  const handleCloseSLADialog = useCallback(() => setShowSLADialog(false), []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ForceNotification>
      <div className={style.tasksPage}>
        <TaskActionBar
          filterDropdowns={filterDropdowns}
          activeFilters={{
            entity_id: currentFilters.entity_id,
            task_category_id: currentFilters.task_category_id,
            assigned_to: currentFilters.assigned_to,
            is_billable: currentFilters.is_billable,
            entity_missing: currentFilters.entity_missing,
          }}
          onFilterChange={handleFilterChange}
          onClearAllFilters={handleClearAllFilters}
          onCreateTask={handleCreateTask}
          onToggleWorkload={handleToggleWorkload}
          onRefresh={handleRefresh}
          showWorkload={showWorkload}
          totalCount={actualTotal}
          filteredCount={filteredCount}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          isPaginationLoading={tasksLoading}
          isTaskLoading={tasksLoading}
          unassignedCount={unassignedCount}
          unassignedCountLoading={unassignedCountLoading}
          onToggleUnassigned={handleToggleUnassigned}
          isUnassignedFilterActive={currentFilters.unassigned_only === true}
          onToggleMagicSort={handleToggleMagicSort}
          isMagicSortActive={currentFilters.is_magic_sort === true}
          onShowSLASummary={handleShowSLASummary}
          hasSLACritical={hasSLACritical}
          isSLADialogOpen={showSLADialog}
          allActiveFilters={currentFilters}
        />

        <TaskStatusBoard statusCounts={statusCounts} loading={tasksLoading} />

        {showWorkload && <TaskWorkload />}

        <TaskTable
          tasks={tasks}
          onTaskClick={handleTaskClick}
          loading={tasksLoading}
          activeStatusFilter={currentFilters.status}
          activePriorityFilter={currentFilters.priority}
          statusCounts={statusCounts}
        />

        <TaskCreateDialog />
        <TaskManageDrawer />

        <TaskCategoryBoard
          isOpen={showCategoryDialog}
          onClose={() => setShowCategoryDialog(false)}
          mode="list"
        />

        <SLAAttentionDialog
          isOpen={showSLADialog}
          onClose={handleCloseSLADialog}
          currentFilters={currentFilters}
        />
      </div>
    </ForceNotification>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TasksPageContent />
    </Suspense>
  );
}
