import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import CircularProgress from "@mui/material/CircularProgress";
import {
  X,
  User,
  Mail,
  Phone,
  Plus,
  Trash2,
  AlertCircle,
  Globe,
  Info,
  Link2,
} from "lucide-react";

import { SOCIAL_PLATFORMS, PLATFORM_ICONS, PLATFORM_COLORS } from "../../page";

import {
  createInfluencer,
  updateInfluencer,
  fetchInfluencerById,
  selectCurrentInfluencer,
  selectCurrentInfluencerLoading,
  selectSubmittingInfluencer,
  clearCurrentInfluencer,
} from "@/store/slices/influncersSlice";

import styles from "./InfluencerDialog.module.scss";

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const MAX_SOCIAL_LINKS = 7;

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  social_links: [],
};

const SECTIONS = [
  { id: "info", label: "Primary Info", icon: User },
  { id: "social", label: "Social Media", icon: Link2 },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function PlatformIcon({ platform, size = 14 }) {
  const Comp = PLATFORM_ICONS[platform] || Globe;
  return (
    <Comp
      size={size}
      style={{ color: PLATFORM_COLORS[platform] || "#6b7280" }}
    />
  );
}

/* ─────────────────────────────────────────────
   DIRTY CHECK
   Returns true if form differs from original snapshot.
───────────────────────────────────────────── */
function socialLinksEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  return a.every((l, i) => l.platform === b[i].platform && l.url === b[i].url);
}

function formIsDirty(original, current) {
  if (!original) return false;
  if (current.name.trim() !== original.name.trim()) return true;
  if (current.email.trim() !== original.email.trim()) return true;
  if (current.phone.trim() !== original.phone.trim()) return true;

  const origLinks = original.social_links || [];
  const currLinks = (current.social_links || []).filter((l) => l.url.trim());
  if (!socialLinksEqual(origLinks, currLinks)) return true;

  return false;
}

/* ─────────────────────────────────────────────
   SOCIAL LINK ROW
───────────────────────────────────────────── */
function SocialLinkRow({ link, index, onChange, onRemove }) {
  return (
    <div className={styles.socialRow}>
      <div className={styles.platformSelect}>
        <select
          value={link.platform}
          onChange={(e) => onChange(index, "platform", e.target.value)}
          className={styles.platformDropdown}
        >
          {SOCIAL_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <span className={styles.platformIcon}>
          <PlatformIcon platform={link.platform} size={13} />
        </span>
      </div>
      <input
        className={styles.socialInput}
        type="url"
        placeholder={`https://${link.platform.toLowerCase()}.com/…`}
        value={link.url}
        onChange={(e) => onChange(index, "url", e.target.value)}
      />
      <button
        type="button"
        className={styles.removeLinkBtn}
        onClick={() => onRemove(index)}
        title="Remove"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN DIALOG
───────────────────────────────────────────── */
export default function InfluencerDialog({
  open,
  onClose,
  influencerId = null,
}) {
  const dispatch = useDispatch();
  const isEdit = !!influencerId;

  const current = useSelector(selectCurrentInfluencer);
  const loadingCurrent = useSelector(selectCurrentInfluencerLoading);
  const submitting = useSelector(selectSubmittingInfluencer);

  const [activeSection, setActiveSection] = useState("info");
  const [form, setForm] = useState(EMPTY_FORM);
  const [originalForm, setOriginalForm] = useState(null); // snapshot for diff
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  /* ── Dirty: only relevant in edit mode ── */
  const isDirty = useMemo(
    () => !isEdit || formIsDirty(originalForm, form),
    [form, originalForm, isEdit],
  );

  /* ── Open / reset ── */
  useEffect(() => {
    if (!open) {
      dispatch(clearCurrentInfluencer());
      return;
    }
    setError(null);
    setFieldErrors({});
    setActiveSection("info");
    setOriginalForm(null);

    if (isEdit) {
      dispatch(fetchInfluencerById(influencerId));
    } else {
      dispatch(clearCurrentInfluencer());
      setForm(EMPTY_FORM);
    }
  }, [open, influencerId]);

  /* ── Populate form when data loads in edit mode ── */
  useEffect(() => {
    if (!current || !isEdit) return;
    const loaded = {
      name: current.name || "",
      email: current.email || "",
      phone: current.phone || "",
      social_links: (current.social_links || []).map((l) => ({
        platform: l.platform,
        url: l.url,
      })),
    };
    setForm(loaded);
    setOriginalForm(loaded); // save snapshot
  }, [current, isEdit]);

  /* ── Field change ── */
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((e) => ({ ...e, [field]: null }));
  };

  /* ── Social links ── */
  const handleAddLink = () => {
    if (form.social_links.length >= MAX_SOCIAL_LINKS) return;
    setForm((prev) => ({
      ...prev,
      social_links: [...prev.social_links, { platform: "LINKEDIN", url: "" }],
    }));
  };

  const handleLinkChange = useCallback((index, field, value) => {
    setForm((prev) => {
      const links = [...prev.social_links];
      links[index] = { ...links[index], [field]: value };
      return { ...prev, social_links: links };
    });
  }, []);

  const handleRemoveLink = useCallback((index) => {
    setForm((prev) => ({
      ...prev,
      social_links: prev.social_links.filter((_, i) => i !== index),
    }));
  }, []);

  /* ── Validation ── */
  const validate = () => {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = "Name must be at least 2 characters";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Valid email required";
    if (!form.phone.trim() || form.phone.trim().length < 5)
      errs.phone = "Valid phone required";

    const urls = form.social_links
      .map((l) => l.url.trim().toLowerCase())
      .filter(Boolean);
    if (urls.length !== new Set(urls).size)
      errs.social_links = "Duplicate social media links are not allowed";

    const hasInvalidUrl = form.social_links.some((l) => {
      if (!l.url.trim()) return false;
      try {
        new URL(l.url);
        return false;
      } catch {
        return true;
      }
    });
    if (hasInvalidUrl)
      errs.social_links = "One or more social links have an invalid URL";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── Submit — only send changed fields in edit mode ── */
  const handleSubmit = async () => {
    if (!validate()) {
      // Navigate to tab with first error
      const infoErr =
        fieldErrors.name || fieldErrors.email || fieldErrors.phone;
      if (infoErr) setActiveSection("info");
      else setActiveSection("social");
      return;
    }
    setError(null);

    let payload;
    if (isEdit && originalForm) {
      // Build diff — only send what actually changed
      payload = {};
      if (form.name.trim() !== originalForm.name.trim())
        payload.name = form.name.trim();
      if (form.email.trim() !== originalForm.email.trim())
        payload.email = form.email.trim();
      if (form.phone.trim() !== originalForm.phone.trim())
        payload.phone = form.phone.trim();

      const origLinks = originalForm.social_links || [];
      const currLinks = form.social_links
        .filter((l) => l.url.trim())
        .map((l) => ({
          platform: l.platform,
          url: l.url.trim(),
        }));
      if (!socialLinksEqual(origLinks, currLinks))
        payload.social_links = currLinks;

      if (Object.keys(payload).length === 0) {
        onClose(null);
        return;
      }
    } else {
      // Create — send everything
      payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        social_links: form.social_links
          .filter((l) => l.url.trim())
          .map((l) => ({ platform: l.platform, url: l.url.trim() })),
      };
    }

    const res = isEdit
      ? await dispatch(updateInfluencer({ id: influencerId, ...payload }))
      : await dispatch(createInfluencer(payload));

    if (res.error) {
      setError(
        typeof res.payload === "string" ? res.payload : "Something went wrong",
      );
      return;
    }

    onClose(res.payload);
  };

  if (!open) return null;

  const atMax = form.social_links.length >= MAX_SOCIAL_LINKS;
  const infoHasError = !!(
    fieldErrors.name ||
    fieldErrors.email ||
    fieldErrors.phone
  );
  const socialHasError = !!fieldErrors.social_links;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.dialog}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {isEdit && current ? (
              <div className={styles.avatar}>{getInitials(current.name)}</div>
            ) : (
              <div className={styles.avatarPlaceholder}>
                <User size={18} />
              </div>
            )}
            <div>
              <p className={styles.headerTitle}>
                {isEdit
                  ? loadingCurrent
                    ? "Loading…"
                    : current?.name || "Edit Influencer"
                  : "New Influencer"}
              </p>
              <p className={styles.headerSub}>
                {isEdit
                  ? `${current?._count?.references ?? 0} lead reference${(current?._count?.references ?? 0) !== 1 ? "s" : ""}`
                  : "Add a new referral influencer"}
              </p>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={() => onClose()}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Pill tabs ── */}
        <div className={styles.tabBar}>
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const hasError =
              section.id === "info" ? infoHasError : socialHasError;
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
          {loadingCurrent ? (
            <div className={styles.loadingState}>
              <CircularProgress size={22} thickness={4} />
              <span>Loading influencer…</span>
            </div>
          ) : (
            <>
              {/* ══ PRIMARY INFO ══ */}
              {activeSection === "info" && (
                <div className={styles.section}>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Full Name <span className={styles.req}>*</span>
                    </label>
                    <div className={styles.inputWrap}>
                      <User size={18} className={styles.inputIcon} />
                      <input
                        className={`${styles.input} ${fieldErrors.name ? styles.inputError : ""}`}
                        placeholder="e.g., Rahul Sharma"
                        value={form.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        maxLength={120}
                        autoComplete="off"
                      />
                    </div>
                    {fieldErrors.name && (
                      <p className={styles.ferror}>{fieldErrors.name}</p>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>
                      Email <span className={styles.req}>*</span>
                    </label>
                    <div className={styles.inputWrap}>
                      <Mail size={16} className={styles.inputIcon} />
                      <input
                        className={`${styles.input} ${fieldErrors.email ? styles.inputError : ""}`}
                        type="email"
                        placeholder="name@example.com"
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className={styles.ferror}>{fieldErrors.email}</p>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>
                      Phone <span className={styles.req}>*</span>
                    </label>
                    <div className={styles.inputWrap}>
                      <Phone size={16} className={styles.inputIcon} />
                      <input
                        className={`${styles.input} ${fieldErrors.phone ? styles.inputError : ""}`}
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={form.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        maxLength={20}
                        autoComplete="off"
                      />
                    </div>
                    {fieldErrors.phone && (
                      <p className={styles.ferror}>{fieldErrors.phone}</p>
                    )}
                  </div>

                  {isEdit && current && (
                    <div className={styles.metaBox}>
                      <div className={styles.metaRow}>
                        <Info size={11} />
                        <span>
                          Created by{" "}
                          <strong>{current.creator?.name || "—"}</strong> ·{" "}
                          {formatDate(current.created_at)}
                        </span>
                      </div>
                      {current.updater && (
                        <div className={styles.metaRow}>
                          <Info size={11} />
                          <span>
                            Updated by{" "}
                            <strong>{current.updater?.name || "—"}</strong> ·{" "}
                            {formatDate(current.updated_at)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {error && (
                    <div className={styles.errorBanner}>
                      <AlertCircle size={14} />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ══ SOCIAL MEDIA ══ */}
              {activeSection === "social" && (
                <div className={styles.section}>
                  {fieldErrors.social_links && (
                    <p className={styles.ferror}>{fieldErrors.social_links}</p>
                  )}

                  {form.social_links.length === 0 && (
                    <p className={styles.emptyLinks}>
                      No social links added yet
                    </p>
                  )}

                  <div className={styles.socialList}>
                    {form.social_links.map((link, i) => (
                      <SocialLinkRow
                        key={i}
                        link={link}
                        index={i}
                        onChange={handleLinkChange}
                        onRemove={handleRemoveLink}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    className={styles.addLinkBtn}
                    onClick={handleAddLink}
                    disabled={atMax}
                  >
                    <Plus size={13} />
                    Add Social Link
                    {atMax && (
                      <span className={styles.cap}>
                        (max {MAX_SOCIAL_LINKS})
                      </span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => onClose()}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={submitting || loadingCurrent || (isEdit && !isDirty)}
          >
            {submitting ? (
              <CircularProgress
                size={13}
                thickness={5}
                className={styles.btnSpinner}
              />
            ) : (
              <Plus size={16} />
            )}
            {isEdit ? "Update Influencer" : "Create Influencer"}
          </button>
        </div>
      </div>
    </div>
  );
}
