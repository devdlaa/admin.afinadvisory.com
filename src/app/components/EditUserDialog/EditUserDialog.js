import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  Edit,
  User,
  Phone,
  Calendar,
  Building2,
  Briefcase,
  MapPin,
  X,
  AlertCircle,
} from "lucide-react";

import { updateUser, clearUpdateError } from "@/store/slices/userSlice";
import "./EditUserDialog.scss";
// For <input type="date">
const toInputFormat = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // ✅ format required by input[type=date]
};

// For display purposes
const toDisplayFormat = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`; // ✅ nice for showing in UI
};
const EditUserDialog = ({ open, onClose, user, departments = [] }) => {
  const dispatch = useDispatch();
  const { updating, updateError } = useSelector((state) => state.user);

  const [activeTab, setActiveTab] = useState("general");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    alternatePhone: "",
    department: "",
    designation: "",
    dateOfJoining: "",
    line1: "",
    city: "",
    pincode: "",
    state: "",
  });

  const [errors, setErrors] = useState({});

  const indianStates = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
  ];

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        alternatePhone: user.alternatePhone || "",
        department: user.department || "",
        designation: user.designation || "",
        dateOfJoining: user.dateOfJoining || "",
        line1: user?.address?.line1 || "",
        city: user?.address?.city || "",
        pincode: user?.address?.pincode || "",
        state: user?.address?.state || "",
      });
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[+]?[1-9]\d{9,14}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid phone number";
    }
    if (
      formData.alternatePhone &&
      !/^[+]?[1-9]\d{9,14}$/.test(formData.alternatePhone.replace(/\s/g, ""))
    ) {
      newErrors.alternatePhone = "Please enter a valid alternate phone number";
    }
    if (!formData.dateOfJoining)
      newErrors.dateOfJoining = "Date of joining is required";
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Please enter a valid 6-digit pincode";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClose = () => {
    if (!updating) {
      dispatch(clearUpdateError());
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Build diff object: only send changed fields
    const updatedFields = {};

    // Compare top-level fields (non-address)
    Object.keys(formData).forEach((key) => {
      if (
        key === "line1" ||
        key === "city" ||
        key === "pincode" ||
        key === "state"
      ) {
        // skip here, we handle below
        return;
      }

      const oldVal = user[key] ?? ""; // normalize undefined → ""
      const newVal = formData[key] ?? "";

      if (newVal !== oldVal) {
        updatedFields[key] = newVal;
      }
    });

    // Now handle nested address
    if (formData.line1 !== (user.address?.line1 ?? "")) {
      updatedFields.line1 = formData.line1;
    }
    if (formData.city !== (user.address?.city ?? "")) {
      updatedFields.city = formData.city;
    }
    if (formData.pincode !== (user.address?.pincode ?? "")) {
      updatedFields.pincode = formData.pincode;
    }
    if (formData.state !== (user.address?.state ?? "")) {
      updatedFields.state = formData.state;
    }

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

      onClose(); // Close dialog on success
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !updating) {
      onClose();
    }
  };

  if (!open || !user) return null;

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
            disabled={updating}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="eu-edit-content">
          {/* Error Display */}
          {updateError && (
            <div className="eu-error-banner">
              <AlertCircle size={16} />
              <span>{updateError}</span>
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
              disabled={updating}
            >
              General Info
            </button>
            <button
              className={`eu-tab ${
                activeTab === "address" ? "eu-tab-active" : ""
              }`}
              onClick={() => setActiveTab("address")}
              disabled={updating}
            >
              Address Details
            </button>
          </div>

          <form onSubmit={handleSubmit} className="eu-edit-form">
            {/* User Header */}
            <div className="eu-user-header">
              <div className="eu-user-meta">
                <span>
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                </span>
                <span className="eu-employee-code">{user.userCode}</span>
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
                            errors.alternatePhone ? "eu-error" : ""
                          }`}
                          value={formData.alternatePhone}
                          onChange={(e) =>
                            handleInputChange("alternatePhone", e.target.value)
                          }
                          placeholder="+91 87654 32109"
                          disabled={updating}
                        />
                        {errors.alternatePhone && (
                          <span className="eu-error-text">
                            {errors.alternatePhone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Work Information Section */}
                  <div className="eu-form-section">
                    <h4 className="eu-section-title">
                      <Briefcase size={16} />
                      Work Information
                    </h4>

                    <div className="eu-form-grid">
                      <div className="eu-form-group">
                        <label className="eu-form-label">Department</label>
                        <select
                          className="eu-form-select"
                          value={formData.department}
                          onChange={(e) =>
                            handleInputChange("department", e.target.value)
                          }
                          disabled={updating}
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="eu-form-group">
                        <label className="eu-form-label">Designation</label>
                        <input
                          type="text"
                          className="eu-form-input"
                          value={formData.designation}
                          onChange={(e) =>
                            handleInputChange("designation", e.target.value)
                          }
                          placeholder="Enter designation"
                          disabled={updating}
                        />
                      </div>

                      <div className="eu-form-group">
                        <label className="eu-form-label">
                          Date of Joining <span className="eu-required"></span>
                        </label>
                        <input
                          type="date"
                          className={`eu-form-input ${
                            errors.dateOfJoining ? "eu-error" : ""
                          }`}
                          value={toInputFormat(formData.dateOfJoining)}
                          onChange={(e) =>
                            handleInputChange("dateOfJoining", e.target.value)
                          }
                          disabled={updating}
                        />
                        {errors.dateOfJoining && (
                          <span className="eu-error-text">
                            {errors.dateOfJoining}
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
                      <label className="eu-form-label">Address Line</label>
                      <input
                        type="text"
                        className="eu-form-input"
                        value={formData.line1}
                        onChange={(e) =>
                          handleInputChange("line1", e.target.value)
                        }
                        placeholder="Enter address line"
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
                        {indianStates.map((state) => (
                          <option key={state} value={state}>
                            {state}
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
                disabled={updating}
              >
                Cancel
              </button>
              <button type="submit" className="eu-save-btn" disabled={updating}>
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
