import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Key, Shield, Check, AlertTriangle, X, Loader2 } from "lucide-react";

import {
  updateUserPermissions,
  fetchPermissions,
} from "@/store/slices/userSlice";
import "./PermissionsDialog.scss";
import { CircularProgress } from "@mui/material";

const PermissionsDialog = ({ open, onClose, user }) => {
  const dispatch = useDispatch();
  const {
    users,
    updating,
    updateError,
    permissionsData,
    permissionsLoading,
    permissionsError,
  } = useSelector((state) => state.user);

  // Local state for form
  const [selectedRole, setSelectedRole] = useState("user");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initial data setup - Reset form when dialog opens or user changes
  useEffect(() => {
    if (open && user) {
   
      setSelectedRole(user.role || "user");
      setSelectedPermissions([...(user.permissions || [])]);
      setHasChanges(false);
    }
  }, [open, user]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setHasChanges(false);
    }
  }, [open]);

  // Fetch permissions data on component mount
  useEffect(() => {
    if (open && !permissionsData) {
      dispatch(fetchPermissions());
    }
  }, [open, permissionsData, dispatch]);

  // Track changes
  useEffect(() => {
    if (user) {
      const roleChanged = selectedRole !== user.role;
      const permissionsChanged =
        JSON.stringify([...selectedPermissions].sort()) !==
        JSON.stringify([...(user.permissions || [])].sort());
      setHasChanges(roleChanged || permissionsChanged);
    }
  }, [selectedRole, selectedPermissions, user]);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    // Auto-select role default permissions
    if (permissionsData?.roleDefaults?.[role]) {
      setSelectedPermissions(permissionsData.roleDefaults[role]);
    }
  };

  const handlePermissionToggle = (permissionId) => {

    setSelectedPermissions((prev) => {
      const newPermissions = prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId];

      return newPermissions;
    });
  };

  const handleSelectAll = (category) => {
    if (!permissionsData?.availablePermissions) return;

    const categoryPermissions = permissionsData.availablePermissions
      .filter((p) => p.category === category)
      .map((p) => p.id);

    const allSelected = categoryPermissions.every((p) =>
      selectedPermissions.includes(p)
    );

    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((p) => !categoryPermissions.includes(p))
      );
    } else {
      setSelectedPermissions((prev) => [
        ...new Set([...prev, ...categoryPermissions]),
      ]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasChanges || !user) return;

    try {
      const updateData = {};

      // Only include changed fields
      if (selectedRole !== user.role) {
        updateData.role = selectedRole;
      }

      const permissionsChanged =
        JSON.stringify([...selectedPermissions].sort()) !==
        JSON.stringify([...(user.permissions || [])].sort());
      if (permissionsChanged) {
        updateData.permissions = selectedPermissions;
      }

   

      const result = await dispatch(
        updateUserPermissions({
          userId: user.id,
          ...updateData,
        })
      ).unwrap();

      
      // Update local state with the returned data if available
      if (result && result.user) {
        setSelectedRole(result.user.role || selectedRole);
        setSelectedPermissions([
          ...(result.user.permissions || selectedPermissions),
        ]);
      }

      onClose();
    } catch (error) {
      console.error("Error updating user permissions:", error);
    }
  };

  const getPermissionIcon = (level) => {
    switch (level) {
      case "critical":
        return (
          <AlertTriangle size={14} className="pd-permission-icon pd-critical" />
        );
      case "advanced":
        return <Shield size={14} className="pd-permission-icon pd-advanced" />;
      default:
        return <Check size={14} className="pd-permission-icon pd-basic" />;
    }
  };

  const getPermissionLevel = (permissionId) => {
    if (!permissionId) return "basic";

    const criticalKeywords = [
      "delete",
      "update",
      "alter-permissions",
      "reject_refund",
      "initiate_refund",
    ];

    const advancedKeywords = [
      "create",
      "invite",
      "access",
      "assign_member",
      "create_new_link",
      "update_paid_status",
      "reset_password",
      "resend_invite",
    ];

    if (criticalKeywords.some((keyword) => permissionId.includes(keyword))) {
      return "critical";
    }

    if (advancedKeywords.some((keyword) => permissionId.includes(keyword))) {
      return "advanced";
    }

    return "basic";
  };

  if (!open || !user) return null;

  if (permissionsLoading) {
    return (
      <div className="pd-dialog-overlay">
        <div className="pd-dialog-container">
          <div className="pd-permissions-dialog">
            <div className="pd-loading-container">
              <Loader2 size={24} className="animate-spin" />
              <p>Loading permissions...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (permissionsError || !permissionsData) {
    return (
      <div className="pd-dialog-overlay" onClick={onClose}>
        <div className="pd-dialog-container">
          <div className="pd-permissions-dialog">
            <div className="pd-error-container">
              <AlertTriangle size={24} />
              <p>{permissionsError || "Failed to load permissions data"}</p>
              <button
                onClick={() => dispatch(fetchPermissions())}
                className="pd-btn pd-btn-outline"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Group permissions by category
  const groupedPermissions = permissionsData.availablePermissions.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push({
        ...permission,
        level: getPermissionLevel(permission.id),
      });
      return acc;
    },
    {}
  );

  return (
    <div className="pd-dialog-overlay" onClick={onClose}>
      <div className="pd-dialog-container" onClick={(e) => e.stopPropagation()}>
        <div className="pd-permissions-dialog">
          <div className="pd-dialog-header">
            <div className="pd-dialog-title">
              <Key className="pd-title-icon" />
              Manage Permissions
            </div>
            <button className="pd-dialog-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="pd-dialog-content">
            <form onSubmit={handleSubmit} className="pd-permissions-form">
              <div className="pd-user-header">
                <div className="pd-user-avatar">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="pd-user-meta">
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                  <span className={`pd-current-role pd-role-${user.role}`}>
                    Current Role:{" "}
                    {user.role.charAt(0).toUpperCase() +
                      user.role.slice(1).replace("A", " A")}
                  </span>
                </div>
              </div>

              {updateError && (
                <div className="pd-error-banner">
                  <AlertTriangle size={16} />
                  <span>{updateError}</span>
                </div>
              )}

              <div className="pd-divider"></div>

              {/* Role Selection */}
              <div className="pd-role-section">
                <h3 className="pd-section-title">
                  <Shield size={16} />
                  User Role
                </h3>
                <div className="pd-role-options">
                  {permissionsData.roles.map((role) => (
                    <label
                      key={role.id}
                      className={`pd-role-option ${
                        selectedRole === role.id ? "pd-selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.id}
                        checked={selectedRole === role.id}
                        onChange={() => handleRoleChange(role.id)}
                        className="pd-role-radio"
                        disabled={updating}
                      />
                      <div className="pd-radio-custom">
                        {selectedRole === role.id && (
                          <div className="pd-radio-dot" />
                        )}
                      </div>
                      <div className="pd-role-info">
                        <div className="pd-role-name">{role.label}</div>
                        <div className="pd-role-desc">{role.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pd-divider"></div>

              {/* Permissions Section */}
              <div className="pd-permissions-section">
                <h3 className="pd-section-title">
                  <Key size={16} />
                  Custom Permissions ({selectedPermissions.length} selected)
                </h3>

                <div className="pd-permissions-grid">
                  {Object.entries(groupedPermissions).map(
                    ([category, permissions]) => {
                      const categoryPermissions = permissions.map((p) => p.id);
                      const allSelected = categoryPermissions.every((p) =>
                        selectedPermissions.includes(p)
                      );
                      const someSelected = categoryPermissions.some((p) =>
                        selectedPermissions.includes(p)
                      );

                      return (
                        <div key={category} className="pd-permission-category">
                          <div className="pd-category-header">
                            <h4 className="pd-category-title">{category}</h4>
                            <button
                              type="button"
                              onClick={() => handleSelectAll(category)}
                              className={`pd-select-all-btn ${
                                allSelected
                                  ? "pd-all-selected"
                                  : someSelected
                                  ? "pd-some-selected"
                                  : ""
                              }`}
                              disabled={updating}
                            >
                              {allSelected ? "Deselect All" : "Select All"}
                            </button>
                          </div>

                          <div className="pd-permissions-list">
                            {permissions.map((permission) => {
                              const isChecked = selectedPermissions.includes(
                                permission.id
                              );

                              return (
                                <label
                                  key={permission.id}
                                  className="pd-permission-item"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      handlePermissionToggle(permission.id)
                                    }
                                    className="pd-permission-checkbox"
                                    disabled={updating}
                                  />
                                  <div
                                    className={`pd-checkbox-custom ${
                                      isChecked ? "checked" : ""
                                    }`}
                                  >
                                    {isChecked && (
                                      <Check
                                        size={12}
                                        className="pd-check-icon"
                                      />
                                    )}
                                  </div>
                                  <div className="pd-permission-details">
                                    <span className="pd-permission-label">
                                      {permission.label}
                                    </span>
                                    <div className="pd-permission-level">
                                      {getPermissionIcon(permission.level)}
                                      <span
                                        className={`pd-level-text pd-${permission.level}`}
                                      >
                                        {permission.level}
                                      </span>
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="pd-divider"></div>

              {/* Summary */}
              <div className="pd-permissions-summary">
                <h4>Permission Summary</h4>
                <div className="pd-summary-stats">
                  <div className="pd-stat">
                    <span className="pd-stat-number">
                      {selectedPermissions.length}
                    </span>
                    <span className="pd-stat-label">Total Permissions</span>
                  </div>
                  <div className="pd-stat">
                    <span className="pd-stat-number">
                      {
                        selectedPermissions.filter((p) => {
                          const permission =
                            permissionsData.availablePermissions.find(
                              (ap) => ap.id === p
                            );
                          return (
                            getPermissionLevel(permission?.id || p) === "basic"
                          );
                        }).length
                      }
                    </span>
                    <span className="pd-stat-label">Basic</span>
                  </div>
                  <div className="pd-stat">
                    <span className="pd-stat-number">
                      {
                        selectedPermissions.filter((p) => {
                          const permission =
                            permissionsData.availablePermissions.find(
                              (ap) => ap.id === p
                            );
                          return (
                            getPermissionLevel(permission?.id || p) ===
                            "advanced"
                          );
                        }).length
                      }
                    </span>
                    <span className="pd-stat-label">Advanced</span>
                  </div>
                  <div className="pd-stat">
                    <span className="pd-stat-number">
                      {
                        selectedPermissions.filter((p) => {
                          const permission =
                            permissionsData.availablePermissions.find(
                              (ap) => ap.id === p
                            );
                          return (
                            getPermissionLevel(permission?.id || p) ===
                            "critical"
                          );
                        }).length
                      }
                    </span>
                    <span className="pd-stat-label">Critical</span>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="pd-form-actions">
            <button
              type="button"
              className="pd-btn pd-btn-outline"
              onClick={onClose}
              disabled={updating}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`pd-btn pd-btn-primary ${
                !hasChanges ? "pd-btn-disabled" : ""
              }`}
              onClick={handleSubmit}
              disabled={updating || !hasChanges}
            >
              {updating && <CircularProgress color="white" size={18} />}
              {updating ? "Updating..." : "Update Permissions"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionsDialog;
