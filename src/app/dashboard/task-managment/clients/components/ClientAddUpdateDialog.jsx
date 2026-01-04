"use client";
import React, { forwardRef, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Save, Building2 } from "lucide-react";
import {
  createEntity,
  updateEntity,
  selectIsLoading,
  selectError,
  clearError,
} from "@/store/slices/entitySlice";
import { schemas } from "@/schemas";
import styles from "./ClientAddUpdateDialog.module.scss";

const ClientAddUpdateDialog = forwardRef(({ mode, client }, ref) => {
  const dispatch = useDispatch();
  const loading = useSelector((state) =>
    selectIsLoading(state, mode === "add" ? "create" : "update")
  );
  const error = useSelector((state) =>
    selectError(state, mode === "add" ? "create" : "update")
  );

  // Form state
  const [formData, setFormData] = useState({
    entity_type: "UN_REGISTRED",
    name: "",
    pan: "",
    email: "",
    primary_phone: "",
    contact_person: "",
    secondary_phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    status: "ACTIVE",
  });

  // Track original data for comparison
  const [originalData, setOriginalData] = useState(null);

  const [validationErrors, setValidationErrors] = useState({});

  // Reset form when mode or client changes
  useEffect(() => {
    if (mode === "add") {
      const initialData = {
        entity_type: "UN_REGISTRED",
        name: "",
        pan: "",
        email: "",
        primary_phone: "",
        contact_person: "",
        secondary_phone: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        pincode: "",
        status: "ACTIVE",
      };
      setFormData(initialData);
      setOriginalData(null);
    } else if (mode === "update" && client) {
      const clientData = {
        entity_type: client.entity_type || "UN_REGISTRED",
        name: client.name || "",
        pan: client.pan || "",
        email: client.email || "",
        primary_phone: client.primary_phone || "",
        contact_person: client.contact_person || "",
        secondary_phone: client.secondary_phone || "",
        address_line1: client.address_line1 || "",
        address_line2: client.address_line2 || "",
        city: client.city || "",
        state: client.state || "",
        pincode: client.pincode || "",
        status: client.status || "ACTIVE",
      };
      setFormData(clientData);
      setOriginalData(clientData);
    }
    setValidationErrors({});
    dispatch(clearError(mode === "add" ? "create" : "update"));
  }, [mode, client, dispatch]);

  // Check if form has changes
  const hasChanges = () => {
    if (mode === "add") return true;
    if (!originalData) return false;

    return Object.keys(formData).some((key) => {
      const current = formData[key] === "" ? null : formData[key];
      const original = originalData[key] === "" ? null : originalData[key];
      return current !== original;
    });
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if there are changes in update mode
    if (mode === "update" && !hasChanges()) {
      // Close dialog without making API call
      ref.current?.close();
      return;
    }

    setValidationErrors({});

    try {
      // Validate with Zod schema
      const schema =
        mode === "add" ? schemas.entity.create : schemas.entity.update;

      // Clean up empty strings to null
      const cleanedData = Object.entries(formData).reduce(
        (acc, [key, value]) => {
          acc[key] = value === "" ? null : value;
          return acc;
        },
        {}
      );

      const validatedData = schema.parse(cleanedData);

      // Dispatch action
      if (mode === "add") {
        await dispatch(createEntity(validatedData)).unwrap();
      } else {
        await dispatch(
          updateEntity({ id: client.id, data: validatedData })
        ).unwrap();
      }

      // Close dialog on success (toast will show success message)
      ref.current?.close();
    } catch (err) {
      if (err.errors) {
        // Zod validation errors
        const errors = {};
        err.errors.forEach((error) => {
          errors[error.path[0]] = error.message;
        });
        setValidationErrors(errors);
      } else {
        // API errors will be handled by toast middleware
        console.error("Error:", err);
      }
    }
  };

  // Handle close
  const handleClose = () => {
    ref.current?.close();
  };

  // Check if PAN is required
  const isPanRequired = formData.entity_type !== "UN_REGISTRED";

  // Check if submit button should be disabled
  const isSubmitDisabled = loading || (mode === "update" && !hasChanges());

  return (
    <dialog ref={ref} className={styles.dialog}>
      <div className={styles.dialogContent}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Building2 size={24} className={styles.headerIcon} />
            <div>
              <h2>{mode === "add" ? "Add New Client" : "Update Client"}</h2>
              <p>
                {mode === "add"
                  ? "Fill in the details to add a new client"
                  : "Update client information"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className={styles.errorBanner}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inner}>
            {/* Entity Type & Status */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="entity_type">
                  Entity Type <span className={styles.required}>*</span>
                </label>
                <select
                  id="entity_type"
                  name="entity_type"
                  value={formData.entity_type}
                  onChange={handleChange}
                  disabled={loading}
                  required
                >
                  <option value="UN_REGISTRED">Unregistered</option>
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="PRIVATE_LIMITED_COMPANY">
                    Private Limited Company
                  </option>
                  <option value="PUBLIC_LIMITED_COMPANY">
                    Public Limited Company
                  </option>
                  <option value="ONE_PERSON_COMPANY">One Person Company</option>
                  <option value="SECTION_8_COMPANY">Section 8 Company</option>
                  <option value="PRODUCER_COMPANY">Producer Company</option>
                  <option value="SOLE_PROPRIETORSHIP">
                    Sole Proprietorship
                  </option>
                  <option value="PARTNERSHIP_FIRM">Partnership Firm</option>
                  <option value="LIMITED_LIABILITY_PARTNERSHIP">
                    Limited Liability Partnership
                  </option>
                  <option value="TRUST">Trust</option>
                  <option value="SOCIETY">Society</option>
                  <option value="COOPERATIVE_SOCIETY">
                    Cooperative Society
                  </option>
                  <option value="FOREIGN_COMPANY">Foreign Company</option>
                  <option value="GOVERNMENT_COMPANY">Government Company</option>
                </select>
                {validationErrors.entity_type && (
                  <span className={styles.error}>
                    {validationErrors.entity_type}
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="status">
                  Status <span className={styles.required}>*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={loading}
                  required
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                {validationErrors.status && (
                  <span className={styles.error}>
                    {validationErrors.status}
                  </span>
                )}
              </div>
            </div>

            {/* Name & PAN */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="name">
                  Client Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Enter client name"
                  required
                  maxLength={120}
                />
                {validationErrors.name && (
                  <span className={styles.error}>{validationErrors.name}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="pan">
                  PAN{" "}
                  {isPanRequired && <span className={styles.required}>*</span>}
                </label>
                <input
                  type="text"
                  id="pan"
                  name="pan"
                  value={formData.pan}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  style={{ textTransform: "uppercase" }}
                  required={isPanRequired}
                />
                {validationErrors.pan && (
                  <span className={styles.error}>{validationErrors.pan}</span>
                )}
              </div>
            </div>

            {/* Email & Primary Phone */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="email">
                  Email <span className={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="client@example.com"
                  required
                />
                {validationErrors.email && (
                  <span className={styles.error}>{validationErrors.email}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="primary_phone">
                  Primary Phone <span className={styles.required}>*</span>
                </label>
                <input
                  type="tel"
                  id="primary_phone"
                  name="primary_phone"
                  value={formData.primary_phone}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="9876543210"
                  maxLength={10}
                  required
                />
                {validationErrors.primary_phone && (
                  <span className={styles.error}>
                    {validationErrors.primary_phone}
                  </span>
                )}
              </div>
            </div>

            {/* Contact Person & Secondary Phone */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="contact_person">Contact Person</label>
                <input
                  type="text"
                  id="contact_person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Enter contact person name"
                  maxLength={100}
                />
                {validationErrors.contact_person && (
                  <span className={styles.error}>
                    {validationErrors.contact_person}
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="secondary_phone">Secondary Phone</label>
                <input
                  type="tel"
                  id="secondary_phone"
                  name="secondary_phone"
                  value={formData.secondary_phone}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="9876543210"
                  maxLength={10}
                />
                {validationErrors.secondary_phone && (
                  <span className={styles.error}>
                    {validationErrors.secondary_phone}
                  </span>
                )}
              </div>
            </div>

            {/* Address Line 1 & 2 */}
            <div className={styles.formGroup}>
              <label htmlFor="address_line1">Address Line 1</label>
              <input
                type="text"
                id="address_line1"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                disabled={loading}
                placeholder="Street address"
                maxLength={200}
              />
              {validationErrors.address_line1 && (
                <span className={styles.error}>
                  {validationErrors.address_line1}
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="address_line2">Address Line 2</label>
              <input
                type="text"
                id="address_line2"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
                disabled={loading}
                placeholder="Apartment, suite, etc."
                maxLength={200}
              />
              {validationErrors.address_line2 && (
                <span className={styles.error}>
                  {validationErrors.address_line2}
                </span>
              )}
            </div>

            {/* City, State & Pincode */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Enter city"
                  maxLength={50}
                />
                {validationErrors.city && (
                  <span className={styles.error}>{validationErrors.city}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="state">State</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Enter state"
                  maxLength={50}
                />
                {validationErrors.state && (
                  <span className={styles.error}>{validationErrors.state}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="pincode">Pincode</label>
                <input
                  type="text"
                  id="pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="123456"
                  maxLength={6}
                />
                {validationErrors.pincode && (
                  <span className={styles.error}>
                    {validationErrors.pincode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitDisabled}
            >
              {loading ? (
                <>
                  <div className={styles.spinner} />
                  {mode === "add" ? "Creating..." : "Updating..."}
                </>
              ) : (
                <>
                  <Save size={18} />
                  {mode === "add" ? "Create Client" : "Update Client"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
});

ClientAddUpdateDialog.displayName = "ClientAddUpdateDialog";

export default ClientAddUpdateDialog;
