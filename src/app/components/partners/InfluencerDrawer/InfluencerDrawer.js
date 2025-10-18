import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  Edit,
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  CreditCard,
  Globe,
  FileText,
  Settings,
  Trash,
} from "lucide-react";
import "./InfluencerDrawer.scss";

import {
  updateInfluencer,
  deleteInfluencer,
  handleEditCloseInfluencer,
  setInfluencerDrawer,
} from "@/store/slices/influencersSlice";
import { removeEmptyFields } from "@/utils/utils";

const InfluencerDrawer = () => {
  const dispatch = useDispatch();

  // Get state from Redux
  const {
    isInfluencerDrawerOpen,
    selectedInfluencer,
    isUpdatingInfluencer,
    isDeletingInfluencer,
  } = useSelector((state) => state.influencers);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    phone: "",
    bio: "",
    location: {
      city: "",
      country: "",
    },
    address: {
      lane: "",
      city: "",
      state: "",
      pincode: "",
      country: "",
    },
    socialLinks: [],
    tags: [],
    preferredContactMethod: "",
    verificationStatus: "",
    status: "",
    defaultCommissionRate: 0,
    referralCode: "",
    profileImageUrl: "",
    preferredPayoutMethod: "",
    bankDetails: {
      accountHolderName: "",
      accountNumber: "",
      ifscCode: "",
      swiftCode: "",
      iban: "",
      bankName: "",
      bankCountry: "",
      upiId: "",
    },
    adminNotes: "",
  });

  useEffect(() => {
    if (selectedInfluencer && isInfluencerDrawerOpen) {
      setFormData({
        name: selectedInfluencer.name || "",
        email: selectedInfluencer.email || "",
        username: selectedInfluencer.username || "",
        phone: selectedInfluencer.phone || "",
        bio: selectedInfluencer.bio || "",
        location: {
          city: selectedInfluencer.location?.city || "",
          country: selectedInfluencer.location?.country || "",
        },
        address: {
          lane: selectedInfluencer.address?.lane || "",
          city: selectedInfluencer.address?.city || "",
          state: selectedInfluencer.address?.state || "",
          pincode: selectedInfluencer.address?.pincode || "",
          country: selectedInfluencer.address?.country || "",
        },
        socialLinks: selectedInfluencer.socialLinks || [],
        tags: selectedInfluencer.tags || [],
        preferredContactMethod: selectedInfluencer.preferredContactMethod || "",
        verificationStatus: selectedInfluencer.verificationStatus || "",
        status: selectedInfluencer.status || "",
        defaultCommissionRate: selectedInfluencer.defaultCommissionRate || 0,
        referralCode: "",
        profileImageUrl: selectedInfluencer.profileImageUrl || "",
        preferredPayoutMethod: selectedInfluencer.preferredPayoutMethod || "",
        bankDetails: {
          accountHolderName:
            selectedInfluencer.bankDetails?.accountHolderName || "",
          accountNumber: selectedInfluencer.bankDetails?.accountNumber || "",
          ifscCode: selectedInfluencer.bankDetails?.ifscCode || "",
          swiftCode: selectedInfluencer.bankDetails?.swiftCode || "",
          iban: selectedInfluencer.bankDetails?.iban || "",
          bankName: selectedInfluencer.bankDetails?.bankName || "",
          bankCountry: selectedInfluencer.bankDetails?.bankCountry || "",
          upiId: selectedInfluencer.bankDetails?.upiId || "",
        },
        adminNotes: selectedInfluencer.adminNotes || "",
      });
    }
  }, [selectedInfluencer, isInfluencerDrawerOpen]);

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

  const handleArrayChange = (field, index, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const addArrayItem = (field, defaultItem) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], defaultItem],
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!selectedInfluencer?.id || isUpdatingInfluencer) return;

    const updateData = {};

    // Helper for primitive fields
    const hasPrimitiveChanged = (key) => {
      const original = selectedInfluencer[key] ?? "";
      const current = formData[key] ?? "";
      return original !== current;
    };

    // Helper for objects
    const hasObjectChanged = (original = {}, current = {}) => {
      const allKeys = new Set([
        ...Object.keys(original),
        ...Object.keys(current),
      ]);
      for (const key of allKeys) {
        if ((original[key] ?? "") !== (current[key] ?? "")) return true;
      }
      return false;
    };

    // Helper for arrays
    const hasArrayChanged = (original = [], current = []) => {
      return JSON.stringify(original) !== JSON.stringify(current);
    };

    // Primitive fields
    [
      "name",
      "email",

      "phone",
      "bio",
      "referralCode",
      "profileImageUrl",
      "preferredContactMethod",
      "verificationStatus",
      "status",
      "defaultCommissionRate",
      "preferredPayoutMethod",
      "adminNotes",
    ].forEach((field) => {
      if (hasPrimitiveChanged(field)) updateData[field] = formData[field];
    });

    // Nested objects
    if (hasObjectChanged(selectedInfluencer.location, formData.location)) {
      updateData.location = formData.location;
    }
    if (hasObjectChanged(selectedInfluencer.address, formData.address)) {
      updateData.address = formData.address;
    }
    if (
      hasObjectChanged(selectedInfluencer.bankDetails, formData.bankDetails)
    ) {
      updateData.bankDetails = formData.bankDetails;
    }

    // Arrays
    if (hasArrayChanged(selectedInfluencer.socialLinks, formData.socialLinks)) {
      updateData.socialLinks = formData.socialLinks;
    }
    if (hasArrayChanged(selectedInfluencer.tags, formData.tags)) {
      updateData.tags = formData.tags;
    }
    if (
      hasArrayChanged(
        selectedInfluencer.additionalInfo,
        formData.additionalInfo
      )
    ) {
      updateData.additionalInfo = formData.additionalInfo;
    }
    const refinedData = removeEmptyFields(updateData);
    // Dispatch update if anything changed
    if (Object.keys(refinedData).length > 0) {
      try {
        await dispatch(
          updateInfluencer({
            id: selectedInfluencer.id,
            updateData: refinedData,
          })
        ).unwrap();
        setIsEditing(false);
      } catch (error) {
        console.error("Failed to update influencer:", error);
      }
    } else {
      // Nothing changed
      setIsEditing(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    dispatch(handleEditCloseInfluencer());
    dispatch(setInfluencerDrawer());
  };

  if (!isInfluencerDrawerOpen || !selectedInfluencer) return null;

  return (
    <div className="influencer-drawer-overlay">
      <div className="influencer-drawer">
        <div className="drawer-header">
          <div className="header-left">
            <div className="influencer-avatar">
              <User size={24} />
            </div>
            <div className="header-info">
              <h3>{selectedInfluencer.name}</h3>
              <span className="user-id">
                {selectedInfluencer.id && `ID: ${selectedInfluencer.id}`}
              </span>
            </div>
          </div>

          <div className="header-actions">
            <button
              className={`toggle-button ${isEditing ? "editing" : ""}`}
              onClick={() => setIsEditing(!isEditing)}
              disabled={isUpdatingInfluencer}
            >
              {isEditing ? "Cancel" : "Enable Form"}
              <Edit size={16} />
            </button>
            <button className="close-button" onClick={handleClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="drawer-content">
          <div className="primary-info-tab">
            {/* Basic Information */}
            <div className="form-section">
              <div className="form-section-title">
                <h4>
                  <User size={16} /> Basic Information
                </h4>
              </div>

              <div className="form_grp_wrapper">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    disabled={!isEditing}
                    className={`form-input ${!isEditing ? "disabled" : ""}`}
                  />
                </div>

                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      handleInputChange("username", e.target.value)
                    }
                    disabled
                    className={`form-input disabled`}
                    placeholder="unique_username"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <div className="input-with-icon">
                  <Mail size={16} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    disabled={!isEditing}
                    className={`form-input ${!isEditing ? "disabled" : ""}`}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <div className="input-with-icon">
                  <Phone size={16} />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    disabled={!isEditing}
                    className={`form-input ${!isEditing ? "disabled" : ""}`}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  disabled={!isEditing}
                  className={`form-textarea ${!isEditing ? "disabled" : ""}`}
                  rows="3"
                  placeholder="Tell us about yourself..."
                  maxLength="500"
                />
              </div>

              <div className="form-group">
                <label>Profile Image URL</label>
                <input
                  type="url"
                  value={formData.profileImageUrl}
                  onChange={(e) =>
                    handleInputChange("profileImageUrl", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`form-input ${!isEditing ? "disabled" : ""}`}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {/* Address */}
            <div className="form-section">
              <div className="form-section-title">
                <h4>
                  <MapPin size={16} /> Address
                </h4>
              </div>

              <div className="form-group">
                <label>Lane/Street</label>
                <input
                  type="text"
                  value={formData.address.lane}
                  onChange={(e) =>
                    handleInputChange("address.lane", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`form-input ${!isEditing ? "disabled" : ""}`}
                />
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
                  />
                </div>
              </div>

              <div className="form-row">
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
                    placeholder="123456"
                  />
                </div>
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
                  />
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="form-section">
              <div className="form-section-title">
                <h4>
                  <Globe size={16} /> Social Media Links
                </h4>
              </div>

              {formData.socialLinks.map((link, index) => (
                <div key={index} className="social-link-group">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Platform</label>
                      <select
                        value={link.platform}
                        onChange={(e) =>
                          handleArrayChange("socialLinks", index, {
                            ...link,
                            platform: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        className={`form-select ${
                          !isEditing ? "disabled" : ""
                        }`}
                      >
                        <option value="">Select platform</option>
                        <option value="instagram">Instagram</option>
                        <option value="twitter">Twitter</option>
                        <option value="tiktok">TikTok</option>
                        <option value="youtube">YouTube</option>
                        <option value="facebook">Facebook</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="form-group url">
                      <div>
                        <label>URL</label>
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) =>
                            handleArrayChange("socialLinks", index, {
                              ...link,
                              url: e.target.value,
                            })
                          }
                          disabled={!isEditing}
                          className={`form-input ${
                            !isEditing ? "disabled" : ""
                          }`}
                          placeholder="https://..."
                        />
                      </div>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => removeArrayItem("socialLinks", index)}
                          className="remove-btn"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isEditing && formData?.socialLinks.length < 5 && (
                <button
                  type="button"
                  onClick={() =>
                    addArrayItem("socialLinks", { platform: "", url: "" })
                  }
                  className="add-btn"
                >
                  Add Social Link
                </button>
              )}
            </div>

            {/* Settings */}
            <div className="form-section">
              <div className="form-section-title">
                <h4>
                  <Settings size={16} /> Settings
                </h4>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      handleInputChange("status", e.target.value)
                    }
                    disabled={!isEditing}
                    className={`form-select ${!isEditing ? "disabled" : ""}`}
                  >
                    <option value="">Select status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Verification Status</label>
                  <select
                    value={formData.verificationStatus}
                    onChange={(e) =>
                      handleInputChange("verificationStatus", e.target.value)
                    }
                    disabled
                    className={`form-select disabled`}
                  >
                    <option value="">Select verification status</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Preferred Contact Method</label>
                  <select
                    value={formData.preferredContactMethod}
                    onChange={(e) =>
                      handleInputChange(
                        "preferredContactMethod",
                        e.target.value
                      )
                    }
                    disabled={!isEditing}
                    className={`form-select ${!isEditing ? "disabled" : ""}`}
                  >
                    <option value="">Select contact method</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="social">Social</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Default Commission Rate</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.defaultCommissionRate}
                    onChange={(e) =>
                      handleInputChange(
                        "defaultCommissionRate",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    disabled
                    className={`form-input disabled`}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Referral Code</label>
                <input
                  type="text"
                  value={formData.referralCode}
                  onChange={(e) =>
                    handleInputChange(
                      "referralCode",
                      e.target.value.toUpperCase()
                    )
                  }
                  disabled
                  className={`form-input disabled`}
                  placeholder="UNIQUE123"
                />
              </div>
            </div>

            {/* Payment Details */}
            <div className="form-section">
              <div className="form-section-title">
                <h4>
                  <CreditCard size={16} /> Payment Details
                </h4>
              </div>

              <div className="form-group">
                <label>Preferred Payout Method</label>
                <select
                  value={formData.preferredPayoutMethod}
                  onChange={(e) =>
                    handleInputChange("preferredPayoutMethod", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`form-select ${!isEditing ? "disabled" : ""}`}
                >
                  <option value="">Select payout method</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Account Holder Name</label>
                  <input
                    type="text"
                    value={formData.bankDetails.accountHolderName}
                    onChange={(e) =>
                      handleInputChange(
                        "bankDetails.accountHolderName",
                        e.target.value
                      )
                    }
                    disabled={!isEditing}
                    className={`form-input ${!isEditing ? "disabled" : ""}`}
                  />
                </div>
                <div className="form-group">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    value={formData.bankDetails.bankName}
                    onChange={(e) =>
                      handleInputChange("bankDetails.bankName", e.target.value)
                    }
                    disabled={!isEditing}
                    className={`form-input ${!isEditing ? "disabled" : ""}`}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Account Number</label>
                  <input
                    type="text"
                    value={formData.bankDetails.accountNumber}
                    onChange={(e) =>
                      handleInputChange(
                        "bankDetails.accountNumber",
                        e.target.value
                      )
                    }
                    disabled={!isEditing}
                    className={`form-input ${!isEditing ? "disabled" : ""}`}
                  />
                </div>
                <div className="form-group">
                  <label>IFSC Code</label>
                  <input
                    type="text"
                    value={formData.bankDetails.ifscCode}
                    onChange={(e) =>
                      handleInputChange(
                        "bankDetails.ifscCode",
                        e.target.value.toUpperCase()
                      )
                    }
                    disabled={!isEditing}
                    className={`form-input ${!isEditing ? "disabled" : ""}`}
                    placeholder="ABCD0123456"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>UPI ID</label>
                <input
                  type="text"
                  value={formData.bankDetails.upiId}
                  onChange={(e) =>
                    handleInputChange("bankDetails.upiId", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`form-input ${!isEditing ? "disabled" : ""}`}
                  placeholder="username"
                />
              </div>
            </div>

            {/* Admin Notes */}
            <div className="form-section">
              <div className="form-section-title">
                <h4>
                  <FileText size={16} /> Admin Notes
                </h4>
              </div>

              <div className="form-group">
                <label>Admin Notes</label>
                <textarea
                  value={formData.adminNotes}
                  onChange={(e) =>
                    handleInputChange("adminNotes", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`form-textarea ${!isEditing ? "disabled" : ""}`}
                  rows="4"
                  placeholder="Internal notes for admin use..."
                  maxLength="1000"
                />
              </div>
            </div>

            {isEditing && (
              <div className="form-actions">
                <button
                  className={`save-button ${
                    isUpdatingInfluencer ? "loading" : ""
                  }`}
                  onClick={handleSave}
                  disabled={isUpdatingInfluencer || isDeletingInfluencer}
                >
                  {isUpdatingInfluencer ? (
                    <>
                      <div className="spinner"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  className={`delete-influencer-button ${
                    isDeletingInfluencer ? "loading" : ""
                  }`}
                  onClick={() => {
                    dispatch(deleteInfluencer({ id: selectedInfluencer?.id }));
                  }}
                  disabled={isDeletingInfluencer}
                >
                  {isDeletingInfluencer ? (
                    <>
                      <div className="spinner"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash size={16} />
                      Delete Influncer
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfluencerDrawer;
