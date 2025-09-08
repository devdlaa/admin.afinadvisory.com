import { useState, useEffect } from "react";

import {
  MoreVertical,
  Edit,
  Trash2,
  Key,
  Mail,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  LockKeyholeOpen,
} from "lucide-react";

import {
  Menu,
  MenuItem,
  IconButton,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import "./UsersTable.scss";
import { useSelector } from "react-redux";

const UsersTable = ({
  users,
  onEdit,
  onPermissions,
  onDelete,
  onResendInvite,
  currentPage,
  totalPages,
  onPageChange,
  totalUsers,
  resettingPassword,
  onPasswordResetLinkSend,
}) => {
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [open, setOpen] = useState(false);
  const [alert, setAlert] = useState(null);

  const {
    reinviting,
    reinviteError,
    sentReinvite,
    inviting,
    loading,
    updating,
  } = useSelector((state) => state.user);

  useEffect(() => {
    if (reinviting === false && reinviteError) {
      setAlert(<Alert severity="warning">{reinviteError}</Alert>);
      setOpen(true);
    } else if (reinviting === false && sentReinvite) {
      setAlert(<Alert severity="success">Re-invitation Sent!</Alert>);
      setOpen(true);
    }
  }, [reinviting, reinviteError, sentReinvite]);

  const handleClose = () => {
    setOpen(false);
  };
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { icon: CheckCircle, class: "status-active", label: "Active" },
      pending: { icon: Clock, class: "status-pending", label: "Pending" },
      disabled: { icon: XCircle, class: "status-disabled", label: "Disabled" },
    };

    const config = statusConfig[status] || statusConfig.disabled;
    const Icon = config.icon;

    return (
      <span className={`status-badge ${config.class}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    return (
      <span className={`role-badge role-${role}`}>
        <Shield size={12} />
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleMenuClick = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleMenuAction = (action) => {
    if (selectedUser) {
      action(selectedUser);
    }
    handleMenuClose();
  };

  const sortedUsers = [...users].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-btn ${currentPage === i ? "active" : ""}`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>
      );
    }

    return pages;
  };

  return (
    <>
      <Snackbar
        open={open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {alert}
      </Snackbar>
      <div className="users-table-container">
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("name")} className="sortable">
                  <span>Name</span>
                  <div
                    className={`sort-indicator ${
                      sortField === "name" ? sortDirection : ""
                    }`}
                  />
                </th>
                <th onClick={() => handleSort("email")} className="sortable">
                  <span>Email</span>
                  <div
                    className={`sort-indicator ${
                      sortField === "email" ? sortDirection : ""
                    }`}
                  />
                </th>
                <th onClick={() => handleSort("role")} className="sortable">
                  <span>Role</span>
                  <div
                    className={`sort-indicator ${
                      sortField === "role" ? sortDirection : ""
                    }`}
                  />
                </th>
                <th
                  onClick={() => handleSort("department")}
                  className="sortable"
                >
                  <span>Department</span>
                  <div
                    className={`sort-indicator ${
                      sortField === "department" ? sortDirection : ""
                    }`}
                  />
                </th>
                <th onClick={() => handleSort("status")} className="sortable">
                  <span>Status</span>
                  <div
                    className={`sort-indicator ${
                      sortField === "status" ? sortDirection : ""
                    }`}
                  />
                </th>

                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user, index) => (
                <tr
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="table-row"
                >
                  <td className="name-cell">
                    <div className="user-info">
                      <div className="user-details">
                        <div className="user-name">{user.name}</div>
                        <div className="user-code">{user.employeeCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="email-cell">
                    <div className="email-info">
                      <span className="email">{user.email}</span>
                    </div>
                  </td>
                  <td>{getRoleBadge(user.role)}</td>
                  <td className="department-cell">
                    <span className="department">
                      {user.department || "Not assigned"}
                    </span>
                    <span className="designation">{user.designation}</span>
                  </td>
                  <td>{getStatusBadge(user.status)}</td>

                  <td className="actions-cell">
                    <IconButton
                      size="small"
                      className="actions-trigger"
                      onClick={(event) => {
                        if (!reinviting && !inviting && !loading && !updating) {
                          handleMenuClick(event, user);
                        }
                      }}
                    >
                      {reinviting || inviting || loading || updating ? (
                        <CircularProgress size={16} />
                      ) : (
                        <MoreVertical size={16} />
                      )}
                    </IconButton>
                    <Menu
                      anchorEl={anchorEl}
                      open={Boolean(anchorEl)}
                      onClose={handleMenuClose}
                      className="actions-dropdown"
                    >
                      <MenuItem
                        onClick={() => handleMenuAction(onEdit)}
                        className="dropdown-item"
                      >
                        <Edit size={16} style={{ marginRight: 8 }} />
                        <span>Edit User</span>
                      </MenuItem>

                      <MenuItem
                        onClick={() => handleMenuAction(onPermissions)}
                        className="dropdown-item"
                      >
                        <Key size={16} style={{ marginRight: 8 }} />
                        <span>Permissions</span>
                      </MenuItem>
                      {selectedUser?.status === "pending" && (
                        <MenuItem
                          disabled={reinviting}
                          onClick={() => handleMenuAction(onResendInvite)}
                          className="dropdown-item"
                        >
                          {reinviting ? (
                            <CircularProgress size={16} />
                          ) : (
                            <Mail size={16} style={{ marginRight: 8 }} />
                          )}

                          <span>Resend Invite</span>
                        </MenuItem>
                      )}
                      <MenuItem
                        onClick={() => {
                          if (!resettingPassword) {
                            handleMenuAction(onPasswordResetLinkSend);
                          }
                        }}
                        className="dropdown-item"
                        disabled={resettingPassword}
                      >
                        {resettingPassword ? (
                          <CircularProgress size={16} />
                        ) : (
                          <LockKeyholeOpen
                            size={16}
                            style={{ marginRight: 8 }}
                          />
                        )}

                        <span>Sent Password Link</span>
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleMenuAction(onDelete)}
                        className="dropdown-item delete-item"
                      >
                        <Trash2 size={16} style={{ marginRight: 8 }} />
                        <span>Delete User</span>
                      </MenuItem>
                    </Menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default UsersTable;
