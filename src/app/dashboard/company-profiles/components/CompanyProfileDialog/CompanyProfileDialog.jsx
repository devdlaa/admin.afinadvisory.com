"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Mail, MapPin, Landmark, User } from "lucide-react";
import { CircularProgress } from "@mui/material";
import {
  createCompanyProfile,
  updateCompanyProfile,
  selectIsLoading,
  selectError,
  clearError,
} from "@/store/slices/companyProfileSlice";
import styles from "./CompanyProfileDialog.module.scss";
import { INDIAN_STATES } from "@/utils/client/cutils";

export default function CompanyProfileDialog({
  open,
  onClose,
  mode = "create",
  profile,
  onSuccess,
}) {
  const dispatch = useDispatch();
  const isCreating = useSelector((state) => selectIsLoading(state, "create"));
  const isUpdating = useSelector((state) => selectIsLoading(state, "update"));
  const createError = useSelector((state) => selectError(state, "create"));
  const updateError = useSelector((state) => selectError(state, "update"));

  const isLoading = mode === "create" ? isCreating : isUpdating;
  const error = mode === "create" ? createError : updateError;

  const [formData, setFormData] = useState({
    name: "",
    legal_name: "",
    pan: "",
    gst_number: "",
    email: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    bank_name: "",
    bank_account_no: "",
    bank_ifsc: "",
    bank_branch: "",
    is_default: false,
    is_active: true,
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [activeTab, setActiveTab] = useState("basic");

  // Initialize form with profile data in edit mode
  useEffect(() => {
    if (open && mode === "edit" && profile) {
      setFormData({
        name: profile.name || "",
        legal_name: profile.legal_name || "",
        pan: profile.pan || "",
        gst_number: profile.gst_number || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address_line1: profile.address_line1 || "",
        address_line2: profile.address_line2 || "",
        city: profile.city || "",
        state: profile.state || "",
        pincode: profile.pincode || "",
        bank_name: profile.bank_name || "",
        bank_account_no: profile.bank_account_no || "",
        bank_ifsc: profile.bank_ifsc || "",
        bank_branch: profile.bank_branch || "",
        is_default: profile.is_default || false,
        is_active: profile.is_active ?? true,
      });
    } else if (open && mode === "create") {
      setFormData({
        name: "",
        legal_name: "",
        pan: "",
        gst_number: "",
        email: "",
        phone: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        pincode: "",
        bank_name: "",
        bank_account_no: "",
        bank_ifsc: "",
        bank_branch: "",
        is_default: false,
        is_active: true,
      });
    }
  }, [open, mode, profile]);

  // Clear errors on mount/close
  useEffect(() => {
    if (open) {
      setValidationErrors({});
      dispatch(clearError(mode === "create" ? "create" : "update"));
      setActiveTab("basic");
    }
  }, [open, mode, dispatch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Company name is required";
    }

    if (
      formData.pan &&
      !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan.toUpperCase())
    ) {
      errors.pan = "Invalid PAN format (e.g., ABCDE1234F)";
    }

    if (
      formData.gst_number &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        formData.gst_number.toUpperCase(),
      )
    ) {
      errors.gst_number = "Invalid GST format";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    if (formData.phone && !/^[0-9]{10}$/.test(formData.phone)) {
      errors.phone = "Phone must be 10 digits";
    }

    if (formData.pincode && !/^[0-9]{6}$/.test(formData.pincode)) {
      errors.pincode = "Pincode must be 6 digits";
    }

    if (
      formData.bank_ifsc &&
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bank_ifsc.toUpperCase())
    ) {
      errors.bank_ifsc = "Invalid IFSC code";
    }

    const hasBankDetails =
      formData.bank_name || formData.bank_account_no || formData.bank_ifsc;

    if (hasBankDetails) {
      if (!formData.bank_name) errors.bank_name = "Bank name is required";
      if (!formData.bank_account_no)
        errors.bank_account_no = "Account number is required";
      if (!formData.bank_ifsc) errors.bank_ifsc = "IFSC code is required";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      if (errors.name || errors.legal_name || errors.pan || errors.gst_number) {
        setActiveTab("basic");
      } else if (errors.email || errors.phone) {
        setActiveTab("contact");
      } else if (
        errors.address_line1 ||
        errors.city ||
        errors.state ||
        errors.pincode
      ) {
        setActiveTab("address");
      } else if (
        errors.bank_name ||
        errors.bank_account_no ||
        errors.bank_ifsc
      ) {
        setActiveTab("bank");
      }
      return;
    }

    const cleanData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value === "" || value === null) {
        acc[key] = null;
      } else if (typeof value === "string") {
        acc[key] = value.trim();
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});

    try {
      if (mode === "create") {
        await dispatch(createCompanyProfile(cleanData)).unwrap();
      } else {
        await dispatch(
          updateCompanyProfile({ id: profile.id, data: cleanData }),
        ).unwrap();
      }
      onSuccess?.();
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  };

  if (!open) return null;

  const tabs = [
    { id: "basic", label: "Basic Info", icon: User },
    { id: "contact", label: "Contact", icon: Mail },
    { id: "address", label: "Address", icon: MapPin },
    { id: "bank", label: "Bank Details", icon: Landmark },
  ];

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div>
              <h2 className={styles.headerTitle}>
                {mode === "create" ? "Create New Profile" : "Edit Profile"}
              </h2>
              <p className={styles.headerSubtitle}>
                {mode === "create"
                  ? "Add a new company profile"
                  : "Update company information"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <X />
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const hasError =
              tab.id === "basic"
                ? validationErrors.name ||
                  validationErrors.pan ||
                  validationErrors.gst_number
                : tab.id === "contact"
                  ? validationErrors.email || validationErrors.phone
                  : tab.id === "address"
                    ? validationErrors.address_line1 ||
                      validationErrors.city ||
                      validationErrors.state ||
                      validationErrors.pincode
                    : tab.id === "bank"
                      ? validationErrors.bank_name ||
                        validationErrors.bank_account_no ||
                        validationErrors.bank_ifsc
                      : false;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
              >
                <Icon />
                {tab.label}
                {hasError && <span className={styles.tabError} />}
              </button>
            );
          })}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorMessage}>
              <p>{error}</p>
            </div>
          )}

          {/* Basic Info Tab */}
          {activeTab === "basic" && (
            <div className={styles.formFields}>
              <FormField
                label="Company Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={validationErrors.name}
                required
                placeholder="Acme Corporation"
              />

              <FormField
                label="Legal Name"
                name="legal_name"
                value={formData.legal_name}
                onChange={handleChange}
                error={validationErrors.legal_name}
                placeholder="Acme Corporation Private Limited"
              />

              <div className={`${styles.formRow} ${styles.cols2}`}>
                <FormField
                  label="PAN"
                  name="pan"
                  value={formData.pan}
                  onChange={handleChange}
                  error={validationErrors.pan}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />

                <FormField
                  label="GST Number"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleChange}
                  error={validationErrors.gst_number}
                  placeholder="27ABCDE1234F1Z5"
                  maxLength={15}
                />
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === "contact" && (
            <div className={styles.formFields}>
              <FormField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={validationErrors.email}
                placeholder="contact@company.com"
              />

              <FormField
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                error={validationErrors.phone}
                placeholder="9876543210"
                maxLength={10}
              />
            </div>
          )}

          {/* Address Tab */}
          {activeTab === "address" && (
            <div className={styles.formFields}>
              <FormField
                label="Address Line 1"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                error={validationErrors.address_line1}
                placeholder="Building/Street"
              />

              <FormField
                label="Address Line 2"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
                error={validationErrors.address_line2}
                placeholder="Area/Locality"
              />
              <FormSelect
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
                error={validationErrors.state}
                options={INDIAN_STATES}
              />
              <div className={`${styles.formRow} ${styles.cols2}`}>
                <FormField
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  error={validationErrors.city}
                  placeholder="Mumbai"
                />

                <FormField
                  label="Pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  error={validationErrors.pincode}
                  placeholder="400001"
                  maxLength={6}
                />
              </div>
            </div>
          )}

          {/* Bank Details Tab */}
          {activeTab === "bank" && (
            <div className={styles.formFields}>
              <FormField
                label="Bank Name"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                error={validationErrors.bank_name}
                placeholder="State Bank of India"
              />

              <div className={`${styles.formRow} ${styles.cols2}`}>
                <FormField
                  label="Account Number"
                  name="bank_account_no"
                  value={formData.bank_account_no}
                  onChange={handleChange}
                  error={validationErrors.bank_account_no}
                  placeholder="1234567890"
                />

                <FormField
                  label="IFSC Code"
                  name="bank_ifsc"
                  value={formData.bank_ifsc}
                  onChange={handleChange}
                  error={validationErrors.bank_ifsc}
                  placeholder="SBIN0001234"
                  maxLength={11}
                />
              </div>

              <FormField
                label="Branch"
                name="bank_branch"
                value={formData.bank_branch}
                onChange={handleChange}
                error={validationErrors.bank_branch}
                placeholder="Mumbai Main Branch"
              />
            </div>
          )}
        </form>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className={styles.submitButton}
          >
            {isLoading ? (
              <>
                <CircularProgress size={16} color="inherit" />
                {mode === "create" ? "Creating..." : "Updating..."}
              </>
            ) : mode === "create" ? (
              "Create Profile"
            ) : (
              "Update Profile"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Form Field Component
function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  required = false,
  placeholder,
  maxLength,
}) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.label}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`${styles.input} ${error ? styles.error : ""}`}
      />
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}

// Form Select Component
function FormSelect({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  options,
}) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.label}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`${styles.select} ${error ? styles.error : ""}`}
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
