"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Plus,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Globe,
} from "lucide-react";

import {
  fetchInfluencers,
  deleteInfluencer,
  selectInfluencerList,
  selectInfluencerLoading,
  selectInfluencerPagination,
  resetInfluencerList,
} from "@/store/slices/influncersSlice.js";

import InfluencerDialog from "./components/InfluencerDialog/InfluencerDialog.jsx";
import InfluencersTable from "./components/InfluencersTable/InfluencersTable.jsx";
import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";
import styles from "./InfluencersPage.module.scss";

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */

export const PAGE_SIZE = 15;

export const SOCIAL_PLATFORMS = [
  "LINKEDIN",
  "TWITTER",
  "FACEBOOK",
  "INSTAGRAM",
  "YOUTUBE",
  "OTHER",
];

export const PLATFORM_COLORS = {
  LINKEDIN: "#0077b5",
  TWITTER: "#1da1f2",
  FACEBOOK: "#1877f2",
  INSTAGRAM: "#e1306c",
  YOUTUBE: "#ff0000",
  OTHER: "#6b7280",
};

export const PLATFORM_ICONS = {
  LINKEDIN: Linkedin,
  TWITTER: Twitter,
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
  YOUTUBE: Youtube,
  OTHER: Globe,
};

export const SORT_OPTIONS = [
  { label: "Newest first", sort_by: "created_at", sort_order: "desc" },
  { label: "Oldest first", sort_by: "created_at", sort_order: "asc" },
  { label: "Most references", sort_by: "reference_count", sort_order: "desc" },
  { label: "Fewest references", sort_by: "reference_count", sort_order: "asc" },
];

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */

export default function InfluencersPage() {
  const dispatch = useDispatch();

  const influencers = useSelector(selectInfluencerList);
  const loading = useSelector(selectInfluencerLoading);
  const pagination = useSelector(selectInfluencerPagination);

  /* ── UI State ── */
  const [search, setSearch] = useState("");
  const [sortIdx, setSortIdx] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  /* ── Debounced search ── */
  const debouncedSearch = useDebounce(search, 350);

  /* ── Fetch list (single source of truth) ── */
  useEffect(() => {
    dispatch(
      fetchInfluencers({
        page_size: PAGE_SIZE,
        ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
        sort_by: SORT_OPTIONS[sortIdx].sort_by,
        sort_order: SORT_OPTIONS[sortIdx].sort_order,
      }),
    );
  }, [debouncedSearch, sortIdx, dispatch]);

  /* ── Handlers ── */

  const handleSearchChange = (val) => {
    setSearch(val);
  };

  const handleClearSearch = () => {
    setSearch("");
  };

  const handleSort = (idx) => {
    setSortIdx(idx);
  };

  const handleLoadMore = () => {
    dispatch(
      fetchInfluencers({
        cursor: pagination.next_cursor,
        page_size: PAGE_SIZE,
        ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
        sort_by: SORT_OPTIONS[sortIdx].sort_by,
        sort_order: SORT_OPTIONS[sortIdx].sort_order,
      }),
    );
  };

  /* ── Dialog ── */

  const handleCreate = () => {
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleEdit = (id) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  const handleDialogClose = (result) => {
    setDialogOpen(false);
    setEditingId(null);

    if (result) {
      dispatch(
        fetchInfluencers({
          page_size: PAGE_SIZE,
          ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
          sort_by: SORT_OPTIONS[sortIdx].sort_by,
          sort_order: SORT_OPTIONS[sortIdx].sort_order,
        }),
      );
    }
  };

  /* ── Delete ── */

  const handleDeleteRequest = (inf) => {
    setDeleteError(null);
    setDeleteTarget(inf);
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    setDeleteError(null);

    const res = await dispatch(deleteInfluencer(deleteTarget.id));

    setDeleteLoading(false);

    if (res.error) {
      setDeleteError(
        typeof res.payload === "string"
          ? res.payload
          : "Could not delete influencer.",
      );
      return;
    }

    setDeleteTarget(null);

    dispatch(
      fetchInfluencers({
        page_size: PAGE_SIZE,
        ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
        sort_by: SORT_OPTIONS[sortIdx].sort_by,
        sort_order: SORT_OPTIONS[sortIdx].sort_order,
      }),
    );
  };

  return (
    <div className={styles.page}>
      <InfluencersTable
        influencers={influencers}
        loading={loading}
        pagination={pagination}
        search={search}
        sortIdx={sortIdx}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        onSortChange={handleSort}
        onLoadMore={handleLoadMore}
        onEdit={handleEdit}
        onDeleteRequest={handleDeleteRequest}
        onCreateClick={handleCreate}
      />

      <InfluencerDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        influencerId={editingId}
      />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={handleDeleteCancel}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        actionName={`Delete "${deleteTarget?.name}"?`}
        actionInfo={
          deleteError
            ? deleteError
            : (deleteTarget?.reference_count ?? 0) > 0
              ? `This influencer has ${deleteTarget.reference_count} lead reference${
                  deleteTarget.reference_count !== 1 ? "s" : ""
                } and cannot be deleted.`
              : "This action cannot be undone."
        }
        confirmText="Delete"
        variant="danger"
        confirmDisabled={
          !deleteError && (deleteTarget?.reference_count ?? 0) > 0
        }
      />
    </div>
  );
}
