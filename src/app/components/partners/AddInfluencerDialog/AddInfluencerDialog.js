import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  User,
  Mail,
  Phone,
  AtSign,
  FileText,
  Users,
  Instagram,
  Twitter,
  Youtube,
  Facebook,
  Globe,
  CreditCard,
  MapPin,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import "./AddInfluencerDialog.scss";
import { generateInfluencerUsername } from "@/utils/server/utils";

// Import Redux actions
import {
  addNewInfluencer,
  clearAddInfluencerData,
  handleAddInfluencerClose,
  clearError,
} from "@/store/slices/influencersSlice";

// Import selectors
import {
  selectAddInfluencerStates,
  selectAddInfluencerErrorMessage,
} from "@/store/slices/influencersSlice";

const AddInfluencerDialog = ({ isOpen, onClose, prefilledData, onSuccess }) => {
  const dispatch = useDispatch();

  // Get Redux state
  const { isAddingNewInfluencer, addInfluencerError, newInfluencerData } =
    useSelector(selectAddInfluencerStates);
  const errorMessage = useSelector(selectAddInfluencerErrorMessage);
  
  const [activeTab, setActiveTab] = useState("primary");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    phone: "",
    adminNotes: "",
    status: "active",
    socialLinks: [],
    defaultCommissionRate: 5,
    preferredPayoutMethod: "",
    profileImageUrl: "",
    tags: [],
    bio: "",
    address: { lane: "", city: "", state: "", pincode: "", country: "" },
    bankDetails: {
      accountHolderName: "",
      accountNumber: "",
      ifscCode: "",
      bankName: "",
      upiId: "",
    },
    additionalInfo: [],
  });
  const [errors, setErrors] = useState({});
  const [newTag, setNewTag] = useState("");

  // Populate form with prefilled data when dialog opens
  useEffect(() => {
    if (isOpen && prefilledData) {
      const attrs = prefilledData.attributes || {};
      
      // Parse social links
      let socialLinks = [];
      try {
        socialLinks = JSON.parse(attrs.SOCIAL_LINKS || "[]");
      } catch (e) {
        socialLinks = [];
      }

      // Map Brevo data to form structure
      const mappedData = {
        name: `${attrs.FIRSTNAME || ""} ${attrs.LASTNAME || ""}`.trim(),
        email: prefilledData.email || "",
        username: "", // Will be auto-generated
        phone: attrs.SMS?.replace(/^91/, "") || "", // Remove country code if present
        adminNotes: attrs.BIO || "",
        status: "active",
        socialLinks: socialLinks.map(link => ({
          platform: link.platform || "instagram",
          url: link.url || ""
        })),
        defaultCommissionRate: 5,
        preferredPayoutMethod: attrs.PREFERRED_CONTACT_METHOD === "bank" ? "bank_transfer" : 
                               attrs.PREFERRED_CONTACT_METHOD === "upi" ? "upi" : "",
        profileImageUrl: "",
        tags: [],
        bio: attrs.BIO || "",
        address: {
          lane: attrs.ADDRESS_LANE || "",
          city: attrs.CITY || "",
          state: attrs.STATE || "",
          pincode: attrs.PINCODE || "",
          country: attrs.COUNTRY || "",
        },
        bankDetails: {
          accountHolderName: "",
          accountNumber: "",
          ifscCode: "",
          bankName: "",
          upiId: "",
        },
        additionalInfo: [],
      };

      setFormData(mappedData);
    }
  }, [isOpen, prefilledData]);

  const payoutMethods = [
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "upi", label: "UPI" },
  ];

  const socialPlatforms = [
    { value: "instagram", label: "Instagram", icon: Instagram },
    { value: "twitter", label: "Twitter", icon: Twitter },
    { value: "youtube", label: "YouTube", icon: Youtube },
    { value: "facebook", label: "Facebook", icon: Facebook },
    { value: "tiktok", label: "TikTok", icon: Globe },
    { value: "linkedin", label: "LinkedIn", icon: Globe },
    { value: "other", label: "Other", icon: Globe },
  ];

  const isMandatoryFieldsFilled = () => {
    return (
      formData.name.trim() && formData.email.trim() && formData.username.trim()
    );
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      username: "",
      phone: "",
      adminNotes: "",
      status: "active",
      socialLinks: [],
      defaultCommissionRate: 5,
      preferredPayoutMethod: "",
      profileImageUrl: "",
      tags: [],
      bio: "",
      address: { lane: "", city: "", state: "", pincode: "", country: "" },
      bankDetails: {
        accountHolderName: "",
        accountNumber: "",
        ifscCode: "",
        bankName: "",
        upiId: "",
      },
      additionalInfo: [],
    });
    setErrors({});
    setNewTag("");
    setActiveTab("primary");
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleNestedInputChange = (parentField, childField, value) => {
    setFormData((prev) => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [childField]: value,
      },
    }));
  };

  const handleSocialLinkChange = (index, field, value) => {
    const newSocialLinks = [...formData.socialLinks];
    newSocialLinks[index] = { ...newSocialLinks[index], [field]: value };
    setFormData((prev) => ({ ...prev, socialLinks: newSocialLinks }));
  };

  const addSocialLink = () => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: "instagram", url: "" }],
    }));
  };

  const removeSocialLink = (index) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const addAdditionalInfo = () => {
    if (formData.additionalInfo.length < 20) {
      setFormData((prev) => ({
        ...prev,
        additionalInfo: [...prev.additionalInfo, { key: "", value: "" }],
      }));
    }
  };

  const removeAdditionalInfo = (index) => {
    setFormData((prev) => ({
      ...prev,
      additionalInfo: prev.additionalInfo.filter((_, i) => i !== index),
    }));
  };

  const handleAdditionalInfoChange = (index, field, value) => {
    const newAdditionalInfo = [...formData.additionalInfo];
    newAdditionalInfo[index] = { ...newAdditionalInfo[index], [field]: value };
    setFormData((prev) => ({ ...prev, additionalInfo: newAdditionalInfo }));
  };

  const handleSubmit = async () => {
    if (!isMandatoryFieldsFilled()) return;

    // Clean the data before sending
    const cleanedData = {
      ...formData,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      socialLinks:
        formData.socialLinks.length > 0
          ? formData.socialLinks.filter((link) => link.url.trim())
          : undefined,
      additionalInfo:
        formData.additionalInfo.length > 0
          ? formData.additionalInfo.filter(
              (info) => info.key.trim() && info.value.trim()
            )
          : undefined,
      phone: formData.phone.trim() || undefined,
      adminNotes: formData.adminNotes.trim() || undefined,
      profileImageUrl: formData.profileImageUrl.trim() || undefined,
      bio: formData.bio.trim() || undefined,
      preferredPayoutMethod: formData.preferredPayoutMethod || undefined,
      address:
        formData.address.lane.trim() ||
        formData.address.city.trim() ||
        formData.address.state.trim() ||
        formData.address.pincode.trim() ||
        formData.address.country.trim()
          ? {
              lane: formData.address.lane.trim() || undefined,
              city: formData.address.city.trim() || undefined,
              state: formData.address.state.trim() || undefined,
              pincode: formData.address.pincode.trim() || undefined,
              country: formData.address.country.trim() || undefined,
            }
          : undefined,
      bankDetails: Object.values(formData.bankDetails).some((value) =>
        value.trim()
      )
        ? {
            accountHolderName:
              formData.bankDetails.accountHolderName.trim() || undefined,
            accountNumber:
              formData.bankDetails.accountNumber.trim() || undefined,
            ifscCode: formData.bankDetails.ifscCode.trim() || undefined,
            bankName: formData.bankDetails.bankName.trim() || undefined,
            upiId: formData.bankDetails.upiId.trim() || undefined,
          }
        : undefined,
    };

    try {
      await dispatch(addNewInfluencer(cleanedData)).unwrap();
      // Success - call onSuccess callback if provided
      if (!addInfluencerError && onSuccess && prefilledData) {
        onSuccess(prefilledData.email);
      }
    } catch (error) {
      // Error is handled by Redux and displayed in the UI
      console.error("Failed to add influencer:", error);
    }
  };

  const handleClose = () => {
    if (!isAddingNewInfluencer) {
      resetForm();
      dispatch(clearAddInfluencerData());
      dispatch(clearError());
      onClose?.();
    }
  };

  // Effect to handle successful creation
  useEffect(() => {
    if (newInfluencerData && !isAddingNewInfluencer && !addInfluencerError) {
      // Success! Close the dialog and reset form
      setTimeout(() => {
        resetForm();
        dispatch(clearAddInfluencerData());
        onClose?.();
      }, 1000);
    }
  }, [
    newInfluencerData,
    isAddingNewInfluencer,
    addInfluencerError,
    dispatch,
    onClose,
  ]);

  // Effect to handle body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Effect to clear errors when dialog opens
  useEffect(() => {
    if (isOpen) {
      dispatch(clearError());
    }
  }, [isOpen, dispatch]);

  // Effect to auto-generate username when email or phone changes
  useEffect(() => {
    if (formData.email.trim() && formData.phone.trim()) {
      const generatedUsername = generateInfluencerUsername(
        formData.email,
        formData.phone
      );
      setFormData((prev) => ({
        ...prev,
        username: generatedUsername,
      }));

      if (errors.username) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.username;
          return newErrors;
        });
      }
    } else if (!formData.email.trim() && !formData.phone.trim()) {
      setFormData((prev) => ({
        ...prev,
        username: "",
      }));
    }
  }, [formData.email, formData.phone, errors.username]);

  if (!isOpen) return null;

  return (
    <>
      <div className="dialog-overlay" onClick={handleClose}>
        <div className="dialog-container" onClick={(e) => e.stopPropagation()}>
          <div className="dialog-header">
            <div className="dialog-title">
              <h2>{prefilledData ? "Create Influencer from Waitlist" : "Add New Influencer"}</h2>
            
            </div>
            {!isAddingNewInfluencer && (
              <button className="close-btn" onClick={handleClose}>
                <X size={20} />
              </button>
            )}
          </div>

          {/* Error Display */}
          {errorMessage && (
            <div className={`error-banner ${errorMessage.type}`}>
              <AlertCircle size={16} />
              <div>
                <strong>{errorMessage.title}</strong>
                <p>{errorMessage?.message}</p>
              </div>
              <button onClick={() => dispatch(clearError())}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* Success Display */}
          {newInfluencerData && !addInfluencerError && (
            <div className="success-banner">
              <CheckCircle size={16} />
              <div>
                <strong>Success!</strong>
                <p>
                  Influencer "{newInfluencerData.name}" has been created
                  successfully.
                </p>
              </div>
            </div>
          )}

          <div className="dialog-tabs">
            <button
              className={`tab-btn ${activeTab === "primary" ? "active" : ""}`}
              onClick={() => setActiveTab("primary")}
              disabled={isAddingNewInfluencer}
            >
              <User size={16} />
              Primary Info
            </button>
            <button
              className={`tab-btn ${activeTab === "secondary" ? "active" : ""}`}
              onClick={() => setActiveTab("secondary")}
              disabled={isAddingNewInfluencer}
            >
              <FileText size={16} />
              Additional Details
            </button>
          </div>

          <div className="dialog-content">
            {activeTab === "primary" && (
              <div className="tab-content">
                <div className="form-grid">
                  {/* Basic Information */}
                  <div className="form-section basic_info">
                    <div className="form-section-inner">
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label required">
                            Full Name
                          </label>
                          <div className="input-wrapper">
                            <input
                              type="text"
                              className={`form-input with-icon ${
                                errors.name ? "error" : ""
                              }`}
                              value={formData.name}
                              onChange={(e) =>
                                handleInputChange("name", e.target.value)
                              }
                              placeholder="Enter full name"
                              disabled={isAddingNewInfluencer}
                            />
                            <User className="input-icon" size={18} />
                          </div>
                          {errors.name && (
                            <span className="error-text">
                              <AlertCircle size={14} />
                              {errors.name}
                            </span>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label required">
                            Email Address
                          </label>
                          <div className="input-wrapper">
                            <input
                              type="email"
                              className={`form-input with-icon ${
                                errors.email ? "error" : ""
                              }`}
                              value={formData.email}
                              onChange={(e) =>
                                handleInputChange("email", e.target.value)
                              }
                              placeholder="Enter email address"
                              disabled={isAddingNewInfluencer}
                            />
                            <Mail className="input-icon" size={18} />
                          </div>
                          {errors.email && (
                            <span className="error-text">
                              <AlertCircle size={14} />
                              {errors.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label required">
                            Username
                          </label>
                          <div className="input-wrapper">
                            <input
                              type="text"
                              className={`form-input with-icon ${
                                errors.username ? "error" : ""
                              }`}
                              value={formData.username}
                              placeholder={
                                formData.email.trim() && formData.phone.trim()
                                  ? "Auto-generated from email & phone"
                                  : "Enter email and phone to generate"
                              }
                              disabled={true}
                              readOnly
                            />
                            <AtSign className="input-icon" size={18} />
                          </div>
                          {errors.username && (
                            <span className="error-text">
                              <AlertCircle size={14} />
                              {errors.username}
                            </span>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Phone Number</label>
                          <div className="input-wrapper">
                            <input
                              type="tel"
                              className="form-input with-icon"
                              value={formData.phone}
                              onChange={(e) =>
                                handleInputChange("phone", e.target.value)
                              }
                              placeholder="Enter phone number"
                              disabled={isAddingNewInfluencer}
                            />
                            <Phone className="input-icon" size={18} />
                          </div>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          <Users size={16} />
                          Status
                        </label>
                        <select
                          className="form-input"
                          value={formData.status}
                          onChange={(e) =>
                            handleInputChange("status", e.target.value)
                          }
                          disabled={isAddingNewInfluencer}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Social Media Links */}
                  <div className="form-section">
                    <div className="section-header">
                      <h3>
                        <Instagram size={18} />
                        Social Media Links
                      </h3>
                      {formData?.socialLinks?.length < 5 && (
                        <button
                          type="button"
                          className="add-btn"
                          onClick={addSocialLink}
                          disabled={isAddingNewInfluencer}
                        >
                          <Plus size={16} />
                          Add Social
                        </button>
                      )}
                    </div>

                    {formData.socialLinks.map((social, index) => (
                      <div key={index} className="social-link-item">
                        <select
                          className="form-input platform-select"
                          value={social.platform}
                          onChange={(e) =>
                            handleSocialLinkChange(
                              index,
                              "platform",
                              e.target.value
                            )
                          }
                          disabled={isAddingNewInfluencer}
                        >
                          {socialPlatforms.map((platform) => (
                            <option key={platform.value} value={platform.value}>
                              {platform.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="url"
                          className="form-input social-url-input"
                          value={social.url}
                          onChange={(e) =>
                            handleSocialLinkChange(index, "url", e.target.value)
                          }
                          placeholder="Enter profile URL"
                          disabled={isAddingNewInfluencer}
                        />
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeSocialLink(index)}
                          disabled={isAddingNewInfluencer}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="grd_section">
                    {/* Tags */}
                    <div className="form-section tags_">
                      <div className="section-header">
                        <h3>Tags</h3>
                      </div>

                      <div className="tags-input-container">
                        <input
                          type="text"
                          className="form-input"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add a tag"
                          onKeyPress={(e) =>
                            e.key === "Enter" && (e.preventDefault(), addTag())
                          }
                          disabled={isAddingNewInfluencer}
                        />
                        <button
                          type="button"
                          className="add-tag-btn"
                          onClick={addTag}
                          disabled={isAddingNewInfluencer || !newTag.trim()}
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <div className="tags-list">
                        {formData.tags.map((tag, index) => (
                          <span key={index} className="tag-item">
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              disabled={isAddingNewInfluencer}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Admin Notes */}
                    <div className="form-section tags_">
                      <div className="form-group">
                        <label className="form-label">Admin Notes</label>
                        <textarea
                          className={`form-textarea ${
                            errors.adminNotes ? "error" : ""
                          }`}
                          value={formData.adminNotes}
                          onChange={(e) =>
                            handleInputChange("adminNotes", e.target.value)
                          }
                          placeholder="Add any admin notes..."
                          rows={3}
                          maxLength={1000}
                          disabled={isAddingNewInfluencer}
                        />
                        {errors.adminNotes && (
                          <span className="error-text">
                            <AlertCircle size={14} />
                            {errors.adminNotes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "secondary" && (
              <div className="tab-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      <CreditCard size={16} />
                      Preferred Payout Method
                    </label>
                    <select
                      className="form-input"
                      value={formData.preferredPayoutMethod}
                      onChange={(e) =>
                        handleInputChange(
                          "preferredPayoutMethod",
                          e.target.value
                        )
                      }
                      disabled={isAddingNewInfluencer}
                    >
                      <option value="">Select method</option>
                      {payoutMethods.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bank Details */}
                  {formData.preferredPayoutMethod === "bank_transfer" && (
                    <div className="form-section">
                      <h3 style={{ marginBottom: "0px" }}>
                        <CreditCard size={18} />
                        Bank Details
                      </h3>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">
                            Account Holder Name
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            value={formData.bankDetails.accountHolderName}
                            onChange={(e) =>
                              handleNestedInputChange(
                                "bankDetails",
                                "accountHolderName",
                                e.target.value
                              )
                            }
                            placeholder="Account holder name"
                            disabled={isAddingNewInfluencer}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Bank Name</label>
                          <input
                            type="text"
                            className="form-input"
                            value={formData.bankDetails.bankName}
                            onChange={(e) =>
                              handleNestedInputChange(
                                "bankDetails",
                                "bankName",
                                e.target.value
                              )
                            }
                            placeholder="Bank name"
                            disabled={isAddingNewInfluencer}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Account Number</label>
                          <input
                            type="text"
                            className="form-input"
                            value={formData.bankDetails.accountNumber}
                            onChange={(e) =>
                              handleNestedInputChange(
                                "bankDetails",
                                "accountNumber",
                                e.target.value
                              )
                            }
                            placeholder="Account number"
                            disabled={isAddingNewInfluencer}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">IFSC Code</label>
                          <input
                            type="text"
                            className="form-input"
                            value={formData.bankDetails.ifscCode}
                            onChange={(e) =>
                              handleNestedInputChange(
                                "bankDetails",
                                "ifscCode",
                                e.target.value.toUpperCase()
                              )
                            }
                            placeholder="IFSC code"
                            disabled={isAddingNewInfluencer}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* UPI Details */}
                  {formData.preferredPayoutMethod === "upi" && (
                    <div className="form-section">
                      <h3>
                        <CreditCard size={18} />
                        UPI Details
                      </h3>

                      <div className="form-group">
                        <label className="form-label">UPI ID</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.bankDetails.upiId}
                          onChange={(e) =>
                            handleNestedInputChange(
                              "bankDetails",
                              "upiId",
                              e.target.value
                            )
                          }
                          placeholder="example@upi"
                          disabled={isAddingNewInfluencer}
                        />
                      </div>
                    </div>
                  )}

                  {/* Profile Information */}
                  <div className="form-section">
                    <div className="form-group">
                      <label className="form-label">Profile Image URL</label>
                      <div className="input-wrapper">
                        <input
                          type="url"
                          className={`form-input with-icon ${
                            errors.profileImageUrl ? "error" : ""
                          }`}
                          value={formData.profileImageUrl}
                          onChange={(e) =>
                            handleInputChange("profileImageUrl", e.target.value)
                          }
                          placeholder="https://example.com/profile.jpg"
                          disabled={isAddingNewInfluencer}
                        />
                        <User className="input-icon" size={18} />
                      </div>
                      {errors.profileImageUrl && (
                        <span className="error-text">
                          <AlertCircle size={14} />
                          {errors.profileImageUrl}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <textarea
                        className={`form-textarea ${errors.bio ? "error" : ""}`}
                        value={formData.bio}
                        onChange={(e) =>
                          handleInputChange("bio", e.target.value)
                        }
                        placeholder="Tell us about this influencer..."
                        rows={4}
                        maxLength={500}
                        disabled={isAddingNewInfluencer}
                      />
                      {errors.bio && (
                        <span className="error-text">
                          <AlertCircle size={14} />
                          {errors.bio}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Location & Address */}
                  <div className="form-section">
                    <h3>
                      <MapPin size={18} />
                      Location & Address
                    </h3>

                    <div className="form-group">
                      <label className="form-label">Street Address</label>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          className="form-input with-icon"
                          value={formData.address.lane}
                          onChange={(e) =>
                            handleNestedInputChange(
                              "address",
                              "lane",
                              e.target.value
                            )
                          }
                          placeholder="Enter street address"
                          disabled={isAddingNewInfluencer}
                        />
                        <MapPin className="input-icon" size={18} />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">City (Address)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.address.city}
                          onChange={(e) =>
                            handleNestedInputChange(
                              "address",
                              "city",
                              e.target.value
                            )
                          }
                          placeholder="City"
                          disabled={isAddingNewInfluencer}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">State/Province</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.address.state}
                          onChange={(e) =>
                            handleNestedInputChange(
                              "address",
                              "state",
                              e.target.value
                            )
                          }
                          placeholder="State/Province"
                          disabled={isAddingNewInfluencer}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Postal Code</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.address.pincode}
                          onChange={(e) =>
                            handleNestedInputChange(
                              "address",
                              "pincode",
                              e.target.value
                            )
                          }
                          placeholder="Postal code"
                          disabled={isAddingNewInfluencer}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Country (Address)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.address.country}
                          onChange={(e) =>
                            handleNestedInputChange(
                              "address",
                              "country",
                              e.target.value
                            )
                          }
                          placeholder="Country"
                          disabled={isAddingNewInfluencer}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="dialog-footer">
            <div className="dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={isAddingNewInfluencer}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!isMandatoryFieldsFilled() || isAddingNewInfluencer}
              >
                {isAddingNewInfluencer ? (
                  <>
                    <div className="loading-spinner"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <User size={16} />
                    Create Influencer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddInfluencerDialog;