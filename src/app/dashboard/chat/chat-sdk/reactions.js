import { doc, updateDoc, getDoc, deleteField } from "firebase/firestore";
import { db } from "../firebase";

// ===============================
// Reactions Management
// ===============================

/**
 * Add or toggle reaction to a message
 */
export const toggleReaction = async ({ chatId, messageId, userId, emoji }) => {
  if (!chatId || !messageId || !userId || !emoji) {
    throw new Error("Missing required parameters for reaction");
  }

  const messageRef = doc(db, "chats", chatId, "messages", messageId);
  const messageSnap = await getDoc(messageRef);

  if (!messageSnap.exists()) {
    throw new Error("Message not found");
  }

  const messageData = messageSnap.data();
  const currentReactions = messageData.reactions || {};

  // If user already reacted with this emoji, remove it
  if (currentReactions[userId] === emoji) {
    await updateDoc(messageRef, {
      [`reactions.${userId}`]: deleteField(),
    });

    return { action: "removed", emoji };
  } else {
    // Add or update reaction
    await updateDoc(messageRef, {
      [`reactions.${userId}`]: emoji,
    });

    return { action: "added", emoji };
  }
};

/**
 * Remove user's reaction
 */
export const removeReaction = async ({ chatId, messageId, userId }) => {
  if (!chatId || !messageId || !userId) {
    throw new Error("Missing required parameters");
  }

  const messageRef = doc(db, "chats", chatId, "messages", messageId);
  const messageSnap = await getDoc(messageRef);

  if (!messageSnap.exists()) {
    throw new Error("Message not found");
  }

  const messageData = messageSnap.data();
  const currentReactions = messageData.reactions || {};

  if (currentReactions[userId]) {
    await updateDoc(messageRef, {
      [`reactions.${userId}`]: deleteField(),
    });
  }
};

/**
 * Get reaction summary for a message
 * Returns object like: { "👍": 3, "❤️": 2, "😂": 1 }
 */
export const getReactionSummary = (reactions) => {
  if (!reactions || typeof reactions !== "object") {
    return {};
  }

  const summary = {};

  Object.values(reactions).forEach((emoji) => {
    summary[emoji] = (summary[emoji] || 0) + 1;
  });

  return summary;
};

/**
 * Check if current user has reacted with specific emoji
 */
export const hasUserReacted = (reactions, userId, emoji) => {
  if (!reactions || !userId) return false;
  return reactions[userId] === emoji;
};

/**
 * Get list of users who reacted with specific emoji
 */
export const getUsersWhoReacted = (reactions, emoji) => {
  if (!reactions || typeof reactions !== "object") {
    return [];
  }

  return Object.entries(reactions)
    .filter(([_, userEmoji]) => userEmoji === emoji)
    .map(([userId, _]) => userId);
};
