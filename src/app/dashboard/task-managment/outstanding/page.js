"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import OutstandingStats from "./components/OutstandingStats/OutstandingStats.jsx";
import OutstandingTable from "./components/OutstandingTable/OutstandingTable.jsx";

import {
  fetchOutstanding,
  fetchOutstandingStats,
  fetchEntityBreakdown,
  selectOutstandingItems,
  selectOutstandingCards,
  selectOutstandingPagination,
  selectOutstandingFilters,
  selectOutstandingLoadingList,
  selectOutstandingLoadingStats,
  selectOutstandingError,
  setOutstandingFilters,
} from "@/store/slices/outstandingSlice.js";

import {
  quickSearchEntities,
  selectQuickSearchResults,
} from "@/store/slices/entitySlice.js";

import styles from "./Outstanding.module.scss";

const Outstanding = () => {
  const dispatch = useDispatch();

  // =========================
  // Redux selectors
  // =========================
  const items = useSelector(selectOutstandingItems);
  const cards = useSelector(selectOutstandingCards);
  const pagination = useSelector(selectOutstandingPagination);
  const filters = useSelector(selectOutstandingFilters);
  const loadingList = useSelector(selectOutstandingLoadingList);
  const loadingStats = useSelector(selectOutstandingLoadingStats);
  const error = useSelector(selectOutstandingError);

  // Entity search selectors
  const entitySearchResults = useSelector(selectQuickSearchResults);

  // Breakdowns selector
  const breakdowns = useSelector((state) => state.outstanding.breakdowns);

  // =========================
  // Local state
  // =========================
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [entityOptions, setEntityOptions] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isEntitySearching, setIsEntitySearching] = useState(false);
  const [expandedEntityId, setExpandedEntityId] = useState(null);

  // =========================
  // Fetch list data
  // =========================
  const fetchListData = useCallback(() => {
    const fetchFilters = {
      ...filters,
      entity_ids: selectedEntityId ? [selectedEntityId] : [],
      page: pagination.page,
      page_size: pagination.page_size,
    };

    dispatch(fetchOutstanding(fetchFilters));
  }, [
    dispatch,
    filters,
    selectedEntityId,
    pagination.page,
    pagination.page_size,
  ]);

  // =========================
  // Initial load
  // =========================
  useEffect(() => {
    if (isInitialLoad) {
      dispatch(fetchOutstandingStats());
      fetchListData();
      setIsInitialLoad(false);
    }
  }, [dispatch, fetchListData, isInitialLoad]);

  // =========================
  // Refetch list on filters / pagination change
  // =========================
  useEffect(() => {
    if (!isInitialLoad) {
      fetchListData();
    }
  }, [fetchListData, isInitialLoad]);

  // =========================
  // Entity search results → options
  // =========================
  useEffect(() => {
    if (entitySearchResults?.length > 0) {
      setEntityOptions(
        entitySearchResults.map((entity) => ({
          value: entity.id,
          label: entity.name,
          metadata: entity.email,
        })),
      );
    }
  }, [entitySearchResults]);

  // =========================
  // Entity search handler
  // =========================
  const handleEntitySearch = useCallback(
    (searchTerm) => {
      if (!searchTerm) return;

      setIsEntitySearching(true);
      dispatch(
        quickSearchEntities({
          search: searchTerm,
          limit: 20,
        }),
      ).finally(() => {
        setIsEntitySearching(false);
      });
    },
    [dispatch],
  );

  // =========================
  // Sorting
  // =========================
  const handleSortChange = useCallback(
    (column) => {
      let nextOrder = "desc";

      if (filters.sort_by === column) {
        nextOrder = filters.sort_order === "asc" ? "desc" : "asc";
      }

      dispatch(
        setOutstandingFilters({
          sort_by: column,
          sort_order: nextOrder,
          page: 1,
        }),
      );
    },
    [dispatch, filters.sort_by, filters.sort_order],
  );

  // =========================
  // Entity filter
  // =========================
  const handleEntitySelect = useCallback(
    (entityId) => {
      setSelectedEntityId(entityId);

      dispatch(
        setOutstandingFilters({
          entity_ids: entityId ? [entityId] : [],
          page: 1,
        }),
      );
    },
    [dispatch],
  );

  // =========================
  // Pagination
  // =========================
  const handlePageChange = useCallback(
    (newPage) => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      dispatch(setOutstandingFilters({ page: newPage }));
      // Close expanded row on page change
      setExpandedEntityId(null);
    },
    [dispatch],
  );

  // =========================
  // Refresh
  // =========================
  const handleRefresh = useCallback(() => {
    dispatch(fetchOutstandingStats());
    fetchListData();
    // Close expanded row on refresh
    setExpandedEntityId(null);
  }, [dispatch, fetchListData]);

  // =========================
  // Toggle expand/collapse
  // =========================
  const handleToggleExpand = useCallback(
    (entityId) => {
      if (expandedEntityId === entityId) {
        // Collapse if already expanded
        setExpandedEntityId(null);
      } else {
        // Expand and fetch breakdown if not already loaded
        setExpandedEntityId(entityId);

        if (!breakdowns[entityId]) {
          dispatch(fetchEntityBreakdown(entityId));
        }
      }
    },
    [dispatch, expandedEntityId, breakdowns],
  );

  // =========================
  // Render
  // =========================
  return (
    <div className={styles.outstanding}>
      <div className={styles.outstanding__container}>
        {/* Global Stats */}
        <OutstandingStats cards={cards} loading={loadingStats} />

        {/* Outstanding Table */}
        <OutstandingTable
          items={items}
          loading={loadingList}
          currentPage={pagination.page}
          totalPages={pagination.total_pages}
          onPageChange={handlePageChange}
          onRefresh={handleRefresh}
          selectedEntityId={selectedEntityId}
          onEntitySelect={handleEntitySelect}
          entityOptions={entityOptions}
          sortBy={filters.sort_by}
          sortOrder={filters.sort_order}
          onSortChange={handleSortChange}
          onEntitySearch={handleEntitySearch}
          isEntitySearching={isEntitySearching}
          expandedEntityId={expandedEntityId}
          onToggleExpand={handleToggleExpand}
          breakdowns={breakdowns}
        />

        {/* Error */}
        {error && (
          <div className={styles.outstanding__error}>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Outstanding;