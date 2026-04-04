"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import ClientsTable from "./components/ClientsTable.jsx";
import GenericActionBar from "@/app/components/pages/GenericActionBar/GenericActionBar.js";

import ClientAddUpdateDialog from "./components/ClientAddUpdateDialog.jsx";
import ClientFilterDialog from "./components/ClientFilterDialog.jsx";

import BulkClientImportDialog from "./components/BulkClientImportDialop/BulkClientImportDialop.jsx";
import { createClientsActionBarConfig } from "@/config/clientsActionBarConfig.js";

import {
  fetchEntities,
  selectListEntities,
  selectIsLoading,
  selectError,
} from "@/store/slices/entitySlice";
import styles from "./ClientsPage.module.scss";

const ClientsPage = () => {
  const dispatch = useDispatch();
  const addUpdateDialogRef = useRef(null);
  const filterDialogRef = useRef(null);
  const bulkImportDialogRef = useRef(null);

  // State for dialog modes
  const [dialogMode, setDialogMode] = useState("add");
  const [selectedClient, setSelectedClient] = useState(null);

  // Redux state
  const clients = useSelector(selectListEntities);
  const loading = useSelector((state) => selectIsLoading(state, "list"));
  const error = useSelector((state) => selectError(state, "list"));

  // Handle Bulk Import Click
  const handleBulkImportClick = () => {
    bulkImportDialogRef.current?.showModal();
  };

  // Create config with bulk import handler
  const clientsActionBarConfig = useMemo(
    () => createClientsActionBarConfig(handleBulkImportClick),
    []
  );

  // Initial data fetch
  useEffect(() => {
    dispatch(fetchEntities({ page: 1, page_size: 20 }));
  }, [dispatch]);

  // Handle Add New Client
  const handleAddNewClient = () => {
    setDialogMode("add");
    setSelectedClient(null);
    addUpdateDialogRef.current?.showModal();
  };

  // Handle Edit Client
  const handleEditClient = (client) => {
    setDialogMode("update");
    setSelectedClient(client);
    addUpdateDialogRef.current?.showModal();
  };

  // Handle Filter Click
  const handleFilterClick = () => {
    filterDialogRef.current?.showModal();
  };

  return (
    <div className={styles.clientsPage}>
      {/* Action Bar with Bulk Import via additionalActions */}
      <GenericActionBar
        {...clientsActionBarConfig}
        onFilterClick={handleFilterClick}
        onAddNew={handleAddNewClient}
      />

      {/* Error Display */}
      {error && (
        <div className={styles.errorBanner}>
          <p>⚠️ {error}</p>
        </div>
      )}

      {/* Clients Table */}
      <div className={styles.tableContainer}>
        {loading && clients.length === 0 ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No clients found</p>
            <button
              onClick={handleAddNewClient}
              className={styles.emptyStateBtn}
            >
              Add Your First Client
            </button>
          </div>
        ) : (
          <ClientsTable
            clients={clients}
            onEdit={handleEditClient}
            loading={loading}
          />
        )}
      </div>

      {/* Add/Update Dialog */}
      <ClientAddUpdateDialog
        ref={addUpdateDialogRef}
        mode={dialogMode}
        client={selectedClient}
      />

      {/* Filter Dialog */}
      <ClientFilterDialog ref={filterDialogRef} />

      {/* Bulk Import Dialog */}
      <BulkClientImportDialog ref={bulkImportDialogRef} />
    </div>
  );
};

export default ClientsPage;
