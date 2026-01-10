import admin from "@/lib/firebase-admin";
import { prisma } from "@/utils/server/db";
import { z } from "zod";

// client sends only admin user id
const memberInputSchema = z.object({
  uid: z.string().uuid(),
});

// Only service_bookings remain now
const COLLECTION_CONFIGS = {
  service_bookings: {
    collectionName: "service_bookings",
    idField: "serviceId",
    userIdentifierField: "user_code",
    assignmentField: "assignmentManagement",
    timestampField: "AssignedAt",
    assignedByField: "AssignedBy",
    maxMembers: 10,
  },
};

function buildAssignedKeys(assignToAll, members, userIdentifierField) {
  if (assignToAll) {
    return ["all"];
  }

  return members.flatMap((m) => [
    `email:${m.email}`,
    `${userIdentifierField}:${m[userIdentifierField]}`,
  ]);
}

function transformMember(member, config, currentUserId, now) {
  return {
    [config.userIdentifierField]: member[config.userIdentifierField],
    name: member.name,
    email: member.email,
    [config.timestampField]: now,
    [config.assignedByField]: currentUserId,
  };
}

export async function assignMembers({
  collectionType,
  documentId,
  assignToAll,
  members = [],
  currentUserId,
}) {
  const config = COLLECTION_CONFIGS[collectionType];

  if (!config) {
    throw new Error(`Invalid collection type: ${collectionType}`);
  }

  // Validate member UIDs
  const validatedMembers = (Array.isArray(members) ? members : []).map((m) => {
    const validation = memberInputSchema.safeParse(m);
    if (!validation.success) {
      throw new Error(`Invalid member data: ${validation.error.message}`);
    }
    return validation.data;
  });

  // Check max members
  if (validatedMembers.length > config.maxMembers) {
    throw new Error(`Maximum of ${config.maxMembers} members allowed`);
  }

  // 🔍 Fetch admin user details from Postgres using uid list
  const uids = validatedMembers.map((m) => m.uid);

  const adminUsers = await prisma.adminUser.findMany({
    where: { id: { in: uids } },
    select: {
      id: true,
      user_code: true,
      name: true,
      email: true,
      status: true,
      deleted_at: true,
    },
  });

  if (adminUsers.length !== uids.length) {
    const found = new Set(adminUsers.map((u) => u.id));
    const missing = uids.filter((u) => !found.has(u));
    throw new Error(`Some users not found: ${missing.join(", ")}`);
  }

  // Validate active users
  adminUsers.forEach((u) => {
    if (u.deleted_at || u.status !== "ACTIVE") {
      throw new Error(`User ${u.name} is not active`);
    }
  });

  // 🎯 Build members in Firestore shape
  const resolvedMembers = adminUsers.map((u) => ({
    user_code: u.user_code,
    name: u.name,
    email: u.email,
  }));

  const firestore = admin.firestore();
  const docRef = firestore.collection(config.collectionName).doc(documentId);

  const updatedAssignment = await firestore.runTransaction(async (tx) => {
    const docSnap = await tx.get(docRef);

    if (!docSnap.exists) {
      throw new Error(`${collectionType} document not found`);
    }

    const now = new Date().toISOString();

    const transformedMembers = resolvedMembers.map((m) =>
      transformMember(m, config, currentUserId, now)
    );

    const assignment = {
      assignToAll,
      members: transformedMembers,
    };

    // Build assignedKeys
    assignment.assignedKeys = buildAssignedKeys(
      assignToAll,
      resolvedMembers,
      config.userIdentifierField
    );

    // Update
    tx.update(docRef, {
      [config.assignmentField]: assignment,
    });

    return assignment;
  });

  return {
    success: true,
    assignment: updatedAssignment,
  };
}

export { COLLECTION_CONFIGS };
