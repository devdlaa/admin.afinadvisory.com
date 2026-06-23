"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Star,
  Edit,
  Trash2,
  MapPin,
  Mail,
  Phone,
  FileText,
  CreditCard,
} from "lucide-react";

import {
  fetchCompanyProfiles,
  selectListProfiles,
  selectPagination,
  selectProfileLoadingStates,
  selectProfileActiveStates,
  selectFilters,
  setFilters,
  resetFilters,
  deleteCompanyProfile,
  setDefaultCompanyProfile,
  selectProfileStatsCount,
} from "@/store/slices/companyProfileSlice";

import CompanyProfileDialog from "./components/CompanyProfileDialog/CompanyProfileDialog";

import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";
import styles from "./CompanyProfilesPage.module.scss";

export default function CompanyProfilesPage() {
  const dispatch = useDispatch();

  // Redux selectors
  const profiles = useSelector(selectListProfiles);
  const pagination = useSelector(selectPagination);
  const loadingStates = useSelector(selectProfileLoadingStates);
  const activeStates = useSelector(selectProfileActiveStates);
  const filters = useSelector(selectFilters);
  const stats = useSelector(selectProfileStatsCount);

  // Local state
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState(null);

  // Fetch profiles on mount
  useEffect(() => {
    dispatch(fetchCompanyProfiles({ page: 1 }));
  }, [dispatch]);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== filters.search) {
        dispatch(setFilters({ search: searchQuery }));
        dispatch(
          fetchCompanyProfiles({ ...filters, search: searchQuery, page: 1 }),
        );
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handlers
  const handleRefresh = () => {
    dispatch(fetchCompanyProfiles({ ...filters, page: pagination.page }));
  };

  const handleCreateNew = () => {
    setSelectedProfile(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEdit = (profile) => {
    setSelectedProfile(profile);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleDelete = (profile) => {
    setProfileToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (profileToDelete) {
      await dispatch(deleteCompanyProfile(profileToDelete.id));
      setDeleteDialogOpen(false);
      setProfileToDelete(null);
      dispatch(fetchCompanyProfiles({ ...filters, page: pagination.page }));
    }
  };

  const handleSetDefault = async (profileId) => {
    await dispatch(setDefaultCompanyProfile(profileId));
    dispatch(fetchCompanyProfiles({ ...filters, page: pagination.page }));
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    dispatch(setFilters(newFilters));
    dispatch(fetchCompanyProfiles({ ...newFilters, page: 1 }));
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    dispatch(resetFilters());
    dispatch(fetchCompanyProfiles({ page: 1 }));
  };

  const handlePageChange = (newPage) => {
    dispatch(fetchCompanyProfiles({ ...filters, page: newPage }));
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.headerTitle}>Company Profiles</h1>
            <p className={styles.headerSubtitle}>
              Manage your company information and settings
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
            }}
          >
            <button onClick={handleCreateNew} className={styles.newButton}>
              <Plus size={20} />
              New Profile
            </button>
            <button
              onClick={handleRefresh}
              disabled={loadingStates.loading}
              className={styles.refreshButton}
            >
              <RefreshCw
                className={loadingStates.loading ? styles.spinning : ""}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Profiles Grid */}
      <div className={styles.profilesSection}>
        {loadingStates.loading ? (
          <div className={styles.profilesGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className={styles.emptyState}>
            <Building2 className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>No profiles found</h3>
            <p className={styles.emptyText}>
              Get started by creating your first company profile
            </p>
            <button onClick={handleCreateNew} className={styles.emptyButton}>
              <Plus size={20} />
              Create Profile
            </button>
          </div>
        ) : (
          <div className={styles.profilesGrid}>
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
                isSettingDefault={loadingStates.deleteLoading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className={styles.pagination}>
          <div className={styles.paginationInner}>
            <p className={styles.paginationInfo}>
              Page {pagination.page} of {pagination.total_pages}
            </p>
            <div className={styles.paginationControls}>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.page || pagination.page === 1}
                className={styles.paginationButton}
              >
                Previous
              </button>
              <div className={styles.paginationNumbers}>
                {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === pagination.total_pages ||
                      (page >= pagination.page - 1 &&
                        page <= pagination.page + 1),
                  )
                  .map((page, index, array) => (
                    <>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span
                          key={`ellipsis-${page}`}
                          className={styles.ellipsis}
                        >
                          ...
                        </span>
                      )}
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`${styles.pageNumber} ${
                          page === pagination.page ? styles.active : ""
                        }`}
                      >
                        {page}
                      </button>
                    </>
                  ))}
              </div>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.has_more}
                className={styles.paginationButton}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CompanyProfileDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedProfile(null);
        }}
        mode={dialogMode}
        profile={selectedProfile}
        onSuccess={() => {
          setDialogOpen(false);
          setSelectedProfile(null);
          dispatch(fetchCompanyProfiles({ ...filters, page: pagination.page }));
        }}
      />

      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setProfileToDelete(null);
        }}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setProfileToDelete(null);
        }}
        onConfirm={confirmDelete}
        actionName="Delete Company Profile"
        actionInfo={`Are you sure you want to delete "${profileToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
const NA = <span className={styles.notAvailable}>Not available</span>;
// Profile Card Component
function ProfileCard({ profile, onEdit, onDelete }) {
  return (
    <div className={styles.profileCard}>
      {/* Default Badge */}
      {profile.is_default && (
        <div className={`${styles.badge} ${styles.default}`}>
          <Star size={12} fill="currentColor" />
          Default
        </div>
      )}

      {/* Status Badge */}
      {!profile.is_active && (
        <div className={`${styles.badge} ${styles.inactive}`}>Inactive</div>
      )}

      {/* Profile Info */}
      <div
        className={`${styles.profileContent} ${profile.is_default || !profile.is_active ? styles.withBadge : ""}`}
      >
        <h3 className={styles.profileName}>{profile.name}</h3>
        {profile.legal_name && (
          <p className={styles.profileLegalName}>{profile.legal_name}</p>
        )}

        <div className={styles.profileDetails}>
          <div className={styles.detailRow}>
            <FileText size={16} />
            <span className={styles.detailLabel}>PAN:</span>
            <span>{profile.pan || NA}</span>
          </div>

          <div className={styles.detailRow}>
            <CreditCard size={16} />
            <span className={styles.detailLabel}>GST:</span>
            <span>{profile.gst_number || NA}</span>
          </div>

          <div className={styles.detailRow}>
            <Mail size={16} />
            <span>{profile.email || NA}</span>
          </div>

          <div className={styles.detailRow}>
            <Phone size={16} />
            <span>{profile.phone || NA}</span>
          </div>

          <div className={styles.detailRow}>
            <MapPin size={16} />
            <span>
              {profile.city || profile.state
                ? [profile.city, profile.state].filter(Boolean).join(", ")
                : NA}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.profileActions}>
          <button
            onClick={() => onEdit(profile)}
            className={`${styles.actionButton} ${styles.edit}`}
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            onClick={() => onDelete(profile)}
            className={`${styles.actionButton} ${styles.delete}`}
          >
            <Trash2 size={16} /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// Skeleton Card Component
function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonLine}></div>
      <div className={`${styles.skeletonLine} ${styles.short}`}></div>
      <div className={styles.skeletonDetails}>
        <div className={styles.skeletonDetailLine}></div>
        <div className={`${styles.skeletonDetailLine} ${styles.medium}`}></div>
        <div className={styles.skeletonDetailLine}></div>
      </div>
      <div className={styles.skeletonActions}>
        <div className={styles.skeletonButton}></div>
        <div className={styles.skeletonButton}></div>
      </div>
    </div>
  );
}
