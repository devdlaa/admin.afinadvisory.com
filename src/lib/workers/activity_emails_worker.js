import { prisma } from "../../utils/server/db.js";
import { SEND_EMAIL } from "../../utils/server/sendemail.js";
import { getFileStream } from "../../services/shared/miniio.service.js";
import {
  onActivityCompleted,
  onActivityMissed,
} from "../../services/leadsManager/analytics/aggregator.js";

const BATCH_SIZE = 7;
const CONCURRENCY = 3;
const MAX_RETRIES = 2;
const POLL_INTERVAL = 25000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadAttachments(email) {
  const attachments = [];

  for (const att of email.attachments) {
    const stream = await getFileStream(att.document.object_key);

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    attachments.push({
      filename: att.document.original_name,
      content: Buffer.concat(chunks),
    });
  }

  return attachments;
}

async function scheduleRetry(email, error) {
  const retryCount = email.retry_count + 1;

  if (retryCount >= MAX_RETRIES) {
    await prisma.$transaction(async (tx) => {
      // 1. update email failure
      await tx.leadEmailMessage.update({
        where: { id: email.id },
        data: {
          retry_count: retryCount,
          last_error: String(error),
        },
      });

      // 2. mark activity MISSED
      const activity = await tx.leadActivity.update({
        where: { id: email.activity_id },
        data: {
          status: "MISSED",
          missed_reason: "Email delivery failed",
          missed_by: "SYSTEM",
          closed_by: email.activity.created_by,
          updated_by: email.activity.created_by,
        },
        select: {
          id: true,
          activity_type: true,
          created_by: true,
          lead_id: true,
        },
      });

      // 3. fetch lead
      const lead = await tx.lead.findUnique({
        where: { id: activity.lead_id },
        select: {
          company_profile_id: true,
        },
      });

      // 4. ANALYTICS
      await onActivityMissed(tx, {
        created_by: activity.created_by,
        companyProfileId: lead.company_profile_id,
      });
    });

    console.error("Email permanently failed:", email.id);
    return;
  }

  const delayMinutes = Math.min(60, retryCount * 5);

  const nextRetry = new Date(Date.now() + delayMinutes * 60000);

  await prisma.leadEmailMessage.update({
    where: { id: email.id },
    data: {
      retry_count: retryCount,
      next_retry_at: nextRetry,
      last_error: String(error),
    },
  });

  console.error("Retry scheduled:", email.id);
}

async function markCompleted(email) {
  await prisma.$transaction(async (tx) => {
    const now = new Date();

    // 1. mark email sent
    await tx.leadEmailMessage.update({
      where: { id: email.id },
      data: {
        sent_at: now,
      },
    });

    // 2. update activity
    const activity = await tx.leadActivity.update({
      where: { id: email.activity_id },
      data: {
        status: "COMPLETED",
        completed_at: now,
        closed_by: email.activity.created_by,
        completion_note: "Automatic Email sent",
        updated_by: email.activity.created_by,
      },
      select: {
        id: true,
        activity_type: true,
        created_by: true,
        lead_id: true,
      },
    });

    // 3. fetch lead (needed for analytics)
    const lead = await tx.lead.findUnique({
      where: { id: activity.lead_id },
      select: {
        company_profile_id: true,
      },
    });

    // 4. ANALYTICS
    await onActivityCompleted(tx, {
      created_by: activity.created_by,
      activity_type: activity.activity_type,
      companyProfileId: lead.company_profile_id,
    });
  });
}

async function processEmail(email) {
  try {
    const attachments = await loadAttachments(email);

    const result = await SEND_EMAIL({
      to: email.to_email,
      html: email.body,
      subjectOverride: email.subject,
      attachments,
    });

    if (!result.success) {
      throw new Error(result.error || "Email send failed");
    }

    await markCompleted(email);

    console.log("Email sent:", email.to_email);
  } catch (error) {
    await scheduleRetry(email, error);
  }
}

async function runWithConcurrency(items, limit, handler) {
  const executing = [];

  for (const item of items) {
    const p = handler(item);
    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing).catch(() => {});
      executing.splice(0, executing.length - limit + 1);
    }
  }

  await Promise.allSettled(executing);
}

async function fetchEmails() {
  const now = new Date();

  return prisma.leadEmailMessage.findMany({
    where: {
      sent_at: null,
      retry_count: { lt: MAX_RETRIES },

      activity: {
        status: "ACTIVE",
        deleted_at: null,
      },

      OR: [
        {
          scheduled_at: { lte: now },
          retry_count: 0,
        },
        {
          next_retry_at: { lte: now },
        },
      ],
    },

    include: {
      activity: true,
      attachments: {
        include: {
          document: true,
        },
      },
    },

    orderBy: {
      scheduled_at: "asc",
    },

    take: BATCH_SIZE,
  });
}

async function worker() {
  console.log("Email worker started");

  while (true) {
    try {
      const emails = await fetchEmails();

      if (!emails.length) {
        await sleep(POLL_INTERVAL);
        continue;
      }

      await runWithConcurrency(emails, CONCURRENCY, processEmail);
    } catch (err) {
      console.error("Worker error:", err);
      await sleep(POLL_INTERVAL);
    }
  }
}

process.on("SIGINT", async () => {
  console.log("Worker shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

worker();
