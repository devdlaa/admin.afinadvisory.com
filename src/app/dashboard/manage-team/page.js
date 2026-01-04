// UsersPage.jsx
"use client";
import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  Plus,
  Search,
  Download,
  RefreshCw,
  Users,
  UserCheck,
  Clock,
  Shield,
  X,
  Loader2,
} from "lucide-react";

import {
  fetchUsers,
  setSearchTerm,
  setSelectedRole,
  setSelectedStatus,
  setCurrentPage,
  clearFilters,
  fetchPermissions,
  resendInvite,
  resetUserOnboarding,
  sendPasswordResetLink,
  toggleUserStatus,
} from "@/store/slices/userSlice";

import InviteUserDialog from "../../components/InviteUserDialog/InviteUserDialog";
import EditUserDialog from "../../components/EditUserDialog/EditUserDialog";
import PermissionsDialog from "../../components/PermissionsDialog/PermissionsDialog";
import DeleteUserDialog from "../../components/DeleteUserDialog/DeleteUserDialog";
import UsersTable from "../../components/UsersTable/UsersTable";

import "./UsersPage.scss";

const UsersPage = () => {
  const dispatch = useDispatch();
  const {
    users,
    searchTerm,
    selectedRole,
    selectedStatus,
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    loading,
    error,
    permissionsData,
    permissionsLoading,
    permissionsError,
    resettingOnboarding,
    resettingPassword,
    togglingStatus,
  } = useSelector((state) => state.user);

  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchInput, setSearchInput] = useState("");

  // Load initial users on component mount
  useEffect(() => {
    dispatch(fetchUsers({ page: 1, limit: itemsPerPage }));
    if (!permissionsData) {
      dispatch(fetchPermissions());
    }
  }, [dispatch, itemsPerPage]);

  // Fetch users when filters change
  useEffect(() => {
    const filters = {
      page: currentPage,
      limit: itemsPerPage,
    };

    if (selectedStatus) filters.status = selectedStatus;
    if (searchTerm) filters.search = searchTerm;

    dispatch(fetchUsers(filters));
  }, [dispatch, currentPage, itemsPerPage, selectedStatus, searchTerm]);

  // Handle search functionality
  const handleSearch = () => {
    if (!searchInput.trim()) return;

    dispatch(setSearchTerm(searchInput.trim()));
    dispatch(setCurrentPage(1));
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchInput("");
    dispatch(setSearchTerm(""));
    dispatch(setCurrentPage(1));
  };

  // Handle filter changes
  const handleRoleChange = (value) => {
    dispatch(setSelectedRole(value));
    dispatch(setCurrentPage(1));
  };

  const handleStatusChange = (value) => {
    dispatch(setSelectedStatus(value));
    dispatch(setCurrentPage(1));
  };

  const handleClearFilters = () => {
    setSearchInput("");
    dispatch(clearFilters());
  };

  const handlePageChange = (page) => {
    dispatch(setCurrentPage(page));
  };

  // Client-side role filtering (since API doesn't support it)
  const displayUsers = useMemo(() => {
    if (!selectedRole) return users;
    return users.filter((user) => user.admin_role === selectedRole);
  }, [users, selectedRole]);

  // Analytics calculations
  const analytics = useMemo(() => {
    return {
      total: totalItems || 0,
      active: users?.filter((u) => u.status === "ACTIVE").length || 0,
      pending: users?.filter((u) => u.status === "INACTIVE").length || 0,
      admins:
        users?.filter(
          (u) => u.admin_role === "ADMIN" || u.admin_role === "SUPER_ADMIN"
        ).length || 0,
    };
  }, [users, totalItems]);

  return (
    <div className="users-page">
      <div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header Section */}
        <div className="page-header">
          <div className="header-content">
            <div className="header-text">
              <h1>User Management</h1>
              <p>
                Centralized control for employee accounts, roles, and access
                permissions
              </p>
            </div>
            <div className="header-actions">
              <button
                className="btn btn-primary"
                onClick={() => setInviteDialogOpen(true)}
              >
                <Plus size={18} />
                <span>Invite New User</span>
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="analytics-section">
          <div
            className="metric-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="metric-icon">
              <Users size={24} />
            </div>
            <div className="metric-data">
              <div className="metric-value">{analytics.total}</div>
              <div className="metric-label">Total Users</div>
            </div>
          </div>

          <div
            className="metric-card metric-active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="metric-icon">
              <UserCheck size={24} />
            </div>
            <div className="metric-data">
              <div className="metric-value">{analytics.active}</div>
              <div className="metric-label">Active Users</div>
            </div>
          </div>

          <div
            className="metric-card metric-pending"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="metric-icon">
              <Clock size={24} />
            </div>
            <div className="metric-data">
              <div className="metric-value">{analytics.pending}</div>
              <div className="metric-label">Pending Invites</div>
            </div>
          </div>

          <div
            className="metric-card metric-admin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="metric-icon">
              <Shield size={24} />
            </div>
            <div className="metric-data">
              <div className="metric-value">{analytics.admins}</div>
              <div className="metric-label">Administrators</div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div
          className="control-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="search-section">
            <div className="search-field">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search by name, email, phone, or user code..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="search-input"
              />
              {searchTerm && (
                <button
                  className="clear-search-btn"
                  onClick={handleClearSearch}
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="filters-section">
            <div className="filter-group">
              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="filter-select"
              >
                <option value="">All Roles</option>
                {permissionsData?.roles?.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>

              <button className="btn btn-ghost" onClick={handleClearFilters}>
                <RefreshCw size={16} />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Mode Indicator */}
        {searchTerm && (
          <div
            className="search-mode-indicator"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="search-info">
              <Search size={16} />
              <span>Showing search results for "{searchTerm}"</span>
              <span className="result-count">
                ({displayUsers.length} found)
              </span>
            </div>
            <button
              onClick={handleClearSearch}
              className="btn btn-ghost btn-sm"
            >
              <X size={14} />
              Clear Search
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-container">
            <Loader2 className="animate-spin" size={24} />
            <span>Loading users...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-container">
            <div className="error-message">
              <span>Error: {error}</span>
              <button
                onClick={() =>
                  dispatch(fetchUsers({ page: 1, limit: itemsPerPage }))
                }
                className="btn btn-sm btn-secondary"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Data Table Container */}
        {!loading && (
          <div
            className="data-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <UsersTable
              users={displayUsers}
              onEdit={(user) => {
                setSelectedUser(user);
                setEditDialogOpen(true);
              }}
              onPermissions={(user) => {
                setSelectedUser(user);
                setPermissionsDialogOpen(true);
              }}
              onDelete={(user) => {
                setSelectedUser(user);
                setDeleteDialogOpen(true);
              }}
              onOnboardingResetLinkSend={(user) => {
                dispatch(resetUserOnboarding({ userId: user?.id }));
              }}
              onResetPwdLinkSend={(user) => {
                dispatch(sendPasswordResetLink({ userId: user?.id }));
              }}
              onToggleAccountStatus={(user) => {
                dispatch(toggleUserStatus({ userId: user?.id }));
              }}
              onResendInvite={(user) => {
                dispatch(resendInvite({ userId: user?.id }));
              }}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalUsers={totalItems}
              loading={loading}
              togglingStatus={togglingStatus}
              resettingOnboarding={resettingOnboarding}
              resettingPassword={resettingPassword}
            />
          </div>
        )}

        {/* Modal Dialogs */}
        {inviteDialogOpen && (
          <InviteUserDialog
            open={inviteDialogOpen}
            onClose={() => setInviteDialogOpen(false)}
            onInvite={(userData) => {
              setInviteDialogOpen(false);
            }}
          />
        )}

        {editDialogOpen && selectedUser && (
          <EditUserDialog
            open={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setSelectedUser(null);
            }}
            onSave={(userData) => {
              setEditDialogOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
          />
        )}

        {permissionsDialogOpen && selectedUser && (
          <PermissionsDialog
            open={permissionsDialogOpen}
            onClose={() => {
              setPermissionsDialogOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
          />
        )}

        {deleteDialogOpen && selectedUser && (
          <DeleteUserDialog
            open={deleteDialogOpen}
            onClose={() => {
              setDeleteDialogOpen(false);
              setSelectedUser(null);
            }}
            onDelete={() => {
              setDeleteDialogOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
          />
        )}
      </div>
    </div>
  );
};

export default UsersPage;
