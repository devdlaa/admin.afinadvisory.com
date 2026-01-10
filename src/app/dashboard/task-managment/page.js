"use client";
import { Building2, Tag, Users } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";

import TaskTable from "./components/TasksTable/TasksTable";
import TaskActionBar from "./components/TaskActionBar/TaskActionBar";
import TaskCreateDialog from "./components/TaskCreateDialog/TaskCreateDialog";
import TaskManageDrawer from "./components/TaskManageDrawer/TaskManageDrawer";
import TaskCategoryBoard from "@/app/components/TaskCategoryBoard/TaskCategoryBoard";
import TaskWorkload from "./components/TaskWorkload/TaskWorkload";
import TaskStatusBoard from "./components/TaskStatusBoard/TaskStatusBoard";

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
} from "@/store/slices/taskSlice";

import { quickSearchEntities } from "@/store/slices/entitySlice";

import {
  fetchCategories,
  selectAllCategories,
  selectIsLoading as selectCategoryLoading,
} from "@/store/slices/taskCategorySlice";

import { fetchUsers } from "@/store/slices/userSlice";

import style from "./page.module.scss";

export default function TasksPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentFilters = useSelector(selectFilters);
  const categories = useSelector(selectAllCategories);
  const categoriesLoading = useSelector((state) =>
    selectCategoryLoading(state, "list")
  );
  const users = useSelector((state) => state.user.users);
  const usersLoading = useSelector((state) => state.user.loading);

  const tasks = useSelector(selectTasks);
  const { currentPage, totalPages } = useSelector(selectPagination);
  const totalCount = useSelector((state) => state.task.totalTasks);
  const statusCounts = useSelector(selectStatusCounts);
  const tasksLoading = useSelector(selectIsLoading({ type: "list" }));

  // Get actual total from global status counts
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

  // Parse URL params and sync with Redux on mount
  useEffect(() => {
    if (isInitialized) return;

    const urlFilters = {};
    const urlPage = searchParams.get("page");

    // Parse filter params
    const filterKeys = [
      "entity_id",
      "task_category_id",
      "assigned_to",
      "status",
      "priority",
      "search",
    ];

    filterKeys.forEach((key) => {
      const value = searchParams.get(key);
      if (value) {
        urlFilters[key] = value;
      }
    });

    // If no filters in URL, don't set default (null = "All")
    // The slice already has the proper defaults

    // Update Redux with filters if any exist
    if (Object.keys(urlFilters).length > 0) {
      dispatch(setFilters(urlFilters));
    }

    if (urlPage && !isNaN(parseInt(urlPage))) {
      dispatch(setPage(parseInt(urlPage)));
    }

    // Fetch tasks with URL params
    dispatch(fetchTasks());
    setIsInitialized(true);
  }, [dispatch, searchParams, isInitialized]);

  // Update URL when filters or page change
  useEffect(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams();

    // Add filters to URL
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value !== null && value !== "" && value !== undefined) {
        params.set(key, value);
      }
    });

    // Add page to URL if not page 1
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    }

    // Update URL without reloading
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    router.replace(newUrl, { scroll: false });
  }, [currentFilters, currentPage, router, isInitialized]);

  // Handle entity async search
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
        setEntitySearchResults(result.data || []);
      } catch (error) {
        console.error("Entity search failed:", error);
        setEntitySearchResults([]);
      } finally {
        setIsSearchingEntities(false);
      }
    },
    [dispatch]
  );

  // Keep selected entity in results
  const selectedEntity = useSelector((state) => {
    const entityId = currentFilters.entity_id;
    if (!entityId) return null;
    return state.entity.entities[entityId];
  });

  const entityOptions = useMemo(() => {
    return selectedEntity
      ? [
          selectedEntity,
          ...entitySearchResults.filter((e) => e.id !== selectedEntity.id),
        ]
      : entitySearchResults;
  }, [selectedEntity, entitySearchResults]);

  // Lazy load callbacks
  const handleLoadCategories = useCallback(() => {
    dispatch(fetchCategories({ page: 1, page_size: 100 }));
  }, [dispatch]);

  const handleLoadUsers = useCallback(() => {
    dispatch(fetchUsers({ page: 1, limit: 100 }));
  }, [dispatch]);

  // Create filter dropdowns
  const filterDropdowns = useMemo(() => {
    const dropdowns = [
      {
        filterKey: "entity_id",
        label: "Client",
        placeholder: "Select Client",
        icon: Building2,
        options: entityOptions.map((entity) => ({
          value: entity.id,
          label: entity.name,
          subtitle: entity.pan || entity.email,
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
    ];

    return dropdowns;
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

  // Handle filter change
  const handleFilterChange = useCallback(
    (filterKey, value) => {
      dispatch(setFilters({ [filterKey]: value }));
      dispatch(setPage(1));
      dispatch(fetchTasks(true)); // Force refresh to update counts
    },
    [dispatch]
  );

  // Handle clear all filters
  const handleClearAllFilters = useCallback(() => {
    dispatch(
      setFilters({
        entity_id: null,
        task_category_id: null,
        assigned_to: null,
        status: null,
        priority: null,
        search: null,
      })
    );
    dispatch(setPage(1));
    dispatch(fetchTasks(true)); // Force refresh
  }, [dispatch]);

  // Handlers
  const handleCreateTask = useCallback(() => {
    dispatch(openCreateDialog());
  }, [dispatch]);

  const handleToggleWorkload = useCallback(() => {
    setShowWorkload((prev) => !prev);
  }, []);

  const handleRefresh = useCallback(() => {
    dispatch(fetchTasks(true)); // Force refresh to get latest counts
  }, [dispatch]);

  const handlePageChange = useCallback(
    (page) => {
      dispatch(setPage(page));
      dispatch(fetchTasks());
    },
    [dispatch]
  );

  // Task table handlers
  const handleTaskClick = useCallback(
    (task) => {
      dispatch(openManageDialog(task.id));
    },
    [dispatch]
  );

  const handleManageTask = useCallback(
    (task) => {
      dispatch(openManageDialog(task.id));
    },
    [dispatch]
  );

  return (
    <div className={style.tasksPage}>
      <TaskActionBar
        filterDropdowns={filterDropdowns}
        activeFilters={{
          entity_id: currentFilters.entity_id,
          task_category_id: currentFilters.task_category_id,
          assigned_to: currentFilters.assigned_to,
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

      {/* NEW: Task Status Board */}
      <TaskStatusBoard statusCounts={statusCounts} loading={tasksLoading} />

      {showWorkload && <TaskWorkload />}

      <TaskTable
        tasks={tasks}
        onTaskClick={handleTaskClick}
        onManageTask={handleManageTask}
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
  );
}
