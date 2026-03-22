"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Link2,
  ChevronDown,
} from "lucide-react";

import GeoFields from "@/app/components/shared/GeoFields/GeoFields";

import {
  createLeadContact,
  updateLeadContact,
  fetchLeadContactById,
  clearErrors,
  clearError,
} from "@/store/slices/leadContactSlice";

import styles from "./LeadContactDialog.module.scss";

import {
  ENTITY_TYPE_OPTIONS,
  INDUSTRY_OPTIONS,
  LANGUAGE_OPTIONS,
  SOCIAL_PLATFORM_OPTIONS,
} from "../constants";

/* ─────────────────────────────────────────────────────────────
   SECTIONS — 5 pills
───────────────────────────────────────────────────────────── */
const SECTIONS = [
  { id: "info", label: "Primary Info", icon: User },
  { id: "contact", label: "Contact Info", icon: Phone },
  { id: "business", label: "Business", icon: Building2 },
  { id: "address", label: "Address", icon: MapPin },
  { id: "social", label: "Social Media", icon: Link2 },
];

/* ─────────────────────────────────────────────────────────────
   FORM SHAPE
───────────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  entity_type: "INDIVIDUAL",
  contact_person: "",
  company_name: "",
  designation: "",
  primary_email: "",
  secondary_email: "",
  primary_phone: "",
  primary_whatsapp: false,
  secondary_phone: "",
  secondary_whatsapp: false,
  website: "",
  industry: "",
  pan: "",
  gst_number: "",
  preferred_language: "",
  address_line1: "",
  address_line2: "",
  country_code: "",
  country_name: "",
  state_code: "",
  state_name: "",
  city: "",
  pincode: "",
  notes: "",
  social_links: [],
};

/* ─────────────────────────────────────────────────────────────
   dataToForm
───────────────────────────────────────────────────────────── */
function dataToForm(data) {
  return {
    entity_type: data.entity_type || "INDIVIDUAL",
    contact_person: data.contact_person || "",
    company_name: data.company_name || "",
    designation: data.designation || "",
    primary_email: data.primary_email || "",
    secondary_email: data.secondary_email || "",
    primary_phone: data.primary_phone || "",
    primary_whatsapp: data.primary_whatsapp ?? false,
    secondary_phone: data.secondary_phone || "",
    secondary_whatsapp: data.secondary_whatsapp ?? false,
    website: data.website || "",
    industry: data.industry || "",
    pan: data.pan || "",
    gst_number: data.gst_number || "",
    preferred_language: data.preferred_language || "",
    address_line1: data.address_line1 || "",
    address_line2: data.address_line2 || "",
    country_code: data.country_code || "",
    country_name: data.country_name || "",
    state_code: data.state_code || "",
    state_name: data.state_name || "",
    city: data.city || "",
    pincode: data.pincode || "",
    notes: data.notes || "",
    social_links: (data.social_links || []).map((l) => ({
      platform: l.platform,
      url: l.url,
    })),
  };
}

/* ─────────────────────────────────────────────────────────────
   PAYLOAD BUILDERS
───────────────────────────────────────────────────────────── */
function buildCreatePayload(form) {
  const out = {};
  Object.entries(form).forEach(([k, v]) => {
    if (k === "social_links") {
      const links = (v || []).filter((l) => l.platform && l.url?.trim());
      if (links.length) out.social_links = links;
      return;
    }
    if (typeof v === "boolean") {
      out[k] = v;
      return;
    }
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  });
  return out;
}

const ENUM_FIELDS = new Set(["entity_type", "industry", "preferred_language"]);
const FREE_TEXT_FIELDS = new Set([
  "contact_person",
  "company_name",
  "designation",
  "primary_email",
  "secondary_email",
  "primary_phone",
  "secondary_phone",
  "website",
  "pan",
  "gst_number",
  "address_line1",
  "address_line2",
  "country_code",
  "country_name",
  "state_code",
  "state_name",
  "city",
  "pincode",
  "notes",
]);

function socialLinksEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every(
    (link, i) => link.platform === b[i].platform && link.url === b[i].url,
  );
}

function buildUpdatePayload(original, current) {
  const diff = {};
  Object.keys(EMPTY_FORM).forEach((key) => {
    const orig = original[key];
    const curr = current[key];

    if (key === "social_links") {
      const origLinks = orig || [];
      const currLinks = (curr || []).filter((l) => l.platform && l.url?.trim());
      if (!socialLinksEqual(origLinks, currLinks))
        diff.social_links = currLinks;
      return;
    }
    if (typeof curr === "boolean") {
      if (curr !== orig) diff[key] = curr;
      return;
    }
    const origStr = (orig ?? "").toString().trim();
    const currStr = (curr ?? "").toString().trim();
    if (currStr === origStr) return;
    if (ENUM_FIELDS.has(key)) {
      diff[key] = currStr || null;
    } else if (FREE_TEXT_FIELDS.has(key)) {
      diff[key] = currStr;
    }
  });
  return diff;
}

/* ─────────────────────────────────────────────────────────────
   FIELD HELPERS
───────────────────────────────────────────────────────────── */
function Field({ label, required, error, children, hint }) {
  return (
    <div className={`${styles.field} ${error ? styles.fieldError : ""}`}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && <span className={styles.fieldErrorMsg}>{error}</span>}
    </div>
  );
}

function Input({ className = "", ...props }) {
  return <input className={`${styles.input} ${className}`} {...props} />;
}

function Select({ className = "", children, ...props }) {
  return (
    <div className={styles.selectWrap}>
      <select className={`${styles.select} ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown size={14} className={styles.selectChevron} />
    </div>
  );
}

function Checkbox({ label, checked, onChange, disabled }) {
  return (
    <label className={styles.checkboxLabel}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className={styles.checkboxText}>{label}</span>
    </label>
  );
}

/* ─────────────────────────────────────────────────────────────
   GROUP DIVIDER
───────────────────────────────────────────────────────────── */
function GroupLabel({ children }) {
  return <div className={styles.groupLabel}>{children}</div>;
}

/* ─────────────────────────────────────────────────────────────
   MAIN DIALOG
───────────────────────────────────────────────────────────── */
export default function LeadContactDialog({
  isOpen,
  mode,
  contactId,
  detailCacheRef,
  onClose,
  onSuccess,
}) {
  const dispatch = useDispatch();

  const createError = useSelector((s) => s.leadContact.error.create);
  const updateError = useSelector((s) => s.leadContact.error.update);
  const serverError = mode === "create" ? createError : updateError;

  const [activeSection, setActiveSection] = useState("info");
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [fetchLoading, setFetchLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const originalFormRef = useRef(null);

  /* ── Compute dirty state (only matters for update mode) ── */
  const isDirty = useMemo(() => {
    if (mode !== "update" || !originalFormRef.current) return true; // create is always "dirty"
    return (
      Object.keys(buildUpdatePayload(originalFormRef.current, form)).length > 0
    );
  }, [form, mode]);

  /* ── Open / mode change ── */
  useEffect(() => {
    if (!isOpen) return;
    setActiveSection("info");
    setFieldErrors({});
    originalFormRef.current = null;
    dispatch(clearErrors());

    if (mode === "create") {
      setForm(EMPTY_FORM);
      return;
    }

    if (mode === "update" && contactId) {
      const cached = detailCacheRef?.current?.[contactId];
      if (cached) {
        const formData = dataToForm(cached);
        originalFormRef.current = formData;
        setForm(formData);
        return;
      }

      setFetchLoading(true);
      dispatch(fetchLeadContactById(contactId))
        .unwrap()
        .then((data) => {
          if (detailCacheRef) detailCacheRef.current[contactId] = data;
          const formData = dataToForm(data);
          originalFormRef.current = formData;
          setForm(formData);
        })
        .catch(() => {})
        .finally(() => setFetchLoading(false));
    }
  }, [isOpen, mode, contactId, dispatch, detailCacheRef]);

  const handleClose = useCallback(() => {
    if (submitLoading) return;
    dispatch(clearErrors());
    onClose();
  }, [submitLoading, dispatch, onClose]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
    }
    dispatch(clearError(mode === "create" ? "create" : "update"));
  };

  /* ── Social links ── */
  const addSocialLink = () => {
    setForm((prev) => ({
      ...prev,
      social_links: [...prev.social_links, { platform: "LINKEDIN", url: "" }],
    }));
  };
  const updateSocialLink = (idx, key, value) => {
    setForm((prev) => {
      const links = [...prev.social_links];
      links[idx] = { ...links[idx], [key]: value };
      return { ...prev, social_links: links };
    });
  };
  const removeSocialLink = (idx) => {
    setForm((prev) => ({
      ...prev,
      social_links: prev.social_links.filter((_, i) => i !== idx),
    }));
  };

  /* ── Validation ── */
  const validate = () => {
    const errors = {};
    if (!form.contact_person.trim())
      errors.contact_person = "Contact name is required";
    if (!form.entity_type) errors.entity_type = "Entity type is required";

    if (mode === "create") {
      const hasContact =
        form.primary_email.trim() ||
        form.secondary_email.trim() ||
        form.primary_phone.trim() ||
        form.secondary_phone.trim();
      if (!hasContact)
        errors._contact = "At least one email or phone is required";
    }

    if (
      form.primary_email &&
      form.secondary_email &&
      form.primary_email === form.secondary_email
    )
      errors.secondary_email = "Cannot be the same as primary email";
    if (
      form.primary_phone &&
      form.secondary_phone &&
      form.primary_phone === form.secondary_phone
    )
      errors.secondary_phone = "Cannot be the same as primary phone";
    if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan.toUpperCase()))
      errors.pan = "Invalid PAN format (e.g. ABCDE1234F)";
    if (
      form.gst_number &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        form.gst_number.toUpperCase(),
      )
    )
      errors.gst_number = "Invalid GST format";

    const urls = (form.social_links || []).map((l) => l.url.toLowerCase());
    if (new Set(urls).size !== urls.length)
      errors._social = "Duplicate social links are not allowed";

    return errors;
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.contact_person || errors.entity_type) setActiveSection("info");
      else if (
        errors._contact ||
        errors.primary_email ||
        errors.secondary_email ||
        errors.primary_phone ||
        errors.secondary_phone
      )
        setActiveSection("contact");
      else if (errors.pan || errors.gst_number) setActiveSection("business");
      else if (errors._social) setActiveSection("social");
      return;
    }

    setSubmitLoading(true);
    try {
      if (mode === "create") {
        const payload = buildCreatePayload(form);
        await dispatch(createLeadContact(payload)).unwrap();
        onSuccess(null);
      } else {
        const payload = buildUpdatePayload(originalFormRef.current, form);
        if (Object.keys(payload).length === 0) {
          onSuccess(null);
          return;
        }
        await dispatch(
          updateLeadContact({ id: contactId, data: payload }),
        ).unwrap();
        onSuccess(contactId);
      }
    } catch {
      // error surfaces via Redux
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!isOpen) return null;

  /* ── Tab error indicators ── */
  const infoHasError = fieldErrors.contact_person || fieldErrors.entity_type;
  const contactHasError =
    fieldErrors._contact ||
    fieldErrors.primary_email ||
    fieldErrors.secondary_email ||
    fieldErrors.primary_phone ||
    fieldErrors.secondary_phone;
  const businessHasError = fieldErrors.pan || fieldErrors.gst_number;
  const socialHasError = fieldErrors._social;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className={styles.dialog}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>
              {mode === "create" ? "Add Lead Contact" : "Edit Lead Contact"}
            </h2>
            <p className={styles.subtitle}>
              {mode === "create"
                ? "Fill in the details to create a new lead contact."
                : "Only changed fields will be sent to the server."}
            </p>
          </div>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            disabled={submitLoading}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Pill tabs ── */}
        <div className={styles.tabBar}>
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const hasError =
              section.id === "info"
                ? infoHasError
                : section.id === "contact"
                  ? contactHasError
                  : section.id === "business"
                    ? businessHasError
                    : section.id === "social"
                      ? socialHasError
                      : false;
            return (
              <button
                key={section.id}
                className={`${styles.tabPill} ${activeSection === section.id ? styles.tabPillActive : ""} ${hasError ? styles.tabPillError : ""}`}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                <Icon size={14} />
                {section.label}
                {hasError && <span className={styles.tabPillErrorDot} />}
              </button>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>
          {fetchLoading ? (
            <div className={styles.fetchingState}>
              <Loader2 size={22} className={styles.spinner} />
              <span>Loading contact…</span>
            </div>
          ) : (
            <>
              {serverError && (
                <div className={styles.serverError}>{serverError}</div>
              )}

              {/* ══ PRIMARY INFO ══ */}
              {activeSection === "info" && (
                <div className={styles.section}>
                  <div className={styles.grid2}>
                    <Field
                      label="Contact Person"
                      required
                      error={fieldErrors.contact_person}
                    >
                      <Input
                        type="text"
                        value={form.contact_person}
                        onChange={(e) =>
                          setField("contact_person", e.target.value)
                        }
                        placeholder="Full name"
                        maxLength={120}
                      />
                    </Field>
                    <Field
                      label="Entity Type"
                      required
                      error={fieldErrors.entity_type}
                    >
                      <Select
                        value={form.entity_type}
                        onChange={(e) =>
                          setField("entity_type", e.target.value)
                        }
                      >
                        {ENTITY_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div className={styles.grid2}>
                    <Field label="Company Name">
                      <Input
                        type="text"
                        value={form.company_name}
                        onChange={(e) =>
                          setField("company_name", e.target.value)
                        }
                        placeholder="Company / Organisation"
                        maxLength={150}
                      />
                    </Field>
                    <Field label="Designation">
                      <Input
                        type="text"
                        value={form.designation}
                        onChange={(e) =>
                          setField("designation", e.target.value)
                        }
                        placeholder="e.g. Director, Manager"
                        maxLength={120}
                      />
                    </Field>
                  </div>

                  <div className={styles.grid2}>
                    <Field label="Industry">
                      <Select
                        value={form.industry}
                        onChange={(e) => setField("industry", e.target.value)}
                      >
                        {INDUSTRY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Preferred Language">
                      <Select
                        value={form.preferred_language}
                        onChange={(e) =>
                          setField("preferred_language", e.target.value)
                        }
                      >
                        {LANGUAGE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <GroupLabel>Notes</GroupLabel>
                  <Field hint="Internal notes about this contact">
                    <textarea
                      className={styles.textarea}
                      value={form.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                      placeholder="Any additional notes, context, or remarks…"
                      rows={5}
                    />
                  </Field>
                </div>
              )}

              {/* ══ CONTACT INFO ══ */}
              {activeSection === "contact" && (
                <div className={styles.section}>
                  {fieldErrors._contact && (
                    <div className={styles.inlineError}>
                      {fieldErrors._contact}
                    </div>
                  )}

                  <GroupLabel>Email Addresses</GroupLabel>
                  <div className={styles.grid2}>
                    <Field
                      label="Primary Email"
                      error={fieldErrors.primary_email}
                    >
                      <Input
                        type="email"
                        value={form.primary_email}
                        onChange={(e) =>
                          setField("primary_email", e.target.value)
                        }
                        placeholder="primary@example.com"
                      />
                    </Field>
                    <Field
                      label="Secondary Email"
                      error={fieldErrors.secondary_email}
                    >
                      <Input
                        type="email"
                        value={form.secondary_email}
                        onChange={(e) =>
                          setField("secondary_email", e.target.value)
                        }
                        placeholder="secondary@example.com"
                      />
                    </Field>
                  </div>

                  <GroupLabel>Phone Numbers</GroupLabel>
                  <div className={styles.grid2}>
                    <div>
                      <Field
                        label="Primary Phone"
                        error={fieldErrors.primary_phone}
                      >
                        <Input
                          type="tel"
                          value={form.primary_phone}
                          onChange={(e) =>
                            setField("primary_phone", e.target.value)
                          }
                          placeholder="+91 98765 43210"
                          maxLength={20}
                        />
                      </Field>
                      <Checkbox
                        label="WhatsApp available"
                        checked={form.primary_whatsapp}
                        onChange={(e) =>
                          setField("primary_whatsapp", e.target.checked)
                        }
                      />
                    </div>
                    <div>
                      <Field
                        label="Secondary Phone"
                        error={fieldErrors.secondary_phone}
                      >
                        <Input
                          type="tel"
                          value={form.secondary_phone}
                          onChange={(e) =>
                            setField("secondary_phone", e.target.value)
                          }
                          placeholder="+91 98765 43210"
                          maxLength={20}
                        />
                      </Field>
                      <Checkbox
                        label="WhatsApp available"
                        checked={form.secondary_whatsapp}
                        onChange={(e) =>
                          setField("secondary_whatsapp", e.target.checked)
                        }
                        disabled={!form.secondary_phone}
                      />
                    </div>
                  </div>

                  <GroupLabel>Website</GroupLabel>
                  <Field label="Website URL">
                    <Input
                      type="url"
                      value={form.website}
                      onChange={(e) => setField("website", e.target.value)}
                      placeholder="https://example.com"
                      maxLength={200}
                    />
                  </Field>
                </div>
              )}

              {/* ══ BUSINESS ══ */}
              {activeSection === "business" && (
                <div className={styles.section}>
                  <div className={styles.grid2}>
                    <Field
                      label="PAN Number"
                      error={fieldErrors.pan}
                      hint="Format: ABCDE1234F"
                    >
                      <Input
                        type="text"
                        value={form.pan}
                        onChange={(e) =>
                          setField("pan", e.target.value.toUpperCase())
                        }
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        style={{
                          fontFamily: "Courier New, monospace",
                          letterSpacing: "1.5px",
                        }}
                      />
                    </Field>
                    <Field
                      label="GST Number"
                      error={fieldErrors.gst_number}
                      hint="15-character GST number"
                    >
                      <Input
                        type="text"
                        value={form.gst_number}
                        onChange={(e) =>
                          setField("gst_number", e.target.value.toUpperCase())
                        }
                        placeholder="22ABCDE1234F1Z5"
                        maxLength={15}
                        style={{
                          fontFamily: "Courier New, monospace",
                          letterSpacing: "1.5px",
                        }}
                      />
                    </Field>
                  </div>
                </div>
              )}

              {/* ══ ADDRESS ══ */}
              {activeSection === "address" && (
                <GeoFields
                  value={{
                    address_line1: form.address_line1,
                    address_line2: form.address_line2,
                    country_code: form.country_code,
                    country_name: form.country_name,
                    state_code: form.state_code,
                    state_name: form.state_name,
                    city: form.city,
                    pincode: form.pincode,
                  }}
                  onChange={(patch) => {
                    Object.entries(patch).forEach(([k, v]) => setField(k, v));
                  }}
                  errors={{}}
                />
              )}

              {/* ══ SOCIAL MEDIA ══ */}
              {activeSection === "social" && (
                <div className={styles.section}>
                  {fieldErrors._social && (
                    <div className={styles.inlineError}>
                      {fieldErrors._social}
                    </div>
                  )}

                  {form.social_links.length === 0 && (
                    <p className={styles.emptyNote}>
                      No social links added yet.
                    </p>
                  )}

                  <div className={styles.socialList}>
                    {form.social_links.map((link, idx) => (
                      <div key={idx} className={styles.socialItem}>
                        <div className={styles.socialPlatform}>
                          <Select
                            value={link.platform}
                            onChange={(e) =>
                              updateSocialLink(idx, "platform", e.target.value)
                            }
                          >
                            {SOCIAL_PLATFORM_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className={styles.socialUrl}>
                          <Input
                            type="url"
                            value={link.url}
                            onChange={(e) =>
                              updateSocialLink(idx, "url", e.target.value)
                            }
                            placeholder="https://…"
                          />
                        </div>
                        <button
                          className={styles.socialRemoveBtn}
                          onClick={() => removeSocialLink(idx)}
                          type="button"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {form.social_links.length < 6 && (
                    <button
                      className={styles.addLinkBtn}
                      onClick={addSocialLink}
                      type="button"
                    >
                      <Plus size={15} />
                      Add Social Link
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <button
            className={styles.cancelBtn}
            onClick={handleClose}
            disabled={submitLoading || fetchLoading}
          >
            Cancel
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={
              submitLoading || fetchLoading || (mode === "update" && !isDirty)
            }
          >
            {submitLoading ? (
              <>
                <Loader2 size={15} className={styles.spinner} />
                {mode === "create" ? "Creating…" : "Saving…"}
              </>
            ) : mode === "create" ? (
              "Create Contact"
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
