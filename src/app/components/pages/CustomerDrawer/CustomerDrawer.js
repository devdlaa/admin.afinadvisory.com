import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  Edit,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Shield,
  Save,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import "./CustomerDrawer.scss";

import {
  setCustomerDrawr,
  updateCustomer,
} from "@/store/slices/customersSlice";
import { CircularProgress } from "@mui/material";

const CustomersDrawer = () => {
  const dispatch = useDispatch();
  const { isUpdatingCustomer, selectedCustomers, isCustomerDrawnOpen } =
    useSelector((state) => state.customers);

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    alternatePhone: "",
    dob: "",
    gender: "",
    address: {
      street: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
    },
    accountStatus: "active",
  });

  useEffect(() => {
    if (selectedCustomers && isCustomerDrawnOpen) {
      setFormData({
        firstName: selectedCustomers.firstName || "",
        lastName: selectedCustomers.lastName || "",
        phoneNumber: selectedCustomers.phoneNumber || "",
        alternatePhone: selectedCustomers.alternatePhone || "",
        dob: selectedCustomers.dob || "",
        gender: selectedCustomers.gender || "",
        address: {
          street: selectedCustomers.address?.street || "",
          city: selectedCustomers.address?.city || "",
          state: selectedCustomers.address?.state || "",
          country: selectedCustomers.address?.country || "",
          pincode: selectedCustomers.address?.pincode || "",
        },
        accountStatus: selectedCustomers.accountStatus || "active",
      });
    }
  }, [selectedCustomers, isCustomerDrawnOpen]);

  const handleInputChange = (field, value) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSave = async () => {

    if (!selectedCustomers?.uid) return;

    // Prepare update data - only send changed fields
    const updateData = {};

    // Compare and add changed basic fields
    if (formData.firstName !== selectedCustomers.firstName)
      updateData.firstName = formData.firstName;
    if (formData.lastName !== selectedCustomers.lastName)
      updateData.lastName = formData.lastName;
    if (formData.phoneNumber !== selectedCustomers.phoneNumber)
      updateData.phoneNumber = formData.phoneNumber;
    if (formData.alternatePhone !== selectedCustomers.alternatePhone)
      updateData.alternatePhone = formData.alternatePhone;
    if (formData.dob !== selectedCustomers.dob) updateData.dob = formData.dob;
    if (formData.gender !== selectedCustomers.gender)
      updateData.gender = formData.gender;
    if (formData.accountStatus !== selectedCustomers.accountStatus)
      updateData.accountStatus = formData.accountStatus;

    // Check address changes
    const currentAddress = selectedCustomers.address || {};
    const hasAddressChanges = Object.keys(formData.address).some(
      (key) => formData.address[key] !== (currentAddress[key] || "")
    );

    if (hasAddressChanges) {
      updateData.address = formData.address;
    }

    // Check if profile should be marked as completed
    const profileFields = [
      formData.firstName,
      formData.lastName,
      formData.phoneNumber,
      formData.dob,
      formData.gender,
      formData.address.street,
      formData.address.city,
      formData.address.state,
      formData.address.pincode,
    ];

    const isProfileComplete = profileFields.every(
      (field) => field && field.trim() !== ""
    );
    if (isProfileComplete !== selectedCustomers.isProfileCompleted) {
      updateData.isProfileCompleted = isProfileComplete;
    }

 

    if (Object.keys(updateData).length > 0) {
      try {
        await dispatch(
          updateCustomer({
            id: selectedCustomers.uid,
            updateData,
          })
        ).unwrap();
        setIsEditing(false);
        dispatch(setCustomerDrawr());
      } catch (error) {
        setIsEditing(false);
         dispatch(setCustomerDrawr());
      }
    } else {
      setIsEditing(false);
       dispatch(setCustomerDrawr());
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setActiveTab("profile");
    dispatch(setCustomerDrawr());
  };

  const handleCancelEdit = () => {
    // Reset form data to original values
    if (selectedCustomers) {
      setFormData({
        firstName: selectedCustomers.firstName || "",
        lastName: selectedCustomers.lastName || "",
        phoneNumber: selectedCustomers.phoneNumber || "",
        alternatePhone: selectedCustomers.alternatePhone || "",
        dob: selectedCustomers.dob || "",
        gender: selectedCustomers.gender || "",
        address: {
          street: selectedCustomers.address?.street || "",
          city: selectedCustomers.address?.city || "",
          state: selectedCustomers.address?.state || "",
          country: selectedCustomers.address?.country || "",
          pincode: selectedCustomers.address?.pincode || "",
        },
        accountStatus: selectedCustomers.accountStatus || "active",
      });
    }
    setIsEditing(false);
  };

  if (!isCustomerDrawnOpen || !selectedCustomers) return null;

  const getDisplayName = () => {
    if (selectedCustomers.firstName || selectedCustomers.lastName) {
      return `${selectedCustomers.firstName || ""} ${
        selectedCustomers.lastName || ""
      }`.trim();
    }
    return selectedCustomers.email?.split("@")[0] || "Unknown User";
  };

  return (
    <div className="selectedCustomers-drawer-overlay">
      <div className="selectedCustomers-drawer">
        <div className="drawer-header">
          <div className="header-left">
            <div className="selectedCustomers-avatar">
              <User size={24} />
            </div>
            <div className="header-info">
              <h3>{getDisplayName()}</h3>
              <span className="user-id">
                Joined On:{" "}
                {new Date(selectedCustomers.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="header-actions">
            <button
              className={`toggle-button ${isEditing ? "editing" : ""}`}
              onClick={() =>
                isEditing ? handleCancelEdit() : setIsEditing(true)
              }
              disabled={isUpdatingCustomer}
            >
              {isEditing ? "Cancel" : "Enable Edit"}
              <Edit size={16} />
            </button>
            <button className="close-button" onClick={handleClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="drawer-tabs">
          <button
            className={`tab ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            PROFILE INFO
          </button>
          <button
            className={`tab ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            SECURITY
          </button>
        </div>

        <div className="drawer-content">
          {activeTab === "profile" && (
            <div className="profile-info-tab">
              <div className="form-section">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      disabled={!isEditing}
                      className={`form-input ${!isEditing ? "disabled" : ""}`}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      disabled={!isEditing}
                      className={`form-input ${!isEditing ? "disabled" : ""}`}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Address (Read-only)</label>
                  <div className="input-with-icon">
                    <Mail size={16} />
                    <input
                      type="email"
                      value={selectedCustomers.email || ""}
                      disabled={true}
                      className="form-input disabled"
                      title="Email cannot be changed for security reasons"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Phone Number</label>
                    <div className="input-with-icon">
                      <Phone size={16} />
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) =>
                          handleInputChange("phoneNumber", e.target.value)
                        }
                        disabled={!isEditing}
                        className={`form-input ${!isEditing ? "disabled" : ""}`}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Alternate Phone</label>
                    <div className="input-with-icon">
                      <Phone size={16} />
                      <input
                        type="tel"
                        value={formData.alternatePhone}
                        onChange={(e) =>
                          handleInputChange("alternatePhone", e.target.value)
                        }
                        disabled={!isEditing}
                        className={`form-input ${!isEditing ? "disabled" : ""}`}
                        placeholder="Enter alternate phone"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <div className="input-with-icon">
                      <Calendar size={16} />
                      <input
                        type="date"
                        value={formData.dob}
                        onChange={(e) =>
                          handleInputChange("dob", e.target.value)
                        }
                        disabled={!isEditing}
                        className={`form-input ${!isEditing ? "disabled" : ""}`}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) =>
                        handleInputChange("gender", e.target.value)
                      }
                      disabled={!isEditing}
                      className={`form-select ${!isEditing ? "disabled" : ""}`}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">
                        Prefer not to say
                      </option>
                    </select>
                  </div>
                </div>

                <div className="form-section-title">
                  <h4>Address Information</h4>
                </div>

                <div className="form-group">
                  <label>Street Address</label>
                  <div className="input-with-icon">
                    <MapPin size={16} />
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) =>
                        handleInputChange("address.street", e.target.value)
                      }
                      disabled={!isEditing}
                      className={`form-input ${!isEditing ? "disabled" : ""}`}
                      placeholder="Enter street address"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) =>
                        handleInputChange("address.city", e.target.value)
                      }
                      disabled={!isEditing}
                      className={`form-input ${!isEditing ? "disabled" : ""}`}
                      placeholder="Enter city"
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) =>
                        handleInputChange("address.state", e.target.value)
                      }
                      disabled={!isEditing}
                      className={`form-input ${!isEditing ? "disabled" : ""}`}
                      placeholder="Enter state"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={(e) =>
                        handleInputChange("address.country", e.target.value)
                      }
                      disabled={!isEditing}
                      className={`form-input ${!isEditing ? "disabled" : ""}`}
                      placeholder="Enter country"
                    />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input
                      type="text"
                      value={formData.address.pincode}
                      onChange={(e) =>
                        handleInputChange("address.pincode", e.target.value)
                      }
                      disabled={!isEditing}
                      className={`form-input ${!isEditing ? "disabled" : ""}`}
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>

                <div className="form-section-title">
                  <h4>Account Status</h4>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.accountStatus}
                    onChange={(e) =>
                      handleInputChange("accountStatus", e.target.value)
                    }
                    disabled={!isEditing}
                    className={`form-select ${!isEditing ? "disabled" : ""}`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {isEditing && (
                <div className="form-actions">
                  <button
                    className={`save-button ${
                      isUpdatingCustomer ? "loading" : ""
                    }`}
                    onClick={handleSave}
                    disabled={isUpdatingCustomer}
                  >
                    {isUpdatingCustomer ? (
                      <>
                        <CircularProgress color="white" size={16} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "security" && (
            <div className="security-tab">
              <div className="security-overview">
                <div className="verification-card">
                  <div className="card-header">
                    <Shield size={20} />
                    <span>Account Verification</span>
                  </div>
                  <div className="verification-items">
                    <div
                      className={`verification-item ${
                        selectedCustomers.isEmailVerified
                          ? "verified"
                          : "unverified"
                      }`}
                    >
                      {selectedCustomers.isEmailVerified ? (
                        <CheckCircle size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                      <span>Email Verification</span>
                      <span className="status">
                        {selectedCustomers.isEmailVerified
                          ? "Verified"
                          : "Not Verified"}
                      </span>
                    </div>
                    <div
                      className={`verification-item ${
                        selectedCustomers.isPhoneVerified
                          ? "verified"
                          : "unverified"
                      }`}
                    >
                      {selectedCustomers.isPhoneVerified ? (
                        <CheckCircle size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                      <span>Phone Verification</span>
                      <span className="status">
                        {selectedCustomers.isPhoneVerified
                          ? "Verified"
                          : "Not Verified"}
                      </span>
                    </div>
                    <div
                      className={`verification-item ${
                        selectedCustomers.isProfileCompleted
                          ? "verified"
                          : "partial"
                      }`}
                    >
                      {selectedCustomers.isProfileCompleted ? (
                        <CheckCircle size={16} />
                      ) : (
                        <AlertCircle size={16} />
                      )}
                      <span>Profile Completion</span>
                      <span className="status">
                        {selectedCustomers.isProfileCompleted
                          ? "Complete"
                          : "Incomplete"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="login-methods-card">
                  <div className="card-header">
                    <User size={20} />
                    <span>Login Methods</span>
                  </div>
                  <div className="login-methods">
                    {selectedCustomers.loginMethod?.map((method, index) => (
                      <div key={index} className="login-method">
                        <span className={`method-badge ${method}`}>
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="account-activity">
                  <div className="card-header">
                    <Calendar size={20} />
                    <span>Account Activity</span>
                  </div>
                  <div className="activity-details">
                    <div className="activity-item">
                      <span className="activity-label">Account Created:</span>
                      <span className="activity-value">
                        {new Date(
                          selectedCustomers.createdAt
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="activity-item">
                      <span className="activity-label">Last Updated:</span>
                      <span className="activity-value">
                        {new Date(
                          selectedCustomers.updatedAt
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="activity-item">
                      <span className="activity-label">Account Role:</span>
                      <span className="activity-value">
                        {selectedCustomers.role}
                      </span>
                    </div>
                    <div className="activity-item">
                      <span className="activity-label">User ID:</span>
                      <span className="activity-value">
                        {selectedCustomers?.uid}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomersDrawer;
