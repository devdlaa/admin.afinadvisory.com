"use client";
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
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
  RefreshCw,
  Grid3x3,
  List,
  Pencil,
  Check,
} from "lucide-react";

import {
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  downloadDocument,
  renameDocument,
  setSearchQuery,
  setSortConfig,
  selectDocumentsForScope,
  selectSearchQuery,
  selectSortConfig,
  selectIsUploading,
  selectIsDownloading,
  selectIsDeleting,
  selectIsRenaming,
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [viewMode, setViewMode] = useState("list");

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
        forceRefresh: false,
      }),
    );
    setCurrentPage(1);
  }, [dispatch, scope, scopeId]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (doc) =>
        doc.original_name.toLowerCase().includes(query) ||
        doc.creator.name.toLowerCase().includes(query),
    );
  }, [items, searchQuery]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files && files[0]) {
        dispatch(uploadDocument({ file: files[0], scope, scopeId }));
      }
    },
    [dispatch, scope, scopeId],
  );

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) dispatch(uploadDocument({ file, scope, scopeId }));
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    dispatch(
      fetchDocuments({
        scope,
        scopeId,
        page: 1,
        sort: field,
        order: newOrder,
        forceRefresh: true,
      }),
    );
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    dispatch(
      fetchDocuments({
        scope,
        scopeId,
        page: 1,
        sort: sortConfig.sort,
        order: sortConfig.order,
        forceRefresh: true,
      }),
    );
    setCurrentPage(1);
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
        forceRefresh: false,
      }),
    );
  };

  const handleRename = (documentId, name) => {
    dispatch(renameDocument({ documentId, name }));
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
    <div
      className={styles.container}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragContent}>
            <Upload size={48} />
            <h3>Drop file to upload</h3>
            <p>Release to start uploading</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>Documents</h2>
            <span className={styles.count}>
              {pagination?.total_items || 0}{" "}
              {pagination?.total_items === 1 ? "file" : "files"}
            </span>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewButton} ${viewMode === "grid" ? styles.active : ""}`}
                onClick={() => setViewMode("grid")}
                title="Grid view"
              >
                <Grid3x3 size={18} />
              </button>
              <button
                className={`${styles.viewButton} ${viewMode === "list" ? styles.active : ""}`}
                onClick={() => setViewMode("list")}
                title="List view"
              >
                <List size={18} />
              </button>
            </div>

            <button
              className={styles.refreshButton}
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? styles.spinning : ""} />
            </button>

            <button
              className={styles.uploadButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={!!uploadingFile}
            >
              <Plus size={18} />
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </div>
        </div>

        <div className={styles.sortControls}>
          <button
            className={`${styles.sortButton} ${sortConfig.sort === "original_name" ? styles.active : ""}`}
            onClick={() => handleSort("original_name")}
          >
            Name <SortIcon field="original_name" />
          </button>
          <button
            className={`${styles.sortButton} ${sortConfig.sort === "created_at" ? styles.active : ""}`}
            onClick={() => handleSort("created_at")}
          >
            Date <SortIcon field="created_at" />
          </button>
          <button
            className={`${styles.sortButton} ${sortConfig.sort === "mime_type" ? styles.active : ""}`}
            onClick={() => handleSort("mime_type")}
          >
            Type <SortIcon field="mime_type" />
          </button>
        </div>
      </div>

      {/* Status */}
      <div className={styles.statusContainer}>
        {error && (
          <div className={styles.errorBanner}>
            <span>{error}</span>
            <button onClick={() => dispatch(clearError())}>
              <X size={16} />
            </button>
          </div>
        )}
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

      {/* Content */}
      {loading && currentPage === 1 ? (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} size={40} />
          <p>Loading documents...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className={styles.emptyState}>
          <section>
            <div className={styles.emptyIcon}>
              <FileText size={64} />
            </div>
            <h3>No documents yet</h3>
            <p>Upload your first document or drag and drop files here</p>
          </section>
        </div>
      ) : (
        <>
          <div
            className={
              viewMode === "grid" ? styles.documentsGrid : styles.documentsList
            }
          >
            {filteredItems.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                viewMode={viewMode}
                onDownload={handleDownload}
                onDelete={handleDeleteClick}
                onRename={handleRename}
                formatFileSize={formatFileSize}
                formatDate={formatDate}
              />
            ))}
          </div>

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
                    Load More <ChevronDown size={18} />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

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

// ── DocumentCard ──────────────────────────────────────────────────

const DocumentCard = React.memo(
  ({
    doc,
    viewMode,
    onDownload,
    onDelete,
    onRename,
    formatFileSize,
    formatDate,
  }) => {
    const downloading = useSelector((state) =>
      selectIsDownloading(state, doc.object_key),
    );
    const deleting = useSelector((state) => selectIsDeleting(state, doc.id));
    const renaming = useSelector((state) => selectIsRenaming(state, doc.id));

    const [editMode, setEditMode] = useState(false);
    const [draftName, setDraftName] = useState("");
    const inputRef = useRef(null);
    const wasRenamingRef = useRef(false);

    // When renaming flips from true → false, close edit mode
    useEffect(() => {
      if (wasRenamingRef.current && !renaming) {
        setEditMode(false);
        setDraftName("");
      }
      wasRenamingRef.current = renaming;
    }, [renaming]);

    // Strip extension for display in the input — we preserve it on the backend
    const getBaseName = (filename) => {
      const lastDot = filename.lastIndexOf(".");
      return lastDot > 0 ? filename.slice(0, lastDot) : filename;
    };

    const getFileExtension = (filename) => {
      const ext = filename.split(".").pop().toUpperCase();
      return ext.length > 4 ? "FILE" : ext;
    };

    const startEdit = () => {
      setDraftName(getBaseName(doc.original_name));
      setEditMode(true);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    };

    const cancelEdit = () => {
      setEditMode(false);
      setDraftName("");
    };

    const commitEdit = () => {
      const trimmed = draftName.trim();
      if (!trimmed || trimmed === getBaseName(doc.original_name)) {
        cancelEdit();
        return;
      }
      onRename(doc.id, trimmed);
      setEditMode(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === "Enter") commitEdit();
      if (e.key === "Escape") cancelEdit();
    };

    const busy = downloading || deleting || renaming;

    if (viewMode === "list") {
      return (
        <div className={styles.documentRow}>
          <div className={styles.rowMain}>
            <div className={styles.rowIcon}>
              <FileText size={20} />
            </div>
            <div className={styles.rowInfo}>
              {editMode ? (
                <div className={styles.renameRow}>
                  <input
                    ref={inputRef}
                    className={styles.renameInput}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={renaming}
                    maxLength={240}
                  />
                  <span className={styles.renameExt}>
                    .{doc.original_name.split(".").pop()}
                  </span>
                </div>
              ) : (
                <div className={styles.rowName}>
                  {truncateText(doc.original_name, 30)}
                </div>
              )}
              <div className={styles.rowMeta}>
                <span className={styles.metaChip}>
                  {getFileExtension(doc.original_name)}
                </span>
                <span className={styles.metaDot}>•</span>
                <span>{formatFileSize(doc.size_bytes)}</span>
                <span className={styles.metaDot}>•</span>
                <span>{doc.creator.name}</span>
                <span className={styles.metaDot}>•</span>
                <span>{formatDate(doc.created_at)}</span>
              </div>
            </div>
          </div>

          <div className={styles.rowActions}>
            {editMode ? ( // In edit mode: only show confirm + cancel inline in the renameRow,
              // hide download & delete entirely so the row stays clean
              <>
                <button
                  className={`${styles.renameConfirm} ${styles.iconButton}`}
                  onClick={commitEdit}
                  disabled={renaming || !draftName.trim()}
                >
                  {renaming ? (
                    <Loader2 size={14} className={styles.spinner} />
                  ) : (
                    <Check size={14} />
                  )}
                </button>
                <button
                  className={`${styles.renameCancel} ${styles.iconButton}`}
                  onClick={cancelEdit}
                  disabled={renaming}
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  className={styles.iconButton}
                  onClick={startEdit}
                  disabled={busy}
                  title="Rename"
                >
                  <Pencil size={15} />
                </button>
                <button
                  className={styles.iconButton}
                  onClick={() => onDownload(doc)}
                  disabled={busy}
                  title="Download"
                >
                  {downloading ? (
                    <Loader2 className={styles.spinner} size={16} />
                  ) : (
                    <Download size={16} />
                  )}
                </button>
                <button
                  className={`${styles.iconButton} ${styles.deleteIcon}`}
                  onClick={() => onDelete(doc)}
                  disabled={busy}
                  title="Delete"
                >
                  {deleting ? (
                    <Loader2 className={styles.spinner} size={16} />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      );
    }

    // Grid card
    return (
      <div className={styles.documentCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon}>
            <FileText size={24} />
          </div>
          <div className={styles.fileType}>
            {getFileExtension(doc.original_name)}
          </div>
        </div>

        <div className={styles.cardBody}>
          {editMode ? (
            <div className={styles.renameBlock}>
              <div className={styles.renameRow}>
                <input
                  ref={inputRef}
                  className={styles.renameInput}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={renaming}
                  maxLength={240}
                />
                <span className={styles.renameExt}>
                  .{doc.original_name.split(".").pop()}
                </span>
              </div>
              <div className={styles.renameActions}>
                <button
                  className={styles.renameConfirm}
                  onClick={commitEdit}
                  disabled={renaming || !draftName.trim()}
                >
                  {renaming ? (
                    <Loader2 size={13} className={styles.spinner} />
                  ) : (
                    <Check size={13} />
                  )}
                  Save
                </button>
                <button
                  className={styles.renameCancel}
                  onClick={cancelEdit}
                  disabled={renaming}
                >
                  <X size={13} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <h4 className={styles.fileName} title={doc.original_name}>
              {truncateText(doc.original_name, 25)}
            </h4>
          )}
          <div className={styles.fileSize}>
            {formatFileSize(doc.size_bytes)}
          </div>
        </div>

        <div className={styles.cardFooter}>
          <div className={styles.footerInfo}>
            <div className={styles.infoRow}>
              <User size={12} />
              <span>{doc.creator.name}</span>
            </div>
            <div className={styles.infoRow}>
              <Calendar size={12} />
              <span>{formatDate(doc.created_at)}</span>
            </div>
          </div>
          <div className={styles.cardActions}>
            {!editMode && (
              <button
                className={styles.iconButton}
                onClick={startEdit}
                disabled={busy}
                title="Rename"
              >
                <Pencil size={15} />
              </button>
            )}
            <button
              className={styles.iconButton}
              onClick={() => onDownload(doc)}
              disabled={busy}
              title="Download"
            >
              {downloading ? (
                <Loader2 className={styles.spinner} size={16} />
              ) : (
                <Download size={16} />
              )}
            </button>
            <button
              className={`${styles.iconButton} ${styles.deleteIcon}`}
              onClick={() => onDelete(doc)}
              disabled={busy}
              title="Delete"
            >
              {deleting ? (
                <Loader2 className={styles.spinner} size={16} />
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  },
);

DocumentCard.displayName = "DocumentCard";

export default DocumentManager;
