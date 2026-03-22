import { prisma } from "@/utils/server/db";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/utils/server/errors";
import { zoomClient } from "@/utils/server/zoomClient";
import { onActivityCompleted, onActivityMissed } from "./analytics/aggregator";
import { buildActivityMessage } from "@/utils/server/activityBulder";
import { addLeadActivityLog } from "../shared/comments.service";

export async function createLeadActivity(lead_id, payload, admin_user) {
  const adminUserId = admin_user.id;
  const now = new Date();

  /* ----------------------------------------
  1. Validate Lead + Contact Emails
  ---------------------------------------- */

  const lead = await prisma.lead.findFirst({
    where: {
      id: lead_id,
      deleted_at: null,
    },
    select: {
      id: true,
      contact: {
        select: {
          primary_email: true,
          secondary_email: true,
        },
      },
    },
  });

  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

  /* ----------------------------------------
  2. Validate Lead Assignment
  ---------------------------------------- */

  const assignment = await prisma.leadAssignment.findFirst({
    where: {
      lead_id,
      admin_user_id: adminUserId,
    },
    select: { id: true },
  });

  if (!assignment) {
    throw new ForbiddenError("You are not assigned to this lead");
  }

  /* ----------------------------------------
  3. Validate Scheduling
  ---------------------------------------- */

  if (payload.scheduled_at) {
    const scheduledDate = new Date(payload.scheduled_at);

    if (scheduledDate <= now) {
      throw new ValidationError("scheduled_at must be in the future");
    }
  }

  /* ----------------------------------------
  4. Validate Email (if EMAIL activity)
  ---------------------------------------- */

  if (payload.activity_type === "EMAIL" && payload.email) {
    const allowedEmails = [
      lead.contact?.primary_email,
      lead.contact?.secondary_email,
    ].filter(Boolean);

    if (!allowedEmails.includes(payload.email.to_email)) {
      throw new ValidationError("Email must match the lead contact's email");
    }
  }

  /* ----------------------------------------
5. Validate Attachments
---------------------------------------- */

  const MAX_ATTACHMENTS = 3;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  if (payload.email?.attachments?.length) {
    const documentIds = payload.email.attachments.map((a) => a.document_id);

    /* ---------- max attachments ---------- */

    if (documentIds.length > MAX_ATTACHMENTS) {
      throw new ValidationError("Maximum 3 attachments allowed");
    }

    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        deleted_at: null,
      },
      select: {
        id: true,
        size_bytes: true,
      },
    });

    if (documents.length !== documentIds.length) {
      throw new ValidationError("One or more attachments are invalid");
    }

    /* ---------- size validation ---------- */

    for (const doc of documents) {
      if (doc.size_bytes > MAX_FILE_SIZE) {
        throw new ValidationError("Attachment file size cannot exceed 5MB");
      }
    }
  }

  /* ----------------------------------------
  6. Determine Activity Mode
  ---------------------------------------- */

  const isCompleted = payload.status === "COMPLETED";
  const isScheduled = !payload.status;

  /* ----------------------------------------
  7. Transaction
  ---------------------------------------- */

  const result = await prisma.$transaction(async (tx) => {
    const activity = await tx.leadActivity.create({
      data: {
        lead_id,

        activity_type: payload.activity_type,

        title: payload.title,
        description: payload.description,

        status: isScheduled ? "ACTIVE" : payload.status,

        is_scheduled: isScheduled,
        scheduled_at: payload.scheduled_at
          ? new Date(payload.scheduled_at)
          : null,

        completed_at: isCompleted ? now : null,
        completion_note: payload.completion_note,

        missed_reason: payload.missed_reason,
        missed_by: payload.missed_by,
        created_by: adminUserId,
        updated_by: adminUserId,
        closed_by: isScheduled ? null : adminUserId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        closer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        email_message: true,
        video_call_meta: true,
      },
    });

    /* ----------------------------------------
    Create Email Message (Automatic Email)
    ---------------------------------------- */

    if (
      payload.activity_type === "EMAIL" &&
      payload.email &&
      payload.scheduled_at
    ) {
      const email = await tx.leadEmailMessage.create({
        data: {
          activity_id: activity.id,
          to_email: payload.email.to_email,
          subject: payload.email.subject,
          body: payload.email.body,
          scheduled_at: new Date(payload.scheduled_at),
        },
      });

      if (payload.email.attachments?.length) {
        await tx.leadEmailAttachment.createMany({
          data: payload.email.attachments.map((a) => ({
            email_id: email.id,
            document_id: a.document_id,
          })),
        });
      }
    }

    return activity;
  });

  const changes = [
    {
      action: "LEAD_ACTIVITY_CREATED",
      from: null,
      to: {
        type: payload.activity_type,
        title: payload.title,
        scheduled_at: payload.scheduled_at || null,
        status: isScheduled ? "ACTIVE" : payload.status,
      },
    },
  ];

  await addLeadsActivityLog("LEAD", lead_id, adminUserId, {
    action: "LEAD_ACTIVITY_CREATED",
    message: buildActivityMessage(changes),
    meta: {
      activity_id: result.id,
      changes,
    },
  }).catch((err) => console.error("Activity log failed:", err));

  return result;
}

export async function listLeadActivities(lead_id, query, admin_user) {
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.min(10, query.page_size || 10);
  const skip = (page - 1) * pageSize;

  const lead = await prisma.lead.findUnique({
    where: {
      id: lead_id,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

  if (admin_user.admin_role !== "SUPER_ADMIN") {
    const assignment = await prisma.leadAssignment.findFirst({
      where: {
        lead_id,
        admin_user_id: admin_user.id,
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenError("You are not assigned to this lead");
    }
  }

  const where = {
    lead_id,
    deleted_at: null,
  };

  if (query.activity_type) {
    where.activity_type = query.activity_type;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.by_me === "true") {
    where.created_by = admin_user.id;
  }

  if (query.created_by) {
    where.created_by = query.created_by;
  }

  if (query.date_from || query.date_to) {
    where.created_at = {};

    if (query.date_from) {
      where.created_at.gte = new Date(query.date_from);
    }

    if (query.date_to) {
      where.created_at.lte = new Date(query.date_to);
    }
  }

  const [rows, total] = await Promise.all([
    prisma.leadActivity.findMany({
      where,
      select: {
        id: true,
        activity_type: true,
        status: true,

        title: true,
        description: true,

        is_scheduled: true,
        scheduled_at: true,

        created_at: true,
        updated_at: true,
        completed_at: true,

        completion_note: true,

        missed_reason: true,
        missed_by: true,

        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        updater: {
          select: {
            id: true,
            name: true,
          },
        },

        closer: {
          select: {
            id: true,
            name: true,
          },
        },

        email_message: {
          select: {
            id: true,
            sent_at: true,
          },
        },

        video_call_meta: {
          select: {
            id: true,
            provider: true,
            status: true,

            meeting_link: true,
            host_start_link: true,
            meeting_code: true,
            provider_meeting_id: true,

            host_user_id: true,
            host_email: true,

            scheduled_at: true,
            started_at: true,
            ended_at: true,

            has_transcript: true,
            is_transcript_ready: true,

            created_at: true,
            updated_at: true,
          },
        },
      },

      orderBy: {
        created_at: "desc",
      },

      skip,
      take: pageSize,
    }),

    prisma.leadActivity.count({ where }),
  ]);

  const now = new Date();

  const items = rows.map((a) => ({
    id: a.id,

    type: a.activity_type,
    status: a.status,

    title: a.title,
    description: a.description,

    is_scheduled: a.is_scheduled,
    scheduled_at: a.scheduled_at,

    created_at: a.created_at,
    updated_at: a.updated_at,
    completed_at: a.completed_at,

    completion_note: a.completion_note,

    missed_reason: a.missed_reason,
    missed_by: a.missed_by,

    is_overdue: a.status === "ACTIVE" && a.scheduled_at && a.scheduled_at < now,

    created_by: a.creator,
    updated_by: a.updater,
    closed_by: a.closer,

    email: a.email_message
      ? {
          linked: true,
          sent: !!a.email_message.sent_at,
        }
      : null,

    video_call: a.video_call_meta
      ? {
          linked: true,

          provider: a.video_call_meta.provider,
          status: a.video_call_meta.status,

          meeting_link: a.video_call_meta.meeting_link,
          host_start_link: a.video_call_meta.host_start_link,
          meeting_code: a.video_call_meta.meeting_code,

          provider_meeting_id: a.video_call_meta.provider_meeting_id,

          host_user_id: a.video_call_meta.host_user_id,
          host_email: a.video_call_meta.host_email,

          scheduled_at: a.video_call_meta.scheduled_at,
          started_at: a.video_call_meta.started_at,
          ended_at: a.video_call_meta.ended_at,

          meeting_started: !!a.video_call_meta.started_at,
          meeting_ended: !!a.video_call_meta.ended_at,
          link_generated: !!a.video_call_meta.meeting_link,

          transcript_available: !!a.video_call_meta.is_transcript_ready,
          transcript_recorded: !!a.video_call_meta.has_transcript,

          created_at: a.video_call_meta.created_at,
          updated_at: a.video_call_meta.updated_at,
        }
      : null,
  }));

  return {
    items,
    pagination: {
      page,
      page_size: pageSize,
      total_items: total,
      total_pages: Math.ceil(total / pageSize),
      has_more: page * pageSize < total,
    },
  };
}

export async function updateLeadActivity(activity_id, payload, admin_user) {
  const adminUserId = admin_user.id;
  const now = new Date();

  /* ----------------------------------------
  1. Fetch Activity
  ---------------------------------------- */

  const activity = await prisma.leadActivity.findUnique({
    where: { id: activity_id },
    select: {
      id: true,
      lead_id: true,
      status: true,
      created_by: true,
      is_scheduled: true,
      activity_type: true,
      title: true,
      description: true,
      scheduled_at: true,
      email_message: {
        select: { id: true },
      },
      video_call_meta: {
        select: {
          provider_meeting_id: true,
          started_at: true,
        },
      },
    },
  });

  if (!activity) {
    throw new NotFoundError("Activity not found");
  }

  /* ----------------------------------------
  2. Permission Check
  ---------------------------------------- */
  if (admin_user.admin_role !== "SUPER_ADMIN") {
    // must be assigned to lead
    const assignment = await prisma.leadAssignment.findFirst({
      where: {
        lead_id: activity.lead_id,
        admin_user_id: adminUserId,
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenError("You are not assigned to this lead");
    }

    // must be creator
    if (activity.created_by !== adminUserId) {
      throw new ForbiddenError("Only the creator of this activity can edit it");
    }
  }

  /* ----------------------------------------
  3. Prevent Editing Closed Activities
  ---------------------------------------- */

  if (activity.status !== "ACTIVE") {
    throw new ValidationError("Closed activities cannot be edited");
  }

  /* ----------------------------------------
  4. Prevent Editing Started Meetings
  ---------------------------------------- */

  if (activity.video_call_meta?.started_at) {
    throw new ValidationError("Started meetings cannot be modified");
  }

  /* ----------------------------------------
  5. Validate Scheduling
  ---------------------------------------- */

  if (payload.scheduled_at) {
    const newSchedule = new Date(payload.scheduled_at);

    if (newSchedule <= now) {
      throw new ValidationError("scheduled_at must be in the future");
    }
  }

  /* ----------------------------------------
  6. Update Activity (Transaction)
  ---------------------------------------- */

  const updated = await prisma.$transaction(async (tx) => {
    return tx.leadActivity.update({
      where: { id: activity_id },
      data: {
        title: payload.title,
        description: payload.description,
        scheduled_at: payload.scheduled_at
          ? new Date(payload.scheduled_at)
          : undefined,
        updated_by: adminUserId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        closer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  });

  /* ----------------------------------------
  7. Update Email for Worker (if exists)
  ---------------------------------------- */

  if (
    payload.scheduled_at &&
    activity.activity_type === "EMAIL" &&
    activity.email_message
  ) {
    await prisma.leadEmailMessage.update({
      where: { activity_id },
      data: {
        scheduled_at: new Date(payload.scheduled_at),
        next_retry_at: null,
      },
    });
  }

  /* ----------------------------------------
  7. Update Zoom Meeting (if exists)
  ---------------------------------------- */

  if (
    payload.scheduled_at &&
    activity.activity_type === "VIDEO_CALL" &&
    activity.video_call_meta?.provider_meeting_id
  ) {
    await zoomClient.patch(
      `/meetings/${activity.video_call_meta.provider_meeting_id}`,
      {
        start_time: new Date(payload.scheduled_at),
      },
    );

    await prisma.videoCallMeta.update({
      where: { activity_id: activity_id },
      data: {
        scheduled_at: new Date(payload.scheduled_at),
      },
    });
  }

  const from = {};
  const to = {};

  // title
  if (payload.title !== undefined && payload.title !== activity.title) {
    from.title = activity.title;
    to.title = payload.title;
  }

  // description
  if (
    payload.description !== undefined &&
    payload.description !== activity.description
  ) {
    from.description = activity.description;
    to.description = payload.description;
  }

  // scheduled_at
  if (payload.scheduled_at) {
    const oldDate = activity.scheduled_at
      ? new Date(activity.scheduled_at).toISOString()
      : null;

    const newDate = new Date(payload.scheduled_at).toISOString();

    if (oldDate !== newDate) {
      from.scheduled_at = oldDate;
      to.scheduled_at = newDate;
    }
  }

  if (Object.keys(from).length > 0) {
    const changes = [
      {
        action: "LEAD_ACTIVITY_UPDATED",
        from,
        to,
      },
    ];

    await addLeadActivityLog(activity.lead_id, adminUserId, {
      action: "LEAD_ACTIVITY_UPDATED",
      message: buildActivityMessage(changes),
      meta: {
        activity_id,
        changes,
      },
    }).catch((err) => console.error("Activity log failed:", err));
  }

  return updated;
}

export async function updateActivityLifecycle(
  activity_id,
  payload,
  admin_user,
) {
  const adminUserId = admin_user.id;
  const now = new Date();

  const activity = await prisma.leadActivity.findUnique({
    where: { id: activity_id },
    include: {
      email_message: true,
      video_call_meta: true,
    },
  });

  if (!activity || activity.deleted_at) {
    throw new NotFoundError("Activity not found");
  }

  if (activity.status !== "ACTIVE") {
    throw new ValidationError("Activity already closed");
  }

  /* ----------------------------------------
  Permission: assigned lead member
  ---------------------------------------- */

  const assignment = await prisma.leadAssignment.findFirst({
    where: {
      lead_id: activity.lead_id,
      admin_user_id: adminUserId,
    },
    select: { id: true },
  });

  if (!assignment) {
    throw new ForbiddenError("You are not assigned to this lead");
  }

  /* ----------------------------------------
  Automatic email cannot be manually closed
  ---------------------------------------- */

  if (
    activity.activity_type === "EMAIL" &&
    activity.email_message &&
    !activity.email_message.sent_at
  ) {
    throw new ValidationError(
      "Automatic email activities are completed by the system",
    );
  }

  /* ----------------------------------------
  Video meeting already started → lock lifecycle
  ---------------------------------------- */

  if (activity.video_call_meta && activity.video_call_meta.started_at) {
    throw new ValidationError(
      "Meeting already started. Lifecycle cannot be modified manually.",
    );
  }

  /* ----------------------------------------
  Determine lifecycle update
  ---------------------------------------- */

  let updateData = {
    closed_by: adminUserId,
    updated_by: adminUserId,
  };

  if (payload.action === "COMPLETE") {
    updateData.status = "COMPLETED";
    updateData.completed_at = now;
    updateData.completion_note = payload.completion_note;
  }

  if (payload.action === "MISSED") {
    updateData.status = "MISSED";
    updateData.missed_reason = payload.missed_reason;
    updateData.missed_by = payload.missed_by;
  }

  /* ----------------------------------------
  Transaction
  ---------------------------------------- */

  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({
      where: { id: activity.lead_id },
      select: {
        company_profile_id: true,
      },
    });

    const updated = await tx.leadActivity.update({
      where: { id: activity_id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        closer: { select: { id: true, name: true, email: true } },
        video_call_meta: true,
        email_message: true,
      },
    });

    /* ----------------------------------------
   Analytics
---------------------------------------- */

    if (payload.action === "COMPLETE") {
      await onActivityCompleted(tx, {
        created_by: activity.created_by,
        activity_type: activity.activity_type,
        companyProfileId: lead.company_profile_id,
      });
    }

    if (payload.action === "MISSED") {
      await onActivityMissed(tx, {
        created_by: activity.created_by,
        companyProfileId: lead.company_profile_id,
      });
    }

    return updated;
  });

  if (
    activity.activity_type === "VIDEO_CALL" &&
    activity.video_call_meta?.provider_meeting_id &&
    !activity.video_call_meta?.started_at
  ) {
    try {
      await zoomClient.delete(
        `/meetings/${activity.video_call_meta.provider_meeting_id}`,
      );

      const meetingStatus =
        payload.action === "COMPLETE" ? "COMPLETED" : "CANCELLED";

      await prisma.videoCallMeta.update({
        where: { activity_id },
        data: {
          status: meetingStatus,
          ended_at: new Date(),
        },
      });
    } catch (err) {
      console.error("Zoom meeting cancellation failed", err);
    }
  }

  // CHANGE-LOG
  const from = {
    status: activity.status,
  };

  const to = {
    status: updateData.status,
  };

  if (updateData.completed_at) {
    to.completed_at = updateData.completed_at.toISOString();
  }

  if (updateData.completion_note) {
    to.completion_note = updateData.completion_note;
  }

  if (updateData.missed_reason) {
    to.missed_reason = updateData.missed_reason;
  }

  if (updateData.missed_by) {
    to.missed_by = updateData.missed_by;
  }

  const changes = [
    {
      action: "LEAD_ACTIVITY_LIFECYCLE_UPDATED",
      from,
      to,
    },
  ];

  await addLeadActivityLog(activity.lead_id, adminUserId, {
    action: `LEAD_ACTIVITY_${payload.action}`,

    message: buildActivityMessage(changes),

    meta: {
      activity_id,
      lifecycle_action: payload.action,
      changes,
    },
  }).catch((err) => console.error("Activity log failed:", err));

  return result;
}

export async function deleteLeadActivity(activity_id, admin_user) {
  const adminUserId = admin_user.id;
  const now = new Date();

  const activity = await prisma.leadActivity.findUnique({
    where: { id: activity_id },
    include: {
      video_call_meta: true,
      email_message: true,
    },
  });

  if (!activity || activity.deleted_at) {
    throw new NotFoundError("Activity not found");
  }

  /* Only creator can delete */

  if (admin_user.admin_role !== "SUPER_ADMIN") {
    // must be assigned to lead
    const assignment = await prisma.leadAssignment.findFirst({
      where: {
        lead_id: activity.lead_id,
        admin_user_id: adminUserId,
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenError("You are not assigned to this lead");
    }

    // must be creator
    if (activity.created_by !== adminUserId) {
      throw new ForbiddenError(
        "Only the creator of this activity can delete it",
      );
    }
  }

  /* Only ACTIVE activities */

  if (activity.status !== "ACTIVE") {
    throw new ValidationError("Only active activities can be deleted");
  }

  /* Block if meeting started */

  if (activity.video_call_meta && activity.video_call_meta.started_at) {
    throw new ValidationError("Started meetings cannot be deleted");
  }

  const result = await prisma.$transaction(async (tx) => {
    if (activity.email_message) {
      await tx.leadEmailMessage.delete({
        where: { activity_id: activity_id },
      });
    }

    const updated = await tx.leadActivity.update({
      where: { id: activity_id },
      data: {
        deleted_at: now,
        deleted_by: adminUserId,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        deleter: { select: { id: true, name: true, email: true } },
        video_call_meta: true,
        email_message: true,
      },
    });

    return updated;
  });

  /* ----------------------------------------
  Cancel Zoom meeting if exists
  ---------------------------------------- */

  if (
    activity.activity_type === "VIDEO_CALL" &&
    activity.video_call_meta?.provider_meeting_id
  ) {
    try {
      await zoomClient.delete(
        `/meetings/${activity.video_call_meta.provider_meeting_id}`,
      );

      await prisma.videoCallMeta.update({
        where: { activity_id },
        data: {
          status: "CANCELLED",
          ended_at: new Date(),
        },
      });
    } catch (err) {
      console.error("Zoom meeting deletion failed", err);
    }
  }

  // CHANGE-LOG
  const from = {
    status: activity.status,
    type: activity.activity_type,
    title: activity.title,
  };

  const to = {
    status: "DELETED",
  };

  const changes = [
    {
      action: "LEAD_ACTIVITY_DELETED",
      from,
      to,
    },
  ];
  await addLeadActivityLog(activity.lead_id, adminUserId, {
    action: "LEAD_ACTIVITY_DELETED",
    message: buildActivityMessage(changes),
    meta: {
      activity_id,
      changes,
    },
  }).catch((err) => console.error("Activity log failed:", err));

  return result;
}

export async function handleZoomWebhook(payload) {
  const event = payload.event;
  const meetingId = String(payload.payload.object.id);

  const video = await prisma.videoCallMeta.findFirst({
    where: { provider_meeting_id: meetingId },
    include: {
      activity: true,
    },
  });

  if (!video) return;

  const activity = video.activity;

  /* --------------------------------
  Ignore if activity deleted
  -------------------------------- */

  if (!activity || activity.deleted_at) return;

  /* --------------------------------
  meeting.started
  -------------------------------- */

  if (event === "meeting.started") {
    if (video.started_at) return;

    await prisma.videoCallMeta.update({
      where: {
        id: video.id,
        started_at: null,
      },
      data: {
        status: "STARTED",
        started_at: new Date(payload.payload.object.start_time),
      },
    });
  }
}

export async function fetchMeetingTranscript(activity_id, admin_user) {
  const video = await prisma.videoCallMeta.findFirst({
    where: { activity_id },
  });

  if (!video) {
    throw new NotFoundError("Video call not found");
  }

  if (!video.provider_meeting_id) {
    throw new ValidationError("Meeting does not have provider meeting id");
  }

  if (admin_user.admin_role !== "SUPER_ADMIN") {
    const assignment = await prisma.leadAssignment.findFirst({
      where: {
        lead_id: video.activity.lead_id,
        admin_user_id: admin_user.id,
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenError("You are not assigned to this lead");
    }
  }

  const folder = `videocall_meta_files/${activity_id}`;
  const objectKey = `${folder}/transcript.txt`;

  /* ----------------------------------------
  Serve from S3 if already stored
  ---------------------------------------- */

  if (video.is_transcript_ready) {
    const stream = await getFileStream(objectKey);

    return {
      from_cache: true,
      stream,
    };
  }

  /* ----------------------------------------
  Fetch from Zoom
  ---------------------------------------- */

  const resp = await zoomClient.get(
    `/meetings/${encodeURIComponent(video.provider_meeting_id)}/transcript`,
  );

  if (!resp.data.can_download) {
    return { ready: false };
  }

  const fileResp = await fetch(resp.data.download_url);
  const buffer = Buffer.from(await fileResp.arrayBuffer());

  const uploaded = await uploadFile({
    buffer,
    originalName: "transcript.txt",
    mimeType: "text/plain",
    folder,
  });

  await prisma.videoCallMeta.update({
    where: { id: video.id },
    data: {
      has_transcript: true,
      is_transcript_ready: true,
    },
  });

  return {
    ready: true,
    url: uploaded.url,
  };
}

export async function getLeadActivityEmailContent(activity_id, admin_user) {
  const activity = await prisma.leadActivity.findUnique({
    where: { id: activity_id },
    include: {
      lead: {
        select: {
          id: true,
          deleted_at: true,
        },
      },
      email_message: {
        include: {
          attachments: {
            include: {
              document: {
                select: {
                  id: true,
                  original_name: true,
                  size_bytes: true,
                  mime_type: true,
                  url: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (admin_user.admin_role !== "SUPER_ADMIN") {
    const assignment = await prisma.leadAssignment.findFirst({
      where: {
        lead_id: activity.lead.id,
        admin_user_id: admin_user.id,
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenError("You are not assigned to this lead");
    }
  }

  /* ----------------------------------------
     Activity Validation
  ---------------------------------------- */

  if (!activity || activity.deleted_at) {
    throw new NotFoundError("Activity not found");
  }

  if (!activity.lead || activity.lead.deleted_at) {
    throw new NotFoundError("Lead not found");
  }

  if (activity.activity_type !== "EMAIL") {
    throw new ValidationError("This activity is not an email activity");
  }

  if (!activity.email_message) {
    throw new ValidationError("Email payload not found");
  }

  const email = activity.email_message;

  /* ----------------------------------------
     Build Attachments
  ---------------------------------------- */

  const attachments = email.attachments
    .filter((a) => a.document && !a.document.deleted_at)
    .map((a) => ({
      document_id: a.document.id,
      name: a.document.original_name,
      size_bytes: a.document.size_bytes,
      mime_type: a.document.mime_type,
      url: a.document.url,
    }));

  /* ----------------------------------------
     Response
  ---------------------------------------- */

  return {
    activity_id: activity.id,

    subject: email.subject,
    body: email.body,
    to_email: email.to_email,

    scheduled_at: email.scheduled_at,
    sent_at: email.sent_at,

    attachments,

    created_at: email.created_at,
  };
}

export async function updateLeadActivityEmailContent(
  activity_id,
  payload,
  admin_user,
) {
  const adminUserId = admin_user.id;

  const MAX_ATTACHMENTS = 3;
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const activity = await prisma.leadActivity.findUnique({
    where: { id: activity_id },
    include: {
      lead_id: true,
      email_message: {
        include: {
          attachments: true,
        },
      },
    },
  });

  if (!activity || activity.deleted_at) {
    throw new NotFoundError("Activity not found");
  }

  if (activity.activity_type !== "EMAIL") {
    throw new ValidationError("This activity is not an email activity");
  }

  if (activity.status !== "ACTIVE") {
    throw new ValidationError(
      "Email content cannot be modified once activity is closed",
    );
  }

  if (admin_user.admin_role !== "SUPER_ADMIN") {
    const assignment = await prisma.leadAssignment.findFirst({
      where: {
        lead_id: activity.lead_id,
        admin_user_id: adminUserId,
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenError("You are not assigned to this lead");
    }

    if (activity.created_by !== adminUserId) {
      throw new ForbiddenError(
        "Only the creator of this activity can update the email",
      );
    }
  }

  if (!activity.email_message) {
    throw new ValidationError("Email payload not found");
  }

  if (activity.email_message.sent_at) {
    throw new ValidationError("Email already sent and cannot be modified");
  }

  const emailId = activity.email_message.id;

  const incomingDocs = payload.attachments
    ? payload.attachments.map((a) => a.document_id)
    : [];

  if (incomingDocs.length > MAX_ATTACHMENTS) {
    throw new ValidationError("Maximum 3 attachments allowed");
  }

  if (incomingDocs.length) {
    const docs = await prisma.document.findMany({
      where: {
        id: { in: incomingDocs },
        deleted_at: null,
      },
      select: {
        id: true,
        size_bytes: true,
      },
    });

    if (docs.length !== incomingDocs.length) {
      throw new ValidationError("Invalid attachment document");
    }

    for (const doc of docs) {
      if (doc.size_bytes > MAX_FILE_SIZE) {
        throw new ValidationError("Attachment file size cannot exceed 5MB");
      }
    }
  }

  const existingDocs = activity.email_message.attachments.map(
    (a) => a.document_id,
  );

  const toAdd = incomingDocs.filter((id) => !existingDocs.includes(id));
  const toRemove = existingDocs.filter((id) => !incomingDocs.includes(id));

  const email = await prisma.$transaction(async (tx) => {
    await tx.leadEmailMessage.update({
      where: { id: emailId },
      data: {
        subject: payload.subject,
        body: payload.body,
      },
    });

    if (toRemove.length) {
      await tx.leadEmailAttachment.deleteMany({
        where: {
          email_id: emailId,
          document_id: { in: toRemove },
        },
      });
    }

    if (toAdd.length) {
      await tx.leadEmailAttachment.createMany({
        data: toAdd.map((docId) => ({
          email_id: emailId,
          document_id: docId,
        })),
      });
    }

    await tx.leadActivity.update({
      where: { id: activity_id },
      data: {
        updated_by: adminUserId,
      },
    });

    return tx.leadEmailMessage.findUnique({
      where: { id: emailId },
      include: {
        attachments: {
          include: {
            document: {
              select: {
                id: true,
                original_name: true,
                size_bytes: true,
                mime_type: true,
                url: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  });

  const attachments = email.attachments
    .filter((a) => a.document && !a.document.deleted_at)
    .map((a) => ({
      document_id: a.document.id,
      name: a.document.original_name,
      size_bytes: a.document.size_bytes,
      mime_type: a.document.mime_type,
      url: a.document.url,
    }));

  // CHANGE-LOG
  const from = {};
  const to = {};

  // subject change (boolean, not value)
  if (
    payload.subject !== undefined &&
    payload.subject !== activity.email_message.subject
  ) {
    from.subject_updated = false;
    to.subject_updated = true;
  }

  // body change (boolean only)
  if (
    payload.body !== undefined &&
    payload.body !== activity.email_message.body
  ) {
    from.body_updated = false;
    to.body_updated = true;
  }

  // attachments
  if (toAdd.length > 0 || toRemove.length > 0) {
    from.attachments_count = existingDocs.length;
    to.attachments_count = incomingDocs.length;

    if (toAdd.length > 0) {
      to.attachments_added = toAdd.length;
    }

    if (toRemove.length > 0) {
      to.attachments_removed = toRemove.length;
    }
  }
  if (Object.keys(to).length > 0) {
    const changes = [
      {
        action: "LEAD_ACTIVITY_EMAIL_UPDATED",
        from,
        to,
      },
    ];

    await addLeadActivityLog(activity.lead_id, adminUserId, {
      action: "LEAD_ACTIVITY_EMAIL_UPDATED",
      message: buildActivityMessage(changes),
      meta: {
        activity_id,
        changes,
      },
    }).catch((err) => console.error("Activity log failed:", err));
  }

  return {
    activity_id: activity_id,
    subject: email.subject,
    body: email.body,
    to_email: email.to_email,
    scheduled_at: email.scheduled_at,
    sent_at: email.sent_at,
    attachments,
    created_at: email.created_at,
  };
}

export async function generateMeetingLink(activity_id, admin_user) {
  const adminUserId = admin_user.id;

  const activity = await prisma.leadActivity.findUnique({
    where: { id: activity_id },
    include: {
      video_call_meta: true,
    },
  });

  if (!activity || activity.deleted_at) {
    throw new NotFoundError("Activity not found");
  }

  if (activity.activity_type !== "VIDEO_CALL") {
    throw new ValidationError("This activity is not a video call");
  }

  if (activity.status !== "ACTIVE") {
    throw new ValidationError(
      "Meeting cannot be generated for closed activity",
    );
  }

  if (!activity.scheduled_at) {
    throw new ValidationError("Scheduled time required to create meeting");
  }

  if (activity.video_call_meta?.started_at) {
    throw new ValidationError("Meeting already started and cannot be modified");
  }

  /* ---------- Check lead assignment ---------- */

  const assignment = await prisma.leadAssignment.findFirst({
    where: {
      lead_id: activity.lead_id,
      admin_user_id: adminUserId,
    },
  });

  if (!assignment) {
    throw new ForbiddenError("You are not assigned to this lead");
  }

  /* ---------- Zoom payload ---------- */

  const zoomPayload = {
    topic: "Video Call - Afinthrive Advisory",
    type: 2,
    start_time: activity.scheduled_at,
    duration: 40,
    timezone: "Asia/Kolkata",

    settings: {
      join_before_host: false,
      waiting_room: true,
      mute_upon_entry: true,
      host_video: true,
      participant_video: true,
      audio: "both",
      auto_recording: "none",
    },
  };

  /* ---------- Create Zoom meeting ---------- */

  let meeting;

  try {
    const zoomResp = await zoomClient.post("/users/me/meetings", zoomPayload);
    meeting = zoomResp.data;
  } catch (err) {
    throw new ExternalServiceError("Failed to create Zoom meeting");
  }

  /* ---------- Save metadata ---------- */

  const videoMeta = await prisma.videoCallMeta.upsert({
    where: {
      activity_id: activity_id,
    },
    update: {
      provider: "ZOOM",
      meeting_link: meeting.join_url,
      host_start_link: meeting.start_url,
      meeting_code: meeting.password,
      provider_meeting_id: String(meeting.id),
      scheduled_at: activity.scheduled_at,
      host_user_id: adminUserId,
      host_email: admin_user.email,
    },
    create: {
      activity_id: activity_id,
      provider: "ZOOM",
      meeting_link: meeting.join_url,
      host_start_link: meeting.start_url,
      meeting_code: meeting.password,
      provider_meeting_id: String(meeting.id),
      scheduled_at: activity.scheduled_at,
      host_user_id: adminUserId,
      host_email: admin_user.email,
    },
  });

  return videoMeta;
}

export async function listActivities(query, admin_user) {
  const pageSize = Math.min(50, query.page_size || 20);
  const now = new Date();

  /* ----------------------------------------
     Base Filters
  ---------------------------------------- */

  const where = {
    deleted_at: null,
    is_scheduled: true,
  };

  /* ----------------------------------------
     Access Control (IMPORTANT)
  ---------------------------------------- */

  if (admin_user.admin_role !== "SUPER_ADMIN") {
    where.lead = {
      assignments: {
        some: {
          admin_user_id: admin_user.id,
        },
      },
    };
  }

  /* ----------------------------------------
     Status Filter
  ---------------------------------------- */

  if (query.status) {
    where.status = query.status;
  }

  /* ----------------------------------------
     Date Filters
  ---------------------------------------- */

  if (query.filter === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    where.scheduled_at = { gte: start, lte: end };
  }

  if (query.filter === "tomorrow") {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setDate(end.getDate() + 1);
    end.setHours(23, 59, 59, 999);

    where.scheduled_at = { gte: start, lte: end };
  }

  if (query.filter === "overdue") {
    where.status = "ACTIVE";
    where.scheduled_at = { lt: now };
  }

  /* ----------------------------------------
     Cursor
  ---------------------------------------- */

  let cursorClause = {};

  if (query.cursor_scheduled_at && query.cursor_id) {
    cursorClause = {
      OR: [
        {
          scheduled_at: {
            gt: new Date(query.cursor_scheduled_at),
          },
        },
        {
          scheduled_at: new Date(query.cursor_scheduled_at),
          id: {
            gt: query.cursor_id,
          },
        },
      ],
    };
  }

  /* ----------------------------------------
     Fetch Activities
  ---------------------------------------- */

  const rows = await prisma.leadActivity.findMany({
    where: {
      ...where,
      ...cursorClause,
    },

    select: {
      id: true,
      activity_type: true,
      status: true,

      title: true,
      description: true,

      is_scheduled: true,
      scheduled_at: true,

      created_at: true,
      completed_at: true,

      completion_note: true,
      missed_reason: true,
      missed_by: true,

      lead: {
        select: {
          id: true,
          title: true,
          contact: {
            select: {
              contact_person: true,
            },
          },
        },
      },

      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      updater: {
        select: {
          id: true,
          name: true,
        },
      },

      closer: {
        select: {
          id: true,
          name: true,
        },
      },

      email_message: {
        select: {
          id: true,
          sent_at: true,
        },
      },

      video_call_meta: {
        select: {
          id: true,
          status: true,
        },
      },
    },

    orderBy: [{ scheduled_at: "asc" }, { id: "asc" }],

    take: pageSize + 1,
  });

  /* ----------------------------------------
     Pagination
  ---------------------------------------- */

  let next_cursor = null;

  if (rows.length > pageSize) {
    const nextItem = rows.pop();
    next_cursor = {
      cursor_scheduled_at: nextItem.scheduled_at,
      cursor_id: nextItem.id,
    };
  }

  /* ----------------------------------------
     Build Response
  ---------------------------------------- */

  const items = rows.map((a) => ({
    id: a.id,

    type: a.activity_type,
    status: a.status,

    title: a.title,
    description: a.description,

    scheduled_at: a.scheduled_at,

    created_at: a.created_at,
    completed_at: a.completed_at,

    completion_note: a.completion_note,

    missed_reason: a.missed_reason,
    missed_by: a.missed_by,

    is_overdue:
      a.status === "ACTIVE" && a.scheduled_at && new Date(a.scheduled_at) < now,

    lead: {
      id: a.lead.id,
      title: a.lead.title,
      contact: {
        name: a.lead.contact?.contact_person || null,
      },
    },

    created_by: a.creator,
    updated_by: a.updater,
    closed_by: a.closer,

    email: a.email_message
      ? {
          linked: true,
          sent: !!a.email_message.sent_at,
        }
      : null,

    video_call: a.video_call_meta
      ? {
          linked: true,
          status: a.video_call_meta.status,
        }
      : null,
  }));

  return {
    items,
    next_cursor,
  };
}

export async function getLeadActivityDetails(activity_id, admin_user) {
  const activity = await prisma.leadActivity.findUnique({
    where: { id: activity_id },
    include: {
      lead: {
        select: {
          id: true,
          title: true,
          deleted_at: true,
          contact: {
            select: {
              contact_person: true,
            },
          },
        },
      },

      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      updater: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      closer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      email_message: {
        include: {
          attachments: {
            include: {
              document: {
                select: {
                  id: true,
                  original_name: true,
                  size_bytes: true,
                  mime_type: true,
                  url: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
      },

      video_call_meta: {
        select: {
          id: true,
          provider: true,
          status: true,

          meeting_link: true,
          host_start_link: true,
          meeting_code: true,
          provider_meeting_id: true,

          host_user_id: true,
          host_email: true,

          scheduled_at: true,
          started_at: true,
          ended_at: true,

          has_transcript: true,
          is_transcript_ready: true,

          created_at: true,
          updated_at: true,
        },
      },
    },
  });

  if (!activity || activity.deleted_at) {
    throw new NotFoundError("Activity not found");
  }

  if (!activity.lead || activity.lead.deleted_at) {
    throw new NotFoundError("Lead not found");
  }

  if (admin_user.admin_role !== "SUPER_ADMIN") {
    const assignment = await prisma.leadAssignment.findFirst({
      where: {
        lead_id: activity.lead.id,
        admin_user_id: admin_user.id,
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenError("You are not assigned to this lead");
    }
  }

  const now = new Date();

  /* ---------------- Email ---------------- */

  let email = null;

  if (activity.email_message) {
    const e = activity.email_message;

    email = {
      id: e.id,
      to_email: e.to_email,
      subject: e.subject,
      body: e.body,
      scheduled_at: e.scheduled_at,
      sent_at: e.sent_at,

      attachments: e.attachments
        .filter((a) => a.document && !a.document.deleted_at)
        .map((a) => ({
          document_id: a.document.id,
          name: a.document.original_name,
          size_bytes: a.document.size_bytes,
          mime_type: a.document.mime_type,
          url: a.document.url,
        })),

      created_at: e.created_at,
    };
  }

  /* ---------------- Video Call ---------------- */

  let video_call = null;

  if (activity.video_call_meta) {
    const v = activity.video_call_meta;

    video_call = {
      id: v.id,

      provider: v.provider,
      status: v.status,

      meeting_link: v.meeting_link,
      host_start_link: v.host_start_link,
      meeting_code: v.meeting_code,

      provider_meeting_id: v.provider_meeting_id,

      host_user_id: v.host_user_id,
      host_email: v.host_email,

      scheduled_at: v.scheduled_at,
      started_at: v.started_at,
      ended_at: v.ended_at,

      meeting_started: !!v.started_at,
      meeting_ended: !!v.ended_at,
      link_generated: !!v.meeting_link,

      transcript_available: !!v.is_transcript_ready,
      transcript_recorded: !!v.has_transcript,

      created_at: v.created_at,
      updated_at: v.updated_at,
    };
  }

  return {
    id: activity.id,

    type: activity.activity_type,
    status: activity.status,

    title: activity.title,
    description: activity.description,

    is_scheduled: activity.is_scheduled,
    scheduled_at: activity.scheduled_at,

    created_at: activity.created_at,
    updated_at: activity.updated_at,
    completed_at: activity.completed_at,

    completion_note: activity.completion_note,

    missed_reason: activity.missed_reason,
    missed_by: activity.missed_by,

    is_overdue:
      activity.status === "ACTIVE" &&
      activity.scheduled_at &&
      activity.scheduled_at < now,

    lead: {
      id: activity.lead.id,
      title: activity.lead.title,
      contact: {
        name: activity.lead.contact?.contact_person || null,
      },
    },

    created_by: activity.creator,
    updated_by: activity.updater,
    closed_by: activity.closer,

    email,
    video_call,
  };
}
