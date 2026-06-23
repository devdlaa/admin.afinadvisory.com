"use client";
import React, { forwardRef, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Save, Building2, Plus, Trash2 } from "lucide-react";
import {
  createEntity,
  updateEntity,
  selectIsLoading,
  selectError,
  clearError,
} from "@/store/slices/entitySlice";
import { schemas } from "@/schemas";
import styles from "./ClientAddUpdateDialog.module.scss";

// Predefined field names for the dropdown
const PREDEFINED_FIELD_NAMES = [
  "GST Number",
  "TAN Number",
  "CIN Number",
  "Website",
  "Client Code",
  "Preferred Language",
  "Custom",
];

const ClientAddUpdateDialog = forwardRef(({ mode, client }, ref) => {
  const dispatch = useDispatch();
  const loading = useSelector((state) =>
    selectIsLoading(state, mode === "add" ? "create" : "update"),
  );
  const error = useSelector((state) =>
    selectError(state, mode === "add" ? "create" : "update"),
  );

  // Active tab state
  const [activeTab, setActiveTab] = useState("primary");

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
    custom_fields: [],
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
        custom_fields: [],
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
        custom_fields: client.custom_fields || [],
      };
      setFormData(clientData);
      setOriginalData(clientData);
    }
    setValidationErrors({});
    setActiveTab("primary");
    dispatch(clearError(mode === "add" ? "create" : "update"));
  }, [mode, client, dispatch]);

  // Check if form has changes
  const hasChanges = () => {
    if (mode === "add") return true;
    if (!originalData) return false;

    return Object.keys(formData).some((key) => {
      if (key === "custom_fields") {
        return (
          JSON.stringify(formData.custom_fields) !==
          JSON.stringify(originalData.custom_fields)
        );
      }
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

  // Handle custom field changes
  const handleCustomFieldChange = (index, field, value) => {
    setFormData((prev) => {
      const newCustomFields = [...prev.custom_fields];
      newCustomFields[index] = {
        ...newCustomFields[index],
        [field]: value,
      };
      return {
        ...prev,
        custom_fields: newCustomFields,
      };
    });

    // Clear validation error for this specific custom field
    const errorKey = `custom_field_${index}_${field}`;
    if (validationErrors[errorKey] || validationErrors.custom_fields) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        // Only clear general custom_fields error if it's not about duplicates or max count
        if (
          validationErrors.custom_fields &&
          !validationErrors.custom_fields.includes("Duplicate") &&
          !validationErrors.custom_fields.includes("Maximum")
        ) {
          delete newErrors.custom_fields;
        }
        return newErrors;
      });
    }
  };

  // Add new custom field
  const addCustomField = () => {
    if (formData.custom_fields.length >= 10) {
      return; // Maximum 10 fields
    }
    setFormData((prev) => ({
      ...prev,
      custom_fields: [
        ...prev.custom_fields,
        { name: "", value: "", isCustomName: false },
      ],
    }));
  };

  // Remove custom field
  const removeCustomField = (index) => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, i) => i !== index),
    }));

    // Clear any errors related to this field
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      // Remove errors for the deleted field
      delete newErrors[`custom_field_${index}_name`];
      delete newErrors[`custom_field_${index}_value`];

      // Reindex remaining field errors
      const reindexedErrors = {};
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith("custom_field_")) {
          const match = key.match(/custom_field_(\d+)_(.*)/);
          if (match) {
            const fieldIndex = parseInt(match[1]);
            const fieldName = match[2];
            if (fieldIndex > index) {
              // Shift down by one
              reindexedErrors[`custom_field_${fieldIndex - 1}_${fieldName}`] =
                newErrors[key];
            } else if (fieldIndex < index) {
              // Keep as is
              reindexedErrors[key] = newErrors[key];
            }
          }
        } else {
          reindexedErrors[key] = newErrors[key];
        }
      });

      return reindexedErrors;
    });
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Close if no changes in update mode
    if (mode === "update" && !hasChanges()) {
      ref.current?.close();
      return;
    }

    setValidationErrors({});

    // Pick schema
    const schema =
      mode === "add" ? schemas.entity.create : schemas.entity.update;

    // Normalize data ("" → null, clean custom fields)
    const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (key === "custom_fields") {
        const validFields = value
          .filter((field) => field.name && field.name.trim())
          .map(({ name, value }) => ({
            name: name.trim(),
            value: value ? value.trim() : null,
          }));

        acc[key] = validFields.length ? validFields : undefined;
      } else {
        acc[key] = value === "" ? null : value;
      }
      return acc;
    }, {});

    // ---------------------------
    // ZOD VALIDATION (NO THROW)
    // ---------------------------
    const result = schema.safeParse(cleanedData);

    if (!result.success) {
      const errors = {};
      let hasCustomFieldError = false;

      result?.error?.issues?.forEach((error) => {
        const path = error.path;

        // Top-level field errors
        if (path.length === 1) {
          errors[path[0]] = error.message;
        }

        // Custom fields
        else if (path[0] === "custom_fields") {
          hasCustomFieldError = true;

          if (path.length === 1) {
            errors.custom_fields = error.message;
          } else if (path.length === 3) {
            const index = path[1];
            const fieldName = path[2];
            errors[`custom_field_${index}_${fieldName}`] = error.message;
          } else if (path.length === 2) {
            errors.custom_fields = error.message;
          }
        }
      });

      setValidationErrors(errors);

      // Auto-switch tab
      const hasPrimaryErrors = Object.keys(errors).some(
        (key) => !key.startsWith("custom_field") && key !== "custom_fields",
      );

      if (hasCustomFieldError && !hasPrimaryErrors) {
        setActiveTab("additional");
      } else {
        setActiveTab("primary");
      }

      return;
    }

    // ✅ Validated data
    const validatedData = result.data;

    try {
      // API call
      if (mode === "add") {
        await dispatch(createEntity(validatedData)).unwrap();
      } else {
        await dispatch(
          updateEntity({ id: client.id, data: validatedData }),
        ).unwrap();
      }

      // Close dialog on success
      ref.current?.close();
    } catch (err) {
      console.error("Submit failed:", err);
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

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${
              activeTab === "primary" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("primary")}
            disabled={loading}
          >
            Primary Info
            {Object.keys(validationErrors).some(
              (key) =>
                !key.startsWith("custom_field") && key !== "custom_fields",
            ) && <span className={styles.errorIndicator}>!</span>}
          </button>
          <button
            type="button"
            className={`${styles.tab} ${
              activeTab === "additional" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("additional")}
            disabled={loading}
          >
            Additional Fields
            {formData.custom_fields.length > 0 && (
              <span className={styles.badge}>
                {formData.custom_fields.length}
              </span>
            )}
            {(validationErrors.custom_fields ||
              Object.keys(validationErrors).some((key) =>
                key.startsWith("custom_field"),
              )) && <span className={styles.errorIndicator}>!</span>}
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
            {/* Primary Info Tab */}
            {activeTab === "primary" && (
              <>
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
                      className={
                        validationErrors.entity_type ? styles.inputError : ""
                      }
                    >
                      <option value="UN_REGISTRED">Unregistered</option>
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="PRIVATE_LIMITED_COMPANY">
                        Private Limited Company
                      </option>
                      <option value="PUBLIC_LIMITED_COMPANY">
                        Public Limited Company
                      </option>
                      <option value="ONE_PERSON_COMPANY">
                        One Person Company
                      </option>
                      <option value="SECTION_8_COMPANY">
                        Section 8 Company
                      </option>
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
                      <option value="GOVERNMENT_COMPANY">
                        Government Company
                      </option>
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
                      className={
                        validationErrors.status ? styles.inputError : ""
                      }
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
                      className={validationErrors.name ? styles.inputError : ""}
                    />
                    {validationErrors.name && (
                      <span className={styles.error}>
                        {validationErrors.name}
                      </span>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="pan">
                      PAN{" "}
                      {isPanRequired && (
                        <span className={styles.required}>*</span>
                      )}
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
                      className={validationErrors.pan ? styles.inputError : ""}
                    />
                    {validationErrors.pan && (
                      <span className={styles.error}>
                        {validationErrors.pan}
                      </span>
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
                      className={
                        validationErrors.email ? styles.inputError : ""
                      }
                    />
                    {validationErrors.email && (
                      <span className={styles.error}>
                        {validationErrors.email}
                      </span>
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
                      className={
                        validationErrors.primary_phone ? styles.inputError : ""
                      }
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
                      className={
                        validationErrors.contact_person ? styles.inputError : ""
                      }
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
                      className={
                        validationErrors.secondary_phone
                          ? styles.inputError
                          : ""
                      }
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
                    className={
                      validationErrors.address_line1 ? styles.inputError : ""
                    }
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
                    className={
                      validationErrors.address_line2 ? styles.inputError : ""
                    }
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
                      className={validationErrors.city ? styles.inputError : ""}
                    />
                    {validationErrors.city && (
                      <span className={styles.error}>
                        {validationErrors.city}
                      </span>
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
                      className={
                        validationErrors.state ? styles.inputError : ""
                      }
                    />
                    {validationErrors.state && (
                      <span className={styles.error}>
                        {validationErrors.state}
                      </span>
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
                      className={
                        validationErrors.pincode ? styles.inputError : ""
                      }
                    />
                    {validationErrors.pincode && (
                      <span className={styles.error}>
                        {validationErrors.pincode}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Additional Fields Tab */}
            {activeTab === "additional" && (
              <div className={styles.additionalFields}>
                <div className={styles.additionalHeader}>
                  <button
                    type="button"
                    className={styles.addFieldBtn}
                    onClick={addCustomField}
                    disabled={loading || formData.custom_fields.length >= 10}
                  >
                    <Plus size={18} />
                    Add Field
                  </button>
                </div>

                {validationErrors.custom_fields && (
                  <div className={styles.errorMessage}>
                    {validationErrors.custom_fields}
                  </div>
                )}

                {formData.custom_fields.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No additional fields added yet.</p>
                    <p className={styles.emptySubtext}>
                      Click "Add Field" to create custom fields for this client.
                    </p>
                  </div>
                ) : (
                  <div className={styles.customFieldsList}>
                    {formData.custom_fields.map((field, index) => (
                      <div key={index} className={styles.customFieldRow}>
                        <div className={styles.fieldNumber}>{index + 1}</div>
                        <div className={styles.customFieldInputs}>
                          <div className={styles.formGroup}>
                            <label htmlFor={`field_name_${index}`}>
                              Field Name
                            </label>
                            {field.isCustomName ? (
                              <>
                                <input
                                  type="text"
                                  id={`field_name_${index}`}
                                  value={field.name}
                                  onChange={(e) =>
                                    handleCustomFieldChange(
                                      index,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  disabled={loading}
                                  placeholder="Enter custom field name"
                                  maxLength={50}
                                  className={
                                    validationErrors[
                                      `custom_field_${index}_name`
                                    ]
                                      ? styles.inputError
                                      : ""
                                  }
                                />
                                {validationErrors[
                                  `custom_field_${index}_name`
                                ] && (
                                  <span className={styles.error}>
                                    {
                                      validationErrors[
                                        `custom_field_${index}_name`
                                      ]
                                    }
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <select
                                  id={`field_name_${index}`}
                                  value={field.name}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "Custom") {
                                      handleCustomFieldChange(
                                        index,
                                        "isCustomName",
                                        true,
                                      );
                                      handleCustomFieldChange(
                                        index,
                                        "name",
                                        "",
                                      );
                                    } else {
                                      handleCustomFieldChange(
                                        index,
                                        "name",
                                        value,
                                      );
                                    }
                                  }}
                                  disabled={loading}
                                  className={
                                    validationErrors[
                                      `custom_field_${index}_name`
                                    ]
                                      ? styles.inputError
                                      : ""
                                  }
                                >
                                  <option value="">Select field name</option>
                                  {PREDEFINED_FIELD_NAMES.map((name) => (
                                    <option key={name} value={name}>
                                      {name}
                                    </option>
                                  ))}
                                </select>
                                {validationErrors[
                                  `custom_field_${index}_name`
                                ] && (
                                  <span className={styles.error}>
                                    {
                                      validationErrors[
                                        `custom_field_${index}_name`
                                      ]
                                    }
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          <div className={styles.formGroup}>
                            <label htmlFor={`field_value_${index}`}>
                              Field Value
                            </label>
                            <input
                              type="text"
                              id={`field_value_${index}`}
                              value={field.value}
                              onChange={(e) =>
                                handleCustomFieldChange(
                                  index,
                                  "value",
                                  e.target.value,
                                )
                              }
                              disabled={loading}
                              placeholder="Enter value"
                              maxLength={255}
                              className={
                                validationErrors[`custom_field_${index}_value`]
                                  ? styles.inputError
                                  : ""
                              }
                            />
                            {validationErrors[
                              `custom_field_${index}_value`
                            ] && (
                              <span className={styles.error}>
                                {
                                  validationErrors[
                                    `custom_field_${index}_value`
                                  ]
                                }
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={styles.removeFieldBtn}
                          onClick={() => removeCustomField(index)}
                          disabled={loading}
                          title="Remove field"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {formData.custom_fields.length >= 10 && (
                  <div className={styles.maxFieldsWarning}>
                    Maximum of 10 custom fields reached
                  </div>
                )}
              </div>
            )}
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
