import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

// ===============================
// Collection References
// ===============================

const messagesCollection = (chatId) =>
  collection(db, "chats", chatId, "messages");
const messageDoc = (chatId, messageId) =>
  doc(db, "chats", chatId, "messages", messageId);

// ===============================
// Send Messages
// ===============================

/**
 * Send a text message
 */
export const sendTextMessage = async ({
  chatId,
  senderId,
  text,
  mentions = [],
  replyTo = null,
}) => {
  if (!text || !text.trim()) {
    throw new Error("Message text cannot be empty");
  }

  const messageData = {
    senderId,
    type: "text",
    text: text.trim(),
    mentions: mentions || [],
    replyTo: replyTo || null,
    reactions: {},
    createdAt: serverTimestamp(),
    isEdited: false,
    deliveredTo: {},
    readBy: {},
  };

  const messageRef = await addDoc(messagesCollection(chatId), messageData);

  return {
    id: messageRef.id,
    ...messageData,
  };
};

/**
 * Send a message with attachments (images, files, videos, voice notes)
 */
export const sendAttachmentMessage = async ({
  chatId,
  senderId,
  attachments,
  text = null,
  mentions = [],
  replyTo = null,
}) => {
  if (!attachments || attachments.length === 0) {
    throw new Error("Attachments cannot be empty");
  }

  // Determine primary type based on first attachment
  const primaryType = attachments[0].type;

  const messageData = {
    senderId,
    type: primaryType, // "image", "video", "file", "audio"
    text: text ? text.trim() : null,
    attachments,
    mentions: mentions || [],
    replyTo: replyTo || null,
    reactions: {},
    createdAt: serverTimestamp(),
    isEdited: false,
    deliveredTo: {},
    readBy: {},
  };

  const messageRef = await addDoc(messagesCollection(chatId), messageData);

  return {
    id: messageRef.id,
    ...messageData,
  };
};

/**
 * Forward a message
 */
export const forwardMessage = async ({
  targetChatId,
  senderId,
  originalMessageId,
  originalChatId,
  originalSenderId,
  text,
  attachments = null,
}) => {
  const messageData = {
    senderId,
    type: attachments ? attachments[0].type : "text",
    text: text || null,
    attachments: attachments || null,
    forwardedFrom: {
      messageId: originalMessageId,
      chatId: originalChatId,
      senderId: originalSenderId,
    },
    reactions: {},
    createdAt: serverTimestamp(),
    isEdited: false,
    deliveredTo: {},
    readBy: {},
  };

  const messageRef = await addDoc(
    messagesCollection(targetChatId),
    messageData,
  );

  return {
    id: messageRef.id,
    ...messageData,
  };
};

// ===============================
// Edit & Delete Messages
// ===============================

/**
 * Edit message text
 */
export const editMessage = async ({ chatId, messageId, senderId, newText }) => {
  if (!newText || !newText.trim()) {
    throw new Error("Message text cannot be empty");
  }

  const messageRef = messageDoc(chatId, messageId);
  const messageSnap = await getDoc(messageRef);

  if (!messageSnap.exists()) {
    throw new Error("Message not found");
  }

  const messageData = messageSnap.data();

  // Only sender can edit
  if (messageData.senderId !== senderId) {
    throw new Error("You can only edit your own messages");
  }

  const trimmedText = newText.trim();

  await updateDoc(messageRef, {
    text: trimmedText,
    isEdited: true,
    editedAt: serverTimestamp(),
  });

  const chatRef = chatDoc(chatId);
  const chatSnap = await getDoc(chatRef);

  if (chatSnap.exists()) {
    const chatData = chatSnap.data();

    if (chatData?.lastMessage?.id === messageId) {
      await updateDoc(chatRef, {
        lastMessage: {
          ...chatData.lastMessage,
          text: trimmedText,
          isEdited: true,
        },
        updatedAt: serverTimestamp(),
      });
    }
  }
};

/**
 * Delete message
 */
export const deleteMessage = async ({ chatId, messageId, senderId }) => {
  const messageRef = messageDoc(chatId, messageId);
  const messageSnap = await getDoc(messageRef);

  if (!messageSnap.exists()) {
    throw new Error("Message not found");
  }

  const messageData = messageSnap.data();

  // Only sender can delete
  if (messageData.senderId !== senderId) {
    throw new Error("You can only delete your own messages");
  }

  // Soft delete
  await updateDoc(messageRef, {
    deletedAt: serverTimestamp(),
    text: null,
    isDeleted: true,
    attachments: null,
  });

  // Or hard delete:
  // await deleteDoc(messageRef);
};

// ===============================
// Pin Messages
// ===============================

/**
 * Pin a message
 */
export const pinMessage = async ({ chatId, messageId, userId }) => {
  // Get chat to check if user is admin
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error("Chat not found");
  }

  const chatData = chatSnap.data();

  // Only admins can pin in groups
  if (chatData.type === "group" && !chatData.adminIds.includes(userId)) {
    throw new Error("Only admins can pin messages in groups");
  }

  const messageRef = messageDoc(chatId, messageId);

  await updateDoc(messageRef, {
    isPinned: true,
    pinnedAt: serverTimestamp(),
    pinnedBy: userId,
  });
};

/**
 * Unpin a message
 */
export const unpinMessage = async ({ chatId, messageId, userId }) => {
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error("Chat not found");
  }

  const chatData = chatSnap.data();

  if (chatData.type === "group" && !chatData.adminIds.includes(userId)) {
    throw new Error("Only admins can unpin messages in groups");
  }

  const messageRef = messageDoc(chatId, messageId);

  await updateDoc(messageRef, {
    isPinned: false,
    pinnedAt: null,
    pinnedBy: null,
  });
};

// ===============================
// Fetch Messages (for pagination)
// ===============================

/**
 * Fetch messages with pagination
 */
export const fetchMessages = async ({
  chatId,
  pageSize = 50,
  lastDoc = null,
}) => {
  let messagesQuery = query(
    messagesCollection(chatId),
    where("deletedAt", "==", null), // Exclude deleted
    orderBy("createdAt", "desc"),
    limit(pageSize),
  );

  if (lastDoc) {
    messagesQuery = query(messagesQuery, startAfter(lastDoc));
  }

  const snapshot = await getDocs(messagesQuery);

  const messages = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return {
    messages,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize,
  };
};

/**
 * Fetch pinned messages
 */
export const fetchPinnedMessages = async ({ chatId }) => {
  const pinnedQuery = query(
    messagesCollection(chatId),
    where("isPinned", "==", true),
    orderBy("pinnedAt", "desc"),
  );

  const snapshot = await getDocs(pinnedQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
