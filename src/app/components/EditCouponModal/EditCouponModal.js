// components/EditCouponModal/EditCouponModal.js
"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  Search,
  Plus,
  Minus,
  Crown,
  DollarSign,
  Percent,
  Save,
  Loader2,
  AlertCircle,
  Tag,
  Trash2,
  UnlinkIcon,
  IndianRupee,
} from "lucide-react";

import {
  updateCoupon,
  fetchServices,
  searchInfluencer,
  clearInfluencer,
  clearError,
} from "@/store/slices/couponsSlice";
import "./EditCouponModal.scss";
import { CircularProgress } from "@mui/material";

export default function EditCouponModal({ coupon, onClose }) {
  const dispatch = useDispatch();
  const {
    services,
    currentInfluencer,
    serviceLoading,
    influencerLoading,
    loading,
    error,
    updateError,
    updatingCoupon
  } = useSelector((state) => state.coupons);

  // Form state - initialize with existing coupon data
  const [formData, setFormData] = useState({
    title: coupon.title || "",
    description: coupon.description || "",
    discount: {
      kind: coupon.discount?.kind || "percent",
      amount: coupon.discount?.amount?.toString() || "",
      maxDiscount: coupon.discount?.maxDiscount?.toString() || "",
    },
    linkedServices: coupon.linkedServices || [],
    appliesTo: {
      users: coupon.appliesTo?.users || "all",
    },
    usageLimits: {
      perUser: coupon.usageLimits?.perUser?.toString() || "",
      total: coupon.usageLimits?.total?.toString() || "",
    },
    validFrom: coupon.validFrom
      ? new Date(coupon.validFrom).toISOString().slice(0, 16)
      : "",
    expiresAt: coupon.expiresAt
      ? new Date(coupon.expiresAt).toISOString().slice(0, 16)
      : "",
    state: coupon.state || "active",
    isInfluencerCoupon: coupon.isInfluencerCoupon || false,
    influencerId: coupon.influencerId || "",
    commission: coupon.commission
      ? {
          kind: coupon.commission.kind || "percent",
          amount: coupon.commission.amount?.toString() || "",
          maxCommission: coupon.commission.maxCommission?.toString() || "",
        }
      : {
          kind: "percent",
          amount: "",
          maxCommission: "",
        },
  });

  // UI state
  const [serviceSearch, setServiceSearch] = useState("");
  const [filteredServices, setFilteredServices] = useState([]);
  const [influencerEmail, setInfluencerEmail] = useState("");
  const [showServiceSearch, setShowServiceSearch] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load services on mount
  useEffect(() => {
    if (!services.length) {
      dispatch(fetchServices());
    }
    return () => {
      dispatch(clearInfluencer());
      dispatch(clearError());
    };
  }, [dispatch, services.length]);

  // Filter services based on search
  useEffect(() => {
    if (services && serviceSearch) {
      const filtered = services.filter(
        (service) =>
          service.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
          service.serviceId.toLowerCase().includes(serviceSearch.toLowerCase())
      );
      setFilteredServices(filtered);
    } else {
      setFilteredServices(services || []);
    }
  }, [services, serviceSearch]);

  // Check for changes
  useEffect(() => {
    const originalData = {
      title: coupon.title || "",
      description: coupon.description || "",
      discount: {
        kind: coupon.discount?.kind || "percent",
        amount: coupon.discount?.amount?.toString() || "",
        maxDiscount: coupon.discount?.maxDiscount?.toString() || "",
      },
      linkedServices: coupon.linkedServices || [],
      appliesTo: {
        users: coupon.appliesTo?.users || "all",
      },
      usageLimits: {
        perUser: coupon.usageLimits?.perUser?.toString() || "",
        total: coupon.usageLimits?.total?.toString() || "",
      },
      validFrom: coupon.validFrom
        ? new Date(coupon.validFrom).toISOString().slice(0, 16)
        : "",
      expiresAt: coupon.expiresAt
        ? new Date(coupon.expiresAt).toISOString().slice(0, 16)
        : "",
      state: coupon.state || "active",
      isInfluencerCoupon: coupon.isInfluencerCoupon || false,
      influencerId: coupon.influencerId || "",
    };

    const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [formData, coupon]);

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

  const handleServiceToggle = (serviceId) => {
    setFormData((prev) => ({
      ...prev,
      linkedServices: prev.linkedServices.includes(serviceId)
        ? prev.linkedServices.filter((id) => id !== serviceId)
        : [...prev.linkedServices, serviceId],
    }));
  };

  const handleServiceRemove = (serviceId) => {
    setFormData((prev) => ({
      ...prev,
      linkedServices: prev.linkedServices.filter((id) => id !== serviceId),
    }));
  };

  const handleUnlinkAllServices = () => {
    setFormData((prev) => ({
      ...prev,
      linkedServices: [],
    }));
  };

  const handleInfluencerSearch = async () => {
    if (!influencerEmail.trim()) return;
    await dispatch(searchInfluencer({ email: influencerEmail.trim() }));
  };

  const handleInfluencerLink = () => {
    if (currentInfluencer) {
      setFormData((prev) => ({
        ...prev,
        influencerId: currentInfluencer.id,
        isInfluencerCoupon: true,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare update data - only include changed fields
    const updateData = {};

    if (formData.title !== (coupon.title || "")) {
      updateData.title = formData.title;
    }

    if (formData.description !== (coupon.description || "")) {
      updateData.description = formData.description;
    }

    if (
      formData.discount.kind !== coupon.discount?.kind ||
      parseFloat(formData.discount.amount) !== coupon.discount?.amount ||
      (formData.discount.maxDiscount
        ? parseFloat(formData.discount.maxDiscount)
        : undefined) !== coupon.discount?.maxDiscount
    ) {
      updateData.discount = {
        kind: formData.discount.kind,
        amount: parseFloat(formData.discount.amount) || 0,
        maxDiscount: formData.discount.maxDiscount
          ? parseFloat(formData.discount.maxDiscount)
          : undefined,
      };
    }

    // Handle service changes
    const originalServices = coupon.linkedServices || [];
    const newServices = formData.linkedServices;
    const addedServices = newServices.filter(
      (id) => !originalServices.includes(id)
    );
    const removedServices = originalServices.filter(
      (id) => !newServices.includes(id)
    );

    if (addedServices.length > 0) {
      updateData.addLinkedServices = addedServices;
    }
    if (removedServices.length > 0) {
      updateData.removeLinkedServices = removedServices;
    }

    if (formData.appliesTo.users !== (coupon.appliesTo?.users || "all")) {
      updateData.appliesTo = formData.appliesTo;
    }

    if (
      formData.usageLimits.perUser !==
        (coupon.usageLimits?.perUser?.toString() || "") ||
      formData.usageLimits.total !==
        (coupon.usageLimits?.total?.toString() || "")
    ) {
      updateData.usageLimits = {
        perUser: formData.usageLimits.perUser
          ? parseInt(formData.usageLimits.perUser)
          : undefined,
        total: formData.usageLimits.total
          ? parseInt(formData.usageLimits.total)
          : undefined,
      };
    }

    if (
      formData.validFrom !==
      (coupon.validFrom
        ? new Date(coupon.validFrom).toISOString().slice(0, 16)
        : "")
    ) {
      updateData.validFrom = formData.validFrom
        ? new Date(formData.validFrom)
        : undefined;
    }

    if (
      formData.expiresAt !==
      (coupon.expiresAt
        ? new Date(coupon.expiresAt).toISOString().slice(0, 16)
        : "")
    ) {
      updateData.expiresAt = formData.expiresAt
        ? new Date(formData.expiresAt)
        : undefined;
    }

    if (formData.state !== (coupon.state || "active")) {
      updateData.state = formData.state;
    }

    if (formData.isInfluencerCoupon !== (coupon.isInfluencerCoupon || false)) {
      updateData.isInfluencerCoupon = formData.isInfluencerCoupon;
    }

    if (formData.influencerId !== (coupon.influencerId || "")) {
      updateData.influencerId = formData.influencerId || null;
    }

    // Handle commission changes
    if (formData.isInfluencerCoupon && formData.commission.amount) {
      const originalCommission = coupon.commission;
      const newCommission = {
        kind: formData.commission.kind,
        amount: parseFloat(formData.commission.amount) || 0,
        maxCommission: formData.commission.maxCommission
          ? parseFloat(formData.commission.maxCommission)
          : undefined,
      };

      if (
        !originalCommission ||
        originalCommission.kind !== newCommission.kind ||
        originalCommission.amount !== newCommission.amount ||
        originalCommission.maxCommission !== newCommission.maxCommission
      ) {
        updateData.commission = newCommission;
      }
    } else if (!formData.isInfluencerCoupon && coupon.commission) {
      updateData.commission = null;
    }

    try {
      await dispatch(updateCoupon({ id: coupon._id, updateData })).unwrap();
      onClose();
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  const getSelectedServices = () => {
    return formData.linkedServices
      .map((id) => services?.find((s) => s.serviceId === id))
      .filter(Boolean);
  };

  return (
    <div className="modal-overlay">
      <div className="edit-coupon-modal">
        <div className="modal-header">
          <div className="header-content">
            <div className="coupon-code-header">
              <div className="coupon-icon">
                <Tag size={20} />
              </div>
              <div className="header-text">
                <h2>Edit Coupon</h2>
        
              </div>
            </div>
            {hasChanges && (
              <div className="changes-indicator">
                <div className="indicator-dot"></div>
                Unsaved changes
              </div>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Basic Info */}
          <div className="form-section">
            <div className="section-header">
              <h3>Basic Information</h3>
              <div className="section-divider"></div>
            </div>

            <div className="form-grid">
              <div className="form_grp_wrapper">
                <div className="form-group">
                  <label>Coupon Code</label>
                  <div className="input-with-icon disabled">
                    <input
                      type="text"
                      value={coupon.code}
                      disabled
                      className="disabled-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="e.g., Summer Sale"
                    maxLength="100"
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Brief description of the coupon"
                  maxLength="500"
                  rows="3"
                />
              </div>
            </div>
          </div>

          {/* Discount */}
          <div className="form-section">
            <div className="section-header">
              <h3>Discount Details</h3>
              <div className="section-divider"></div>
            </div>

            <div className="discount-type-selector">
              <button
                type="button"
                className={`discount-type-btn ${
                  formData.discount.kind === "percent" ? "active" : ""
                }`}
                onClick={() => handleInputChange("discount.kind", "percent")}
              >
                <Percent size={16} />
                Percentage
              </button>
              <button
                type="button"
                className={`discount-type-btn ${
                  formData.discount.kind === "flat" ? "active" : ""
                }`}
                onClick={() => handleInputChange("discount.kind", "flat")}
              >
                <IndianRupee size={16} />
                Fixed Amount
              </button>
            </div>

            <div className="form-grid discount_type">
              <div className="form-group">
                <label>
                  {formData.discount.kind === "percent"
                    ? "Percentage (%)"
                    : "Amount (₹)"}{" "}
                  *
                </label>
                <input
                  type="number"
                  value={formData.discount.amount}
                  onChange={(e) =>
                    handleInputChange("discount.amount", e.target.value)
                  }
                  placeholder={
                    formData.discount.kind === "percent" ? "10" : "50"
                  }
                  min="0"
                  max={formData.discount.kind === "percent" ? "100" : undefined}
                  step={formData.discount.kind === "percent" ? "1" : "0.01"}
                  required
                />
              </div>

              {formData.discount.kind === "percent" && (
                <div className="form-group">
                  <label>Max Discount ($)</label>
                  <input
                    type="number"
                    value={formData.discount.maxDiscount}
                    onChange={(e) =>
                      handleInputChange("discount.maxDiscount", e.target.value)
                    }
                    placeholder="100"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Linked Services */}
          <div className="form-section">
            <div className="section-header">
              <h3>Linked Services</h3>
              <div className="section-divider"></div>
            </div>

            <div className="service-management">
              {/* Service Badges */}
              {formData.linkedServices.length > 0 && (
                <div className="linked-services-display">
                  <div className="services-header">
                    <span className="services-count">
                      {formData.linkedServices.length} service
                      {formData.linkedServices.length !== 1 ? "s" : ""} linked
                    </span>
                    <button
                      type="button"
                      className="unlink-all-btn"
                      onClick={handleUnlinkAllServices}
                      title="Unlink all services"
                    >
                      <UnlinkIcon size={14} />
                      Unlink all
                    </button>
                  </div>
                  <div className="service-badges">
                    {getSelectedServices().map((service) => (
                      <div key={service.serviceId} className="service-badge">
                        <span className="service-name">{service.name}</span>
                        <button
                          type="button"
                          className="remove-service-btn"
                          onClick={() => handleServiceRemove(service.serviceId)}
                          title={`Remove ${service.name}`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Search */}
              <div className="service-search-section">
                <button
                  type="button"
                  className="toggle-service-search"
                  onClick={() => setShowServiceSearch(!showServiceSearch)}
                >
                  <Plus size={16} />
                  Add Services
                </button>

                {showServiceSearch && (
                  <div className="service-search-dropdown">
                    <div className="search-input-wrapper">
                      <Search size={16} />
                      <input
                        type="text"
                        placeholder="Search services..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                      />
                    </div>

                    <div className="services-list">
                      {serviceLoading ? (
                        <div className="loading-services">
                          <Loader2 size={16} className="spinner" />
                          Loading services...
                        </div>
                      ) : filteredServices.length === 0 ? (
                        <div className="no-services">No services found</div>
                      ) : (
                        filteredServices.map((service) => (
                          <div
                            key={service.serviceId}
                            className={`service-item ${
                              formData.linkedServices.includes(
                                service.serviceId
                              )
                                ? "selected"
                                : ""
                            }`}
                            onClick={() =>
                              handleServiceToggle(service.serviceId)
                            }
                          >
                            <div className="service-info">
                              <div className="service-name">{service.name}</div>
                              <div className="service-id">
                                {service.serviceId}
                              </div>
                            </div>
                            <div className="service-checkbox">
                              {formData.linkedServices.includes(
                                service.serviceId
                              ) ? (
                                <Minus size={16} />
                              ) : (
                                <Plus size={16} />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Influencer Section */}
          <div className="form-section">
            <div className="section-header">
              <h3>Influencer Coupon</h3>
              <div className="section-divider"></div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isInfluencerCoupon}
                  onChange={(e) => {
                    handleInputChange("isInfluencerCoupon", e.target.checked);
                    if (!e.target.checked) {
                      handleInputChange("influencerId", "");
                      dispatch(clearInfluencer());
                    }
                  }}
                />
                <Crown size={16} />
                This is an influencer coupon
              </label>
            </div>

            {formData.isInfluencerCoupon && (
              <div className="influencer-section">
                <div className="influencer-search">
                  <label>Search Influencer by Email</label>
                  <div className="search-input-wrapper">
                    <input
                      type="email"
                      value={influencerEmail}
                      onChange={(e) => setInfluencerEmail(e.target.value)}
                      placeholder="influencer@example.com"
                    />
                    <button
                      type="button"
                      onClick={handleInfluencerSearch}
                      disabled={influencerLoading || !influencerEmail.trim()}
                      className="search-btn"
                    >
                      {influencerLoading ? (
                        <Loader2 size={16} className="spinner" />
                      ) : (
                        <Search size={16} />
                      )}
                    </button>
                  </div>

                  {formData.influencerId && (
                    <div className="current-influencer">
                      <small>
                        Current influencer ID: {formData.influencerId}
                      </small>
                    </div>
                  )}
                </div>

                {currentInfluencer && (
                  <div className="influencer-result">
                    <div className="influencer-info">
                      <h4>
                        {currentInfluencer.username || currentInfluencer.email}
                      </h4>
                      <p>Email: {currentInfluencer.email}</p>
                      {currentInfluencer.mobile && (
                        <p>Phone: {currentInfluencer.mobile}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleInfluencerLink}
                      className="link-btn"
                      disabled={formData.influencerId === currentInfluencer.id}
                    >
                      {formData.influencerId === currentInfluencer.id
                        ? "Linked"
                        : "Link"}
                    </button>
                  </div>
                )}

                {/* Commission */}
                <div className="commission-section">
                  <h4>Commission Settings</h4>

                  <div className="commission-type-selector">
                    <button
                      type="button"
                      className={`commission-type-btn ${
                        formData.commission.kind === "percent" ? "active" : ""
                      }`}
                      onClick={() =>
                        handleInputChange("commission.kind", "percent")
                      }
                    >
                      <Percent size={16} />
                      Percentage
                    </button>
                    <button
                      type="button"
                      className={`commission-type-btn ${
                        formData.commission.kind === "fixed" ? "active" : ""
                      }`}
                      onClick={() =>
                        handleInputChange("commission.kind", "fixed")
                      }
                    >
                      <DollarSign size={16} />
                      Fixed Amount
                    </button>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>
                        {formData.commission.kind === "percent"
                          ? "Commission (%)"
                          : "Commission ($)"}
                      </label>
                      <input
                        type="number"
                        value={formData.commission.amount}
                        onChange={(e) =>
                          handleInputChange("commission.amount", e.target.value)
                        }
                        placeholder={
                          formData.commission.kind === "percent" ? "5" : "10"
                        }
                        min="0"
                        step={
                          formData.commission.kind === "percent" ? "1" : "0.01"
                        }
                      />
                    </div>

                    {formData.commission.kind === "percent" && (
                      <div className="form-group">
                        <label>Max Commission ($)</label>
                        <input
                          type="number"
                          value={formData.commission.maxCommission}
                          onChange={(e) =>
                            handleInputChange(
                              "commission.maxCommission",
                              e.target.value
                            )
                          }
                          placeholder="50"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Usage & Validity */}
          <div className="form-section">
            <div className="section-header">
              <h3>Usage & Validity</h3>
              <div className="section-divider"></div>
            </div>

            <div className="form-grid">
              <div className="form_grp_wrapper three">
                <div className="form-group">
                  <label>Applies To</label>
                  <select
                    value={formData.appliesTo.users}
                    onChange={(e) =>
                      handleInputChange("appliesTo.users", e.target.value)
                    }
                  >
                    <option value="all">All Users</option>
                    <option value="new">New Users Only</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="expired">Expired</option>
                    <option value="usedUp">Used Up</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Uses Per User</label>
                  <input
                    type="number"
                    value={formData.usageLimits.perUser}
                    onChange={(e) =>
                      handleInputChange("usageLimits.perUser", e.target.value)
                    }
                    placeholder="1"
                    min="1"
                  />
                </div>
              </div>
              <div className="form_grp_wrapper three">
                <div className="form-group">
                  <label>Total Uses</label>
                  <input
                    type="number"
                    value={formData.usageLimits.total}
                    onChange={(e) =>
                      handleInputChange("usageLimits.total", e.target.value)
                    }
                    placeholder="100"
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Valid From</label>
                  <input
                    type="datetime-local"
                    value={formData.validFrom}
                    onChange={(e) =>
                      handleInputChange("validFrom", e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Expires At</label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) =>
                      handleInputChange("expiresAt", e.target.value)
                    }
                    min={formData.validFrom}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-btn"
              disabled={updatingCoupon || !hasChanges || !formData.discount.amount}
            >
              {updatingCoupon ? (
                <>
                   <CircularProgress  color='white' size={16} className="spinner" />
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
        </form>
      </div>
    </div>
  );
}
