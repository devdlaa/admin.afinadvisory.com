"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import OutstandingStats from "./components/OutstandingStats/OutstandingStats.jsx";
import OutstandingTable from "./components/OutstandingTable/OutstandingTable.jsx";

import {
  fetchOutstanding,
  selectOutstandingItems,
  selectOutstandingCards,
  selectOutstandingPagination,
  selectOutstandingFilters,
  selectOutstandingLoading,
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

  // Redux selectors
  const items = useSelector(selectOutstandingItems);
  const cards = useSelector(selectOutstandingCards);
  const pagination = useSelector(selectOutstandingPagination);
  const filters = useSelector(selectOutstandingFilters);
  const loading = useSelector(selectOutstandingLoading);
  const error = useSelector(selectOutstandingError);

  // Entity search selectors
  const entitySearchResults = useSelector(selectQuickSearchResults);

  // Local state
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [entityOptions, setEntityOptions] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isEntitySearching, setIsEntitySearching] = useState(false);

  // Fetch outstanding data
  const fetchData = useCallback(() => {
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

  // Initial load - fetch cards (stats)
  useEffect(() => {
    if (isInitialLoad) {
      dispatch(fetchOutstanding({}));
      setIsInitialLoad(false);
    }
  }, [dispatch, isInitialLoad]);

  // Fetch data when filters or pagination change
  useEffect(() => {
    if (!isInitialLoad) {
      fetchData();
    }
  }, [fetchData, isInitialLoad]);

  // Update entity options when search results change
  useEffect(() => {
    if (entitySearchResults && entitySearchResults.length > 0) {
      const options = entitySearchResults.map((entity) => ({
        value: entity.id,
        label: entity.name,
        metadata: entity.email,
      }));
      setEntityOptions(options);
    }
  }, [entitySearchResults]);

  // Handle entity search
  const handleEntitySearch = useCallback(
    (searchTerm) => {
      if (searchTerm) {
        setIsEntitySearching(true);
        dispatch(
          quickSearchEntities({
            search: searchTerm,
            limit: 20,
          }),
        ).finally(() => {
          setIsEntitySearching(false);
        });
      }
    },
    [dispatch],
  );

  const handleChargeTypeChange = useCallback(
    (type) => {
      dispatch(
        setOutstandingFilters({
          charge_type: type || undefined,
          page: 1,
        }),
      );
    },
    [dispatch],
  );
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

  // Handle entity selection
  const handleEntitySelect = useCallback(
    (entityId) => {
      setSelectedEntityId(entityId);

      // Reset to page 1 when changing entity filter
      dispatch(
        setOutstandingFilters({
          entity_ids: entityId ? [entityId] : [],
        }),
      );

      // Reset pagination to page 1
      if (pagination.page !== 1) {
        handlePageChange(1);
      }
    },
    [dispatch, pagination.page],
  );

  // Handle page change
  const handlePageChange = useCallback(
    (newPage) => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      dispatch(setOutstandingFilters({ page: newPage }));
    },
    [dispatch],
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className={styles.outstanding}>
      <div className={styles.outstanding__container}>
        {/* Stats Cards */}
        <OutstandingStats
          cards={cards}
          loading={isInitialLoad && loading}
          selectedChargeType={filters.charge_type}
        />

        {/* Table */}
        <OutstandingTable
          items={items}
          loading={!isInitialLoad && loading}
          currentPage={pagination.page}
          totalPages={pagination.total_pages}
          chargeType={filters.charge_type}
          onChargeTypeChange={handleChargeTypeChange}
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
        />

        {/* Error Display */}
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
