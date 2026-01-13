import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  X,
  Mail,
  User,
  Briefcase,
  Shield,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Alert } from "@mui/material";

import { fetchPermissions, inviteUser } from "@/store/slices/userSlice";
import "./InviteUserDialog.scss";

const InviteUserDialog = ({ open, onClose, onInvite }) => {
  const dispatch = useDispatch();
  const {
    permissionsData,
    permissionsLoading,
    permissionsError,
    inviting,
    inviteError,
    inviteErrors,
  } = useSelector((state) => state.user);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    alternatePhone: "",
    department: "",
    designation: "",
    role: "MANAGER", // Fixed: Use uppercase role ID
    dateOfJoining: "",
    permissions: [],
  });

  const [errors, setErrors] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [invitationResult, setInvitationResult] = useState(null);

  // Load permissions when dialog opens
  useEffect(() => {
    if (open && !permissionsData) {
      dispatch(fetchPermissions());
    }
  }, [open, permissionsData, dispatch]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open && permissionsData) {
      const defaultRole = "MANAGER"; // Default role
      const defaultPermissions =
        permissionsData?.roleDefaults?.[defaultRole] || [];

      setFormData({
        name: "",
        email: "",
        phone: "",
        alternatePhone: "",
        department: "",
        designation: "",
        role: defaultRole,
        dateOfJoining: "",
        permissions: defaultPermissions,
      });
      setErrors({});
      setShowConfirmation(false);
      setInvitationResult(null);
    }
  }, [open, permissionsData]);

  // Handle API errors from Redux
  useEffect(() => {
    if (inviteErrors && inviteErrors.length > 0) {
      const fieldErrors = {};
      inviteErrors.forEach((error) => {
        if (
          error.field &&
          error.field !== "general" &&
          error.field !== "network"
        ) {
          fieldErrors[error.field] = error.message;
        }
      });
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
    }
  }, [inviteErrors]);

  const handleInputChange = (field, value) => {
    let newValue = value;

    // Special handling for different field types
    if (field === "dateOfJoining" && value) {
      try {
        const date = new Date(value);
        if (!isNaN(date)) {
          newValue = date.toISOString().split("T")[0];
        }
      } catch (error) {
        console.warn("Invalid date format:", error);
      }
    }

    // Clean phone numbers
    if ((field === "phone" || field === "alternatePhone") && value) {
      newValue = value.replace(/\D/g, "");
    }

    setFormData((prev) => ({ ...prev, [field]: newValue }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePermissionToggle = (permissionCode) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionCode)
        ? prev.permissions.filter((p) => p !== permissionCode)
        : [...prev.permissions, permissionCode],
    }));

    // Clear permissions error
    if (errors.permissions) {
      setErrors((prev) => ({ ...prev, permissions: "" }));
    }
  };

  const handleRoleChange = (roleId) => {
    const defaultPermissions = permissionsData?.roleDefaults?.[roleId] || [];

    setFormData((prev) => ({
      ...prev,
      role: roleId,
      permissions: defaultPermissions,
    }));

    // Clear role and permissions errors
    if (errors.role || errors.permissions) {
      setErrors((prev) => ({
        ...prev,
        role: "",
        permissions: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required field validations
    if (!formData.name?.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (formData.name.trim().length > 100) {
      newErrors.name = "Name must be less than 100 characters";
    }

    if (!formData.email?.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = "Phone number is required";
    } else {
      const cleanPhone = formData.phone.replace(/\s/g, "");
      if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
        newErrors.phone = "Phone number must be 10-15 digits";
      }
    }

    // Validate alternate phone if provided
    if (formData.alternatePhone?.trim()) {
      const cleanAltPhone = formData.alternatePhone.replace(/\s/g, "");
      if (!/^\+?[0-9]{10,15}$/.test(cleanAltPhone)) {
        newErrors.alternatePhone = "Alternate phone must be 10-15 digits";
      }
    }

    if (!formData.role) {
      newErrors.role = "Role selection is required";
    }

    if (!formData.permissions || formData.permissions.length === 0) {
      newErrors.permissions = "At least one permission is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmInvite = async () => {
    setInvitationResult(null);

    try {
      // Prepare clean data for submission
      const submitData = {
        ...formData,
        name: formData.name?.trim(),
        email: formData.email?.trim().toLowerCase(),
        phone: formData.phone?.replace(/\s/g, ""),
        alternatePhone:
          formData.alternatePhone?.replace(/\s/g, "") || undefined,
        department: formData.department?.trim() || undefined,
        designation: formData.designation?.trim() || undefined,
      };

      // Remove undefined values
      Object.keys(submitData).forEach((key) => {
        if (submitData[key] === undefined || submitData[key] === "") {
          delete submitData[key];
        }
      });

      const result = await dispatch(inviteUser(submitData)).unwrap();

      setInvitationResult({
        type: "success",
        message: result.message || "User invited successfully",
        emailSent: result.data?.emailSent,
        userData: result.data,
      });

      // Call the parent callback if provided
      if (onInvite && typeof onInvite === "function") {
        onInvite(result.data);
      }

      // Auto-close after successful invitation
      setTimeout(() => {
        handleResetForm();
        onClose();
      }, 3000);
    } catch (error) {
      console.error("Invitation failed:", error);

      setInvitationResult({
        type: "error",
        message: error.message || "Failed to invite user",
        errors: error.errors || [],
      });

      // Go back to form if there are field-specific errors
      if (
        error.errors &&
        error.errors.some(
          (err) =>
            err.field && !["general", "network", "server"].includes(err.field)
        )
      ) {
        setShowConfirmation(false);
      }
    }
  };

  const handleResetForm = () => {
    const defaultRole = "MANAGER";
    const defaultPermissions =
      permissionsData?.roleDefaults?.[defaultRole] || [];

    setFormData({
      name: "",
      email: "",
      phone: "",
      alternatePhone: "",
      department: "",
      designation: "",
      role: defaultRole,
      dateOfJoining: "",
      permissions: defaultPermissions,
    });
    setErrors({});
    setShowConfirmation(false);
    setInvitationResult(null);
  };

  // Get available data from Redux store
  const availablePermissions = permissionsData?.permissions || [];
  const roles = permissionsData?.roles || [];

  // Group permissions by category and sort by permission code
  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    const category = permission.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {});

  // Sort permissions within each category by code
  Object.keys(groupedPermissions).forEach((category) => {
    groupedPermissions[category].sort((a, b) => a.code.localeCompare(b.code));
  });

  const isSubmitting = inviting;

  if (!open) return null;

  // Show loading state while fetching permissions
  if (permissionsLoading) {
    return (
      <div className="invite_new_user_dialog-overlay">
        <div className="dialog-container">
          <div className="invite-dialog">
            <div className="loading-content">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="loading-spinner"
              />
              <p>Loading permissions...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if permissions failed to load
  if (permissionsError) {
    return (
      <div className="invite_new_user_dialog-overlay">
        <div className="dialog-container">
          <div className="invite-dialog">
            <div className="error-content">
              <AlertTriangle size={24} />
              <p>Failed to load permissions data</p>
              <button
                className="btn btn-primary"
                onClick={() => dispatch(fetchPermissions())}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="invite_new_user_dialog-overlay" onClick={onClose}>
      <div className="dialog-container" onClick={(e) => e.stopPropagation()}>
        <div className="invite-dialog">
          <div className="dialog-header">
            <div className="dialog-title">
              <Mail className="title-icon" />
              Invite New User
            </div>
            <button className="dialog-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="dialog-content">
            {/* Show invitation result alert */}
            {invitationResult && (
              <Alert
                severity={
                  invitationResult?.type === "success" ? "success" : "error"
                }
                className="invitation-alert"
                style={{ marginBottom: "1rem" }}
              >
                <div>
                  {invitationResult?.message}
                  {invitationResult.type === "success" &&
                    !invitationResult.emailSent && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginTop: "0.5rem",
                          color: "#f57c00",
                        }}
                      >
                        <AlertTriangle size={16} />
                        Note: User was created but invitation email could not be
                        sent.
                      </div>
                    )}
                  {invitationResult.type === "error" &&
                    invitationResult.errors && (
                      <ul style={{ marginTop: "0.5rem", paddingLeft: "1rem" }}>
                        {invitationResult.errors.map((error, index) => (
                          <li key={index}>{error.message}</li>
                        ))}
                      </ul>
                    )}
                </div>
              </Alert>
            )}

            {/* Show Redux invite error if using Redux action */}
            {inviteError && !invitationResult && (
              <Alert severity="error" style={{ marginBottom: "1rem" }}>
                <div>{inviteError}</div>
              </Alert>
            )}

            {!showConfirmation ? (
              <form onSubmit={handleSubmit} className="invite-form">
                <div className="form-sections">
                  <div className="section_wrap">
                    {/* Personal Information */}
                    <div className="form-section">
                      <h3 className="section-title">
                        <User size={16} />
                        Personal Information
                      </h3>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Full Name *</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) =>
                              handleInputChange("name", e.target.value)
                            }
                            className={`form-input ${
                              errors.name ? "error" : ""
                            }`}
                            placeholder="Enter full name"
                            maxLength={100}
                          />
                          {errors.name && (
                            <span className="error-text">{errors.name}</span>
                          )}
                        </div>
                        <div className="form-group">
                          <label className="form-label">Email Address *</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              handleInputChange("email", e.target.value)
                            }
                            className={`form-input ${
                              errors.email ? "error" : ""
                            }`}
                            placeholder="Enter email address"
                          />
                          {errors.email && (
                            <span className="error-text">{errors.email}</span>
                          )}
                        </div>
                        <div className="form-group">
                          <label className="form-label">Phone Number *</label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) =>
                              handleInputChange("phone", e.target.value)
                            }
                            className={`form-input ${
                              errors.phone ? "error" : ""
                            }`}
                            placeholder="9876543210"
                            maxLength={15}
                          />
                          {errors.phone && (
                            <span className="error-text">{errors.phone}</span>
                          )}
                        </div>
                        <div className="form-group">
                          <label className="form-label">Alternate Phone</label>
                          <input
                            type="tel"
                            value={formData.alternatePhone}
                            onChange={(e) =>
                              handleInputChange(
                                "alternatePhone",
                                e.target.value
                              )
                            }
                            className={`form-input ${
                              errors.alternatePhone ? "error" : ""
                            }`}
                            placeholder="8765432109"
                            maxLength={15}
                          />
                          {errors.alternatePhone && (
                            <span className="error-text">
                              {errors.alternatePhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role & Permissions */}
                  <div className="form-section">
                    <h3 className="section-title">
                      <Shield size={16} />
                      Role & Permissions
                    </h3>

                    <div className="role-selection">
                      <label className="form-label">User Role *</label>
                      {errors.role && (
                        <span className="error-text">{errors.role}</span>
                      )}
                      <div className="role-options">
                        {roles.map((role) => (
                          <div
                            key={role.id}
                            className={`role-option ${
                              formData.role === role.id ? "selected" : ""
                            }`}
                            onClick={() => handleRoleChange(role.id)}
                          >
                            <div className="roal_box_wrapper">
                              <div className="role-radio">
                                {formData.role === role.id && (
                                  <div className="radio-dot" />
                                )}
                              </div>
                              <div className="role-info">
                                <div className="role-name">{role.label}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="permissions-section">
                      <label className="form-label">Permissions *</label>
                      {errors.permissions && (
                        <span className="error-text">{errors.permissions}</span>
                      )}
                      <div className="permissions-grid">
                        {Object.entries(groupedPermissions).map(
                          ([category, permissions]) => (
                            <div key={category} className="permission-category">
                              <h4 className="category-title">{category}</h4>
                              {permissions.map((permission) => {
                                const isChecked = formData.permissions.includes(
                                  permission.code
                                );
                                return (
                                  <label
                                    key={permission.id}
                                    className="permission-item"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        handlePermissionToggle(permission.code)
                                      }
                                      className="permission-checkbox"
                                    />
                                    <div
                                      className={`checkbox-custom ${
                                        isChecked ? "checked" : ""
                                      }`}
                                    >
                                      {isChecked && (
                                        <Check
                                          size={12}
                                          className="check-icon"
                                        />
                                      )}
                                    </div>
                                    <span className="permission-label">
                                      {permission.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    Review Invitation
                  </button>
                </div>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="confirmation-content"
              >
                <div className="confirmation-header">
                  <div className="confirmation-icon">
                    <Mail size={24} />
                  </div>
                  <h3>Confirm Invitation</h3>
                  <p>Please review the details before sending the invitation</p>
                </div>

                <div className="confirmation-details">
                  <div className="detail-group">
                    <strong>Name:</strong> {formData.name}
                  </div>
                  <div className="detail-group">
                    <strong>Email:</strong> {formData.email}
                  </div>
                  <div className="detail-group">
                    <strong>Phone:</strong> {formData.phone}
                  </div>
                  {formData.alternatePhone && (
                    <div className="detail-group">
                      <strong>Alternate Phone:</strong>{" "}
                      {formData.alternatePhone}
                    </div>
                  )}
                  <div className="detail-group">
                    <strong>Role:</strong>{" "}
                    {roles.find((r) => r.id === formData.role)?.label ||
                      formData.role}
                  </div>

                  <div className="detail-group">
                    <strong>Permissions:</strong> {formData.permissions.length}{" "}
                    permissions assigned
                  </div>
                </div>

                <div className="confirmation-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowConfirmation(false)}
                    disabled={isSubmitting}
                  >
                    Back to Edit
                  </button>
                  <button
                    className="btn btn-primary send-invite-btn"
                    onClick={handleConfirmInvite}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="loading-spinner"
                        />
                        Sending Invitation...
                      </>
                    ) : (
                      <>
                        <Mail size={16} />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteUserDialog;
