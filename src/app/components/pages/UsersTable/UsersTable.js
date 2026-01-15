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
  UserRound,
  AlertTriangle,
} from "lucide-react";

import {
  Menu,
  MenuItem,
  IconButton,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import styles from "./UsersTable.module.scss";
import { useSelector } from "react-redux";

const UsersTable = ({
  users,
  onEdit,
  onPermissions,
  onDelete,
  onResendInvite,

  resettingOnboarding,
  onOnboardingResetLinkSend,
  onResetPwdLinkSend,
  resettingPassword,
  onToggleAccountStatus,
  togglingStatus,
}) => {
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [open, setOpen] = useState(false);
  const [alert, setAlert] = useState(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    action: null,
    user: null,
  });

  const {
    reinviting,
    reinviteError,
    sentReinvite,
    inviting,
    loading,
    updating,
    resetPasswordError,
    sentPasswordReset,
    resetOnboardingError,
    sentOnboardingReset,
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

  useEffect(() => {
    if (resettingPassword === false && resetPasswordError) {
      setAlert(<Alert severity="warning">{resetPasswordError}</Alert>);
      setOpen(true);
    } else if (resettingPassword === false && sentPasswordReset) {
      setAlert(<Alert severity="success">Password Reset Link Sent!</Alert>);
      setOpen(true);
    }
  }, [resettingPassword, resetPasswordError, sentPasswordReset]);

  useEffect(() => {
    if (resettingOnboarding === false && resetOnboardingError) {
      setAlert(<Alert severity="warning">{resetOnboardingError}</Alert>);
      setOpen(true);
    } else if (resettingOnboarding === false && sentOnboardingReset) {
      setAlert(<Alert severity="success">Onboarding Reset Link Sent!</Alert>);
      setOpen(true);
    }
  }, [resettingOnboarding, resetOnboardingError, sentOnboardingReset]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleConfirmDialogClose = () => {
    setConfirmDialog({
      open: false,
      title: "",
      message: "",
      action: null,
      user: null,
    });
  };

  const handleConfirmAction = () => {
    if (confirmDialog.action && confirmDialog.user) {
      confirmDialog.action(confirmDialog.user);
    }
    handleConfirmDialogClose();
  };

  const showConfirmDialog = (title, message, action, user) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      action,
      user,
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: {
        icon: CheckCircle,
        class: styles.statusActive,
        label: "Active",
      },
      INACTIVE: { icon: Clock, class: styles.statusPending, label: "Inactive" },
      SUSPENDED: {
        icon: XCircle,
        class: styles.statusDisabled,
        label: "Suspended",
      },
    };

    const config = statusConfig[status] || statusConfig.INACTIVE;
    const Icon = config.icon;

    return (
      <span className={`${styles.statusBadge} ${config.class}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      SUPER_ADMIN: { label: "Super Admin", class: styles.roleSuperAdmin },
      ADMIN: { label: "Admin", class: styles.roleAdmin },
      MANAGER: { label: "Manager", class: styles.roleManager },
      EMPLOYEE: { label: "Employee", class: styles.roleEmployee },
      VIEW_ONLY: { label: "View Only", class: styles.roleViewOnly },
    };

    const config = roleConfig[role] || {
      label: role,
      class: styles.roleDefault,
    };

    return (
      <span className={`${styles.roleBadge} ${config.class}`}>
        <Shield size={12} />
        {config.label}
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

  const handlePasswordReset = () => {
    if (selectedUser) {
      showConfirmDialog(
        "Send Password Reset Link",
        `Are you sure you want to send a password reset link to ${selectedUser.name} (${selectedUser.email})? This will allow them to reset their password.`,
        onResetPwdLinkSend,
        selectedUser
      );
    }
    handleMenuClose();
  };

  const handleOnboardingReset = () => {
    if (selectedUser) {
      showConfirmDialog(
        "Reset Onboarding Flow",
        `Are you sure you want to reset the onboarding flow for ${selectedUser.name} (${selectedUser.email})? This will restart their entire onboarding process.`,
        onOnboardingResetLinkSend,
        selectedUser
      );
    }
    handleMenuClose();
  };

  const handleAccountToggle = () => {
    if (selectedUser) {
      showConfirmDialog(
        "Account Status Update",
        `Are you sure you want to update the account status for ${selectedUser.name} (${selectedUser.email})? This will Make the account Inactive or Active according to the current Status.`,
        onToggleAccountStatus,
        selectedUser
      );
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

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleConfirmDialogClose}
        className={styles.teamsManagementDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className={styles.dialogTitle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AlertTriangle size={24} color="#f59e0b" />
            {confirmDialog.title}
          </div>
        </DialogTitle>
        <DialogContent className={styles.dialogContent}>
          <Typography
            variant="body1"
            style={{ color: "#374151", lineHeight: 1.6 }}
          >
            {confirmDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions className={styles.dialogActions}>
          <Button
            onClick={handleConfirmDialogClose}
            variant="outlined"
            style={{
              borderColor: "#d1d5db",
              color: "#6b7280",
              textTransform: "none",
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            style={{
              backgroundColor: "#3b82f6",
              color: "white",
              textTransform: "none",
              fontWeight: 500,
            }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      <div className={styles.usersTableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.usersTable}>
            <thead>
              <tr>
                <th
                  onClick={() => handleSort("name")}
                  className={styles.sortable}
                >
                  <span>Name</span>
                  <div
                    className={`${styles.sortIndicator} ${
                      sortField === "name" ? styles[sortDirection] : ""
                    }`}
                  />
                </th>
                <th
                  onClick={() => handleSort("email")}
                  className={styles.sortable}
                >
                  <span>Email</span>
                  <div
                    className={`${styles.sortIndicator} ${
                      sortField === "email" ? styles[sortDirection] : ""
                    }`}
                  />
                </th>
                <th
                  onClick={() => handleSort("admin_role")}
                  className={styles.sortable}
                >
                  <span>Role</span>
                  <div
                    className={`${styles.sortIndicator} ${
                      sortField === "admin_role" ? styles[sortDirection] : ""
                    }`}
                  />
                </th>
                <th
                  onClick={() => handleSort("phone")}
                  className={styles.sortable}
                >
                  <span>Phone</span>
                  <div
                    className={`${styles.sortIndicator} ${
                      sortField === "phone" ? styles[sortDirection] : ""
                    }`}
                  />
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className={styles.sortable}
                >
                  <span>Status</span>
                  <div
                    className={`${styles.sortIndicator} ${
                      sortField === "status" ? styles[sortDirection] : ""
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
                  className={styles.tableRow}
                >
                  <td className={styles.nameCell}>
                    <div className={styles.userInfo}>
                      <div className={styles.userDetails}>
                        <div className={styles.userName}>{user.name}</div>
                        <div className={styles.userCode}>{user.user_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.emailCell}>
                    <div className={styles.emailInfo}>
                      <span className={styles.email}>{user.email}</span>
                    </div>
                  </td>
                  <td>{getRoleBadge(user.admin_role)}</td>
                  <td className={styles.departmentCell}>
                    <span className={styles.department}>{user.phone}</span>
                    {user.alternate_phone && (
                      <span className={styles.designation}>
                        {user.alternate_phone}
                      </span>
                    )}
                  </td>
                  <td>{getStatusBadge(user.status)}</td>

                  <td className={styles.actionsCell}>
                    <IconButton
                      size="small"
                      className={styles.actionsTrigger}
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
                      className={styles.actionsDropdown}
                    >
                      <MenuItem
                        onClick={() => handleMenuAction(onEdit)}
                        className={styles.dropdownItem}
                      >
                        <Edit size={16} style={{ marginRight: 8 }} />
                        <span>Edit User</span>
                      </MenuItem>

                      <MenuItem
                        onClick={() => handleMenuAction(onPermissions)}
                        className={styles.dropdownItem}
                      >
                        <Key size={16} style={{ marginRight: 8 }} />
                        <span>Permissions</span>
                      </MenuItem>

                      <MenuItem
                        onClick={handleAccountToggle}
                        className={styles.dropdownItem}
                        disabled={togglingStatus}
                      >
                        {togglingStatus ? (
                          <CircularProgress size={16} />
                        ) : (
                          <UserRound size={16} style={{ marginRight: 8 }} />
                        )}
                        <span>Account Status</span>
                      </MenuItem>
                      {selectedUser?.status === "INACTIVE" &&
                        !selectedUser?.onboarding_completed && (
                          <MenuItem
                            disabled={reinviting}
                            onClick={() => handleMenuAction(onResendInvite)}
                            className={styles.dropdownItem}
                          >
                            {reinviting ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Mail size={16} style={{ marginRight: 8 }} />
                            )}
                            <span>Resend Invite</span>
                          </MenuItem>
                        )}
                      {selectedUser?.status === "ACTIVE" &&
                        selectedUser?.onboarding_completed && (
                          <>
                            <MenuItem
                              onClick={handlePasswordReset}
                              className={styles.dropdownItem}
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
                              <span>Password Reset Link</span>
                            </MenuItem>

                            <MenuItem
                              onClick={handleOnboardingReset}
                              className={styles.dropdownItem}
                              disabled={resettingOnboarding}
                            >
                              {resettingOnboarding ? (
                                <CircularProgress size={16} />
                              ) : (
                                <UserRound
                                  size={16}
                                  style={{ marginRight: 8 }}
                                />
                              )}
                              <span>Onboarding Reset Flow</span>
                            </MenuItem>
                          </>
                        )}

                      <MenuItem
                        onClick={() => handleMenuAction(onDelete)}
                        className={`${styles.dropdownItem} ${styles.deleteItem}`}
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
