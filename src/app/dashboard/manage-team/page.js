// UsersPage.jsx
"use client";
import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { showSuccess,showError,showWarning } from "@/app/components/toastService";
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
  searchUsers,
  setSearchTerm,
  setSelectedDepartment,
  setSelectedRole,
  setSelectedStatus,
  setCurrentPage,
  clearFilters,
  clearSearch,
  setSearchMode,
  fetchPermissions,
  resendInvite,
  resetUserPassword,
} from "@/store/slices/userSlice";

import InviteUserDialog from "../../components/InviteUserDialog/InviteUserDialog";
import EditUserDialog from "../../components/EditUserDialog/EditUserDialog";
import PermissionsDialog from "../../components/PermissionsDialog/PermissionsDialog";
import DeleteUserDialog from "../../components/DeleteUserDialog/DeleteUserDialog";
import UsersTable from "../../components/UsersTable/UsersTable";

import "./UsersPage.scss";

const roles = ["admin", "user", "superAdmin"];
const statuses = ["active", "pending", "disabled"];

const UsersPage = () => {
  const dispatch = useDispatch();
  const {
    users,
    searchResults,
    isSearchMode,
    searchTerm,
    selectedDepartment,
    selectedRole,
    selectedStatus,
    currentPage,
    itemsPerPage,
    hasMore,
    nextCursor,
    loading,
    error,
    permissionsData,
    permissionsLoading,
    permissionsError,
    resettingPassword,
  } = useSelector((state) => state.user);

  // Dialog states (keeping local as they don't need global state)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchInput, setSearchInput] = useState("");

  // Load initial users on component mount
  useEffect(() => {
    dispatch(fetchUsers({ cursor: null, pageSize: itemsPerPage }));
    if (!permissionsData) {
      dispatch(fetchPermissions());
    }
  }, [dispatch, itemsPerPage]);

  // Filter logic for local filtering
  const getFilteredData = (dataToFilter) => {
    return dataToFilter?.filter((user) => {
      const matchesDepartment =
        !selectedDepartment || user.department === selectedDepartment;
      const matchesRole = !selectedRole || user.role === selectedRole;
      const matchesStatus = !selectedStatus || user.status === selectedStatus;

      return matchesDepartment && matchesRole && matchesStatus;
    });
  };

  // Get current display data based on search mode
  const displayUsers = useMemo(() => {
    const dataToFilter = isSearchMode ? searchResults : users;
    return getFilteredData(dataToFilter);
  }, [
    users,
    searchResults,
    isSearchMode,
    selectedDepartment,
    selectedRole,
    selectedStatus,
  ]);

  // Pagination for display data
  const totalPages = Math.ceil(displayUsers?.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = displayUsers?.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Handle search functionality
  const handleSearch = async () => {
    if (!searchInput.trim()) return;

    dispatch(setSearchTerm(searchInput));

    // First search in existing users
    const localMatches = users.filter((user) => {
      const term = searchInput.toLowerCase();
      return (
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.employeeCode?.toLowerCase().includes(term) ||
        user.phone?.includes(searchInput) ||
        user.userCode?.toLowerCase().includes(term)
      );
    });

    if (localMatches.length > 0) {
      dispatch(setSearchMode(true));
    }

    // Always make API call for comprehensive search
    try {
      await dispatch(searchUsers(searchInput.trim())).unwrap();
      dispatch(setCurrentPage(1));
    } catch (err) {
      console.error("Search failed:");
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchInput("");
    dispatch(clearSearch());
    dispatch(setCurrentPage(1));
  };

  // Handle load more for pagination
  const handleLoadMore = async () => {
    if (!hasMore || loading || isSearchMode) return;

    try {
      await dispatch(
        fetchUsers({ cursor: nextCursor, pageSize: itemsPerPage })
      ).unwrap();
    } catch (err) {
      console.error("Failed to load more users:");
    }
  };

  // Handle filter changes
  const handleDepartmentChange = (value) => {
    dispatch(setSelectedDepartment(value));
  };

  const handleRoleChange = (value) => {
    dispatch(setSelectedRole(value));
  };

  const handleStatusChange = (value) => {
    dispatch(setSelectedStatus(value));
  };

  const handleClearFilters = () => {
    dispatch(clearFilters());
  };

  const handlePageChange = (page) => {
    dispatch(setCurrentPage(page));
  };

  // Analytics calculations
  const analytics = useMemo(() => {
    const allUsers = isSearchMode ? searchResults : users;
    return {
      total: allUsers?.length,
      active: allUsers?.filter((u) => u.status === "active").length,
      pending: allUsers?.filter((u) => u.status === "pending").length,
      admins: allUsers?.filter((u) => u.role === "admin").length,
    };
  }, [users, searchResults, isSearchMode]);

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
                placeholder="Search by name, email, phone, or employee ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="search-input"
              />
              {isSearchMode && (
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
                value={selectedDepartment}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="filter-select"
              >
                <option value="">All Departments</option>
                {permissionsData?.departments?.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="filter-select"
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
              <button className="btn btn-ghost" onClick={handleClearFilters}>
                <RefreshCw size={16} />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Mode Indicator */}
        {isSearchMode && (
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
                  dispatch(fetchUsers({ cursor: null, pageSize: itemsPerPage }))
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
              users={paginatedUsers}
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
              onPasswordResetLinkSend={(user) => {
                dispatch(resetUserPassword({ email: user?.email }));
              }}
              onResendInvite={(user) => {
                dispatch(resendInvite({ email: user?.email || null }));
              }}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalUsers={displayUsers?.length}
              loading={loading}
              resettingPassword={resettingPassword}
            />

            {/* Load More Button (outside table for seamless experience) */}
            {!isSearchMode && hasMore && (
              <div className="load-more-section">
                <button
                  className="btn btn-outline btn-wide"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Load More Users</span>
                    </>
                  )}
                </button>
                <p className="load-more-info">
                  Showing {users.length} users • More available
                </p>
              </div>
            )}
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
            departments={permissionsData?.departments || []}
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
