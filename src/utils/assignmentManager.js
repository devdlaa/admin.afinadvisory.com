// utils/assignmentManager.js
import admin from "@/lib/firebase-admin";
import { z } from "zod";

/**
 * Shared schema for member validation
 */
const memberInputSchema = z.object({
  userCode: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  name: z.string().min(1),
  email: z.string().email(),
  sendEmail: z.boolean().default(false),
});

const COLLECTION_CONFIGS = {
  service_bookings: {
    collectionName: "service_bookings",
    idField: "serviceId",
    userIdentifierField: "userCode",
    assignmentField: "assignmentManagement",
    timestampField: "AssignedAt",
    assignedByField: "AssignedBy",
    emailSentField: "isEmailSentAlready",
    maxMembers: 10,
  },
  tasks: {
    collectionName: "tasks",
    idField: "taskId",
    userIdentifierField: "userId",
    assignmentField: "assignment",
    timestampField: "assignedAt",
    assignedByField: "assignedBy",
    emailSentField: "emailSent",
    maxMembers: 10,
    includeCreatorInfo: true,
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
  const transformed = {
    [config.userIdentifierField]: member[config.userIdentifierField],
    name: member.name,
    email: member.email,
    [config.timestampField]: now,
    [config.assignedByField]: currentUserId,
    [config.emailSentField]: !member.sendEmail,
  };

  return transformed;
}

export async function assignMembers({
  collectionType,
  documentId,
  assignToAll,
  members = [],
  currentUserId,
  currentUserName = "",
}) {
  const config = COLLECTION_CONFIGS[collectionType];

  if (!config) {
    throw new Error(`Invalid collection type: ${collectionType}`);
  }

  // Validate members array
  const normalizedMembers = Array.isArray(members) ? members : [];

  // Validate each member
  const validatedMembers = normalizedMembers.map((m) => {
    const validation = memberInputSchema.safeParse(m);
    if (!validation.success) {
      throw new Error(`Invalid member data: ${validation.error.message}`);
    }
    return validation.data;
  });

  // Check max members limit
  if (validatedMembers.length > config.maxMembers) {
    throw new Error(`Maximum of ${config.maxMembers} members allowed`);
  }

  const firestore = admin.firestore();
  const docRef = firestore.collection(config.collectionName).doc(documentId);

  const updatedAssignment = await firestore.runTransaction(async (tx) => {
    const docSnap = await tx.get(docRef);

    if (!docSnap.exists) {
      throw new Error(`${collectionType} document not found`);
    }

    const now = new Date().toISOString();

    // Transform members based on collection type
    const transformedMembers = validatedMembers.map((m) =>
      transformMember(m, config, currentUserId, now)
    );

    // Build assignment object
    const assignment = {
      assignToAll,
      members: transformedMembers,
    };

    // Add creator info for tasks
    if (config.includeCreatorInfo) {
      const existingData = docSnap.data();
      assignment.createdById =
        existingData.assignment?.createdById || currentUserId;
      assignment.createdByName =
        existingData.assignment?.createdByName || currentUserName;
      assignment.createdAt = existingData.assignment?.createdAt || now;
    }

    // Build assignedKeys for fast querying
    const assignedKeys = buildAssignedKeys(
      assignToAll,
      validatedMembers,
      config.userIdentifierField
    );

    assignment.assignedKeys = assignedKeys;

    // Update document
    tx.update(docRef, {
      [config.assignmentField]: assignment,
    });

    return assignment;
  });

  return {
    success: true,
    assignment: updatedAssignment,
    membersToEmail: validatedMembers.filter((m) => m.sendEmail),
  };
}

export { COLLECTION_CONFIGS };
