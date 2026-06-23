"use client";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  Loader2,
} from "lucide-react";
import { deleteEntity } from "@/store/slices/entitySlice";
import styles from "./ClientsTable.module.scss";

import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";

const ClientsTable = ({ clients, onEdit, loading }) => {
  const dispatch = useDispatch();
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });

  // Track which entity is being deleted
  const [deletingEntityId, setDeletingEntityId] = useState(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    clientId: null,
    clientName: "",
  });

  // Get delete loading state from Redux
  const isDeleting = useSelector((state) => state.entity.loading.delete);

  // Sort handler
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Get sorted data
  const getSortedClients = () => {
    const sortedClients = [...clients];
    sortedClients.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === "asc"
        ? aValue > bValue
          ? 1
          : -1
        : bValue > aValue
        ? 1
        : -1;
    });

    return sortedClients;
  };

  // Sort icon component
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className={styles.sortIcon} />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp size={14} className={styles.sortIconActive} />
    ) : (
      <ArrowDown size={14} className={styles.sortIconActive} />
    );
  };

  // Open confirmation dialog
  const handleDeleteClick = (clientId, clientName) => {
    setConfirmDialog({
      isOpen: true,
      clientId,
      clientName,
    });
  };

  // Close confirmation dialog
  const handleCloseDialog = () => {
    if (!isDeleting) {
      setConfirmDialog({
        isOpen: false,
        clientId: null,
        clientName: "",
      });
      setDeletingEntityId(null);
    }
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    const { clientId } = confirmDialog;
    setDeletingEntityId(clientId);

    try {
      await dispatch(deleteEntity(clientId)).unwrap();
      handleCloseDialog();
    } catch (error) {
      setDeletingEntityId(null);
    }
  };

  // Format entity type for display
  const formatEntityType = (type) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Get status badge class
  const getStatusClass = (status) => {
    switch (status) {
      case "ACTIVE":
        return styles.statusActive;
      case "INACTIVE":
        return styles.statusInactive;
      case "SUSPENDED":
        return styles.statusSuspended;
      default:
        return "";
    }
  };

  const sortedClients = getSortedClients();

  return (
    <>
      <div className={styles.tableWrapper}>
        <table className={styles.clientsTable}>
          <thead>
            <tr>
              <th onClick={() => handleSort("name")}>
                <div className={styles.headerCell}>
                  Name
                  <SortIcon columnKey="name" />
                </div>
              </th>
              <th onClick={() => handleSort("entity_type")}>
                <div className={styles.headerCell}>
                  Type
                  <SortIcon columnKey="entity_type" />
                </div>
              </th>
              <th onClick={() => handleSort("pan")}>
                <div className={styles.headerCell}>
                  PAN
                  <SortIcon columnKey="pan" />
                </div>
              </th>
              <th>Contact</th>
              <th onClick={() => handleSort("status")}>
                <div className={styles.headerCell}>
                  Status
                  <SortIcon columnKey="status" />
                </div>
              </th>
              <th onClick={() => handleSort("created_at")}>
                <div className={styles.headerCell}>
                  Created
                  <SortIcon columnKey="created_at" />
                </div>
              </th>
              <th className={styles.actionsHeader}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedClients.map((client) => {
              const isCurrentlyDeleting = deletingEntityId === client.id;

              return (
                <tr
                  key={client.id}
                  className={loading ? styles.loadingRow : ""}
                >
                  <td>
                    <div className={styles.nameCell}>
                      <Building2 size={16} className={styles.icon} />
                      <div>
                        <div className={styles.clientName}>{client.name}</div>
                        {client.contact_person && (
                          <div className={styles.contactPerson}>
                            <User size={12} />
                            {client.contact_person}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.entityType}>
                      {formatEntityType(client.entity_type ?? "UN_REGISTRED")}
                    </span>
                  </td>
                  <td>
                    <span className={styles.pan}>{client.pan || "—"}</span>
                  </td>
                  <td>
                    <div className={styles.contactInfo}>
                      <div className={styles.contactItem}>
                        <Mail size={12} />
                        <a href={`mailto:${client.email}`}>{client.email}</a>
                      </div>
                      <div className={styles.contactItem}>
                        <Phone size={12} />
                        <a href={`tel:${client.primary_phone}`}>
                          {client.primary_phone}
                        </a>
                      </div>
                      {client.city && (
                        <div className={styles.contactItem}>
                          <MapPin size={12} />
                          <span>
                            {client.city}
                            {client.state && `, ${client.state}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${getStatusClass(
                        client.status
                      )}`}
                    >
                      {client.status}
                    </span>
                  </td>
                  <td>
                    <span className={styles.date}>
                      {new Date(client.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => onEdit(client)}
                        title="Edit client"
                        disabled={isCurrentlyDeleting}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() =>
                          handleDeleteClick(client.id, client.name)
                        }
                        title="Delete client"
                        disabled={isCurrentlyDeleting}
                      >
                        {isCurrentlyDeleting ? (
                          <Loader2 size={16} className={styles.spinner} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={handleCloseDialog}
        actionName="Delete Client"
        actionInfo={`Are you sure you want to delete "${confirmDialog.clientName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseDialog}
      />
    </>
  );
};

export default ClientsTable;
