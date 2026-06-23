"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchLeadContacts,
  deleteLeadContact,
  setFilters,
  resetFilters,
  clearErrors,
  invalidatePageCache,
  selectLeadContacts,
  selectLeadContactsPagination,
  selectLeadContactsFilters,
  selectLeadContactsLoading,
  selectLeadContactsError,
  selectLeadContactStats,
  selectLeadContactActiveStates,
} from "@/store/slices/leadContactSlice";

import LeadContactsTable from "./components/LeadContactsTable/LeadContactsTable.jsx";
import LeadContactDialog from "./components/LeadContactDialog/LeadContactDialog.jsx";
import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";

import styles from "./page.module.scss";

export default function LeadContactsPage() {
  const dispatch = useDispatch();

  const contacts                         = useSelector(selectLeadContacts);
  const pagination                       = useSelector(selectLeadContactsPagination);
  const filters                          = useSelector(selectLeadContactsFilters);
  const loading                          = useSelector(selectLeadContactsLoading);
  const error                            = useSelector(selectLeadContactsError);
  const { isSearchActive, isFilterActive } = useSelector(selectLeadContactActiveStates);

  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [dialogMode,    setDialogMode]    = useState("create");
  const [selectedId,    setSelectedId]    = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteId,  setPendingDeleteId]  = useState(null);
  const [deleteLoading,    setDeleteLoading]    = useState(false);

  const detailCacheRef = useRef({});

  const buildActiveFilters = (f) => {
    const out = {};
    if (f.search)       out.search       = f.search;
    if (f.entity_type)  out.entity_type  = f.entity_type;
    if (f.industry)     out.industry     = f.industry;
    return out;
  };

  const loadPage = useCallback(
    (page) => {
      dispatch(fetchLeadContacts({
        page,
        page_size: pagination.page_size,
        ...buildActiveFilters(filters),
      }));
    },
    [dispatch, pagination.page_size, filters],
  );

  useEffect(() => {
    dispatch(fetchLeadContacts({ page: 1, page_size: pagination.page_size }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = useCallback(
    (newFilters) => {
      dispatch(setFilters(newFilters));
      dispatch(fetchLeadContacts({
        page: 1,
        page_size: pagination.page_size,
        ...buildActiveFilters({ ...filters, ...newFilters }),
      }));
    },
    [dispatch, pagination.page_size, filters],
  );

  const handleResetFilters = useCallback(() => {
    dispatch(resetFilters());
    dispatch(fetchLeadContacts({ page: 1, page_size: pagination.page_size }));
  }, [dispatch, pagination.page_size]);

  const handleRefresh = useCallback(() => {
    detailCacheRef.current = {};
    dispatch(invalidatePageCache());
    return dispatch(fetchLeadContacts({
      page: pagination.page,
      page_size: pagination.page_size,
      _forceRefresh: true,
      ...buildActiveFilters(filters),
    }));
  }, [dispatch, pagination.page, pagination.page_size, filters]);

  // ── FIX 1: handleCreateClick defined and passed to table ──
  const handleCreateClick = useCallback(() => {
    setDialogMode("create");
    setSelectedId(null);
    setDialogOpen(true);
  }, []);

  const handleEditClick = useCallback((id, cacheRef) => {
    setDialogMode("update");
    setSelectedId(id);
    setDialogOpen(true);
  }, []);

  const handleDeleteClick = useCallback((id) => {
    setPendingDeleteId(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return;
    setDeleteLoading(true);
    try {
      await dispatch(deleteLeadContact(pendingDeleteId)).unwrap();
      delete detailCacheRef.current[pendingDeleteId];
      setDeleteDialogOpen(false);
      setPendingDeleteId(null);
      loadPage(pagination.page);
    } catch {
      // error surfaces via redux
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDialogSuccess = useCallback(
    (updatedId) => {
      setDialogOpen(false);
      if (updatedId) delete detailCacheRef.current[updatedId];
      dispatch(invalidatePageCache());
      loadPage(1);
    },
    [dispatch, loadPage],
  );

  return (
    <div className={styles.page}>
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={() => dispatch(clearErrors())} className={styles.errorDismiss}>
            Dismiss
          </button>
        </div>
      )}

      <LeadContactsTable
        contacts={contacts}
        loading={loading}
        pagination={pagination}
        filters={filters}
        isSearchActive={isSearchActive}
        isFilterActive={isFilterActive}
        onPageChange={loadPage}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onRefresh={handleRefresh}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onCreateClick={handleCreateClick}  
        detailCacheRef={detailCacheRef}
      />

      <LeadContactDialog
        isOpen={dialogOpen}
        mode={dialogMode}
        contactId={selectedId}
        detailCacheRef={detailCacheRef}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleDialogSuccess}
      />

      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteDialogOpen(false);
            setPendingDeleteId(null);
          }
        }}
        actionName="Delete Lead Contact"
        actionInfo="This action cannot be undone. The contact will be soft-deleted if not linked to any lead or video call."
        confirmText={deleteLoading ? "Deleting…" : "Delete"}
        cancelText="Cancel"
        variant="danger"
        isCritical
        criticalConfirmWord="DELETE"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}