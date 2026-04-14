import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  getDoc,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase";

// ===============================
// Collection References
// ===============================

const chatsCollection = () => collection(db, "chats");
const chatDoc = (chatId) => doc(db, "chats", chatId);
const messagesCollection = (chatId) =>
  collection(db, "chats", chatId, "messages");

// ===============================
// Create Chat
// ===============================

/**
 * Create a new direct chat
 */
export const createDirectChat = async ({ currentUserId, otherUserId }) => {
  if (!currentUserId || !otherUserId) {
    throw new Error("Missing user IDs for direct chat");
  }

  // Check if chat already exists
  const existingChatQuery = query(
    chatsCollection(),
    where("type", "==", "direct"),
    where("memberIds", "array-contains", currentUserId),
  );

  const existingChats = await getDocs(existingChatQuery);
  const existingChat = existingChats.docs.find((doc) => {
    const data = doc.data();
    return data.memberIds.includes(otherUserId);
  });

  if (existingChat) {
    return { id: existingChat.id, ...existingChat.data() };
  }

  // Create new direct chat
  const chatData = {
    type: "direct",
    memberIds: [currentUserId, otherUserId].sort(), // Sort for consistency
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
    lastMessage: null,
    unreadCounts: {
      [currentUserId]: 0,
      [otherUserId]: 0,
    },
  };

  const chatRef = await addDoc(chatsCollection(), chatData);

  return {
    id: chatRef.id,
    ...chatData,
  };
};

/**
 * Create a new group chat
 */
export const createGroupChat = async ({
  name,
  memberIds,
  createdBy,
  description = null,
}) => {
  if (!name || !memberIds || memberIds.length < 2) {
    throw new Error("Invalid group chat parameters");
  }

  // Ensure creator is in memberIds
  const uniqueMemberIds = [...new Set([createdBy, ...memberIds])];

  const unreadCounts = {};
  uniqueMemberIds.forEach((uid) => {
    unreadCounts[uid] = 0;
  });

  const chatData = {
    type: "group",
    name,
    description,
    memberIds: uniqueMemberIds,
    adminIds: [createdBy],
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: null,
    unreadCounts,
    deletedAt: null,
  };

  const chatRef = await addDoc(chatsCollection(), chatData);

  return {
    id: chatRef.id,
    ...chatData,
  };
};

// ===============================
// Update Chat
// ===============================

/**
 * Add member to group
 */
export const addMemberToGroup = async ({ chatId, userId, currentUserId }) => {
  const chatRef = chatDoc(chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error("Chat not found");
  }

  const chatData = chatSnap.data();

  // Check if current user is admin
  if (!chatData.adminIds.includes(currentUserId)) {
    throw new Error("Only admins can add members");
  }

  // Check if already a member
  if (chatData.memberIds.includes(userId)) {
    throw new Error("User is already a member");
  }

  await updateDoc(chatRef, {
    memberIds: arrayUnion(userId),
    [`unreadCounts.${userId}`]: 0,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Remove member from group
 */
export const removeMemberFromGroup = async ({
  chatId,
  userId,
  currentUserId,
}) => {
  const chatRef = chatDoc(chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error("Chat not found");
  }

  const chatData = chatSnap.data();

  // Check if current user is admin
  if (!chatData.adminIds.includes(currentUserId)) {
    throw new Error("Only admins can remove members");
  }

  await updateDoc(chatRef, {
    memberIds: arrayRemove(userId),
    adminIds: arrayRemove(userId), // Also remove from admins if present
    updatedAt: serverTimestamp(),
  });
};

/**
 * Promote member to admin
 */
export const promoteToAdmin = async ({ chatId, userId, currentUserId }) => {
  const chatRef = chatDoc(chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error("Chat not found");
  }

  const chatData = chatSnap.data();

  if (!chatData.adminIds.includes(currentUserId)) {
    throw new Error("Only admins can promote members");
  }

  if (!chatData.memberIds.includes(userId)) {
    throw new Error("User is not a member");
  }

  await updateDoc(chatRef, {
    adminIds: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Demote admin to regular member
 */
export const demoteAdmin = async ({ chatId, userId, currentUserId }) => {
  const chatRef = chatDoc(chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error("Chat not found");
  }

  const chatData = chatSnap.data();

  if (!chatData.adminIds.includes(currentUserId)) {
    throw new Error("Only admins can demote members");
  }

  // Prevent last admin from being demoted
  if (chatData.adminIds.length === 1 && chatData.adminIds[0] === userId) {
    throw new Error("Cannot demote the last admin");
  }

  await updateDoc(chatRef, {
    adminIds: arrayRemove(userId),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Update group details (name, description)
 */
export const updateGroupDetails = async ({
  chatId,
  currentUserId,
  name,
  description,
}) => {
  const chatRef = chatDoc(chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error("Chat not found");
  }

  const chatData = chatSnap.data();

  if (!chatData.adminIds.includes(currentUserId)) {
    throw new Error("Only admins can update group details");
  }

  const updates = {
    updatedAt: serverTimestamp(),
  };

  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;

  await updateDoc(chatRef, updates);
};

/**
 * Delete group
 */
export const deleteGroup = async ({ chatId, currentUserId }) => {
  const chatRef = chatDoc(chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error("Chat not found");
  }

  const chatData = chatSnap.data();

  if (!chatData.adminIds.includes(currentUserId)) {
    throw new Error("Only admins can delete group");
  }

  // Soft delete by marking
  await updateDoc(chatRef, {
    deletedAt: serverTimestamp(),
    deletedBy: currentUserId,
  });

  // Or hard delete:
  // await deleteDoc(chatRef);
};

/**
 * Mark chat as read (reset unread counter)
 */
export const markChatAsRead = async ({ chatId, userId }) => {
  const chatRef = chatDoc(chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) return;

  const chatData = chatSnap.data();
  const unreadCounts = chatData.unreadCounts || {};

  unreadCounts[userId] = 0;

  const hasUnread = Object.values(unreadCounts).some((count) => count > 0);

  await updateDoc(chatRef, {
    [`unreadCounts.${userId}`]: 0,
    hasUnread,
  });
};

/**
 * Leave group
 */
export const leaveGroup = async ({ chatId, userId }) => {
  const chatRef = chatDoc(chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error("Chat not found");
  }

  const chatData = chatSnap.data();

  // If last admin leaving, promote someone or handle gracefully
  if (
    chatData.adminIds.includes(userId) &&
    chatData.adminIds.length === 1 &&
    chatData.memberIds.length > 1
  ) {
    // Promote first non-admin member
    const newAdmin = chatData.memberIds.find((id) => id !== userId);
    if (newAdmin) {
      await updateDoc(chatRef, {
        adminIds: [newAdmin],
      });
    }
  }

  await updateDoc(chatRef, {
    memberIds: arrayRemove(userId),
    adminIds: arrayRemove(userId),
    updatedAt: serverTimestamp(),
  });
};
