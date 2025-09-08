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

const INDIAN_STATES = [
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
  "Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const AddUserDialog = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { isAddingNewUser, passwordResetLink } = useSelector(
    (state) => state.customers
  );

  const errorMessage = useSelector(selectAddUserErrorMessage);

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
        newErrors.alternatePhone = "Please enter a valid 10-digit alternate phone number";
      } else if (cleanAlternatePhone === cleanMainPhone) {
        newErrors.alternatePhone = "Alternate phone number cannot be same as primary phone number";
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
      // Scroll to first error field
      const firstErrorField = document.querySelector('.form-group input.error, .form-group select.error');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
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
            <span>{errorMessage.title || "Something went wrong while adding new user."}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-grid">
            {/* First Name */}
            <div className="form-group">
              <label htmlFor="firstName">
                <User size={16} />
                First Name *
              </label>
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
              {errors.firstName && (
                <span className="field-error">{errors.firstName}</span>
              )}
            </div>

            {/* Last Name */}
            <div className="form-group">
              <label htmlFor="lastName">
                <User size={16} />
                Last Name *
              </label>
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
              {errors.lastName && (
                <span className="field-error">{errors.lastName}</span>
              )}
            </div>

            {/* Email */}
            <div className="form-group full-width">
              <label htmlFor="email">
                <Mail size={16} />
                Email Address *
              </label>
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
              {errors.email && (
                <span className="field-error">{errors.email}</span>
              )}
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label htmlFor="phoneNumber">
                <Phone size={16} />
                Phone Number *
              </label>
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
              {errors.phoneNumber && (
                <span className="field-error">{errors.phoneNumber}</span>
              )}
            </div>

            {/* Alternate Phone */}
            <div className="form-group">
              <label htmlFor="alternatePhone">
                <PhoneCall size={16} />
                Alternate Phone
              </label>
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
              {errors.alternatePhone && (
                <span className="field-error">{errors.alternatePhone}</span>
              )}
            </div>

            {/* Gender */}
            <div className="form-group">
              <label htmlFor="gender">
                <Users size={16} />
                Gender
              </label>
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

            {/* Date of Birth */}
            <div className="form-group">
              <label htmlFor="dob">
                <Calendar size={16} />
                Date of Birth
              </label>
              <input
                type="date"
                id="dob"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                disabled={isAddingNewUser}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="address-section">
            <h3>
              <Home size={18} />
              Address Details (Optional)
            </h3>

            <div className="form-grid address-grid">
              {/* Street Address */}
              <div className="form-group full-width">
                <label htmlFor="address.street">
                  <MapPin size={16} />
                  Street Address
                </label>
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

              {/* City */}
              <div className="form-group">
                <label htmlFor="address.city">
                  <MapPin size={16} />
                  City
                </label>
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

              {/* State */}
              <div className="form-group">
                <label htmlFor="address.state">
                  <MapPin size={16} />
                  State
                </label>
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

              {/* Pincode */}
              <div className="form-group">
                <label htmlFor="address.pincode">
                  <MapPin size={16} />
                  Pincode
                </label>
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
                {errors["address.pincode"] && (
                  <span className="field-error">{errors["address.pincode"]}</span>
                )}
              </div>

              {/* Country */}
              <div className="form-group">
                <label htmlFor="address.country">
                  <MapPin size={16} />
                  Country
                </label>
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

        {passwordResetLink ? (
          <div className="info-note">
            <CircleCheck color="green" size={16} />
            <span
              style={{
                textWrap: "wrap",
              }}
            >
              {passwordResetLink}
            </span>
          </div>
        ) : (
          <div className="info-note">
            <AlertCircle size={16} />
            <span>
              A password reset link will be automatically generated and provided
              after user creation. Share this link with the user to complete
              their account setup.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddUserDialog;