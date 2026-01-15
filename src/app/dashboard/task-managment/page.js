"use client";
import { Building2, Tag, Users, IndianRupee } from "lucide-react";
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

import TaskCategoryBoard from "@/app/components/pages/TaskCategoryBoard/TaskCategoryBoard.jsx";
import TaskWorkload from "./components/TaskWorkload/TaskWorkload.jsx";
import TaskStatusBoard from "./components/TaskStatusBoard/TaskStatusBoard.jsx";
import TaskCreateDialog from "./components/TaskCreateDialog/TaskCreateDialog.jsx";

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
} from "@/store/slices/taskSlice";

import { quickSearchEntities } from "@/store/slices/entitySlice";

import {
  fetchCategories,
  selectAllCategories,
  selectIsLoading as selectCategoryLoading,
} from "@/store/slices/taskCategorySlice";

import { fetchUsers } from "@/store/slices/userSlice";

import style from "./page.module.scss";

// Separate component that uses useSearchParams
function TasksPageContent() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentFilters = useSelector(selectFilters);
  const categories = useSelector(selectAllCategories);
  const categoriesLoading = useSelector((state) =>
    selectCategoryLoading(state, "list")
  );

  // Harden selectors
  const users = useSelector((state) => state.user?.users || []);
  const usersLoading = useSelector((state) => state.user?.loading || false);

  const tasks = useSelector(selectTasks);
  const { currentPage, totalPages } = useSelector(selectPagination);

  const totalCount = useSelector((state) => state.task?.totalTasks || 0);
  const statusCounts = useSelector(selectStatusCounts);
  const tasksLoading = useSelector(selectIsLoading({ type: "list" }));
  const currentTaskId = useSelector(selectManageDialogTaskId);

  const globalCounts = statusCounts?.global || {};
  const actualTotal =
    Object.values(globalCounts).reduce((sum, count) => sum + count, 0) ||
    totalCount ||
    0;
  const filteredCount = tasks?.length || 0;

  const [entitySearchResults, setEntitySearchResults] = useState([]);
  const [isSearchingEntities, setIsSearchingEntities] = useState(false);
  const [showWorkload, setShowWorkload] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const hasLoadedCategories = useRef(false);
  const hasLoadedUsers = useRef(false);
  const ignoreNextDeepLink = useRef(false);

  const isUpdatingFromUrl = useRef(false);

  const deepLinkTaskId = searchParams.get("taskId");

  // FIX: Parse URL params and sync to Redux on mount AND when URL changes
  useEffect(() => {
    const urlFilters = {};
    const urlPage = searchParams.get("page");

    const filterKeys = [
      "entity_id",
      "task_category_id",
      "assigned_to",
      "status",
      "priority",
      "search",
      "is_billable",
    ];

    let hasChanges = false;

    filterKeys.forEach((key) => {
      const value = searchParams.get(key);
      if (value !== null) {
        // Convert boolean strings to actual booleans for is_billable
        if (key === "is_billable") {
          urlFilters[key] = value === "true";
        } else {
          urlFilters[key] = value;
        }

        // Check if different from current filter
        if (currentFilters[key] !== urlFilters[key]) {
          hasChanges = true;
        }
      } else {
        // URL doesn't have this filter, should be null
        if (currentFilters[key] !== null) {
          urlFilters[key] = null;
          hasChanges = true;
        }
      }
    });

    const parsedPage = urlPage ? parseInt(urlPage) : 1;
    if (currentPage !== parsedPage) {
      hasChanges = true;
    }

    // Only update Redux if there are actual changes
    if (hasChanges || !isInitialized) {
      isUpdatingFromUrl.current = true;

      dispatch(setFilters(urlFilters));

      if (parsedPage !== currentPage) {
        dispatch(setPage(parsedPage));
      }

      dispatch(fetchTasks());

      // Reset flag after a tick
      setTimeout(() => {
        isUpdatingFromUrl.current = false;
      }, 0);
    }

    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [searchParams]); // Re-run when URL changes

  // FIX: Sync Redux state to URL (only when not updating from URL)
  useEffect(() => {
    if (!isInitialized || isUpdatingFromUrl.current) return;

    const params = new URLSearchParams(window.location.search);

    // Filters
    const filterKeys = [
      "entity_id",
      "task_category_id",
      "assigned_to",
      "status",
      "priority",
      "search",
      "is_billable",
    ];

    filterKeys.forEach((key) => {
      const value = currentFilters[key];
      if (value !== null && value !== "" && value !== undefined) {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });

    // Page
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    } else {
      params.delete("page");
    }

    // Drawer state
    if (currentTaskId) {
      params.set("taskId", currentTaskId);
    } else {
      params.delete("taskId");
      params.delete("tab");
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;

    if (newUrl !== window.location.pathname + window.location.search) {
      router.replace(newUrl, { scroll: false });
    }
  }, [currentFilters, currentPage, currentTaskId, router, isInitialized]);

  // Handle deep link task opening
  useEffect(() => {
    if (window.__closingTaskDrawer) {
      window.__closingTaskDrawer = false;
      return;
    }

    if (!deepLinkTaskId || currentTaskId === deepLinkTaskId) return;

    dispatch(openManageDialog(deepLinkTaskId));
  }, [deepLinkTaskId, currentTaskId, dispatch]);

  const handleEntitySearch = useCallback(
    async (query) => {
      if (!query || !query.trim()) {
        setEntitySearchResults([]);
        return;
      }

      setIsSearchingEntities(true);
      try {
        const result = await dispatch(
          quickSearchEntities({ search: query, limit: 20 })
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
    [dispatch]
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

  const filterDropdowns = useMemo(() => {
    return [
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
        filterKey: "is_billable",
        label: "Billing",
        placeholder: "All Tasks",
        icon: IndianRupee,
        options: [
          { value: true, label: "Billable" },
          { value: false, label: "Non-billable" },
        ],
      },
    ];
  }, [
    entityOptions,
    categories,
    users,
    handleEntitySearch,
    isSearchingEntities,
    categoriesLoading,
    usersLoading,
    handleLoadCategories,
    handleLoadUsers,
  ]);

  const handleFilterChange = useCallback(
    (filterKey, value) => {
      dispatch(setFilters({ [filterKey]: value }));
      dispatch(setPage(1));
      dispatch(fetchTasks(true));
    },
    [dispatch]
  );

  const handleClearAllFilters = useCallback(() => {
    dispatch(
      setFilters({
        entity_id: null,
        task_category_id: null,
        assigned_to: null,
        // status: null, // FIX: Preserve status filter when clearing
        priority: null,
        search: null,
        is_billable: null,
      })
    );
    dispatch(setPage(1));
    dispatch(fetchTasks(true));
  }, [dispatch]);

  const handleCreateTask = useCallback(() => {
    dispatch(openCreateDialog());
  }, [dispatch]);

  const handleToggleWorkload = useCallback(() => {
    setShowWorkload((prev) => !prev);
  }, []);

  const handleRefresh = useCallback(() => {
    dispatch(fetchTasks(true));
  }, [dispatch]);

  const handlePageChange = useCallback(
    (page) => {
      dispatch(setPage(page));
      dispatch(fetchTasks());
    },
    [dispatch]
  );

  const handleTaskClick = useCallback(
    (task) => {
      dispatch(openManageDialog(task.id));
    },
    [dispatch]
  );

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
