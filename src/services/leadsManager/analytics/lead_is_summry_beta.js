// services/leads/lead-ai-summary.service.js

import crypto from "crypto";
import { prisma } from "@/utils/server/db";
import { generateWithGemini } from "@/utils/server/gemini";
import { NotFoundError, ForbiddenError } from "@/utils/server/errors";

/* ----------------------------------------
  Hash Utility
  Only meaningful fields are included.
  Any change here = new hash = regeneration allowed.
---------------------------------------- */

function computeLeadSummaryHash(lead, activities) {
  const meaningful = {
    title: lead.title,
    priority: lead.priority,
    stage_id: lead.stage_id,
    expected_close_date: lead.expected_close_date ?? null,
    closure_status: lead.closure_status ?? null,
    stage_updated_at: lead.stage_updated_at ?? null,
    description: lead.description ?? null,
    activities: activities.map((a) => ({
      id: a.id,
      activity_type: a.activity_type,
      status: a.status,
      title: a.title ?? null,
      description: a.description ?? null,
      completion_note: a.completion_note ?? null,
      missed_reason: a.missed_reason ?? null,
      missed_by: a.missed_by ?? null,
      scheduled_at: a.scheduled_at ?? null,
      completed_at: a.completed_at ?? null,
    })),
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(meaningful))
    .digest("hex");
}

export async function getLeadAiSummary(lead_id, admin_user) {
  /* ----------------------------------------
  Lead Fetch — richer context now included
  ---------------------------------------- */

  const lead = await prisma.lead.findFirst({
    where: {
      id: lead_id,
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      expected_close_date: true,
      closure_status: true,
      created_at: true,
      updated_at: true,
      created_by: true,
      updated_by: true,
      stage_id: true,
      stage_updated_at: true,
      ai_summary: true,
      ai_summary_generated_at: true,
      ai_summary_input_hash: true,
      stage: {
        select: {
          id: true,
          name: true,
        },
      },
      // Who is the lead
      contact: {
        select: {
          contact_person: true,
          company_name: true,
          designation: true,
          industry: true,
          preferred_language: true,
          city: true,
          state_name: true,
          country_name: true,
        },
      },
      // Which pipeline
      pipeline: {
        select: {
          name: true,
        },
      },
      // How it came in
      source: {
        select: {
          source: true,
        },
      },
      // Tags the team put on it
      tags: {
        select: {
          tag: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!lead) throw new NotFoundError("Lead not found");

  /* ----------------------------------------
  Assignment Check (needed for both paths)
  ---------------------------------------- */

  const assignment = await prisma.leadAssignment.findFirst({
    where: { lead_id, admin_user_id: admin_user.id },
    select: { id: true },
  });

  /* ----------------------------------------
  Determine if this user can generate/refresh

  Allowed if:
    - SUPER_ADMIN, OR
    - Created this lead AND is currently assigned to it
  ---------------------------------------- */

  const isSuperAdmin = admin_user.admin_role === "SUPER_ADMIN";
  const isAssignedCreator =
    lead.created_by === admin_user.id && assignment !== null;
  const canGenerate = isSuperAdmin || isAssignedCreator;

  /* ----------------------------------------
  Non-generator path — return cached only
  ---------------------------------------- */

  if (!canGenerate) {
    if (!assignment) {
      throw new ForbiddenError("You are not assigned to this lead");
    }

    return {
      ai_summary: lead.ai_summary ?? null,
      ai_summary_generated_at: lead.ai_summary_generated_at ?? null,
      freshly_generated: false,
      message: lead.ai_summary ? null : "AI summary not generated yet.",
    };
  }

  /* ----------------------------------------
  Generator path — Hash-based staleness check
  ---------------------------------------- */

  if (lead.ai_summary && lead.ai_summary_input_hash) {
    const activitiesForHash = await prisma.leadActivity.findMany({
      where: { lead_id, deleted_at: null },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        activity_type: true,
        status: true,
        title: true,
        description: true,
        completion_note: true,
        missed_reason: true,
        missed_by: true,
        scheduled_at: true,
        completed_at: true,
      },
    });

    const currentHash = computeLeadSummaryHash(lead, activitiesForHash);

    if (currentHash === lead.ai_summary_input_hash) {
      return {
        ai_summary: lead.ai_summary,
        ai_summary_generated_at: lead.ai_summary_generated_at,
        freshly_generated: false,
        message: "Nothing meaningful has changed since the last summary.",
      };
    }
  }

  /* ----------------------------------------
  Parallel Fetch — Activities + Stage History
  ---------------------------------------- */

  const [activities, currentStageHistory] = await Promise.all([
    prisma.leadActivity.findMany({
      where: { lead_id, deleted_at: null },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        activity_type: true,
        status: true,
        title: true,
        description: true,
        scheduled_at: true,
        completed_at: true,
        completion_note: true,
        missed_reason: true,
        missed_by: true,
        created_by: true,
        closed_by: true,
        is_scheduled: true,
        created_at: true,
        updated_at: true,
      },
    }),

    prisma.leadStageHistory.findMany({
      where: {
        lead_id,
        to_stage_id: lead.stage_id,
      },
      orderBy: { changed_at: "asc" },
      select: { changed_at: true },
    }),
  ]);

  /* ----------------------------------------
  Compute Stage Metrics
  ---------------------------------------- */

  const now = new Date();

  let total_duration_ms = 0;
  for (let i = 0; i < currentStageHistory.length; i++) {
    const enteredAt = new Date(currentStageHistory[i].changed_at);
    const exitedAt = currentStageHistory[i + 1]
      ? new Date(currentStageHistory[i + 1].changed_at)
      : now;
    total_duration_ms += exitedAt - enteredAt;
  }

  const daysInCurrentStage = lead.stage_updated_at
    ? Math.floor(
        (now - new Date(lead.stage_updated_at)) / (1000 * 60 * 60 * 24),
      )
    : null;

  const totalDaysInStageEver = Math.floor(
    total_duration_ms / (1000 * 60 * 60 * 24),
  );

  const timesEnteredStage = currentStageHistory.length;

  /* ----------------------------------------
  Resolve User IDs to Names
  ---------------------------------------- */

  const userIdSet = new Set();
  if (lead.created_by) userIdSet.add(lead.created_by);
  if (lead.updated_by) userIdSet.add(lead.updated_by);
  for (const a of activities) {
    if (a.created_by) userIdSet.add(a.created_by);
    if (a.closed_by) userIdSet.add(a.closed_by);
  }

  const users = await prisma.adminUser.findMany({
    where: { id: { in: Array.from(userIdSet) } },
    select: { id: true, name: true },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const resolveName = (id) => userMap[id] ?? "Unknown";

  /* ----------------------------------------
  Build Prompt Sections
  ---------------------------------------- */

  // — Contact & Company context
  const contactLines = lead.contact
    ? [
        lead.contact.contact_person &&
          `Contact Person: ${lead.contact.contact_person}`,
        lead.contact.designation && `Designation: ${lead.contact.designation}`,
        lead.contact.company_name && `Company: ${lead.contact.company_name}`,
        lead.contact.industry && `Industry: ${lead.contact.industry}`,
        (lead.contact.city || lead.contact.state_name) &&
          `Location: ${[lead.contact.city, lead.contact.state_name, lead.contact.country_name].filter(Boolean).join(", ")}`,
        lead.contact.preferred_language &&
          `Preferred Language: ${lead.contact.preferred_language}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "No contact linked.";

  // — Lead meta
  const tagNames = lead.tags?.length
    ? lead.tags.map((t) => t.tag.name).join(", ")
    : "None";

  const leadMeta = [
    `Deal Title: ${lead.title}`,
    lead.description && `Deal Description: ${lead.description}`,
    `Pipeline: ${lead.pipeline?.name ?? "Unknown"}`,
    `Current Stage: ${lead.stage.name}`,
    `Time in Current Stage: ${daysInCurrentStage !== null ? `${daysInCurrentStage} days` : "Unknown"}`,
    `Total Days Ever in This Stage: ${totalDaysInStageEver} days`,
    `Times Entered This Stage: ${timesEnteredStage}${timesEnteredStage > 1 ? " (deal went backwards)" : ""}`,
    `Priority: ${lead.priority}`,
    `Closure Status: ${lead.closure_status ?? "Open"}`,
    `Lead Source: ${lead.source?.source ?? "Unknown"}`,
    `Tags: ${tagNames}`,
    `Expected Close Date: ${lead.expected_close_date ? new Date(lead.expected_close_date).toDateString() : "Not set"}`,
    `Created At: ${new Date(lead.created_at).toDateString()}`,
    `Last Updated At: ${new Date(lead.updated_at).toDateString()}`,
    `Created By: ${resolveName(lead.created_by)}`,
    `Last Updated By: ${resolveName(lead.updated_by)}`,
  ]
    .filter(Boolean)
    .join("\n");

  // — Activity history
  const activityLines = activities.length
    ? activities
        .map((a, i) => {
          const parts = [
            `${i + 1}. [${a.activity_type}${a.is_scheduled ? " · scheduled" : " · ad-hoc"}] ${a.title ?? "Untitled"} — Status: ${a.status}`,
          ];
          if (a.description) parts.push(`   Note: ${a.description}`);
          if (a.scheduled_at)
            parts.push(
              `   Scheduled: ${new Date(a.scheduled_at).toDateString()}`,
            );
          if (a.completed_at)
            parts.push(
              `   Completed: ${new Date(a.completed_at).toDateString()}`,
            );
          if (a.completion_note)
            parts.push(`   Completion Note: ${a.completion_note}`);
          if (a.missed_reason)
            parts.push(`   Missed Reason: ${a.missed_reason}`);
          if (a.missed_by) parts.push(`   Missed By: ${a.missed_by}`);
          if (a.created_by)
            parts.push(`   Logged By: ${resolveName(a.created_by)}`);
          if (a.closed_by)
            parts.push(`   Closed By: ${resolveName(a.closed_by)}`);
          return parts.join("\n");
        })
        .join("\n\n")
    : "No activities recorded yet.";

  /* ----------------------------------------
  Prompt
  ---------------------------------------- */

  const prompt = `
You are an experienced CRM analyst summarizing a sales lead for a busy sales manager.
Write exactly 2–3 sentences. Be specific, human, and direct — like a colleague giving a quick brief, not a robot filing a report.

RULES:
- Use the contact's name and/or company name when available — never say "the lead" if you know who it is
- Mention the stage by name when relevant
- Use "re-entered" ONLY if Times Entered This Stage > 1; never say "first time in" if it re-entered
- If no activities exist, say so naturally (e.g. "no outreach yet" not "no activities recorded")
- Do NOT mention things that are missing or unknown unless it's actionable
- Do NOT use bullet points or markdown
- Do NOT pad with filler phrases like "it's important to note" or "it's worth mentioning"
- Keep it under 60 words total

TONE: Confident, concise, like a senior sales ops person talking to their manager.

STRUCTURE (in one flowing paragraph):
1. Who is this and where they are in the pipeline right now
2. What's the key signal — activity trend, stage movement, urgency, or lack of engagement
3. What should happen next (specific and actionable)

--- CONTACT & COMPANY ---
${contactLines}

--- DEAL INFO ---
${leadMeta}

--- ACTIVITY HISTORY ---
${activityLines}
`.trim();

  /* ----------------------------------------
  Call Gemini
  ---------------------------------------- */

  const geminiResult = await generateWithGemini(prompt);

  if (!geminiResult.success) {
    return {
      ai_summary: lead.ai_summary ?? null,
      ai_summary_generated_at: lead.ai_summary_generated_at ?? null,
      freshly_generated: false,
      quota_exhausted: geminiResult.quota_exhausted,
      message: geminiResult.message,
    };
  }

  /* ----------------------------------------
  Compute hash from already-fetched activities
  ---------------------------------------- */

  const newHash = computeLeadSummaryHash(lead, activities);

  /* ----------------------------------------
  Store Summary + Hash on Lead
  ---------------------------------------- */

  const updatedLead = await prisma.lead.update({
    where: { id: lead_id },
    data: {
      ai_summary: geminiResult.text,
      ai_summary_generated_at: new Date(),
      ai_summary_input_hash: newHash,
    },
    select: {
      ai_summary: true,
      ai_summary_generated_at: true,
    },
  });

  /* ----------------------------------------
  Response
  ---------------------------------------- */

  return {
    ai_summary: updatedLead.ai_summary,
    ai_summary_generated_at: updatedLead.ai_summary_generated_at,
    freshly_generated: true,
    message: null,
  };
}
