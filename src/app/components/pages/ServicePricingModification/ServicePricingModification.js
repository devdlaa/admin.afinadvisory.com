import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Save,
  X,
  AlertCircle,
  Toggle,
  Star,
  MapPin,
  Check,
} from "lucide-react";
import "./ServicePricingModification.scss";

import { Dropdown } from "../../shared/TinyLib/TinyLib";
import { CircularProgress } from "@mui/material";
import { INDIAN_STATES as indianStates } from "@/utils/server/utils";

import ConfirmationDialog from "../../shared/ConfirmationDialog/ConfirmationDialog";
const ServicePricingModification = ({
  initialConfig,
  onSave,
  onCancel,
  isSaving,
}) => {
  const [config, setConfig] = useState(initialConfig || {});
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);

  const [activePlanTab, setActivePlanTab] = useState(0);

  useEffect(() => {
    if (!config.AVAILABLE_PLANS) {
      setConfig((prev) => ({ ...prev, AVAILABLE_PLANS: [] }));
    }
    if (!config.stateWiseExtras) {
      setConfig((prev) => ({ ...prev, stateWiseExtras: [] }));
    }
    if (!config.youtube_video_link) {
      setConfig((prev) => ({ ...prev, youtube_video_link: "" }));
    }
  }, []);

  const generatePlanId = (serviceName, planName) => {
    const serviceId = config.serviceId || "SERVICE";
    return `${serviceId}_${planName.toUpperCase().replace(/\s+/g, "_")}`;
  };

  const updateConfig = (path, value) => {
    setConfig((prev) => {
      const newConfig = { ...prev };
      const keys = path.split(".");
      let current = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
    setIsDirty(true);
  };

  const addPlan = () => {
    if (config.AVAILABLE_PLANS?.length >= 3) return;

    const newPlan = {
      planId: generatePlanId(config.serviceName, "New Plan"),
      name: "New Plan",
      price: 0,
      originalPrice: 0,
      isPopular: false,
      features: ["New Feature"],
    };

    setConfig((prev) => ({
      ...prev,
      AVAILABLE_PLANS: [...(prev.AVAILABLE_PLANS || []), newPlan],
    }));
    setActivePlanTab(config.AVAILABLE_PLANS?.length || 0);
    setIsDirty(true);
  };

  const deletePlan = (index) => {
    const plans = [...config.AVAILABLE_PLANS];
    plans.splice(index, 1);

    if (plans.length === 0) {
      setConfig((prev) => ({
        ...prev,
        AVAILABLE_PLANS: plans,
        isPricingOnDemand: true,
      }));
      setActivePlanTab(0);
    } else {
      setConfig((prev) => ({
        ...prev,
        AVAILABLE_PLANS: plans,
      }));
      // Adjust active tab if needed
      if (activePlanTab >= plans.length) {
        setActivePlanTab(plans.length - 1);
      }
    }
    setIsDirty(true);
  };

  const updatePlan = (index, field, value) => {
    const plans = [...config.AVAILABLE_PLANS];
    if (field === "name") {
      plans[index].planId = generatePlanId(config.serviceName, value);
    }
    plans[index][field] = value;

    setConfig((prev) => ({
      ...prev,
      AVAILABLE_PLANS: plans,
    }));
    setIsDirty(true);
  };

  const addFeature = (planIndex) => {
    const plans = [...config.AVAILABLE_PLANS];
    plans[planIndex].features.push("New Feature");

    setConfig((prev) => ({
      ...prev,
      AVAILABLE_PLANS: plans,
    }));
    setIsDirty(true);
  };

  const updateFeature = (planIndex, featureIndex, value) => {
    const plans = [...config.AVAILABLE_PLANS];
    plans[planIndex].features[featureIndex] = value;

    setConfig((prev) => ({
      ...prev,
      AVAILABLE_PLANS: plans,
    }));
    setIsDirty(true);
  };

  const deleteFeature = (planIndex, featureIndex) => {
    const plans = [...config.AVAILABLE_PLANS];
    if (plans[planIndex].features.length <= 1) return;

    plans[planIndex].features.splice(featureIndex, 1);

    setConfig((prev) => ({
      ...prev,
      AVAILABLE_PLANS: plans,
    }));
    setIsDirty(true);
  };

  const togglePopular = (index) => {
    const plans = [...config.AVAILABLE_PLANS];
    plans.forEach((plan) => (plan.isPopular = false));
    plans[index].isPopular = true;

    setConfig((prev) => ({
      ...prev,
      AVAILABLE_PLANS: plans,
    }));
    setIsDirty(true);
  };

  const addStateWiseExtra = () => {
    const newExtra = {
      state_name: indianStates[0],
      extra_charges: 0,
      for_plan_number: 1,
    };

    setConfig((prev) => ({
      ...prev,
      stateWiseExtras: [...(prev.stateWiseExtras || []), newExtra],
    }));
    setIsDirty(true);
  };

  const updateStateWiseExtra = (index, field, value) => {
    const extras = [...(config.stateWiseExtras || [])];
    extras[index][field] = value;

    setConfig((prev) => ({
      ...prev,
      stateWiseExtras: extras,
    }));
    setIsDirty(true);
  };

  const deleteStateWiseExtra = (index) => {
    const extras = [...(config.stateWiseExtras || [])];
    extras.splice(index, 1);

    setConfig((prev) => ({
      ...prev,
      stateWiseExtras: extras,
    }));
    setIsDirty(true);
  };

  const validate = () => {
    const newErrors = {};

    if (!config.serviceName?.trim()) {
      newErrors.serviceName = "Service name is required";
    }

    // YouTube URL validation (optional but if provided, should be valid)
    if (config.youtube_video_link?.trim()) {
      const youtubeRegex =
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
      if (!youtubeRegex.test(config.youtube_video_link.trim())) {
        newErrors.youtube_video_link = "Please enter a valid YouTube URL";
      }
    }

    if (
      !config.isPricingOnDemand &&
      (!config.AVAILABLE_PLANS || config.AVAILABLE_PLANS.length === 0)
    ) {
      newErrors.plans =
        "At least one plan is required when pricing is not on demand";
    }

    config.AVAILABLE_PLANS?.forEach((plan, index) => {
      if (!plan.name?.trim()) {
        newErrors[`plan_${index}_name`] = "Plan name is required";
      }
      if (plan.price < 0) {
        newErrors[`plan_${index}_price`] = "Price cannot be negative";
      }
      if (!plan.features || plan.features.length === 0) {
        newErrors[`plan_${index}_features`] =
          "At least one feature is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(config);
      setIsDirty(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setDialogOpen(!isDialogOpen);
    } else {
      onCancel();
    }
  };

  return (
    <div className="service-pricing-modification">
      <ConfirmationDialog
        isOpen={isDialogOpen}
        onClose={handleCancel}
        actionName="You have unsaved changes."
        actionInfo="Are you sure you want to cancel?"
        confirmText="Keep Editing"
        cancelText="Cancel Editing"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={onCancel}
      />
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <h1 className="page-title">Service Pricing Configuration</h1>
          <p className="page-description">
            Configure pricing plans and regional settings for your service
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleCancel}>
            <X size={16} />
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!isDirty}
          >
            {isSaving ? (
              <CircularProgress color="white" size={17} />
            ) : (
              <Save size={16} />
            )}
            {isSaving ? "Saving Changes" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="content">
        <div className="content-wrapper">
          <div className="section_wrapper first">
            {/* Basic Information */}
            <div className="section">
              <div className="section-header">
                <h2 className="section-title">Basic Information</h2>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Service ID</label>
                  <input
                    type="text"
                    value={config.serviceId || ""}
                    disabled
                    className="form-input disabled"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Service Name</label>
                  <input
                    type="text"
                    value={config.serviceName || ""}
                    onChange={(e) =>
                      updateConfig("serviceName", e.target.value)
                    }
                    className={`form-input ${
                      errors.serviceName ? "error" : ""
                    }`}
                    placeholder="Enter service name"
                  />
                  {errors.serviceName && (
                    <span className="form-error">{errors.serviceName}</span>
                  )}
                </div>

                <div className="form_group_wrapper">
                  <div className="form-group">
                    <label className="form-label">GST Rate (%)</label>
                    <input
                      type="number"
                      value={config.gstRate || 0}
                      onChange={(e) =>
                        updateConfig("gstRate", parseInt(e.target.value) || 0)
                      }
                      className="form-input"
                      min="0"
                      max="100"
                      placeholder="18"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Max Multi Purchase Count
                    </label>
                    <input
                      type="number"
                      value={config.maxMultiPurchaseCount || 0}
                      onChange={(e) =>
                        updateConfig(
                          "maxMultiPurchaseCount",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="form-input"
                      min="0"
                      placeholder="10"
                    />
                  </div>
                </div>

                {/* YouTube Video URL Field */}
                <div className="form-group youtube-field">
                  <label className="form-label">YouTube Video URL</label>
                  <input
                    type="url"
                    value={config.youtube_video_link || ""}
                    onChange={(e) =>
                      updateConfig("youtube_video_link", e.target.value)
                    }
                    className={`form-input ${
                      errors.youtube_video_link ? "error" : ""
                    }`}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  {errors.youtube_video_link && (
                    <span className="form-error">
                      {errors.youtube_video_link}
                    </span>
                  )}
                  <span className="form-hint">
                    Optional: Add a YouTube video to showcase your service
                  </span>
                </div>
              </div>

              {/* Toggle Controls */}
              <div className="toggles-section">
                <div className="toggle-item">
                  <div className="toggle-info">
                    <div className="toggle_head">
                      <span className="toggle-label">Multi Purchase</span>
                      <button
                        className={`toggle-button ${
                          config.isMultiPurchase ? "active" : ""
                        }`}
                        onClick={() =>
                          updateConfig(
                            "isMultiPurchase",
                            !config.isMultiPurchase
                          )
                        }
                      >
                        <div className="toggle-slider"></div>
                      </button>
                    </div>
                    <span className="toggle-description">
                      Allow customers to purchase multiple quantities
                    </span>
                  </div>
                </div>

                <div className="toggle-item">
                  <div className="toggle-info">
                    <div className="toggle_head">
                      <span className="toggle-label">Pricing On Demand</span>
                      <button
                        className={`toggle-button ${
                          config.isPricingOnDemand ? "active" : ""
                        }`}
                        onClick={() =>
                          updateConfig(
                            "isPricingOnDemand",
                            !config.isPricingOnDemand
                          )
                        }
                      >
                        <div className="toggle-slider"></div>
                      </button>
                    </div>

                    <span className="toggle-description">
                      Show 'Contact for pricing' instead of fixed plans
                    </span>
                  </div>
                </div>

                <div className="toggle-item">
                  <div className="toggle-info">
                    <div className="toggle_head">
                      <span className="toggle-label">Multi State</span>
                      <button
                        className={`toggle-button ${
                          config.isMultiState ? "active" : ""
                        }`}
                        onClick={() =>
                          updateConfig("isMultiState", !config.isMultiState)
                        }
                      >
                        <div className="toggle-slider"></div>
                      </button>
                    </div>

                    <span className="toggle-description">
                      Enable state-wise pricing variations
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Available Plans with Tabs */}
          {!config.isPricingOnDemand && (
            <div className="section pricing">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Pricing Plans</h2>
                  <p className="section-description">
                    Add up to 3 pricing plans for each service
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={addPlan}
                  disabled={config.AVAILABLE_PLANS?.length >= 3}
                >
                  <Plus size={16} />
                  Add Plan
                </button>
              </div>

              {errors.plans && (
                <div className="alert alert-error">
                  <AlertCircle size={16} />
                  {errors.plans}
                </div>
              )}

              {config.AVAILABLE_PLANS && config.AVAILABLE_PLANS.length > 0 && (
                <div className="plans-container">
                  {/* Plan Tabs */}
                  <div className="plan-tabs">
                    {config.AVAILABLE_PLANS.map((plan, index) => (
                      <button
                        key={index}
                        className={`plan-tab ${
                          activePlanTab === index ? "active" : ""
                        }`}
                        onClick={() => setActivePlanTab(index)}
                      >
                        <span className="tab-name">
                          {plan.name || `Plan ${index + 1}`}
                        </span>
                        {plan.isPopular && (
                          <Star size={14} className="tab-star" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Active Plan Content */}
                  {config.AVAILABLE_PLANS[activePlanTab] && (
                    <div className="plan-card">
                      <div className="plan-card-header">
                        <div className="plan-badge">
                          Plan {activePlanTab + 1}
                        </div>
                        <div className="plan-actions">
                          <button
                            className={`action-btn ${
                              config.AVAILABLE_PLANS[activePlanTab].isPopular
                                ? "active"
                                : ""
                            }`}
                            onClick={() => togglePopular(activePlanTab)}
                            title="Mark as popular"
                          >
                            <Star size={14} />
                          </button>
                          <button
                            className="action-btn danger"
                            onClick={() => deletePlan(activePlanTab)}
                            title="Delete plan"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="plan-card-content">
                        <div className="form-grid">
                          <div className="form_group_wrapper">
                            <div className="form-group">
                              <label className="form-label">Plan Name</label>
                              <input
                                type="text"
                                value={
                                  config.AVAILABLE_PLANS[activePlanTab].name ||
                                  ""
                                }
                                onChange={(e) =>
                                  updatePlan(
                                    activePlanTab,
                                    "name",
                                    e.target.value
                                  )
                                }
                                className={`form-input ${
                                  errors[`plan_${activePlanTab}_name`]
                                    ? "error"
                                    : ""
                                }`}
                                placeholder="Enter plan name"
                              />
                              {errors[`plan_${activePlanTab}_name`] && (
                                <span className="form-error">
                                  {errors[`plan_${activePlanTab}_name`]}
                                </span>
                              )}
                            </div>

                            <div className="form-group">
                              <label className="form-label">Plan ID</label>
                              <input
                                type="text"
                                value={
                                  config.AVAILABLE_PLANS[activePlanTab]
                                    .planId || ""
                                }
                                disabled
                                className="form-input disabled"
                              />
                            </div>
                          </div>
                          <div className="form_group_wrapper">
                            <div className="form-group">
                              <label className="form-label">Price (₹)</label>
                              <input
                                type="number"
                                value={
                                  config.AVAILABLE_PLANS[activePlanTab].price ||
                                  0
                                }
                                onChange={(e) =>
                                  updatePlan(
                                    activePlanTab,
                                    "price",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className={`form-input ${
                                  errors[`plan_${activePlanTab}_price`]
                                    ? "error"
                                    : ""
                                }`}
                                min="0"
                                placeholder="0"
                              />
                              {errors[`plan_${activePlanTab}_price`] && (
                                <span className="form-error">
                                  {errors[`plan_${activePlanTab}_price`]}
                                </span>
                              )}
                            </div>

                            <div className="form-group">
                              <label className="form-label">
                                Original Price (₹)
                              </label>
                              <input
                                type="number"
                                value={
                                  config.AVAILABLE_PLANS[activePlanTab]
                                    .originalPrice || 0
                                }
                                onChange={(e) =>
                                  updatePlan(
                                    activePlanTab,
                                    "originalPrice",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="form-input"
                                min="0"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Features */}
                        <div className="features-section">
                          <div className="features-header">
                            <label className="form-label">Features</label>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => addFeature(activePlanTab)}
                            >
                              <Plus size={14} />
                              Add Feature
                            </button>
                          </div>

                          {errors[`plan_${activePlanTab}_features`] && (
                            <div className="alert alert-error">
                              <AlertCircle size={16} />
                              {errors[`plan_${activePlanTab}_features`]}
                            </div>
                          )}

                          <div className="features-list">
                            {config.AVAILABLE_PLANS[
                              activePlanTab
                            ].features?.map((feature, featureIndex) => (
                              <div key={featureIndex} className="feature-item">
                                <input
                                  type="text"
                                  value={feature}
                                  onChange={(e) =>
                                    updateFeature(
                                      activePlanTab,
                                      featureIndex,
                                      e.target.value
                                    )
                                  }
                                  className="form-input"
                                  placeholder="Enter feature"
                                />
                                <button
                                  className="action-btn danger"
                                  onClick={() =>
                                    deleteFeature(activePlanTab, featureIndex)
                                  }
                                  disabled={
                                    config.AVAILABLE_PLANS[activePlanTab]
                                      .features.length <= 1
                                  }
                                  title="Delete feature"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* State-wise Extras */}
          {config.isMultiState && (
            <div className="section multi_state">
              <div className="section-header">
                <div>
                  <h2 className="section-title">State-wise Pricing</h2>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={addStateWiseExtra}
                >
                  <Plus size={16} />
                  Add State Extra
                </button>
              </div>

              <div className="state-extras-grid">
                {config.stateWiseExtras?.map((extra, index) => (
                  <div key={index} className="state-extra-card">
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">State</label>
                        <Dropdown
                          options={indianStates.map((state) => ({
                            value: state,
                            label: state,
                          }))}
                          value={extra.state_name || ""}
                          onChange={(val) =>
                            updateStateWiseExtra(index, "state_name", val)
                          }
                          placeholder="Select state"
                          className="form-select"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          State Wise Charge (₹)
                        </label>
                        <input
                          type="number"
                          value={extra.extra_charges || 0}
                          onChange={(e) =>
                            updateStateWiseExtra(
                              index,
                              "extra_charges",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="form-input"
                          min="0"
                          placeholder="0"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">For Plan</label>
                        <Dropdown
                          options={
                            config.AVAILABLE_PLANS?.map((_, planIndex) => ({
                              value: planIndex + 1,
                              label: `Plan ${planIndex + 1}`,
                            })) || []
                          }
                          value={extra.for_plan_number || 1}
                          onChange={(val) =>
                            updateStateWiseExtra(
                              index,
                              "for_plan_number",
                              parseInt(val)
                            )
                          }
                          placeholder="Select plan"
                          className="form-select"
                        />
                      </div>

                      <div className="form-group form-actions">
                        <button
                          className="action-btn danger"
                          onClick={() => deleteStateWiseExtra(index)}
                          title="Delete state extra"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remarks */}
          <div className="section remarks">
            <div className="section-header">
              <h2 className="section-title">Remarks</h2>
              <p className="section-description">
                Add any additional notes or instructions
              </p>
            </div>

            <div className="form-group">
              <textarea
                value={config.remarks?.join("\n") || ""}
                onChange={(e) =>
                  updateConfig(
                    "remarks",
                    e.target.value.split("\n").filter((r) => r.trim())
                  )
                }
                className="form-textarea"
                placeholder="Enter remarks (one per line)"
                rows="4"
              />
            </div>
          </div>

          {/* Pricing on Demand Notice */}
          {config.isPricingOnDemand && (
            <div className="alert alert-info">
              <AlertCircle size={16} />
              Pricing is set to on-demand. Customers will see "Contact for
              pricing" instead of fixed plans.
            </div>
          )}
        </div>
      </div>

      {/* Unsaved Changes Indicator */}
      {isDirty && (
        <div className="unsaved-indicator">
          <AlertCircle size={16} />
          You have unsaved changes
        </div>
      )}
    </div>
  );
};

export default ServicePricingModification;
