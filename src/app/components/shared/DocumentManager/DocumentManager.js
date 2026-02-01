"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Search,
  Download,
  Trash2,
  FileText,
  ChevronUp,
  ChevronDown,
  Loader2,
  File,
  Plus,
  X,
  Upload,
  Calendar,
  User,
  FileIcon,
} from "lucide-react";

import {
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  downloadDocument,
  setSearchQuery,
  setSortConfig,
  selectDocumentsForScope,
  selectSearchQuery,
  selectSortConfig,
  selectIsUploading,
  selectIsDownloading,
  selectIsDeleting,
  clearError,
} from "@/store/slices/documentSlice";

import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";
import styles from "./DocumentManager.module.scss";
import {
  truncateText,
  formatFileSize,
  formatDate,
} from "@/utils/client/cutils";

const DocumentManager = ({ scope, scopeId }) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  // Selectors
  const { items, pagination, loading } = useSelector((state) =>
    selectDocumentsForScope(state, scope, scopeId),
  );
  const searchQuery = useSelector((state) =>
    selectSearchQuery(state, scope, scopeId),
  );
  const sortConfig = useSelector((state) =>
    selectSortConfig(state, scope, scopeId),
  );
  const uploadingFile = useSelector((state) =>
    selectIsUploading(state, scope, scopeId),
  );
  const error = useSelector((state) => state.documents.error);

  // Local state
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    documentId: null,
    documentName: "",
  });

  useEffect(() => {
    dispatch(
      fetchDocuments({
        scope,
        scopeId,
        page: 1,
        sort: sortConfig.sort,
        order: sortConfig.order,
      }),
    );
    setCurrentPage(1);
  }, [dispatch, scope, scopeId, sortConfig.sort, sortConfig.order]);

  // Filtered items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(
      (doc) =>
        doc.original_name.toLowerCase().includes(query) ||
        doc.creator.name.toLowerCase().includes(query),
    );
  }, [items, searchQuery]);

  // Handlers
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      dispatch(uploadDocument({ file, scope, scopeId }));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddNewClick = () => {
    fileInputRef.current?.click();
  };

  const handleSearch = (e) => {
    dispatch(
      setSearchQuery({
        scopeKey: `${scope}_${scopeId}`,
        query: e.target.value,
      }),
    );
  };

  const handleSort = (field) => {
    const newOrder =
      sortConfig.sort === field && sortConfig.order === "desc" ? "asc" : "desc";
    dispatch(
      setSortConfig({
        scopeKey: `${scope}_${scopeId}`,
        sort: field,
        order: newOrder,
      }),
    );
  };

  const handleDownload = (doc) => {
    dispatch(
      downloadDocument({
        objectKey: doc.object_key,
        originalName: doc.original_name,
      }),
    );
  };

  const handleDeleteClick = (doc) => {
    setDeleteDialog({
      isOpen: true,
      documentId: doc.id,
      documentName: doc.original_name,
    });
  };

  const handleDeleteConfirm = async () => {
    dispatch(deleteDocument({ documentId: deleteDialog.documentId }));
    setDeleteDialog({ isOpen: false, documentId: null, documentName: "" });
  };

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    dispatch(
      fetchDocuments({
        scope,
        scopeId,
        page: nextPage,
        sort: sortConfig.sort,
        order: sortConfig.order,
      }),
    );
  };

  const SortIcon = ({ field }) => {
    if (sortConfig.sort !== field) return null;
    return sortConfig.order === "desc" ? (
      <ChevronDown className={styles.sortIcon} />
    ) : (
      <ChevronUp className={styles.sortIcon} />
    );
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>
            {pagination?.total_items || 0} Documents
          </h3>
        </div>

        <div className={styles.headerRight}>
          {/* Sort Controls */}
          <div className={styles.sortControls}>
            <button
              className={`${styles.sortButton} ${
                sortConfig.sort === "original_name" ? styles.active : ""
              }`}
              onClick={() => handleSort("original_name")}
            >
              Name
              <SortIcon field="original_name" />
            </button>
            <button
              className={`${styles.sortButton} ${
                sortConfig.sort === "created_at" ? styles.active : ""
              }`}
              onClick={() => handleSort("created_at")}
            >
              Date
              <SortIcon field="created_at" />
            </button>
            <button
              className={`${styles.sortButton} ${
                sortConfig.sort === "mime_type" ? styles.active : ""
              }`}
              onClick={() => handleSort("mime_type")}
            >
              Type
              <SortIcon field="mime_type" />
            </button>
          </div>

          {/* Add New Button */}
          <button
            className={styles.addButton}
            onClick={handleAddNewClick}
            disabled={!!uploadingFile}
          >
            <Plus size={18} />
            Add New
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {error ||
        (uploadingFile && (
          <div
            style={{
              padding: "20px",
            }}
          >
            {/* Error Message */}
            {error && (
              <div className={styles.errorBanner}>
                <span>{error}</span>
                <button onClick={() => dispatch(clearError())}>
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Uploading State */}
            {uploadingFile && (
              <div className={styles.uploadingCard}>
                <div className={styles.uploadingIcon}>
                  <Upload size={20} />
                </div>
                <div className={styles.uploadingInfo}>
                  <div className={styles.uploadingName}>
                    {truncateText(uploadingFile?.fileName, 30)}
                  </div>
                  <div className={styles.uploadingStatus}>
                    <Loader2 className={styles.spinner} size={16} />
                    <span>Uploading...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

      {/* Documents List */}
      {loading && currentPage === 1 ? (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} size={32} />
          <p>Loading documents...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className={styles.emptyState}>
          <File size={48} className={styles.emptyIcon} />
          <h4>No documents found</h4>
          <p>Upload your first document to get started</p>
          <button className={styles.emptyButton} onClick={handleAddNewClick}>
            <Upload size={18} />
            Upload Document
          </button>
        </div>
      ) : (
        <>
          {/* Documents Grid */}
          <div className={styles.documentsGrid}>
            {filteredItems.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onDownload={handleDownload}
                onDelete={handleDeleteClick}
                formatFileSize={formatFileSize}
                formatDate={formatDate}
              />
            ))}
          </div>

          {/* Load More Button */}
          {pagination?.has_more && (
            <div className={styles.loadMoreWrapper}>
              <button
                className={styles.loadMoreButton}
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className={styles.spinner} size={18} />
                    Loading...
                  </>
                ) : (
                  <>
                    Load More
                    <ChevronDown size={18} />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() =>
          setDeleteDialog({ isOpen: false, documentId: null, documentName: "" })
        }
        actionName="Delete Document"
        actionInfo={`Are you sure you want to delete "${deleteDialog.documentName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() =>
          setDeleteDialog({ isOpen: false, documentId: null, documentName: "" })
        }
      />
    </div>
  );
};

// Document Card Component
const DocumentCard = React.memo(
  ({ doc, onDownload, onDelete, formatFileSize, formatDate, getFileIcon }) => {
    const downloading = useSelector((state) =>
      selectIsDownloading(state, doc.object_key),
    );
    const deleting = useSelector((state) => selectIsDeleting(state, doc.id));

    return (
      <div className={styles.documentCard}>
        {/* File Icon and Name */}
        <div className={styles.cardHeader}>
          <div className={styles.fileInfo}>
            <div className={styles.fileName}>
              {truncateText(doc.original_name, 40)}
            </div>
            <div className={styles.fileMeta}>
              <span className={styles.fileType}>
                {doc.mime_type.split("/")[1]?.toUpperCase() || "FILE"}
              </span>
              <span className={styles.fileSeparator}>•</span>
              <span className={styles.fileSize}>
                {formatFileSize(doc.size_bytes)}
              </span>
            </div>
          </div>
        </div>

        {/* Creator and Date Info */}
        <div className={styles.cardMeta}>
          <div className={styles.metaItem}>
            <User size={14} className={styles.metaIcon} />
            <div className={styles.metaContent}>
              <div className={styles.metaLabel}>Created by</div>
              <div className={styles.metaValue}>{doc.creator.name}</div>
            </div>
          </div>
          <div className={styles.metaItem}>
            <Calendar size={14} className={styles.metaIcon} />
            <div className={styles.metaContent}>
              <div className={styles.metaLabel}>Date uploaded</div>
              <div className={styles.metaValue}>
                {formatDate(doc.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.cardActions}>
          <button
            className={`${styles.actionButton} ${styles.downloadButton}`}
            onClick={() => onDownload(doc)}
            disabled={downloading || deleting}
            title="Download"
          >
            {downloading ? (
              <Loader2 className={styles.spinner} size={16} />
            ) : (
              <Download size={16} />
            )}
            <span>Download</span>
          </button>
          <button
            className={`${styles.actionButton} ${styles.deleteButton}`}
            onClick={() => onDelete(doc)}
            disabled={downloading || deleting}
            title="Delete"
          >
            {deleting ? (
              <Loader2 className={styles.spinner} size={16} />
            ) : (
              <Trash2 size={16} />
            )}
            <span>Delete</span>
          </button>
        </div>
      </div>
    );
  },
);

DocumentCard.displayName = "DocumentCard";

export default DocumentManager;
