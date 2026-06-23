import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Users,
  PhoneCall,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  MapPin,
  Home,
  CircleCheck,
} from "lucide-react";
import {
  addNewUser,
  clearError,
  selectAddUserErrorMessage,
  clearAddUserData,
} from "@/store/slices/customersSlice";
import "./AddUserDialog.scss";

import { INDIAN_STATES } from "@/utils/server/utils";

const AddUserDialog = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { isAddingNewUser, passwordResetLink } = useSelector(
    (state) => state.customers
  );

  const errorMessage = useSelector(selectAddUserErrorMessage);

  const [activeTab, setActiveTab] = useState("primary");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    gender: "",
    dob: "",
    alternatePhone: "",
    address: {
      street: "",
      pincode: "",
      state: "",
      city: "",
      country: "",
    },
  });

  const [errors, setErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Handle nested address fields
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // Real-time validation for specific fields
    validateFieldRealTime(name, value);
  };

  // Real-time validation for immediate feedback
  const validateFieldRealTime = (fieldName, value) => {
    const newErrors = { ...errors };

    switch (fieldName) {
      case "firstName":
      case "lastName":
        if (value && !/^[a-zA-Z\s]+$/.test(value)) {
          newErrors[fieldName] = "Only letters and spaces are allowed";
        } else {
          delete newErrors[fieldName];
        }
        break;

      case "phoneNumber":
      case "alternatePhone":
        if (value && !/^\d{10}$/.test(value.replace(/\D/g, ""))) {
          newErrors[fieldName] = "Please enter a valid 10-digit phone number";
        } else {
          delete newErrors[fieldName];
        }
        break;

      case "email":
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = "Please enter a valid email address";
        } else {
          delete newErrors.email;
        }
        break;

      case "address.pincode":
        if (value && !/^\d{6}$/.test(value)) {
          newErrors["address.pincode"] = "Pincode must be exactly 6 digits";
        } else {
          delete newErrors["address.pincode"];
        }
        break;
    }

    setErrors(newErrors);
  };

  // Comprehensive form validation
  const validateForm = () => {
    const newErrors = {};

    // Required field validations
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (!/^[a-zA-Z\s]+$/.test(formData.firstName.trim())) {
      newErrors.firstName = "First name can only contain letters and spaces";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (!/^[a-zA-Z\s]+$/.test(formData.lastName.trim())) {
      newErrors.lastName = "Last name can only contain letters and spaces";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ""))) {
      newErrors.phoneNumber = "Please enter a valid 10-digit phone number";
    }

    // Optional field validations (only if filled)
    if (formData.alternatePhone && formData.alternatePhone.trim()) {
      const cleanAlternatePhone = formData.alternatePhone.replace(/\D/g, "");
      const cleanMainPhone = formData.phoneNumber.replace(/\D/g, "");

      if (!/^\d{10}$/.test(cleanAlternatePhone)) {
        newErrors.alternatePhone =
          "Please enter a valid 10-digit alternate phone number";
      } else if (cleanAlternatePhone === cleanMainPhone) {
        newErrors.alternatePhone =
          "Alternate phone number cannot be same as primary phone number";
      }
    }

    // Address validations (only if filled)
    if (formData.address.pincode && formData.address.pincode.trim()) {
      if (!/^\d{6}$/.test(formData.address.pincode)) {
        newErrors["address.pincode"] = "Pincode must be exactly 6 digits";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Check if errors are in current tab, if not switch to appropriate tab
      const primaryErrors = [
        "firstName",
        "lastName",
        "email",
        "phoneNumber",
        "alternatePhone",
        "gender",
        "dob",
      ];
      const addressErrors = [
        "address.street",
        "address.pincode",
        "address.state",
        "address.city",
        "address.country",
      ];

      const hasErrorsInPrimary = primaryErrors.some((field) => errors[field]);
      const hasErrorsInAddress = addressErrors.some((field) => errors[field]);

      if (hasErrorsInPrimary && activeTab !== "primary") {
        setActiveTab("primary");
      } else if (hasErrorsInAddress && activeTab !== "address") {
        setActiveTab("address");
      }

      // Scroll to first error field after tab switch
      setTimeout(() => {
        const firstErrorField = document.querySelector(
          ".form-group input.error, .form-group select.error"
        );
        if (firstErrorField) {
          firstErrorField.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          firstErrorField.focus();
        }
      }, 100);
      return;
    }

    try {
      const result = await dispatch(addNewUser(formData)).unwrap();

      if (result.newUser && result?.passwordResetLink?.trim()) {
        setShowSuccessMessage(true);

        setTimeout(() => {
          setFormData({
            firstName: "",
            lastName: "",
            email: "",
            phoneNumber: "",
            gender: "",
            dob: "",
            alternatePhone: "",
            address: {
              street: "",
              pincode: "",
              state: "",
              city: "",
              country: "",
            },
          });
          setShowSuccessMessage(false);
          setActiveTab("primary");
          onClose();
          dispatch(clearAddUserData());
        }, 20000);
      }
    } catch (error) {
      console.error("Failed to add user:", error);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (isAddingNewUser) return; // Prevent closing while loading

    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      gender: "",
      dob: "",
      alternatePhone: "",
      address: {
        street: "",
        pincode: "",
        state: "",
        city: "",
        country: "",
      },
    });
    setErrors({});
    setShowSuccessMessage(false);
    setActiveTab("primary");
    dispatch(clearError());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="add-user-dialog-overlay">
      <div className="add-user-dialog">
        {/* Header */}
        <div className="dialog-header">
          <div className="header-content">
            <User className="header-icon" />
            <h2>Add New User</h2>
          </div>
          <button
            className="close-btn"
            onClick={handleClose}
            disabled={isAddingNewUser}
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Message */}
        {passwordResetLink && (
          <div className="success-message">
            <CheckCircle size={20} />
            <span>
              User added successfully! Password reset link has been generated.
            </span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>
              {errorMessage.title ||
                "Something went wrong while adding new user."}
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="add-user-form">
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              type="button"
              className={`tab-btn ${activeTab === "primary" ? "active" : ""}`}
              onClick={() => setActiveTab("primary")}
              disabled={isAddingNewUser}
            >
              <User size={16} />
              Primary Info
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "address" ? "active" : ""}`}
              onClick={() => setActiveTab("address")}
              disabled={isAddingNewUser}
            >
              <Home size={16} />
              Address
            </button>
          </div>

          {/* Tab Content */}

          <div className="tab-content">
            {activeTab === "primary" && (
              <div className="form-grid">
                <div className="form_gird">
                  {/* First Name */}
                  <div className="form-group">
                    <label htmlFor="firstName">First Name *</label>
                    <div className="input-wrapper">
                      <User size={16} className="input-icon" />
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={errors.firstName ? "error" : ""}
                        placeholder="Enter first name"
                        disabled={isAddingNewUser}
                      />
                    </div>
                    {errors.firstName && (
                      <span className="field-error">{errors.firstName}</span>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name *</label>
                    <div className="input-wrapper">
                      <User size={16} className="input-icon" />
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={errors.lastName ? "error" : ""}
                        placeholder="Enter last name"
                        disabled={isAddingNewUser}
                      />
                    </div>
                    {errors.lastName && (
                      <span className="field-error">{errors.lastName}</span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="form-group full-width">
                  <label htmlFor="email">Email Address *</label>
                  <div className="input-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={errors.email ? "error" : ""}
                      placeholder="Enter email address"
                      disabled={isAddingNewUser}
                    />
                  </div>
                  {errors.email && (
                    <span className="field-error">{errors.email}</span>
                  )}
                </div>

                <div className="form_gird">
                  {/* Phone Number */}
                  <div className="form-group">
                    <label htmlFor="phoneNumber">Phone Number *</label>
                    <div className="input-wrapper">
                      <Phone size={16} className="input-icon" />
                      <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        className={errors.phoneNumber ? "error" : ""}
                        placeholder="Enter phone number"
                        disabled={isAddingNewUser}
                        maxLength="10"
                      />
                    </div>
                    {errors.phoneNumber && (
                      <span className="field-error">{errors.phoneNumber}</span>
                    )}
                  </div>

                  {/* Alternate Phone */}
                  <div className="form-group">
                    <label htmlFor="alternatePhone">Alternate Phone</label>
                    <div className="input-wrapper">
                      <PhoneCall size={16} className="input-icon" />
                      <input
                        type="tel"
                        id="alternatePhone"
                        name="alternatePhone"
                        value={formData.alternatePhone}
                        onChange={handleInputChange}
                        className={errors.alternatePhone ? "error" : ""}
                        placeholder="Enter alternate phone"
                        disabled={isAddingNewUser}
                        maxLength="10"
                      />
                    </div>
                    {errors.alternatePhone && (
                      <span className="field-error">
                        {errors.alternatePhone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form_gird">
                  {/* Gender */}
                  <div className="form-group">
                    <label htmlFor="gender">Gender</label>
                    <div className="input-wrapper">
                      <Users size={16} className="input-icon" />
                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        disabled={isAddingNewUser}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="form-group">
                    <label htmlFor="dob">Date of Birth</label>
                    <div className="input-wrapper">
                      <Calendar size={16} className="input-icon" />
                      <input
                        type="date"
                        id="dob"
                        name="dob"
                        value={formData.dob}
                        onChange={handleInputChange}
                        disabled={isAddingNewUser}
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "address" && (
              <div className="form-grid address-grid">
                {/* Street Address */}
                <div className="form-group full-width">
                  <label htmlFor="address.street">Street Address</label>
                  <div className="input-wrapper">
                    <MapPin size={16} className="input-icon" />
                    <input
                      type="text"
                      id="address.street"
                      name="address.street"
                      value={formData?.address?.street}
                      onChange={handleInputChange}
                      placeholder="Enter street address"
                      disabled={isAddingNewUser}
                    />
                  </div>
                </div>

                <div className="form_gird">
                  {/* City */}
                  <div className="form-group">
                    <label htmlFor="address.city">City</label>
                    <div className="input-wrapper">
                      <MapPin size={16} className="input-icon" />
                      <input
                        type="text"
                        id="address.city"
                        name="address.city"
                        value={formData?.address?.city}
                        onChange={handleInputChange}
                        placeholder="Enter city"
                        disabled={isAddingNewUser}
                      />
                    </div>
                  </div>

                  {/* State */}
                  <div className="form-group">
                    <label htmlFor="address.state">State</label>
                    <div className="input-wrapper">
                      <MapPin size={16} className="input-icon" />
                      <select
                        id="address.state"
                        name="address.state"
                        value={formData?.address?.state}
                        onChange={handleInputChange}
                        disabled={isAddingNewUser}
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form_gird">
                  {/* Pincode */}
                  <div className="form-group">
                    <label htmlFor="address.pincode">Pincode</label>
                    <div className="input-wrapper">
                      <MapPin size={16} className="input-icon" />
                      <input
                        type="text"
                        id="address.pincode"
                        name="address.pincode"
                        value={formData?.address?.pincode}
                        onChange={handleInputChange}
                        className={errors["address.pincode"] ? "error" : ""}
                        placeholder="Enter 6-digit pincode"
                        disabled={isAddingNewUser}
                        maxLength="6"
                      />
                    </div>
                    {errors["address.pincode"] && (
                      <span className="field-error">
                        {errors["address.pincode"]}
                      </span>
                    )}
                  </div>

                  {/* Country */}
                  <div className="form-group">
                    <label htmlFor="address.country">Country</label>
                    <div className="input-wrapper">
                      <MapPin size={16} className="input-icon" />
                      <input
                        type="text"
                        id="address.country"
                        name="address.country"
                        value={formData?.address?.country}
                        onChange={handleInputChange}
                        placeholder="Enter country"
                        disabled={isAddingNewUser}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={handleClose}
              disabled={isAddingNewUser}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isAddingNewUser}
            >
              {isAddingNewUser ? (
                <>
                  <Loader2 size={16} className="spinning" />
                  Adding User...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Add User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserDialog;
