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
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialPermissions, setInitialPermissions] = useState([]);

  // Get user's current permission codes
  const getUserPermissionCodes = (user) => {
    if (!user?.permissions) return [];

    // If permissions is already an array of codes (strings)
    if (
      Array.isArray(user.permissions) &&
      typeof user.permissions[0] === "string"
    ) {
      return user.permissions;
    }

    // If permissions is an array of objects with permission.code or just code
    if (Array.isArray(user.permissions)) {
      return user.permissions
        .map((p) => {
          // Handle different possible structures
          if (typeof p === "string") return p;
          if (p.permission?.code) return p.permission.code;
          if (p.code) return p.code;
          return null;
        })
        .filter(Boolean);
    }

    return [];
  };

  // Fetch permissions data on component mount
  useEffect(() => {
    if (open && !permissionsData) {
      dispatch(fetchPermissions());
    }
  }, [open, permissionsData, dispatch]);

  // Initial data setup - Set both selected and initial permissions
  useEffect(() => {
    if (open && user) {
      const currentPermissions = getUserPermissionCodes(user);
      
      setSelectedPermissions([...currentPermissions]);
      setInitialPermissions([...currentPermissions]);
      setHasChanges(false);
    }
  }, [open, user]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedPermissions([]);
      setInitialPermissions([]);
      setHasChanges(false);
    }
  }, [open]);

  // Track changes by comparing with initial permissions
  useEffect(() => {
    if (initialPermissions.length > 0 || selectedPermissions.length > 0) {
      const permissionsChanged =
        JSON.stringify([...selectedPermissions].sort()) !==
        JSON.stringify([...initialPermissions].sort());
      setHasChanges(permissionsChanged);
    }
  }, [selectedPermissions, initialPermissions]);

  const handlePermissionToggle = (permissionCode) => {
    setSelectedPermissions((prev) => {
      const newPermissions = prev.includes(permissionCode)
        ? prev.filter((p) => p !== permissionCode)
        : [...prev, permissionCode];

      return newPermissions;
    });
  };

  const handleSelectAll = (category) => {
    if (!permissionsData?.permissions) return;

    // Fixed: Get category permissions from permissionsData.permissions
    const categoryPermissions = permissionsData.permissions
      .filter((p) => p.category === category)
      .map((p) => p.code);

    const allSelected = categoryPermissions.every((p) =>
      selectedPermissions.includes(p)
    );

    if (allSelected) {
      // Deselect all from this category
      setSelectedPermissions((prev) =>
        prev.filter((p) => !categoryPermissions.includes(p))
      );
    } else {
      // Select all from this category
      setSelectedPermissions((prev) => [
        ...new Set([...prev, ...categoryPermissions]),
      ]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasChanges || !user) return;

    try {
      await dispatch(
        updateUserPermissions({
          userId: user.id,
          permissionCodes: selectedPermissions,
        })
      ).unwrap();

      // Update initial permissions to reflect the save
      setInitialPermissions([...selectedPermissions]);
      setHasChanges(false);

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

  const getPermissionLevel = (permissionCode) => {
    if (!permissionCode) return "basic";

    const criticalKeywords = [
      "delete",
      "reject_refund",
      "initiate_refund",
      "manage",
    ];
    const advancedKeywords = ["create", "update", "assign", "alter"];

    if (criticalKeywords.some((keyword) => permissionCode.includes(keyword))) {
      return "critical";
    }

    if (advancedKeywords.some((keyword) => permissionCode.includes(keyword))) {
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
  const groupedPermissions = permissionsData.permissions.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push({
        ...permission,
        level: getPermissionLevel(permission.code),
      });
      return acc;
    },
    {}
  );

  // Sort permissions within each category
  Object.keys(groupedPermissions).forEach((category) => {
    groupedPermissions[category].sort((a, b) => a.code.localeCompare(b.code));
  });

  // Get role label
  const getRoleLabel = (role) => {
    const roleLabels = {
      SUPER_ADMIN: "Super Admin",
      ADMIN: "Admin",
      MANAGER: "Manager",
      EMPLOYEE: "Employee",
      VIEW_ONLY: "View Only",
    };
    return roleLabels[role] || role;
  };

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
                  <span
                    className={`pd-current-role pd-role-${user.admin_role?.toLowerCase()}`}
                  >
                    Current Role: {getRoleLabel(user.admin_role)}
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

              {/* Permissions Section */}
              <div className="pd-permissions-section">
                <h3 className="pd-section-title">
                  <Key size={16} />
                  Custom Permissions ({selectedPermissions.length} selected)
                </h3>

                <div className="pd-permissions-grid">
                  {Object.entries(groupedPermissions).map(
                    ([category, permissions]) => {
                      const categoryPermissions = permissions.map(
                        (p) => p.code
                      );
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
                                permission.code
                              );

                              return (
                                <label
                                  key={permission.code}
                                  className="pd-permission-item"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      handlePermissionToggle(permission.code)
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
                          return getPermissionLevel(p) === "basic";
                        }).length
                      }
                    </span>
                    <span className="pd-stat-label">Basic</span>
                  </div>
                  <div className="pd-stat">
                    <span className="pd-stat-number">
                      {
                        selectedPermissions.filter((p) => {
                          return getPermissionLevel(p) === "advanced";
                        }).length
                      }
                    </span>
                    <span className="pd-stat-label">Advanced</span>
                  </div>
                  <div className="pd-stat">
                    <span className="pd-stat-number">
                      {
                        selectedPermissions.filter((p) => {
                          return getPermissionLevel(p) === "critical";
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
              {updating && <CircularProgress color="inherit" size={18} />}
              {updating ? "Updating..." : "Update Permissions"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionsDialog;
