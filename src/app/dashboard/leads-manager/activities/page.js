"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Mail } from "lucide-react";

import {
  fetchActivities,
  resetActivities,
  prevPage,
  updateActivity,
  updateActivityLifecycle,
  fetchActivityEmail,
  updateActivityEmail,
  resetActivityEmail,
  selectActivities,
  selectActivitiesLoading,
  selectNextCursor,
  selectCurrentPage,
  selectTotalPages,
  selectHasPrevPage,
  selectActivityEmail,
  selectMutationLoading,
} from "@/store/slices/activities.slice";

import { fetchUsers, selectAdminUsers } from "@/store/slices/userSlice";

import ActivitiesHeader from "./components/Activitiesheader";
import ActivitiesTable from "./components/Activitiestable";
import ViewActivityDialog from "../components/ViewActivityDialog/ViewActivityDialog";
import EmailComposer from "../components/EmailComposer/EmailComposer";

import styles from "./activities.module.scss";

/* ============================
   Page
============================ */

export default function ActivitiesPage() {
  const dispatch = useDispatch();

  // ── redux ──
  const activities = useSelector(selectActivities);
  const loading = useSelector(selectActivitiesLoading);
  const nextCursor = useSelector(selectNextCursor);
  const currentPage = useSelector(selectCurrentPage);
  const totalPages = useSelector(selectTotalPages);
  const hasPrevPage = useSelector(selectHasPrevPage);
  const users = useSelector(selectAdminUsers);
  const emailData = useSelector(selectActivityEmail);
  const mutLoading = useSelector(selectMutationLoading);

  // ── filters ──
  const [activeTypes, setActiveTypes] = useState([
    "CALL",
    "EMAIL",
    "WHATSAPP",
    "VIDEO_CALL",
  ]);
  const [dateFilter, setDateFilter] = useState("overdue");
  const [selectedUser, setSelectedUser] = useState("");

  // ── dialog state ──
  // selectedActivity  = the raw activity object from the list
  // emailState        = { activityId, mode: "SHOW" | "UPDATE" }
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [emailState, setEmailState] = useState(null);

  /* ── fetch users once ── */
  useEffect(() => {
    if (!users?.length) dispatch(fetchUsers({}));
  }, []);

  /* ── build query ── */
  const buildQuery = () => {
    const q = {};
    if (activeTypes.length) q.activity_type = activeTypes;
    if (dateFilter) q.filter = dateFilter;
    if (selectedUser) q.created_by = selectedUser;
    return q;
  };

  /* ── refetch on filter change ── */
  useEffect(() => {
    dispatch(resetActivities());
    dispatch(fetchActivities(buildQuery()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTypes, dateFilter, selectedUser]);

  /* ── type toggle ── */
  const handleToggleType = (key, overrideAll) => {
    if (overrideAll !== undefined) {
      setActiveTypes(overrideAll);
      return;
    }
    setActiveTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  /* ── pagination ── */
  const handleNextPage = () => {
    if (!nextCursor) return;
    dispatch(fetchActivities({ ...buildQuery(), ...nextCursor }));
  };
  const handlePrevPage = () => dispatch(prevPage());

  /* ────────────────────────────────────────────
     Row click → open ViewActivityDialog
  ──────────────────────────────────────────── */

  const handleRowClick = (activity) => setSelectedActivity(activity);

  /* ────────────────────────────────────────────
     Build props for ViewActivityDialog
     Mirrors buildViewActivityProps in LeadDetailsDrawer
  ──────────────────────────────────────────── */

  const buildViewActivityProps = (activity) => {
    if (!activity) return null;

    const isActive = activity.status === "ACTIVE";
    const isOverdue = activity.is_overdue;
    const isDone = ["COMPLETED", "MISSED", "CANCELLED"].includes(
      activity.status,
    );
    const canAct = isActive || isOverdue;
    const isScheduled = !!activity.scheduled_at;

    const editableFields = canAct
      ? { title: true, description: true, scheduled_at: isScheduled }
      : {};

    const initialData = {
      activity_type: activity.type,
      title: activity.title ?? "",
      description: activity.description ?? "",
      nature: isScheduled ? "SCHEDULED" : "LOG",
      status: activity.status ?? null,
      completion_note: activity.completion_note ?? "",
      missed_reason: activity.missed_reason ?? "",
      scheduled_at: activity.scheduled_at ?? null,
      email: activity.email ?? null,
    };

    const fmt = (iso) =>
      iso
        ? new Date(iso).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "—";

    const timestamps = [
      { label: "Scheduled at", value: fmt(activity.scheduled_at) },
      { label: "Created at", value: fmt(activity.created_at) },
      { label: "Created by", value: activity.created_by?.name ?? "—" },
      { label: "Updated at", value: fmt(activity.updated_at) },
      { label: "Updated by", value: activity.updated_by?.name ?? "—" },
      ...(activity.completed_at
        ? [{ label: "Completed at", value: fmt(activity.completed_at) }]
        : []),
      ...(activity.closed_by
        ? [{ label: "Closed by", value: activity.closed_by?.name ?? "—" }]
        : []),
    ];

    // lead info shown in right panel
    const leadDetails = activity.lead
      ? {
          title: activity.lead.title ?? "",
          description: activity.lead.description ?? "",
          chips: [
            activity.lead.stage?.name && {
              value: activity.lead.stage.name,
              color: "#6366f1", // stage color
            },

            activity.lead.priority && {
              value: activity.lead.priority,
              color:
                activity.lead.priority === "HIGH"
                  ? "#ef4444"
                  : activity.lead.priority === "MEDIUM"
                    ? "#f59e0b"
                    : "#10b981",
            },

            activity.lead.contact?.contact_person && {
              value: activity.lead.contact.contact_person,
              color: "#3b82f6",
            },
          ].filter(Boolean),
        }
      : null;

    // stage name as tag pill
    const tags = [activity.lead?.stage?.name].filter(Boolean);

    // ── email banner (same logic as LeadDetailsDrawer) ──
    let banner = null;

    if (isScheduled && activity.type === "EMAIL" && activity.email?.linked) {
      const emailSent = activity.email.sent;
      const bannerActions = [];

      if (isDone || emailSent) {
        bannerActions.push({
          label: "Show Email",
          bgColor: "#F0FDF4",
          textColor: "#16A34A",
          icon: <Mail size={14} />,
          handler: () => {
            setEmailState({ activityId: activity.id, mode: "SHOW" });
          },
        });
      } else {
        bannerActions.push({
          label: "Update Email",
          bgColor: "#EFF6FF",
          textColor: "#2563EB",
          icon: <Mail size={14} />,
          handler: () => {
            setEmailState({ activityId: activity.id, mode: "UPDATE" });
          },
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

    return {
      initialData,
      editableFields,
      completionNote:
        activity.completion_note || activity.missed_reason || null,
      timestamps,
      tags,
      banner,
      leadDetails,
      leadStatus: isOverdue ? "overdue" : activity.status?.toLowerCase(),
      canUpdateStatus: canAct,
    };
  };

  /* ────────────────────────────────────────────
     ViewActivityDialog handlers
  ──────────────────────────────────────────── */

  const handleUpdateActivity = (payload) => {
    if (!selectedActivity) return;

    dispatch(
      updateActivity({
        leadId: selectedActivity.lead?.id,
        activityId: selectedActivity.id,
        payload,
      }),
    )
      .unwrap()
      .then(() => setSelectedActivity(null));
  };

  const handleLifecycleSubmit = ({ status, reason, override_activity }) => {
    if (!selectedActivity) return;

    let payload = {};
    if (status === "COMPLETED") {
      payload = { action: "COMPLETED", completion_note: reason };
    } else if (status === "MISSED") {
      payload = { action: "MISSED", missed_reason: reason };
    } else if (status === "CANCELLED") {
      payload = { action: "CANCELLED", missed_reason: reason };
    }

    if (override_activity) payload.override_activity = true;

    dispatch(
      updateActivityLifecycle({
        leadId: selectedActivity.lead?.id,
        activityId: selectedActivity.id,
        payload,
      }),
    )
      .unwrap()
      .then(() => setSelectedActivity(null));
  };

  /* ────────────────────────────────────────────
     EmailComposer handlers
  ──────────────────────────────────────────── */

  const handleEmailComposerClose = () => {
    setEmailState(null);
    dispatch(resetActivityEmail());
  };

  const handleEmailFetchInitialData = () => {
    if (!emailState?.activityId || !selectedActivity?.lead?.id) return;
    dispatch(
      fetchActivityEmail({
        leadId: selectedActivity.lead.id,
        activityId: emailState.activityId,
      }),
    );
  };

  const handleEmailSubmit = (payload) => {
    // SHOW mode — just close
    if (emailState?.mode === "SHOW") {
      handleEmailComposerClose();
      return;
    }

    dispatch(
      updateActivityEmail({
        leadId: selectedActivity.lead?.id,
        activityId: emailState.activityId,
        payload: {
          ...payload,
          attachments: payload.attachments?.map((a) => ({
            document_id: a.id ?? a.document_id,
          })),
        },
      }),
    )
      .unwrap()
      .then(() => {
        handleEmailComposerClose();
      });
  };

  /* ────────────────────────────────────────────
     Derived contact emails for EmailComposer
  ──────────────────────────────────────────── */

  const toEmails = selectedActivity?.lead?.contact
    ? [
        selectedActivity.lead.contact.primary_email,
        selectedActivity.lead.contact.secondary_email,
      ].filter(Boolean)
    : [];

  const viewProps = buildViewActivityProps(selectedActivity);

  /* ────────────────────────────────────────────
     Render
  ──────────────────────────────────────────── */

  return (
    <div className={styles.container}>
      <ActivitiesHeader
        activeTypes={activeTypes}
        onToggleType={handleToggleType}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        users={users}
        selectedUser={selectedUser}
        onUserChange={setSelectedUser}
      />

      <ActivitiesTable
        activities={activities}
        loading={loading}
        nextCursor={nextCursor}
        currentPage={currentPage}
        totalPages={totalPages}
        hasPrevPage={hasPrevPage}
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
        onRowClick={handleRowClick}
      />

      {/* ── View / Edit Activity Dialog ── */}
      {selectedActivity && viewProps && (
        <ViewActivityDialog
          open={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
          initialData={viewProps.initialData}
          editableFields={viewProps.editableFields}
          completionNote={viewProps.completionNote}
          timestamps={viewProps.timestamps}
          tags={viewProps.tags}
          banner={viewProps.banner}
          leadDetails={viewProps.leadDetails}
          leadStatus={viewProps.leadStatus}
          canUpdateStatus={viewProps.canUpdateStatus}
          isUpdatingActivity={mutLoading.updateActivity}
          onUpdateActivity={handleUpdateActivity}
          isSubmittingLifecycle={mutLoading.updateLifecycle}
          onLifecycleSubmit={handleLifecycleSubmit}
        />
      )}

      {/* ── Email Composer (view or update linked email) ── */}
      <EmailComposer
        open={!!emailState}
        onClose={handleEmailComposerClose}
        mode={emailState?.mode === "UPDATE" ? "update" : "view"}
        leadId={selectedActivity?.lead?.id}
        fromEmail="info@afinadvisory.com"
        toEmails={toEmails}
        initialData={emailData}
        loadingWhenInitialData={mutLoading.email || mutLoading.updateEmail}
        onFetchInitialData={handleEmailFetchInitialData}
        onSubmit={handleEmailSubmit}
      />
    </div>
  );
}
