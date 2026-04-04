"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  FileText,
  User,
  Tag,
  Link2,
  ChevronDown,
  AlertCircle,
  Loader2,
  Flag,
  Calendar,
  GitBranch,
} from "lucide-react";

import { createLead, selectCreateLeadLoading } from "@/store/slices/leadsSlice";
import {
  fetchCompanyProfiles,
  selectListProfiles,
  selectIsLoading as selectProfileLoading,
} from "@/store/slices/companyProfileSlice";

import LeadTagsDialog from "../LeadTagsDialog/LeadTagsDialog";
import LeadContactDialog from "../../leads-contact/components/LeadContactDialog/LeadContactDialog";
import InfluencerDialog from "../../influncers/components/InfluencerDialog/InfluencerDialog";
import LinkSelectionDialog from "../LinkSelectionDialog/LinkSelectionDialog";

import {
  searchInfluencers,
  selectInfluencerSearchList,
  selectInfluencerSearchLoading,
} from "@/store/slices/influncersSlice";

import {
  quickSearchLeadContacts,
  clearQuickSearch,
  selectQuickSearchResults,
  selectQuickSearchLoading,
} from "@/store/slices/leadContactSlice";

import styles from "./CreateLeadDrawer.module.scss";

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low", color: "#6b7280", bg: "#f3f4f6" },
  { value: "NORMAL", label: "Normal", color: "#3b82f6", bg: "#eff6ff" },
  { value: "HIGH", label: "High", color: "#f59e0b", bg: "#fffbeb" },
  { value: "URGENT", label: "Urgent", color: "#ef4444", bg: "#fef2f2" },
];

const PRIORITY_ICON_MAP = {
  LOW: "▽",
  NORMAL: "◇",
  HIGH: "▲",
  URGENT: "⬆",
};

/* ─────────────────────────────────────────────
   PRIORITY DROPDOWN
───────────────────────────────────────────── */
function PriorityDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected =
    PRIORITY_OPTIONS.find((p) => p.value === value) || PRIORITY_OPTIONS[1];

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className={styles.priorityWrap} ref={ref}>
      <button
        type="button"
        className={styles.priorityTrigger}
        onClick={() => setOpen((v) => !v)}
        style={{
          "--p-color": selected.color,
          "--p-bg": selected.bg,
        }}
      >
        <span className={styles.priorityDot} />
        <span className={styles.priorityLabel}>{selected.label} Priority</span>
        <ChevronDown
          size={13}
          className={`${styles.priorityChevron} ${open ? styles.priorityChevronOpen : ""}`}
        />
      </button>

      {open && (
        <div className={styles.priorityMenu}>
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.priorityItem} ${value === opt.value ? styles.priorityItemActive : ""}`}
              style={{ "--p-color": opt.color, "--p-bg": opt.bg }}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <span className={styles.priorityDot} />
              <span>{opt.label} </span>
              {value === opt.value && (
                <span className={styles.priorityCheck}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   LINKED ENTITY PILL (Contact / Reference)
───────────────────────────────────────────── */
function LinkedPill({ label, name, meta, onClear, color = "#3b82f6" }) {
  return (
    <div className={styles.linkedPill} style={{ "--pill-color": color }}>
      <div className={styles.linkedPillInfo}>
        <span className={styles.linkedPillName}>{name}</span>
        {meta && <span className={styles.linkedPillMeta}>{meta}</span>}
      </div>
      <button
        type="button"
        className={styles.linkedPillClear}
        onClick={onClear}
        title={`Remove ${label}`}
      >
        <X size={12} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FIELD WRAPPER
───────────────────────────────────────────── */
function Field({ label, required, error, hint, icon: Icon, children }) {
  return (
    <div className={`${styles.field} ${error ? styles.fieldHasError : ""}`}>
      <label className={styles.fieldLabel}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      {children}

      {error && (
        <span className={styles.fieldError}>
          <AlertCircle size={15} /> {error}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   COMPANY DROPDOWN
───────────────────────────────────────────── */
function CompanyDropdown({ value, onChange, companies, loading }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);
  const selected = companies.find((c) => c.id === value);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={styles.companyDropWrap} ref={ref}>
      <button
        type="button"
        className={`${styles.companyTrigger} ${!selected ? styles.companyTriggerPlaceholder : ""}`}
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
      >
        <span className={styles.companyTriggerText}>
          {loading
            ? "Loading companies…"
            : selected
              ? selected.name
              : "Select company…"}
        </span>
        {loading ? (
          <Loader2 size={13} className={styles.companySpinner} />
        ) : (
          <ChevronDown
            size={13}
            className={`${styles.companyChevron} ${open ? styles.companyChevronOpen : ""}`}
          />
        )}
      </button>

      {open && !loading && (
        <div className={styles.companyMenu}>
          <div className={styles.companyList}>
            {filtered.length === 0 ? (
              <div className={styles.companyEmpty}>No companies found</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.companyItem} ${value === c.id ? styles.companyItemActive : ""}`}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span>{c.name}</span>
                  {c.is_default && (
                    <span className={styles.companyDefault}>Default</span>
                  )}
                  {value === c.id && (
                    <span className={styles.companyCheck}>✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN DRAWER
───────────────────────────────────────────── */
export default function CreateLeadDrawer({
  open,
  onClose,
  pipeline,
  onSuccess,
}) {
  const dispatch = useDispatch();
  const submitting = useSelector(selectCreateLeadLoading);
  const companies = useSelector(selectListProfiles);
  const companiesLoading = useSelector((s) => selectProfileLoading(s, "list"));

  /* ── Form state ── */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [companyProfileId, setCompanyProfileId] = useState("");
  const [closeDays, setCloseDays] = useState("");

  /* ── Linked entities ── */
  const [linkedContact, setLinkedContact] = useState(null); // { id, contact_person, entity_type, primary_email }
  const [linkedReference, setLinkedReference] = useState(null); // { type, id?, name, email?, phone? }
  const [selectedTags, setSelectedTags] = useState([]);

  /* ── Dialog visibility ── */
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [showContactLink, setShowContactLink] = useState(false);
  const [showReferenceLink, setShowReferenceLink] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [showNewInfluencer, setShowNewInfluencer] = useState(false);

  const lcResults = useSelector(selectQuickSearchResults);
  const lcSearching = useSelector(selectQuickSearchLoading);
  const infResults = useSelector(selectInfluencerSearchList);
  const infSearching = useSelector(selectInfluencerSearchLoading);
  const searchTimerRef = useRef(null);

  /* ── Validation ── */
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);

  /* ── Load companies on open ── */
  useEffect(() => {
    if (!open) {
      dispatch(clearQuickSearch());
      return;
    }
    // Reset form
    setTitle("");
    setDescription("");
    setPriority("NORMAL");
    setCompanyProfileId("");
    setCloseDays("");
    setLinkedContact(null);
    setLinkedReference(null);
    setSelectedTags([]);
    setErrors({});
    setGlobalError(null);

    if (companies.length === 0) {
      dispatch(fetchCompanyProfiles({ page_size: 50 }));
    }
  }, [open]);

  /* ── Search handler for LinkSelectionDialog ── */
  const handleSearchChange = useCallback(
    (query, tabId) => {
      clearTimeout(searchTimerRef.current);
      if (!query.trim()) return;

      searchTimerRef.current = setTimeout(() => {
        if (tabId === "lead_contact") {
          dispatch(quickSearchLeadContacts({ search: query, limit: 10 }));
        } else if (tabId === "influencer") {
          dispatch(searchInfluencers({ search: query, page_size: 10 }));
        }
      }, 300);
    },
    [dispatch],
  );

  const handleTabChange = useCallback(() => {
    clearTimeout(searchTimerRef.current);
    dispatch(clearQuickSearch());
  }, [dispatch]);

  /* ── Contact link confirmed ── */
  const handleContactConfirm = (payload) => {
    if (payload.type === "__cleared") {
      setLinkedContact(null);
    } else if (payload.type === "lead_contact") {
      setLinkedContact({
        id: payload.id,
        contact_person: payload.contact_person,
        entity_type: payload.entity_type,
        primary_email: payload.email,
      });
      if (errors.lead_contact_id)
        setErrors((e) => {
          const n = { ...e };
          delete n.lead_contact_id;
          return n;
        });
    }
    setShowContactLink(false);
  };

  /* ── Reference link confirmed ── */
  const handleReferenceConfirm = (payload) => {
    if (payload.type === "__cleared") {
      setLinkedReference(null);
    } else if (payload.type === "lead_contact") {
      setLinkedReference({
        type: "LEAD_CONTACT",
        lead_contact_id: payload.id,
        _display: { name: payload.contact_person, meta: payload.email },
      });
    } else if (payload.type === "influencer") {
      setLinkedReference({
        type: "INFLUENCER",
        influencer_id: payload.id,
        _display: { name: payload.name, meta: payload.email },
      });
    } else if (payload.type === "external") {
      setLinkedReference({
        type: "EXTERNAL_PERSON",
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        _display: {
          name: payload.name,
          meta: [payload.email, payload.phone].filter(Boolean).join(" · "),
        },
      });
    }
    setShowReferenceLink(false);
  };

  /* ── AddNew from LinkSelectionDialog ── */
  const handleAddNew = (tabId) => {
    if (tabId === "lead_contact") {
      setShowContactLink(false);
      setShowNewContact(true);
    } else if (tabId === "influencer") {
      setShowReferenceLink(false);
      setShowNewInfluencer(true);
    }
  };

  /* ── New contact created → re-open link dialog ── */
  const handleNewContactSuccess = () => {
    setShowNewContact(false);
    setShowContactLink(true);
  };

  /* ── New influencer created → re-open reference dialog ── */
  const handleNewInfluencerClose = (result) => {
    setShowNewInfluencer(false);
    if (result) setShowReferenceLink(true);
  };

  /* ── Validate ── */
  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = "Title is required";
    if (!companyProfileId) errs.company_profile_id = "Company is required";
    if (!linkedContact) errs.lead_contact_id = "Lead contact is required";
    if (
      closeDays &&
      (isNaN(Number(closeDays)) ||
        Number(closeDays) < 1 ||
        Number(closeDays) > 10)
    ) {
      errs.close_days = "Enter a number between 1 and 10";
    }
    return errs;
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setGlobalError(null);

    const payload = {
      title: title.trim(),
      pipeline_id: pipeline.id,
      company_profile_id: companyProfileId,
      lead_contact_id: linkedContact.id,
      priority,
    };

    if (description.trim()) payload.description = description.trim();

    if (closeDays) {
      const d = new Date();
      d.setDate(d.getDate() + Number(closeDays));
      d.setHours(23, 59, 59, 999);
      payload.expected_close_date = d.toISOString();
    }

    if (selectedTags.length) payload.tags = selectedTags.map((t) => t.id);

    if (linkedReference) {
      const { _display, ...ref } = linkedReference;
      payload.reference = ref;
    }

    try {
      const res = await dispatch(createLead(payload));
      if (res.error) {
        setGlobalError(
          typeof res.payload === "string"
            ? res.payload
            : "Failed to create lead",
        );
        return;
      }
      onSuccess?.(res.payload);
      onClose();
    } catch (e) {
      setGlobalError("Something went wrong");
    }
  };

  if (!open) return null;

  const selectedPriority = PRIORITY_OPTIONS.find((p) => p.value === priority);

  /* Build selectedData shapes for LinkSelectionDialog */
  const contactSelectedData = linkedContact
    ? {
        __type: "lead_contact",
        id: linkedContact.id,
        contact_person: linkedContact.contact_person,
        email: linkedContact.primary_email,
        entity_type: linkedContact.entity_type,
      }
    : null;

  const refDisplay = linkedReference?._display;
  const referenceSelectedData = linkedReference
    ? {
        __type:
          linkedReference.type === "LEAD_CONTACT"
            ? "lead_contact"
            : linkedReference.type === "INFLUENCER"
              ? "influencer"
              : "external",
        id: linkedReference.lead_contact_id || linkedReference.influencer_id,
        name: refDisplay?.name,
        contact_person: refDisplay?.name,
        email: refDisplay?.meta?.split(" · ")[0] || "",
      }
    : null;

  return (
    <>
      <div
        className={styles.overlay}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className={styles.drawer}>
          {/* ── Header ── */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.headerIconWrap}>
                <GitBranch size={18} />
              </span>
              <div>
                <p className={styles.headerTitle}>New Lead</p>
                <p className={styles.headerSub}>
                  Pipeline: <strong>{pipeline?.name}</strong>
                </p>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={onClose} type="button">
              <X size={16} />
            </button>
          </div>

          {/* ── Body ── */}
          <div className={styles.body}>
            {globalError && (
              <div className={styles.globalError}>
                <AlertCircle size={14} /> {globalError}
              </div>
            )}

            {/* Pipeline badge */}
            <div className={styles.pipelineBadge}>
              <GitBranch size={20} />
              <span>{pipeline?.name}</span>
              <span className={styles.pipelineBadgeNote}>
                Lead will be added to the first stage
              </span>
            </div>

            {/* Title */}
            <Field
              label="Lead Title"
              required
              icon={FileText}
              error={errors.title}
            >
              <input
                className={`${styles.input} ${errors.title ? styles.inputError : ""}`}
                placeholder="e.g., Website Redesign Project"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title)
                    setErrors((e) => {
                      const n = { ...e };
                      delete n.title;
                      return n;
                    });
                }}
                maxLength={200}
                autoFocus
              />
            </Field>

            {/* Description */}
            <Field label="Description" icon={FileText}>
              <textarea
                className={styles.textarea}
                placeholder="Brief notes about this lead…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={800}
                rows={4}
              />
            </Field>

            {/* Row: Priority + Close Days */}
            <div className={styles.row2}>
              <Field label="Priority" icon={Flag}>
                <PriorityDropdown value={priority} onChange={setPriority} />
              </Field>
              <Field
                label="Expected Close"
                icon={Calendar}
                error={errors.close_days}
              >
                <input
                  className={`${styles.input} ${errors.close_days ? styles.inputError : ""}`}
                  type="number"
                  min={1}
                  max={10}
                  placeholder="1 – 10 Days"
                  value={closeDays}
                  onChange={(e) => {
                    setCloseDays(e.target.value);
                    if (errors.close_days)
                      setErrors((e) => {
                        const n = { ...e };
                        delete n.close_days;
                        return n;
                      });
                  }}
                />
              </Field>
            </div>

            {/* Company */}
            <Field label="Company" required error={errors.company_profile_id}>
              <CompanyDropdown
                value={companyProfileId}
                onChange={(id) => {
                  setCompanyProfileId(id);
                  if (errors.company_profile_id)
                    setErrors((e) => {
                      const n = { ...e };
                      delete n.company_profile_id;
                      return n;
                    });
                }}
                companies={companies}
                loading={companiesLoading}
              />
            </Field>

            {/* Divider */}
            <div className={styles.divider}>
              <span>People & Associations</span>
            </div>

            {/* Lead Contact */}
            <Field
              label="Lead Contact"
              required
              icon={User}
              error={errors.lead_contact_id}
              hint={
                linkedContact
                  ? undefined
                  : "Search and link an existing contact"
              }
            >
              {linkedContact ? (
                <LinkedPill
                  label="contact"
                  name={linkedContact.contact_person}
                  meta={[
                    linkedContact.entity_type?.replaceAll("_", " "),
                    linkedContact.primary_email,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  onClear={() => setLinkedContact(null)}
                  color="#3b82f6"
                />
              ) : (
                <button
                  type="button"
                  className={`${styles.linkBtn} ${errors.lead_contact_id ? styles.linkBtnError : ""}`}
                  onClick={() => setShowContactLink(true)}
                >
                  <User size={20} />
                  <span>Search & Link Contact</span>
                  <ChevronDown size={20} />
                </button>
              )}
              {linkedContact && (
                <button
                  type="button"
                  className={styles.changeLinkBtn}
                  onClick={() => setShowContactLink(true)}
                >
                  Change
                </button>
              )}
            </Field>

            {/* Reference */}
            <Field
              label="Reference"
              icon={Link2}
              hint="Optional — who referred this lead?"
            >
              {linkedReference ? (
                <>
                  <LinkedPill
                    label="reference"
                    name={linkedReference._display?.name}
                    meta={linkedReference._display?.meta}
                    onClear={() => setLinkedReference(null)}
                    color="#8b5cf6"
                  />
                  <button
                    type="button"
                    className={styles.changeLinkBtn}
                    onClick={() => setShowReferenceLink(true)}
                  >
                    Change
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => setShowReferenceLink(true)}
                >
                  <Link2 size={20} />
                  <span>Link Reference</span>
                  <ChevronDown size={20} />
                </button>
              )}
            </Field>

            {/* Divider */}
            <div className={styles.divider}>
              <span>Tags</span>
            </div>

            {/* Tags */}
            <Field
              label="Tags"
              icon={Tag}
              hint={`Up to 5 tags. ${selectedTags.length}/5 selected.`}
            >
              <div className={styles.tagsArea}>
                {selectedTags.length > 0 && (
                  <div className={styles.tagsList}>
                    {selectedTags.map((tag) => (
                      <span
                        key={tag.id}
                        className={styles.tagChip}
                        style={{
                          "--tag-color": tag.color_code,
                          "--tag-bg": `${tag.color_code}1A`,
                        }}
                      >
                        <span className={styles.tagChipDot} />
                        {tag.name}
                        <button
                          type="button"
                          className={styles.tagChipRemove}
                          onClick={() =>
                            setSelectedTags((prev) =>
                              prev.filter((t) => t.id !== tag.id),
                            )
                          }
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => setShowTagsDialog(true)}
                >
                  <Tag size={20} />
                  <span>
                    {selectedTags.length > 0 ? "Edit Tags" : "Add Tags"}
                  </span>
                  <ChevronDown size={20} />
                </button>
              </div>
            </Field>
          </div>

          {/* ── Footer ── */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={20} className={styles.spinner} />
                  Creating…
                </>
              ) : (
                <>
                  <GitBranch size={20} />
                  Create Lead
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tags Dialog ── */}
      <LeadTagsDialog
        open={showTagsDialog}
        onClose={() => setShowTagsDialog(false)}
        selectedTags={selectedTags}
        onSelectionChange={setSelectedTags}
      />

      {/* ── Link Contact Dialog ── */}
      <LinkSelectionDialog
        isOpen={showContactLink}
        mode="client"
        selectedData={contactSelectedData}
        leadContactResults={lcResults}
        leadContactSearching={lcSearching}
        influencerResults={[]}
        influencerSearching={false}
        onClose={() => setShowContactLink(false)}
        onSearchChange={handleSearchChange}
        onTabChange={handleTabChange}
        onConfirm={handleContactConfirm}
        onAddNew={handleAddNew}
      />

      {/* ── Link Reference Dialog ── */}
      <LinkSelectionDialog
        isOpen={showReferenceLink}
        mode="reference"
        selectedData={referenceSelectedData}
        leadContactResults={lcResults}
        leadContactSearching={lcSearching}
        influencerResults={infResults}
        influencerSearching={infSearching}
        onClose={() => setShowReferenceLink(false)}
        onSearchChange={handleSearchChange}
        onTabChange={handleTabChange}
        onConfirm={handleReferenceConfirm}
        onAddNew={handleAddNew}
      />

      {/* ── New Lead Contact Dialog ── */}
      <LeadContactDialog
        isOpen={showNewContact}
        mode="create"
        contactId={null}
        detailCacheRef={null}
        onClose={() => setShowNewContact(false)}
        onSuccess={handleNewContactSuccess}
      />

      {/* ── New Influencer Dialog ── */}
      <InfluencerDialog
        open={showNewInfluencer}
        onClose={handleNewInfluencerClose}
        influencerId={null}
      />
    </>
  );
}
