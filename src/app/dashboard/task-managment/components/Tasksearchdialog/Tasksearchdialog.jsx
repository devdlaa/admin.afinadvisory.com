"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import LinearProgress from "@mui/material/LinearProgress";

import {
  Search,
  X,
  SearchX,
  ArrowRight,
  Building2,
  Tag,
  Users,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

import FilterDropdown from "@/app/components/pages/FilterDropdown/FilterDropdown";

import DateRangeDropdown from "./DateRangeDropdown/DateRangeDropdown";
import { quickSearchEntities } from "@/store/slices/entitySlice";
import {
  fetchCategories,
  selectAllCategories,
  selectIsLoading as selectCategoryLoading,
} from "@/store/slices/taskCategorySlice";
import { fetchUsers } from "@/store/slices/userSlice";

import {
  closeSearchDialog,
  setSearchQuery,
  setSearchFilter,
  clearSearchFilters,
  clearSearchResults,
  setSearchPage,
  searchTasksAsync,
  selectSearchIsOpen,
  selectSearchQuery,
  selectSearchFilters,
  selectSearchResults,
  selectSearchLoading,
  selectSearchError,
  selectSearchHasSearched,
  selectSearchPage,
  selectSearchPageSize,
} from "@/store/slices/tasksSearchSlice";

import styles from "./TaskSearchDialog.module.scss";

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "PENDING_CLIENT_INPUT", label: "Pending Client Input" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low Priority" },
  { value: "NORMAL", label: "Normal Priority" },
  { value: "HIGH", label: "High Priority" },
];

const STATUS_LABEL_MAP = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, o.label]),
);
const PRIORITY_LABEL_MAP = Object.fromEntries(
  PRIORITY_OPTIONS.map((o) => [o.value, o.label]),
);

const DEBOUNCE_MS = 400;

// ── Helper: format date label ─────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

// ── Skeleton row ──────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className={styles.skeletonCard}>
    <div className={styles.skeletonLine} style={{ height: 16, width: "60%" }} />
    <div style={{ display: "flex", gap: 8 }}>
      <div className={styles.skeletonLine} style={{ height: 12, width: 80 }} />
      <div className={styles.skeletonLine} style={{ height: 12, width: 60 }} />
    </div>
    <div className={styles.skeletonLine} style={{ height: 12, width: "40%" }} />
  </div>
);

// ── Badge helpers ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => (
  <span className={`${styles.badge} ${styles[`status_${status}`]}`}>
    {STATUS_LABEL_MAP[status] || status}
  </span>
);

const PriorityBadge = ({ priority }) => (
  <span className={`${styles.badge} ${styles[`priority_${priority}`]}`}>
    {PRIORITY_LABEL_MAP[priority] || priority}
  </span>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function TaskSearchDialog() {
  const dispatch = useDispatch();
  const router = useRouter();

  // Redux state
  const isOpen = useSelector(selectSearchIsOpen);
  const query = useSelector(selectSearchQuery);
  const filters = useSelector(selectSearchFilters);
  const results = useSelector(selectSearchResults);
  const loading = useSelector(selectSearchLoading);
  const error = useSelector(selectSearchError);
  const hasSearched = useSelector(selectSearchHasSearched);
  const page = useSelector(selectSearchPage);
  const pageSize = useSelector(selectSearchPageSize);

  // Local data for dropdowns
  const categories = useSelector(selectAllCategories);
  const categoriesLoading = useSelector((state) =>
    selectCategoryLoading(state, "list"),
  );
  const users = useSelector((state) => state.user?.users || []);
  const usersLoading = useSelector((state) => state.user?.loading || false);

  // Local UI state
  const [entitySearchResults, setEntitySearchResults] = useState([]);
  const [isSearchingEntities, setIsSearchingEntities] = useState(false);

  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const lastSearchRef = useRef(null); // ← holds the last dispatched thunk promise
  const hasLoadedCategories = useRef(false);
  const hasLoadedUsers = useRef(false);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && isOpen) {
        dispatch(closeSearchDialog());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, dispatch]);

  // ── Auto-search (debounced) when query or filters change ─────────────────
  const triggerSearch = useCallback(
    (q, f, p = 1) => {
      if (!q || q.trim().length < 2) return;
      // Abort any in-flight request before firing a new one
      lastSearchRef.current?.abort();
      lastSearchRef.current = dispatch(
        searchTasksAsync({
          search: q.trim(),
          page: p,
          page_size: pageSize,
          ...Object.fromEntries(
            Object.entries(f).filter(([, v]) => v !== null && v !== ""),
          ),
        }),
      );
    },
    [dispatch, pageSize],
  );

  const handleQueryChange = useCallback(
    (e) => {
      const val = e.target.value;
      dispatch(setSearchQuery(val));
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        triggerSearch(val, filters, 1);
      }, DEBOUNCE_MS);
    },
    [dispatch, filters, triggerSearch],
  );

  useEffect(() => {
    if (!query || query.trim().length < 2) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerSearch(query, filters, 1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [filters]);

  // ── Entity search ──────────────────────────────────────────────────────────
  const handleEntitySearch = useCallback(
    async (searchQuery) => {
      if (!searchQuery?.trim()) {
        setEntitySearchResults([]);
        return;
      }
      setIsSearchingEntities(true);
      try {
        const result = await dispatch(
          quickSearchEntities({ search: searchQuery, limit: 20 }),
        ).unwrap();
        const safe = Array.isArray(result?.data)
          ? result.data.filter((e) => e?.id && e?.name)
          : [];
        setEntitySearchResults(safe);
      } catch {
        setEntitySearchResults([]);
      } finally {
        setIsSearchingEntities(false);
      }
    },
    [dispatch],
  );

  const selectedEntity = useSelector((state) => {
    const id = filters.entity_id;
    if (!id) return null;
    return state.entity?.entities?.[id] || null;
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

  // ── Filter change ──────────────────────────────────────────────────────────
  const handleFilterChange = useCallback(
    (key, value) => {
      dispatch(setSearchFilter({ [key]: value ?? null }));
    },
    [dispatch],
  );

  const handleClearFilters = useCallback(() => {
    dispatch(clearSearchFilters());
  }, [dispatch]);

  // ── Clear query — abort in-flight request + clear results ─────────────────
  const handleClearQuery = useCallback(() => {
    clearTimeout(debounceRef.current); // cancel pending debounce
    lastSearchRef.current?.abort(); // cancel in-flight request
    lastSearchRef.current = null;
    dispatch(setSearchQuery(""));
    dispatch(clearSearchResults()); // reset results & hasSearched
    inputRef.current?.focus();
  }, [dispatch]);

  // ── Filter dropdowns config — identical structure to TaskActionBar ─────────
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
        isLoading: categoriesLoading,
        lazyLoad: true,
        onLazyLoad: handleLoadCategories,
      },
      {
        filterKey: "assigned_to",
        label: "Assignee",
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
        filterKey: "status",
        label: "Status",
        placeholder: "Any Status",
        icon: SlidersHorizontal,
        options: STATUS_OPTIONS,
        enableLocalSearch: false,
      },
      {
        filterKey: "priority",
        label: "Priority",
        placeholder: "Any Priority",
        icon: SlidersHorizontal,
        options: PRIORITY_OPTIONS,
        enableLocalSearch: false,
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

  // ── Pagination ─────────────────────────────────────────────────────────────
  const hasMorePages = results.length === pageSize;

  const handlePrevPage = useCallback(() => {
    if (page <= 1) return;
    const newPage = page - 1;
    dispatch(setSearchPage(newPage));
    triggerSearch(query, filters, newPage);
  }, [page, query, filters, triggerSearch, dispatch]);

  const handleNextPage = useCallback(() => {
    if (!hasMorePages) return;
    const newPage = page + 1;
    dispatch(setSearchPage(newPage));
    triggerSearch(query, filters, newPage);
  }, [hasMorePages, page, query, filters, triggerSearch, dispatch]);

  // ── Task click → navigate ──────────────────────────────────────────────────
  const handleTaskClick = useCallback(
    (taskId) => {
      dispatch(closeSearchDialog());
      router.push(`/dashboard/task-managment?taskId=${taskId}`);
    },
    [dispatch, router],
  );

  // ── Active filter count ────────────────────────────────────────────────────
  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== null && v !== "",
  ).length;

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) dispatch(closeSearchDialog());
      }}
    >
      <div className={styles.dialog} role="dialog" aria-label="Search Tasks">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.titleRow}>
              <div className={styles.titleIcon}>
                <Search size={18} />
              </div>
              <div>
                <h2 className={styles.title}>Search Tasks</h2>
                <p className={styles.subtitle}>
                  Find tasks by title, description, filters &amp; more
                </p>
              </div>
            </div>

            <div className={styles.topbar_actionbtns}>
              {activeFilterCount > 0 && (
                <button
                  className={styles.clearFiltersBtn}
                  onClick={handleClearFilters}
                >
                  <X size={12} />
                  Clear filters ({activeFilterCount})
                </button>
              )}
              <button
                className={styles.closeBtn}
                onClick={() => dispatch(closeSearchDialog())}
                aria-label="Close search"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Search input */}
          <div className={styles.searchInputWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Search by task title or description…"
              value={query}
              onChange={handleQueryChange}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                className={styles.clearInputBtn}
                onClick={handleClearQuery}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter dropdowns — same .map() pattern as TaskActionBar */}
          <div className={styles.filtersRow}>
            {filterDropdowns.map((dropdown) => (
              <div
                key={dropdown.filterKey}
                className={styles.filterDropdownWrap}
              >
                <FilterDropdown
                  label={dropdown.label}
                  placeholder={dropdown.placeholder}
                  icon={dropdown.icon}
                  options={dropdown.options}
                  selectedValue={filters[dropdown.filterKey]}
                  onSelect={(option) =>
                    handleFilterChange(dropdown.filterKey, option.value)
                  }
                  onSearchChange={dropdown.onSearchChange}
                  onAddNew={dropdown.onAddNew}
                  addNewLabel={dropdown.addNewLabel}
                  isLoading={dropdown.isLoading}
                  isSearching={dropdown.isSearching}
                  emptyStateMessage={dropdown.emptyStateMessage}
                  hintMessage={dropdown.hintMessage}
                  enableLocalSearch={dropdown.enableLocalSearch}
                  lazyLoad={dropdown.lazyLoad}
                  onLazyLoad={dropdown.onLazyLoad}
                />
              </div>
            ))}

            {/* Date range — same style as other filter dropdowns */}
            <DateRangeDropdown
              label="Date Created"
              fromValue={filters.created_date_from || ""}
              toValue={filters.created_date_to || ""}
              onApply={({ from, to }) => {
                handleFilterChange("created_date_from", from);
                handleFilterChange("created_date_to", to);
              }}
              onClear={() => {
                handleFilterChange("created_date_from", null);
                handleFilterChange("created_date_to", null);
              }}
            />
          </div>
        </div>

        <div className={styles.divider} />

        {/* Body */}
        <div className={styles.body}>
          {/* Loading bar */}
          {loading ? (
            <div className={styles.loadingBar}>
              <LinearProgress />
            </div>
          ) : (
            <div className={styles.loadingBarPlaceholder} />
          )}

          {/* Initial state — nothing typed yet */}
          {!hasSearched && !loading && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Search size={26} />
              </div>
              <p className={styles.emptyTitle}>Start searching</p>
              <p className={styles.emptyHint}>
                Type at least 2 characters in the search bar above to find
                tasks.
              </p>
            </div>
          )}

          {/* Skeleton while loading first search */}
          {loading && !hasSearched && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </>
          )}

          {/* Loading overlay skeletons on page change */}
          {loading && hasSearched && (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <SearchX size={26} />
              </div>
              <p className={styles.emptyTitle}>Search failed</p>
              <p className={styles.emptyHint}>{error}</p>
            </div>
          )}

          {/* No results */}
          {!loading && hasSearched && !error && results.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <SearchX size={26} />
              </div>
              <p className={styles.emptyTitle}>No tasks found</p>
              <p className={styles.emptyHint}>
                Try different keywords or adjust the filters to broaden your
                search.
              </p>
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <>
              <div className={styles.resultsMeta}>
                <span className={styles.resultsCount}>
                  Showing <span>{results.length}</span> result
                  {results.length !== 1 ? "s" : ""}
                  {page > 1 ? ` · Page ${page}` : ""}
                </span>
              </div>

              {results.map((task) => (
                <a
                className={styles.anchor}
                  key={`task_${task?.id}`}
                  href={`/dashboard/task-managment?taskId=${task.id}`}
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey) {
                      e.preventDefault();
                      handleTaskClick(task.id);
                    }
                  }}
                >
                  <div
                    key={task.id}
                    className={styles.taskCard}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.cardTop}>
                      <p className={styles.cardTitle}>{task.title}</p>
                      <div className={styles.cardBadges}>
                        {task.status && <StatusBadge status={task.status} />}
                        {task.priority && (
                          <PriorityBadge priority={task.priority} />
                        )}
                      </div>
                      <ArrowRight size={15} className={styles.arrowIcon} />
                    </div>

                    <div className={styles.cardMeta}>
                      {task.entity_name && (
                        <span className={styles.metaItem}>
                          <Building2 size={18} />
                          <span className={styles.entityName}>
                            {task.entity_name}
                          </span>
                        </span>
                      )}
                      {task.category_name && (
                        <span className={styles.metaItem}>
                          <Tag size={18} />
                          <span className={styles.categoryName}>
                            {task.category_name}
                          </span>
                        </span>
                      )}
                      {task.due_date && (
                        <span className={styles.metaItem}>
                          <Clock size={18} />
                          {fmtDate(task.due_date)}
                        </span>
                      )}
                      {task.created_at && (
                        <span className={styles.metaItem}>
                          <Calendar size={18} />
                          Created {fmtDate(task.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        {hasSearched && (
          <div className={styles.footer}>
            <div className={styles.footerHint}>
              <span className={styles.kbd}>
                <span>Esc</span> to close
              </span>
              <span className={styles.kbd}>
                <span>Enter</span> to open task
              </span>
            </div>

            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={handlePrevPage}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft size={13} />
                Prev
              </button>
              <span className={styles.pageInfo}>
                Page <strong>{page}</strong>
              </span>
              <button
                className={styles.pageBtn}
                onClick={handleNextPage}
                disabled={!hasMorePages || loading}
              >
                Next
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
