import { prisma } from "@/utils/server/db.js";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../utils/server/errors.js";
import { onLeadAssignedBulk } from "./analytics/aggregator.js";
import { buildActivityMessage } from "@/utils/server/activityBulder.js";
import { addLeadActivityLog } from "../shared/comments.service.js";
import { notify } from "../shared/notifications.service.js";
export const syncLeadAssignments = async (lead_id, users, admin_user) => {
  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();

    if (!users || users.length === 0) {
      throw new ValidationError(
        "At least one user must remain assigned to the lead",
      );
    }

    const lead = await tx.lead.findUnique({
      where: { id: lead_id },
      select: {
        id: true,
        pipeline_id: true,
        stage_id: true,
        source: true,
        company_profile_id: true,
        created_by: true,
        assignments: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!lead) throw new NotFoundError("Lead not found");

    const analyticsLead = {
      id: lead.id,
      pipelineId: lead.pipeline_id,
      stageId: lead.stage_id,
      source: lead.source || null,
      companyProfileId: lead.company_profile_id,
    };

    const creatorId = lead.created_by;

    const currentAssignments = lead.assignments;

    const currentIds = currentAssignments.map((a) => a.admin_user_id);

    const newIds = users.map((u) => u.admin_user_id);

    const isSuperAdmin = admin_user.admin_role === "SUPER_ADMIN";

    const ownerAssignment = currentAssignments.find((a) => a.role === "OWNER");

    const currentUserAssignment = currentAssignments.find(
      (a) => a.admin_user_id === admin_user.id,
    );

    // ---------------- PERMISSION CHECK ----------------

    if (!isSuperAdmin) {
      if (!ownerAssignment || ownerAssignment.admin_user_id !== admin_user.id) {
        throw new ForbiddenError("Only the lead owner can modify assignments");
      }

      if (!currentUserAssignment || currentUserAssignment.role !== "OWNER") {
        throw new ForbiddenError(
          "Owner must remain assigned to modify assignments",
        );
      }
    }

    // ---------------- OWNER SAFETY ----------------

    if (!isSuperAdmin && !newIds.includes(admin_user.id)) {
      throw new ValidationError("Owner cannot remove themselves");
    }

    // ---------------- SYNC LOGIC ----------------

    const toAdd = newIds.filter((id) => !currentIds.includes(id));

    const toRemove = currentIds.filter((id) => !newIds.includes(id));
    const removedUsers = currentAssignments
      .filter((a) => toRemove.includes(a.admin_user_id))
      .map((a) => ({
        id: a.admin_user_id,
        name: a.assignee.name,
        email: a.assignee.email,
      }));

    // ---------------- REMOVE USERS ----------------

    if (toRemove.length) {
      await tx.leadAssignment.deleteMany({
        where: {
          lead_id,
          admin_user_id: { in: toRemove },
        },
      });
    }

    // ---------------- ADD USERS ----------------

    const addData = toAdd.map((id) => ({
      lead_id,
      admin_user_id: id,
      role: id === creatorId ? "OWNER" : "COLLABORATOR",
      assigned_by: admin_user.id,
      assigned_at: now,
    }));

    if (addData.length) {
      await tx.leadAssignment.createMany({
        data: addData,
        skipDuplicates: true,
      });
      await onLeadAssignedBulk(tx, analyticsLead, toAdd);
    }

    // ---------------- FETCH FINAL STATE ----------------
    const assignments = await tx.leadAssignment.findMany({
      where: { lead_id },
      orderBy: { assigned_at: "asc" },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      lead,
      assignments,
      toAdd,
      toRemove,
      removedUsers,
    };
  });

  // ---------------- ACTIVITY LOG ----------------
  const changes = [];
  const addedUsers = result.assignments
    .filter((a) => result.toAdd.includes(a.admin_user_id))
    .map((a) => ({
      id: a.admin_user_id,
      name: a.assignee?.name || null,
      email: a.assignee?.email || null,
    }));

  for (const user of addedUsers) {
    changes.push({
      field: "assignment",
      from: null,
      to: {
        name: user.name,
        email: user.email,
      },
    });
  }
  for (const user of result.removedUsers) {
    changes.push({
      field: "assignment",
      from: {
        name: user.name,
        email: user.email,
      },
      to: null,
    });
  }

  if (result.removedUsers.length) {
    changes.push({
      field: "assignments_removed",
      users: result.removedUsers,
    });
  }
  if (changes.length) {
    await addLeadActivityLog(lead_id, admin_user.id, {
      action: "LEAD_ASSIGNMENTS_UPDATED",
      message: buildActivityMessage(changes),
      meta: { changes },
    });
  }

  // ---------------- NOTIFICATIONS ----------------
  try {
    if (result.toAdd.length > 0) {
      await notify(result.toAdd, {
        type: "LEAD_ASSIGNED",
        title: "New lead assigned",
        body: `Lead: ${lead.name}`,
        actor_id: admin_user.id,
        actor_name: admin_user?.name ?? null,
        link: `/dashboard/leads-managment?leadId=${result.lead.id}`,
      });
    }
  } catch (err) {
    console.error("Assignment notification failed:", err);
  }

  return {
    lead_id,
    assignments: result.assignments.map((a) => ({
      id: a.id,
      admin_user_id: a.admin_user_id,
      role: a.role,
      assigned_at: a.assigned_at,
      assigned_by: a.assigned_by,
      assignee: a.assignee,
    })),
  };
};
