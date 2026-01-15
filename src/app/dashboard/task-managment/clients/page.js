"use client";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import ClientsTable from "./components/ClientsTable.jsx";
import GenericActionBar from "@/app/components/pages/GenericActionBar/GenericActionBar.js";

import ClientAddUpdateDialog from "./components/ClientAddUpdateDialog.jsx";
import ClientFilterDialog from "./components/ClientFilterDialog.jsx";

import { clientsActionBarConfig } from "@/config/clientsActionBarConfig.js";

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

  // State for dialog modes
  const [dialogMode, setDialogMode] = useState("add");
  const [selectedClient, setSelectedClient] = useState(null);

  // Redux state
  const clients = useSelector(selectListEntities);
  const loading = useSelector((state) => selectIsLoading(state, "list"));

  const error = useSelector((state) => selectError(state, "list"));

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
      {/* Action Bar */}
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
    </div>
  );
};

export default ClientsPage;
