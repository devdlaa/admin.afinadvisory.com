"use client";
import { Building2, Tag, Users } from "lucide-react";

import { useState, useEffect, useCallback } from "react";

import { useDispatch, useSelector } from "react-redux";

import TaskTable from "./components/TasksTable/TasksTable";
import TaskActionBar from "./components/TaskActionBar/TaskActionBar";
import {
  openDialog,
  fetchTasks,
  setFilters,
  setPage,
  selectFilters,
  selectTasks,
} from "@/store/slices/taskSlice";

import { quickSearchEntities } from "@/store/slices/entitySlice";

// Import category slice
import {
  fetchCategories,
  selectAllCategories,
  selectIsLoading as selectCategoryLoading,
} from "@/store/slices/taskCategorySlice";

// Import users slice
import { fetchUsers } from "@/store/slices/userSlice";

// Import the TaskCategoryBoard dialog
import TaskCategoryBoard from "@/app/components/TaskCategoryBoard/TaskCategoryBoard";

import style from "./page.module.scss";

// Import dummy data for testing
import { dummyTasks } from "./dummyTasks";

export default function TasksPage() {
  const dispatch = useDispatch();
  const currentFilters = useSelector(selectFilters);

  // Get categories from Redux
  const categories = useSelector(selectAllCategories);
  const categoriesLoading = useSelector((state) =>
    selectCategoryLoading(state, "list")
  );

  // Get users from Redux
  const users = useSelector((state) => state.user.users);
  const usersLoading = useSelector((state) => state.user.loading);

  // Get tasks and pagination info - use dummy data for testing
  const tasksFromRedux = useSelector(selectTasks);
  const tasks = tasksFromRedux.length > 0 ? tasksFromRedux : dummyTasks;
  const totalCount = useSelector(
    (state) => state.task.totalTasks || dummyTasks.length
  );
  const filteredCount = tasks?.length || 0;
  const currentPage = useSelector((state) => state.task.currentPage || 1);
  const totalPages = useSelector((state) => state.task.totalPages || 1);
  const tasksLoading = useSelector((state) => state.task.loading.list);

  // Local state for entity search
  const [entitySearchResults, setEntitySearchResults] = useState([]);
  const [isSearchingEntities, setIsSearchingEntities] = useState(false);

  // Local state
  const [showWorkload, setShowWorkload] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  // Fetch initial data
  useEffect(() => {
    // Only fetch tasks on mount
    dispatch(fetchTasks());

    // Categories and users will be lazy loaded by the dropdowns
  }, [dispatch]);

  // Handle entity async search with useCallback to prevent infinite loops
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

  // Keep selected entity in the results even after selection
  const selectedEntity = useSelector((state) => {
    const entityId = currentFilters.entity_id;
    if (!entityId) return null;
    return state.entity.entities[entityId];
  });

  // Merge selected entity with search results
  const entityOptions = selectedEntity
    ? [
        selectedEntity,
        ...entitySearchResults.filter((e) => e.id !== selectedEntity.id),
      ]
    : entitySearchResults;

  // Lazy load callbacks for dropdowns (Redux handles caching automatically)
  const handleLoadCategories = useCallback(() => {
    dispatch(fetchCategories({ page: 1, page_size: 100 }));
  }, [dispatch]);

  const handleLoadUsers = useCallback(() => {
    dispatch(fetchUsers({ page: 1, limit: 100 }));
  }, [dispatch]);

  // Create filter dropdowns configuration function
  const createFilterDropdowns = ({
    entities,
    categories,
    users,
    onEntitySearch,
    onAddCategory,
  }) => [
    {
      filterKey: "entity_id",
      label: "Client",
      placeholder: "Select Client",
      icon: Building2,
      options: entities.map((entity) => ({
        value: entity.id,
        label: entity.name,
        subtitle: entity.pan || entity.email,
      })),
      onSearchChange: onEntitySearch,
      enableLocalSearch: !onEntitySearch,
      emptyStateMessage: "No clients found",
      hintMessage: "Start typing to search clients...",
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
      onAddNew: onAddCategory,
      addNewLabel: "New Category",
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
    },
  ];

  // Call the function to get the array
  const filterDropdowns = createFilterDropdowns({
    entities: entityOptions,
    categories: categories,
    users: users,
    onEntitySearch: handleEntitySearch,
    onAddCategory: () => setShowCategoryDialog(true),
  });

  // Update loading state and lazy load config for dropdowns
  const updatedFilterDropdowns = filterDropdowns.map((dropdown) => {
    if (dropdown.filterKey === "entity_id") {
      return {
        ...dropdown,
        isSearching: isSearchingEntities,
      };
    }
    if (dropdown.filterKey === "task_category_id") {
      return {
        ...dropdown,
        isLoading: categoriesLoading,
        lazyLoad: true,
        onLazyLoad: handleLoadCategories,
      };
    }
    if (dropdown.filterKey === "assigned_to") {
      return {
        ...dropdown,
        isLoading: usersLoading,
        lazyLoad: true,
        onLazyLoad: handleLoadUsers,
      };
    }
    return dropdown;
  });

  // Handle filter change
  const handleFilterChange = (filterKey, value) => {
    dispatch(setFilters({ [filterKey]: value }));
    dispatch(setPage(1));
    dispatch(fetchTasks());
  };

  // Handle clear all filters
  const handleClearAllFilters = () => {
    dispatch(
      setFilters({
        entity_id: null,
        task_category_id: null,
        assigned_to: null,
        status: null,
        priority: null,
      })
    );
    dispatch(setPage(1));
    dispatch(fetchTasks());
  };

  // Handlers
  const handleCreateTask = () => {
    dispatch(openDialog({ mode: "create" }));
  };

  const handleExportClick = () => {
    // TODO: Implement export
    console.log("Export tasks");
  };

  const handleToggleWorkload = () => {
    setShowWorkload(!showWorkload);
  };

  const handlePageChange = (page) => {
    dispatch(setPage(page));
    dispatch(fetchTasks());
  };

  // Task table handlers
  const handleTaskClick = (task) => {
    console.log("Task clicked:", task.id);
    dispatch(openDialog({ mode: "edit", taskId: task.id }));
  };

  const handleManageTask = (task) => {
    console.log("Manage task:", task.id);
    dispatch(openDialog({ mode: "edit", taskId: task.id }));
  };

  const handleAssigneeClick = (task) => {
    console.log("Manage assignees:", task.id);
    // TODO: Open assignee management dialog
  };

  // Bulk action handlers
  const handleBulkAssign = (taskIds) => {
    console.log("Bulk assign tasks:", taskIds);
    // TODO: Open bulk assign dialog
  };

  const handleBulkStatusChange = (taskIds) => {
    console.log("Bulk status change:", taskIds);
    // TODO: Open bulk status change dialog
  };

  const handleBulkDelete = (taskIds) => {
    console.log("Bulk delete tasks:", taskIds);
    // TODO: Implement bulk delete with confirmation
  };

  return (
    <div className={style.tasksPage}>
      {/* Custom Action Bar */}
      <TaskActionBar
        filterDropdowns={updatedFilterDropdowns}
        activeFilters={{
          entity_id: currentFilters.entity_id,
          task_category_id: currentFilters.task_category_id,
          assigned_to: currentFilters.assigned_to,
        }}
        onFilterChange={handleFilterChange}
        onClearAllFilters={handleClearAllFilters}
        onCreateTask={handleCreateTask}
        onExport={handleExportClick}
        onToggleWorkload={handleToggleWorkload}
        showWorkload={showWorkload}
        totalCount={totalCount}
        filteredCount={filteredCount}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        isPaginationLoading={tasksLoading}
      />

      {/* Workload Section */}
      {showWorkload && (
        <div className={style.workloadSection}>
          <p>Workload view coming soon...</p>
        </div>
      )}

      {/* Category Dialog */}
      <TaskCategoryBoard
        isOpen={showCategoryDialog}
        onClose={() => setShowCategoryDialog(false)}
        mode="list"
      />

      {/* Task Table */}
      <TaskTable
        tasks={tasks}
        onTaskClick={handleTaskClick}
        onManageTask={handleManageTask}
        onAssigneeClick={handleAssigneeClick}
        onBulkAssign={handleBulkAssign}
        onBulkStatusChange={handleBulkStatusChange}
        onBulkDelete={handleBulkDelete}
        loading={tasksLoading}
        activeStatusFilter={currentFilters.status}
        activePriorityFilter={currentFilters.priority}
      />
    </div>
  );
}
