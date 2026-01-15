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
import styles from  "./InviteUserDialog.module.scss";

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
      <div className={styles.invite_new_user_dialogOverlay}>
        <div className={styles.dialogContainer}>
          <div className={styles.inviteDialog}>
            <div className={styles.loadingContent}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className={styles.loadingSpinner}
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
      <div className={styles.invite_new_user_dialogOverlay}>
        <div className={styles.dialogContainer}>
          <div className={styles.inviteDialog}>
            <div className={styles.errorContent}>
              <AlertTriangle size={24} />
              <p>Failed to load permissions data</p>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
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
    <div className={styles.invite_new_user_dialogOverlay} onClick={onClose}>
      <div className={styles.dialogContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inviteDialog}>
          <div className={styles.dialogHeader}>
            <div className={styles.dialogTitle}>
              <Mail className={styles.titleIcon} />
              Invite New User
            </div>
            <button className={styles.dialogClose} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className={styles.dialogContent}>
            {/* Show invitation result alert */}
            {invitationResult && (
              <Alert
                severity={
                  invitationResult?.type === "success" ? "success" : "error"
                }
                className={styles.invitationAlert}
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
              <form onSubmit={handleSubmit} className={styles.inviteForm}>
                <div className={styles.formSections}>
                  <div className={styles.section_wrap}>
                    {/* Personal Information */}
                    <div className={styles.formSection}>
                      <h3 className={styles.sectionTitle}>
                        <User size={16} />
                        Personal Information
                      </h3>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Full Name *</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) =>
                              handleInputChange("name", e.target.value)
                            }
                            className={`${styles.formInput} ${ errors.name ? styles.error : "" }`}
                            placeholder="Enter full name"
                            maxLength={100}
                          />
                          {errors.name && (
                            <span className={styles.errorText}>{errors.name}</span>
                          )}
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Email Address *</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              handleInputChange("email", e.target.value)
                            }
                            className={`${styles.formInput} ${ errors.email ? styles.error : "" }`}
                            placeholder="Enter email address"
                          />
                          {errors.email && (
                            <span className={styles.errorText}>{errors.email}</span>
                          )}
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Phone Number *</label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) =>
                              handleInputChange("phone", e.target.value)
                            }
                            className={`${styles.formInput} ${ errors.phone ? styles.error : "" }`}
                            placeholder="9876543210"
                            maxLength={15}
                          />
                          {errors.phone && (
                            <span className={styles.errorText}>{errors.phone}</span>
                          )}
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Alternate Phone</label>
                          <input
                            type="tel"
                            value={formData.alternatePhone}
                            onChange={(e) =>
                              handleInputChange(
                                "alternatePhone",
                                e.target.value
                              )
                            }
                            className={`${styles.formInput} ${ errors.alternatePhone ? styles.error : "" }`}
                            placeholder="8765432109"
                            maxLength={15}
                          />
                          {errors.alternatePhone && (
                            <span className={styles.errorText}>
                              {errors.alternatePhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role & Permissions */}
                  <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>
                      <Shield size={16} />
                      Role & Permissions
                    </h3>

                    <div className={styles.roleSelection}>
                      <label className={styles.formLabel}>User Role *</label>
                      {errors.role && (
                        <span className={styles.errorText}>{errors.role}</span>
                      )}
                      <div className={styles.roleOptions}>
                        {roles.map((role) => (
                          <div
                            key={role.id}
                            className={`${styles.roleOption} ${ formData.role === role.id ? styles.selected : "" }`}
                            onClick={() => handleRoleChange(role.id)}
                          >
                            <div className={styles.roal_box_wrapper}>
                              <div className={styles.roleRadio}>
                                {formData.role === role.id && (
                                  <div className={styles.radioDot} />
                                )}
                              </div>
                              <div className={styles.roleInfo}>
                                <div className={styles.roleName}>{role.label}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={styles.permissionsSection}>
                      <label className={styles.formLabel}>Permissions *</label>
                      {errors.permissions && (
                        <span className={styles.errorText}>{errors.permissions}</span>
                      )}
                      <div className={styles.permissionsGrid}>
                        {Object.entries(groupedPermissions).map(
                          ([category, permissions]) => (
                            <div key={category} className={styles.permissionCategory}>
                              <h4 className={styles.categoryTitle}>{category}</h4>
                              {permissions.map((permission) => {
                                const isChecked = formData.permissions.includes(
                                  permission.code
                                );
                                return (
                                  <label
                                    key={permission.id}
                                    className={styles.permissionItem}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        handlePermissionToggle(permission.code)
                                      }
                                      className={styles.permissionCheckbox}
                                    />
                                    <div
                                      className={`${styles.checkboxCustom} ${ isChecked ? styles.checked : "" }`}
                                    >
                                      {isChecked && (
                                        <Check
                                          size={12}
                                          className={styles.checkIcon}
                                        />
                                      )}
                                    </div>
                                    <span className={styles.permissionLabel}>
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

                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnOutline}`}
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`${styles.btn} ${styles.btnPrimary}`}
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
                className={styles.confirmationContent}
              >
                <div className={styles.confirmationHeader}>
                  <div className={styles.confirmationIcon}>
                    <Mail size={24} />
                  </div>
                  <h3>Confirm Invitation</h3>
                  <p>Please review the details before sending the invitation</p>
                </div>

                <div className={styles.confirmationDetails}>
                  <div className={styles.detailGroup}>
                    <strong>Name:</strong> {formData.name}
                  </div>
                  <div className={styles.detailGroup}>
                    <strong>Email:</strong> {formData.email}
                  </div>
                  <div className={styles.detailGroup}>
                    <strong>Phone:</strong> {formData.phone}
                  </div>
                  {formData.alternatePhone && (
                    <div className={styles.detailGroup}>
                      <strong>Alternate Phone:</strong>{" "}
                      {formData.alternatePhone}
                    </div>
                  )}
                  <div className={styles.detailGroup}>
                    <strong>Role:</strong>{" "}
                    {roles.find((r) => r.id === formData.role)?.label ||
                      formData.role}
                  </div>

                  <div className={styles.detailGroup}>
                    <strong>Permissions:</strong> {formData.permissions.length}{" "}
                    permissions assigned
                  </div>
                </div>

                <div className={styles.confirmationActions}>
                  <button
                    className={`${styles.btn} ${styles.btnOutline}`}
                    onClick={() => setShowConfirmation(false)}
                    disabled={isSubmitting}
                  >
                    Back to Edit
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary} ${styles.sendInviteBtn}`}
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
                          className={styles.loadingSpinner}
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