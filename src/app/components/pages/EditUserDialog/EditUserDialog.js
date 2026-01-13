"use client";
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";

import {
  Edit,
  User,
  Phone,
  MapPin,
  X,
  AlertCircle,
  Camera,
  Trash2,
  Upload,
} from "lucide-react";

import {
  updateUser,
  clearUpdateError,
  uploadProfileImage,
  deleteProfileImage,
} from "@/store/slices/userSlice";
import { getProfileUrl } from "@/utils/shared/shared_util";
import "./EditUserDialog.scss";

// Indian States from Prisma schema
import { INDIAN_STATES } from "@/utils/server/utils";

const EditUserDialog = ({ open, onClose, user }) => {
  const dispatch = useDispatch();
  const { updating, updateError, uploadingImage, uploadImageError } =
    useSelector((state) => state.user);

  const [activeTab, setActiveTab] = useState("general");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    alternate_phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    pincode: "",
    state: "",
    uid: "",
  });

  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        alternate_phone: user.alternate_phone || "",
        address_line1: user.address_line1 || "",
        address_line2: user.address_line2 || "",
        city: user.city || "",
        pincode: user.pincode || "",
        state: user.state || "",
      });

      // Set initial image preview using getProfileUrl
      setImagePreview(getProfileUrl(user.id));
      setImageError(false);
    }
  }, [user]);

  // Clear update error when dialog opens
  useEffect(() => {
    if (open) {
      dispatch(clearUpdateError());
    }
  }, [open, dispatch]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        image: "Please select a valid image file",
      }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        image: "Image size must be less than 5MB",
      }));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload image
    handleImageUpload(file);
  };

  const handleImageUpload = async (file) => {
    try {
      await dispatch(uploadProfileImage({ userId: user.id, file })).unwrap();

      setImagePreview(getProfileUrl(user.id) + `?t=${Date.now()}`);
      setImageError(false);
      setErrors((prev) => ({ ...prev, image: "" }));
    } catch (err) {
      alert("Failed to upload image:");

      setImagePreview(getProfileUrl(user.id));
      setImageError(false);
    }
  };

  const handleImageDelete = async () => {
    if (!imagePreview) return;

    try {
      await dispatch(deleteProfileImage({ userId: user.id })).unwrap();
      setImagePreview(null);
      setImageError(true);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Failed to delete image:", err);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[+]?[1-9]\d{9,14}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid phone number";
    }
    if (
      formData.alternate_phone &&
      !/^[+]?[1-9]\d{9,14}$/.test(formData.alternate_phone.replace(/\s/g, ""))
    ) {
      newErrors.alternate_phone = "Please enter a valid alternate phone number";
    }
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Please enter a valid 6-digit pincode";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClose = () => {
    if (!updating && !uploadingImage) {
      dispatch(clearUpdateError());
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Build diff object: only send changed fields
    const updatedFields = {};

    // Compare all fields
    Object.keys(formData).forEach((key) => {
      const oldVal = user[key] ?? "";
      const newVal = formData[key] ?? "";

      if (newVal !== oldVal) {
        updatedFields[key] = newVal;
      }
    });

    // If nothing changed, just exit
    if (Object.keys(updatedFields).length === 0) {
      handleClose();
      return;
    }

    try {
      await dispatch(
        updateUser({
          userId: user.id,
          userData: updatedFields,
        })
      ).unwrap();

      onClose();
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !updating && !uploadingImage) {
      onClose();
    }
  };

  if (!open || !user) return null;

  // Get initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="eu-dialog-backdrop" onClick={handleBackdropClick}>
      <div className="eu-edit-dialog">
        <div className="eu-dialog-header">
          <div className="eu-dialog-title">
            <Edit className="eu-title-icon" />
            Edit User Information
          </div>
          <button
            className="eu-close-button"
            onClick={handleClose}
            disabled={updating || uploadingImage}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="eu-edit-content">
          {/* Error Display */}
          {(updateError || uploadImageError) && (
            <div className="eu-error-banner">
              <AlertCircle size={16} />
              <span>{updateError || uploadImageError}</span>
              <button
                onClick={() => dispatch(clearUpdateError())}
                className="eu-error-close"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="eu-tabs">
            <button
              className={`eu-tab ${
                activeTab === "general" ? "eu-tab-active" : ""
              }`}
              onClick={() => setActiveTab("general")}
              disabled={updating || uploadingImage}
            >
              General Info
            </button>
            <button
              className={`eu-tab ${
                activeTab === "address" ? "eu-tab-active" : ""
              }`}
              onClick={() => setActiveTab("address")}
              disabled={updating || uploadingImage}
            >
              Address Details
            </button>
          </div>

          <form onSubmit={handleSubmit} className="eu-edit-form">
            {/* User Header with Profile Image */}
            <div className="eu-user-header">
              <div className="eu-profile-image-section">
                <div className="eu-profile-image-container">
                  {imagePreview && !imageError ? (
                    <img
                      src={imagePreview}
                      alt={user.name}
                      className="eu-profile-image"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="eu-profile-image-fallback">
                      <span>{getInitials(user.name)}</span>
                    </div>
                  )}

                  {uploadingImage && (
                    <div className="eu-image-uploading-overlay">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="eu-loading-spinner"
                      />
                    </div>
                  )}
                </div>

                <div className="eu-profile-image-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: "none" }}
                    disabled={uploadingImage}
                  />
                  <button
                    type="button"
                    className="eu-image-action-btn eu-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <>
                        <Upload size={14} />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera size={14} />
                        {imagePreview && !imageError ? "Change" : "Upload"}
                      </>
                    )}
                  </button>

                  {imagePreview && !imageError && (
                    <button
                      type="button"
                      className="eu-image-action-btn eu-delete-btn"
                      onClick={handleImageDelete}
                      disabled={uploadingImage}
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  )}
                </div>

                {errors.image && (
                  <span className="eu-error-text">{errors.image}</span>
                )}
              </div>
            </div>

            <div className="eu-form-sections">
              {activeTab === "general" && (
                <>
                  {/* Personal Information Section */}
                  <div className="eu-form-section">
                    <h4 className="eu-section-title">
                      <User size={16} />
                      Personal Information
                    </h4>

                    <div className="eu-form-grid">
                      <div className="eu-form-group">
                        <label className="eu-form-label">
                          Full Name <span className="eu-required">*</span>
                        </label>
                        <input
                          type="text"
                          className={`eu-form-input ${
                            errors.name ? "eu-error" : ""
                          }`}
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange("name", e.target.value)
                          }
                          placeholder="Enter full name"
                          disabled={updating}
                        />
                        {errors.name && (
                          <span className="eu-error-text">{errors.name}</span>
                        )}
                      </div>

                      <div className="eu-form-group">
                        <label className="eu-form-label">
                          Phone Number <span className="eu-required">*</span>
                        </label>
                        <input
                          type="tel"
                          className={`eu-form-input ${
                            errors.phone ? "eu-error" : ""
                          }`}
                          value={formData.phone}
                          onChange={(e) =>
                            handleInputChange("phone", e.target.value)
                          }
                          placeholder="+91 98765 43210"
                          disabled={updating}
                        />
                        {errors.phone && (
                          <span className="eu-error-text">{errors.phone}</span>
                        )}
                      </div>

                      <div className="eu-form-group">
                        <label className="eu-form-label">Alternate Phone</label>
                        <input
                          type="tel"
                          className={`eu-form-input ${
                            errors.alternate_phone ? "eu-error" : ""
                          }`}
                          value={formData.alternate_phone}
                          onChange={(e) =>
                            handleInputChange("alternate_phone", e.target.value)
                          }
                          placeholder="+91 87654 32109"
                          disabled={updating}
                        />
                        {errors.alternate_phone && (
                          <span className="eu-error-text">
                            {errors.alternate_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "address" && (
                <div className="eu-form-section">
                  <h4 className="eu-section-title">
                    <MapPin size={16} />
                    Address Details
                  </h4>

                  <div className="eu-form-grid">
                    <div className="eu-form-group">
                      <label className="eu-form-label">Address Line 1</label>
                      <input
                        type="text"
                        className="eu-form-input"
                        value={formData.address_line1}
                        onChange={(e) =>
                          handleInputChange("address_line1", e.target.value)
                        }
                        placeholder="Enter address line 1"
                        disabled={updating}
                      />
                    </div>

                    <div className="eu-form-group">
                      <label className="eu-form-label">Address Line 2</label>
                      <input
                        type="text"
                        className="eu-form-input"
                        value={formData.address_line2}
                        onChange={(e) =>
                          handleInputChange("address_line2", e.target.value)
                        }
                        placeholder="Enter address line 2"
                        disabled={updating}
                      />
                    </div>

                    <div className="eu-form-group">
                      <label className="eu-form-label">City</label>
                      <input
                        type="text"
                        className="eu-form-input"
                        value={formData.city}
                        onChange={(e) =>
                          handleInputChange("city", e.target.value)
                        }
                        placeholder="Enter city"
                        disabled={updating}
                      />
                    </div>

                    <div className="eu-form-group">
                      <label className="eu-form-label">Pincode</label>
                      <input
                        type="text"
                        className={`eu-form-input ${
                          errors.pincode ? "eu-error" : ""
                        }`}
                        value={formData.pincode}
                        onChange={(e) =>
                          handleInputChange("pincode", e.target.value)
                        }
                        placeholder="Enter 6-digit pincode"
                        disabled={updating}
                      />
                      {errors.pincode && (
                        <span className="eu-error-text">{errors.pincode}</span>
                      )}
                    </div>

                    <div className="eu-form-group">
                      <label className="eu-form-label">State</label>
                      <select
                        className="eu-form-select"
                        value={formData.state}
                        onChange={(e) =>
                          handleInputChange("state", e.target.value)
                        }
                        disabled={updating}
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map((state) => (
                          <option key={state.value} value={state.value}>
                            {state.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="eu-form-actions">
              <button
                type="button"
                className="eu-cancel-btn"
                onClick={handleClose}
                disabled={updating || uploadingImage}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="eu-save-btn"
                disabled={updating || uploadingImage}
              >
                {updating && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="eu-loading-spinner"
                  />
                )}
                {updating ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditUserDialog;
