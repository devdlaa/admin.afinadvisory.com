"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronUp, ChevronDown, Save, Mail } from "lucide-react";
import styles from "./LeadDetailsDrawer.module.scss";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchLeadDetails,
  selectLeadDetails,
  selectLeadLoading,
  updateLead,
  updateLeadAssignments,
  selectTeamEffort,
  fetchAiSummary,
  fetchTeamEffort,
  updateLeadStage,
  createLeadActivity,
  fetchLeadActivities,
  selectLeadAcitiesPagination,
  selectLeadActivitiesHistory,
  fetchActivityEmail,
  clearLeadDetails,
  resetActivityDetails,
  resetLeadActivitiesHistory,
  updateActivityEmail,
  updateLeadActivity,
  updateActivityLifecycle,
} from "@/store/slices/leadDetails.slice";

import {
  quickSearchLeadContacts,
  selectQuickSearchResults,
  selectQuickSearchLoading,
} from "@/store/slices/leadContactSlice";

import {
  searchInfluencers,
  selectInfluencerSearchList,
  selectInfluencerSearchLoading,
} from "@/store/slices/influncersSlice";
import ActivityTab from "../ActivityTab/ActivityTab";
import CreateActivityDialog from "../CreateActivityDialog/CreateActivityDialog";
import EmailComposer from "../EmailComposer/EmailComposer";
import ViewActivityDialog from "../ViewActivityDialog/ViewActivityDialog";
import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";

import LeadContactDialog from "../../leads-contact/components/LeadContactDialog/LeadContactDialog";
import LeadDetailsSkeleton from "./components/LeadDetailsSkeleton";
import LeadPrimaryInfo from "./components/LeadPrimaryInfo";
import LeadTagsAndTeam from "./components/LeadTagsAndTeam";
import AssignmentDialog from "@/app/components/pages/AssignmentDialog/AssignmentDialog";

import LeadTagsDialog from "../LeadTagsDialog/LeadTagsDialog";
import LinkSelectionDialog from "../LinkSelectionDialog/LinkSelectionDialog";
import LeadReferenceSection from "./components/LeadReferenceSection";
import LeadContactSection from "./components/LeadContactSection";
import { REMINDER_TAG_COLORS } from "@/services/reminders/reminder.constants";
import LeadSourceSection from "./components/LeadSourceSection";
import { CircularProgress } from "@mui/material";
import LeadDrawerTabs from "../LeadDrawerTabs/LeadDrawerTabs";
import DocumentManager from "@/app/components/shared/DocumentManager/DocumentManager";
import LeadNotesTimeline from "../LeadNotesTimeline/LeadNotesTimeline";
import LeadStageTimeline from "../LeadStageTimeline/LeadStageTimeline";
import LeadLogsTimeline from "../LeadLogsTimeline/LeadLogsTimeline";
import LeadPrimaryMeta from "../LeadPrimaryMeta/LeadPrimaryMeta";

/* ── Main Drawer ── */
export default function LeadDetailsDrawer({
  isOpen,
  onClose,
  LEADID,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  navigationState,
}) {
  const drawerRef = useRef(null);
  const dispatch = useDispatch();

  const [draft, setDraft] = useState(null);
  const [original, setOriginal] = useState(null);
  const [activeTab, setActiveTab] = useState("activity");
  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isReferenceDialogOpen, setIsReferenceDialogOpen] = useState(false);
  const [lostStageConfirm, setLostStageConfirm] = useState(null);

  const [contactDialogMode, setContactDialogMode] = useState(null);
  const [activeContactId, setActiveContactId] = useState(null);
  const [isCreateActivityOpen, setIsCreateActivityOpen] = useState(false);
  const contactResults = useSelector(selectQuickSearchResults);
  const contactSearching = useSelector(selectQuickSearchLoading);
  const influencerResults = useSelector(selectInfluencerSearchList);
  const influencerSearching = useSelector(selectInfluencerSearchLoading);
  const leadAcitiesPagination = useSelector(selectLeadAcitiesPagination);
  const leadActivitiesHistory = useSelector(selectLeadActivitiesHistory);
  const emailData = useSelector(
    (state) => state.leadDetails.activityDetails.email,
  );

  const [emailState, setEmailState] = useState(null);
  const [viewActivityState, setViewActivityState] = useState(null);
  const lead = useSelector(selectLeadDetails);
  const teamEffort = useSelector(selectTeamEffort);
  const loading = useSelector(selectLeadLoading);

  useEffect(() => {
    if (!LEADID || !isOpen) return;
    dispatch(fetchLeadDetails(LEADID));
  }, [LEADID, isOpen, dispatch]);

  useEffect(() => {
    if (!lead) return;

    const mapped = {
      title: lead.title || "",
      description: lead.description || "",
      priority: lead.priority || "NORMAL",
    };

    setDraft(mapped);
    setOriginal(mapped);
  }, [lead]);

  const updateDraft = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  /* ── Dirty check — title, description, priority ── */
  const isPrimaryDirty = () => {
    if (!draft || !original) return false;
    return (
      draft.title !== original.title ||
      draft.description !== original.description ||
      draft.priority !== original.priority
    );
  };

  /* ── Save title / description / priority ── */
  const handlePrimaryUpdate = async () => {
    const payload = {};

    if (draft.title !== original.title) payload.title = draft.title;
    if (draft.description !== original.description)
      payload.description = draft.description;
    if (draft.priority !== original.priority) payload.priority = draft.priority;

    if (!Object.keys(payload).length) return;

    try {
      await dispatch(updateLead({ leadId: LEADID, payload })).unwrap();
      setOriginal((prev) => ({ ...prev, ...payload }));
    } catch (err) {
      console.error(err);
    }
  };

  /* ── Reference ── */
  const handleReferenceConfirm = async (payload) => {
    try {
      let reference = null;

      if (payload.type === "__cleared") {
        reference = null;
      } else if (payload.type === "lead_contact") {
        reference = { type: "LEAD_CONTACT", lead_contact_id: payload.id };
      } else if (payload.type === "influencer") {
        reference = { type: "INFLUENCER", influencer_id: payload.id };
      } else if (payload.type === "entity") {
        reference = { type: "ENTITY", entity_id: payload.id };
      } else if (payload.type === "external") {
        reference = {
          type: "EXTERNAL_PERSON",
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
        };
      } else {
        return;
      }

      await dispatch(
        updateLead({ leadId: LEADID, payload: { reference } }),
      ).unwrap();
      setIsReferenceDialogOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  /* ── Contact ── */
  const handleContactConfirm = async (payload) => {
    try {
      let contactId = null;

      if (payload.type === "__cleared") {
        contactId = null;
      } else if (payload.type === "lead_contact") {
        contactId = payload.id;
      } else {
        return;
      }

      await dispatch(
        updateLead({ leadId: LEADID, payload: { lead_contact_id: contactId } }),
      ).unwrap();

      setIsContactDialogOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  /* ── Search (contacts + influencers) ── */
  const handleSearch = (query, tabId) => {
    if (!query.trim()) return;

    if (tabId === "lead_contact") {
      dispatch(quickSearchLeadContacts({ search: query, limit: 20 }));
    }
    if (tabId === "influencer") {
      dispatch(searchInfluencers({ search: query, page_size: 20 }));
    }
  };

  /* ── Tags ── */
  const handleTagsConfirm = async (tags) => {
    try {
      await dispatch(
        updateLead({
          leadId: LEADID,
          payload: { tags: tags.map((t) => t.id) },
        }),
      ).unwrap();
      setIsTagsDialogOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  /* ── Assignments ── */
  const handleSaveAssignments = async (data) => {
    if (data.user_ids?.length > 0) {
      await dispatch(
        updateLeadAssignments({
          leadId: LEADID,
          users: data.user_ids.map((id) => ({ admin_user_id: id })),
        }),
      ).unwrap();
    }
    setIsAssignmentDialogOpen(false);
  };

  /* ── Contact dialog helpers ── */
  const handleEditContact = () => {
    if (!lead?.contact?.id) return;
    setActiveContactId(lead.contact.id);
    setContactDialogMode("update");
  };

  const handleAddNewContact = () => {
    setActiveContactId(null);
    setContactDialogMode("create");
  };

  /* ── Close drawer ── */
  const handleOnCloseDrawer = () => {
    setDraft(null);
    setOriginal(null);
    setIsTagsDialogOpen(false);
    setIsAssignmentDialogOpen(false);
    setIsContactDialogOpen(false);
    setIsReferenceDialogOpen(false);
    setContactDialogMode(null);
    setActiveContactId(null);
    dispatch(clearLeadDetails());
    dispatch(resetActivityDetails());
    dispatch(resetLeadActivitiesHistory());
    onClose();
  };

  /* ── Derived data for dialogs ── */
  const selectedContactData = lead?.contact
    ? {
        __type: "lead_contact",
        id: lead.contact.id,
        contact_person: lead.contact.contact_person || lead.contact.name,
        email: lead.contact.primary_email || lead.contact.email,
        primary_phone: lead.contact.primary_phone,
        entity_type: lead.contact.entity_type,
      }
    : null;

  const selectedReferenceData = (() => {
    const ref = lead?.reference;
    if (!ref) return null;

    if (ref.type === "LEAD_CONTACT") {
      return {
        __type: "lead_contact",
        id: ref.lead_contact_id,
        contact_person: ref.contact_person,
        email: ref.email,
        primary_phone: ref.phone,
      };
    }
    if (ref.type === "INFLUENCER") {
      return {
        __type: "influencer",
        id: ref.influencer_id,
        name: ref.name,
        email: ref.email,
        phone: ref.phone,
      };
    }
    if (ref.type === "EXTERNAL_PERSON") {
      return {
        __type: "external",
        name: ref.name,
        email: ref.email,
        phone: ref.phone,
      };
    }
    return null;
  })();

  const handleUpdateStage = async (stage, input_value = null) => {
    if (stage?.is_closed && !stage?.is_won && !input_value) {
      setLostStageConfirm(stage);
      return;
    }
    try {
      await dispatch(
        updateLeadStage({
          leadId: LEADID,
          stage_id: stage.stage_id,
          lost_reason: input_value,
        }),
      ).unwrap();
      setLostStageConfirm(null);
    } catch (err) {
      console.error(err);
      setLostStageConfirm(null);
    }
  };

  const handleRefreshAiSummary = async () => {
    try {
      await dispatch(fetchAiSummary(LEADID)).unwrap();
    } catch (err) {
      console.error(err);
    }
  };
  const handleRefreshTeamEffort = async () => {
    try {
      await dispatch(fetchTeamEffort(LEADID)).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateActivity = async (payload) => {
    if (!lead?.id) {
      setIsCreateActivityOpen(false);
      return;
    }

    try {
      const formattedPayload = {
        ...payload,
        ...(payload.email
          ? {
              email: {
                ...payload.email,
                attachments: payload.email.attachments?.map((a) => ({
                  document_id: a.id,
                })),
              },
            }
          : {}),
      };

      await dispatch(
        createLeadActivity({
          leadId: lead.id,
          payload: formattedPayload,
        }),
      ).unwrap();

      setIsCreateActivityOpen(false);
    } catch (err) {
      console.error("Create activity failed:", err);
    }
  };

  const handleFetchActivityHistory = () => {
    if (loading.activities || !lead?.id) return;

    const { pagination } = leadActivitiesHistory;

    const hasMore = pagination
      ? pagination.page < pagination.total_pages
      : true;

    if (!hasMore) return;

    dispatch(fetchLeadActivities({ leadId: lead?.id }));
  };

  const handleShowEmail = (activity) => {
    setEmailState({ activityId: activity.id, mode: "SHOW" });
  };

  const handleUpdateEmailClick = (activity) => {
    setEmailState({ activityId: activity.id, mode: "UPDATE" });
  };

  const handelActivityClick = (id, activity, original_activity_format) => {
    setViewActivityState({
      hydrated: activity,
      original:
        original_activity_format ?? activity?.original_activity ?? activity,
    });
  };

  const normalizedTags =
    lead?.tags?.map((t) => ({
      ...t,
      color_code: REMINDER_TAG_COLORS[t.color] || "#6B7280",
    })) || [];

  const buildViewActivityProps = (hydrated, original) => {
    if (!hydrated || !original) return null;

    const isActive = original.status === "ACTIVE";
    const isOverdue = original.is_overdue;
    const isDone = ["COMPLETED", "MISSED", "CANCELLED"].includes(
      original.status,
    );
    const canAct = isActive || isOverdue;

    // ── nature & schedule ──────────────────────────────────────────────
    const isScheduled = !!original.scheduled_at;

    // ── editable fields ────────────────────────────────────────────────
    const editableFields = canAct
      ? { title: true, description: true, scheduled_at: isScheduled }
      : {};

    // ── initial data for the dialog form ──────────────────────────────
    const initialData = {
      activity_type: original.type,
      title: original.title ?? "",
      description: original.description ?? "",
      nature: isScheduled ? "SCHEDULED" : "LOG",
      status: original.status,
      completion_note: original.completion_note ?? "",
      missed_reason: original.missed_reason ?? "",
      scheduled_at: original.scheduled_at ?? null,
    };

    // ── completion note (read-only bottom field) ───────────────────────
    const completionNote =
      original.completion_note || original.missed_reason || null;

    // ── timestamps for right panel ─────────────────────────────────────
    const fmt = (iso) =>
      iso
        ? new Date(iso).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "—";

    const timestamps = [
      { label: "Created at", value: fmt(original.created_at) },
      { label: "Created by", value: original.created_by?.name ?? "—" },
      { label: "Updated at", value: fmt(original.updated_at) },
      { label: "Updated by", value: original.updated_by?.name ?? "—" },
      ...(original.completed_at
        ? [{ label: "Completed at", value: fmt(original.completed_at) }]
        : []),
      ...(original.closed_by
        ? [{ label: "Closed by", value: original.closed_by?.name }]
        : []),
    ];

    // ── tags for header pills ──────────────────────────────────────────
    // Use the already-hydrated tags array from the hydrated payload
    const tags = (hydrated.tags ?? []).map((t) => t.tags_name);

    // ── banner ─────────────────────────────────────────────────────────
    let banner = null;

    if (isScheduled && original.type === "EMAIL" && original.email?.linked) {
      const emailSent = original.email.sent;

      const isClosed = isDone;

      const bannerActions = [];

      if (isClosed || emailSent) {
        bannerActions.push({
          label: "Show Email",
          bgColor: "#F0FDF4",
          textColor: "#16A34A",
          icon: <Mail size={14} />,
          handler: () => handleShowEmail(original),
        });
      } else {
        bannerActions.push({
          label: "Update Email",
          bgColor: "#EFF6FF",
          textColor: "#2563EB",
          icon: <Mail size={14} />,
          handler: () => handleUpdateEmailClick(original),
        });
      }

      banner = {
        type: "email",
        title: emailSent
          ? "This email has already been sent."
          : "An auto email is linked to this activity.",
        description: emailSent
          ? "The email was delivered to the recipient."
          : canAct
            ? "You can still update the email content before it sends."
            : "The email was not sent.",
        actions: bannerActions,
      };
    }

    // ── lead details for right panel ───────────────────────────────────
    const leadDetails = lead
      ? {
          title: lead.title,
          description: lead.description,
          chips: [],
        }
      : null;

    const isAutoEmailOnly =
      original.type === "EMAIL" &&
      isScheduled &&
      original.email?.linked &&
      !original.email?.sent;

    const canUpdateStatus = canAct;

    return {
      initialData,
      editableFields,
      completionNote,
      timestamps,
      tags,
      banner,
      leadDetails,
      leadStatus: original.is_overdue
        ? "overdue"
        : original.status?.toLowerCase(),
      canUpdateStatus,
    };
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOnCloseDrawer}>
      <div
        className={styles.drawer}
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Control Pill */}
        <div className={styles.controlPill}>
          <button className={styles.pillBtn} onClick={onClose} title="Close">
            <X size={20} strokeWidth={2.2} />
          </button>
          <div className={styles.pillDivider} />
          <button
            className={styles.pillBtn}
            onClick={onPrev}
            disabled={!hasPrev}
            title="Previous"
          >
            <ChevronUp size={20} strokeWidth={2.2} />
          </button>
          <button
            className={styles.pillBtn}
            onClick={onNext}
            disabled={!hasNext || navigationState === "next"}
            title="Next"
          >
            {" "}
            {navigationState === "next" ? (
              <CircularProgress size={18} color="grey" />
            ) : (
              <ChevronDown size={20} strokeWidth={2.2} />
            )}
          </button>
        </div>
        {loading?.fetch ? (
          <LeadDetailsSkeleton />
        ) : (
          <div className={styles.body}>
            {/* ── Left Panel ── */}
            <div className={styles.leftPanel}>
              {draft && (
                <LeadPrimaryInfo
                  title={draft.title}
                  description={draft.description}
                  priority={draft.priority}
                  activeStage={lead?.timeline?.summary?.current_stage}
                  createdAt={lead?.created_at}
                  leadConversonStatus={
                    lead?.is_won === false && lead?.is_lost === false
                      ? "OPEN"
                      : lead?.is_won === true && lead?.is_lost === false
                        ? "WON"
                        : lead?.is_won === false && lead?.is_lost === true
                          ? "LOST"
                          : null
                  }
                  closedAt={
                    lead?.is_won || lead?.is_lost
                      ? lead?.timeline?.summary?.current_stage_metrics
                          ?.last_entered_at
                      : null
                  }
                  createdBy={lead?.created_by || "-"}
                  expectedCloseDate={lead?.expected_close_date}
                  isWon={lead?.is_won}
                  isLost={lead?.is_lost}
                  onTitleChange={(val) => updateDraft("title", val)}
                  onDescriptionChange={(val) => updateDraft("description", val)}
                  onPriorityChange={(val) => updateDraft("priority", val)}
                />
              )}

              <LeadTagsAndTeam
                tags={normalizedTags}
                assignedUsers={lead?.assignments || []}
                onManageTags={() => setIsTagsDialogOpen(true)}
                onOpenAssignmentDialog={() => setIsAssignmentDialogOpen(true)}
              />

              <LeadContactSection
                contact={lead?.contact}
                onEditContact={handleEditContact}
                onChangeContact={() => setIsContactDialogOpen(true)}
              />

              <LeadReferenceSection
                reference={lead?.reference}
                onUpdateReference={() => setIsReferenceDialogOpen(true)}
              />

              <LeadSourceSection items={lead?.source} />

              {isPrimaryDirty() && (
                <div className={styles.floatingUpdateBar}>
                  <button
                    className={styles.updateBtn}
                    onClick={handlePrimaryUpdate}
                    disabled={loading?.update}
                  >
                    {loading?.update ? (
                      <CircularProgress
                        color="grey"
                        size={20}
                        className={styles.spinner}
                      />
                    ) : (
                      <Save size={20} />
                    )}
                    {loading?.update ? "Updating..." : "Update Lead Details"}
                  </button>
                </div>
              )}
            </div>

            <div className={styles.divider} />

            {/* ── Right Panel ── */}
            <div className={styles.rightPanel}>
              <LeadPrimaryMeta
                lost_by={lead?.lost_by}
                timeline={lead?.timeline}
                onUpdateStage={handleUpdateStage}
                aiSummary={{
                  ai_summary: lead?.ai_summary,
                  ai_summary_generated_at: lead?.ai_summary_generated_at,
                }}
                isLoadingAiSummary={loading.ai}
                onRefreshAiSummary={handleRefreshAiSummary}
                teamEffort={teamEffort}
                isLoadingTeamEffort={loading.team}
                onRefreshTeamEffort={handleRefreshTeamEffort}
              />

              <LeadDrawerTabs
                currentTab={activeTab}
                onTabChange={setActiveTab}
              />
              <section className={styles.tab_rendrer}>
                {activeTab === "activity" && (
                  <ActivityTab
                    pinned_comments={lead?.pinned_comments?.items}
                    focusActivities={lead?.focus_now}
                    historyActivities={leadActivitiesHistory}
                    onActivityClick={handelActivityClick}
                    activityHandlers={{
                      onUpdateEmail: handleUpdateEmailClick,
                      onShowEmail: handleShowEmail,
                    }}
                    leadAcitiesPagination={leadAcitiesPagination}
                    isLoadingHistory={loading?.activities}
                    OnhandleFetchActivityHistory={handleFetchActivityHistory}
                    onCreateActivity={() => {
                      setIsCreateActivityOpen(true);
                    }}
                  />
                )}
                {activeTab === "timeline" && (
                  <LeadStageTimeline leadId={lead?.id} />
                )}
                {activeTab === "notes" && (
                  <LeadNotesTimeline leadId={lead?.id} lead={lead} />
                )}
                {activeTab === "documents" && (
                  <DocumentManager scope={"LEAD_ACTIVITY"} scopeId={lead?.id} />
                )}
                {activeTab === "logs" && <LeadLogsTimeline leadId={lead?.id} />}
              </section>
            </div>
          </div>
        )}
        {/* ── Dialogs ── */}
        <LeadTagsDialog
          open={isTagsDialogOpen}
          onClose={() => setIsTagsDialogOpen(false)}
          selectedTags={normalizedTags}
          onSelectionChange={handleTagsConfirm}
          updating={loading.update}
        />
        <LinkSelectionDialog
          isOpen={isContactDialogOpen}
          mode="client"
          selectedData={selectedContactData}
          leadContactResults={contactResults}
          leadContactSearching={contactSearching}
          onClose={() => setIsContactDialogOpen(false)}
          onSearchChange={handleSearch}
          onConfirm={handleContactConfirm}
          onAddNew={(tabId) => {
            if (tabId === "lead_contact") {
              setIsContactDialogOpen(false);
              handleAddNewContact();
            }
          }}
          isUpdating={loading.update}
        />

        <ConfirmationDialog
          isOpen={!!lostStageConfirm}
          onClose={() => setLostStageConfirm(null)}
          actionName="Mark lead as Lost"
          actionInfo="This will close the lead as lost. Please provide a reason."
          confirmText="Confirm"
          variant="danger"
          inputField={{
            label: "Reason for losing this lead",
            placeholder: "e.g. Budget constraints, chose competitor...",
          }}
          onConfirm={({ input_value }) =>
            handleUpdateStage(lostStageConfirm, input_value)
          }
          onCancel={() => setLostStageConfirm(null)}
        />
        <LinkSelectionDialog
          isOpen={isReferenceDialogOpen}
          mode="reference"
          selectedData={selectedReferenceData}
          leadContactResults={contactResults}
          leadContactSearching={contactSearching}
          influencerResults={influencerResults}
          influencerSearching={influencerSearching}
          onClose={() => setIsReferenceDialogOpen(false)}
          onSearchChange={handleSearch}
          onConfirm={handleReferenceConfirm}
          isUpdating={loading.update}
        />
        <LeadContactDialog
          isOpen={!!contactDialogMode}
          mode={contactDialogMode}
          contactId={activeContactId}
          onClose={() => {
            setContactDialogMode(null);
            setActiveContactId(null);
          }}
        />
        <EmailComposer
          open={!!emailState}
          onClose={() => {
            setEmailState(null);
            dispatch(resetActivityDetails());
          }}
          mode={emailState?.mode === "UPDATE" ? "update" : "view"}
          leadId={lead?.id}
          fromEmail={"info@afinadvisory.com"}
          toEmails={[
            lead?.contact?.primary_email,
            lead?.contact?.secondary_email,
          ].filter(Boolean)}
          initialData={emailData}
          loadingWhenInitialData={loading?.email || loading?.updateEmail}
          onFetchInitialData={() => {
            if (!emailState?.activityId) return;
            dispatch(
              fetchActivityEmail({
                lead_id: lead?.id,
                activityId: emailState.activityId,
              }),
            );
          }}
          onSubmit={(payload) => {
            if (emailState?.mode === "SHOW") {
              setEmailState(null);
              return;
            }

            dispatch(
              updateActivityEmail({
                lead_id: lead?.id,
                activityId: emailState.activityId,
                payload: {
                  ...payload,
                  attachments: payload.attachments?.map((a) => ({
                    document_id: a.id ?? a.document_id,
                  })),
                },
              }),
            ).then(() => {
              setEmailState(null);
              dispatch(resetActivityDetails());
            });
          }}
        />
        <CreateActivityDialog
          open={isCreateActivityOpen}
          onClose={() => setIsCreateActivityOpen(false)}
          onSubmit={handleCreateActivity}
          leadId={lead?.id}
          isSubmitting={loading.createActivity}
          fromEmail={"info@afinadvisory.com"}
          toEmails={[
            lead?.contact?.primary_email,
            lead?.contact?.secondary_email,
          ].filter(Boolean)}
        />
        <AssignmentDialog
          isOpen={isAssignmentDialogOpen}
          onClose={() => setIsAssignmentDialogOpen(false)}
          isSaving={loading.assignments}
          config={{
            assignedUsers: (lead?.assignments || []).map((a) => ({
              id: a.id,
              name: a?.name,
              email: a?.email,
            })),
            assignedToAll: false,
            creatorId: null,
            onSave: handleSaveAssignments,
            title: "Manage Lead Assignments",
            subtitle: "Assign team members to this lead",
          }}
        />
        {viewActivityState &&
          (() => {
            const props = buildViewActivityProps(
              viewActivityState.hydrated,
              viewActivityState.original,
            );
            if (!props) return null;

            const original = viewActivityState.original;

            return (
              <ViewActivityDialog
                open={!!viewActivityState}
                onClose={() => setViewActivityState(null)}
                initialData={props.initialData}
                editableFields={props.editableFields}
                completionNote={props.completionNote}
                timestamps={props.timestamps}
                tags={props.tags}
                banner={props.banner}
                leadDetails={props.leadDetails}
                leadStatus={props.leadStatus}
                canUpdateStatus={props.canUpdateStatus}
                isUpdatingActivity={loading?.updateActivity}
                onUpdateActivity={(payload) => {
                  dispatch(
                    updateLeadActivity({
                      leadId: lead?.id,
                      activityId: original.id,
                      payload,
                    }),
                  ).then(() => setViewActivityState(null));
                }}
                isSubmittingLifecycle={loading?.updateActivityLifecycle}
                onLifecycleSubmit={({ status, reason, override_activity }) => {
                  let payload = {};

                  if (status === "COMPLETED") {
                    payload = { action: "COMPLETED", completion_note: reason };
                  } else if (status === "MISSED") {
                    payload = {
                      action: "MISSED",
                      missed_reason: reason,
                    };
                  } else if (status === "CANCELLED") {
                    payload = { action: "CANCELLED", missed_reason: reason };
                  }

                  if (override_activity) {
                    payload.override_activity = true;
                  }

                  dispatch(
                    updateActivityLifecycle({
                      leadId: lead?.id,
                      activityId: original.id,
                      payload,
                    }),
                  ).then(() => setViewActivityState(null));
                }}
              />
            );
          })()}
      </div>
    </div>
  );
}
