import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  doc,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

// ===============================
// Chat List Listener
// ===============================

/**
 * Subscribe to user's chat list (sidebar)
 * Returns unsubscribe function
 */
export const subscribeToChats = (userId, callback, errorCallback) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const chatsQuery = query(
    collection(db, "chats"),
    where("memberIds", "array-contains", userId),
    where("deletedAt", "==", null),
    orderBy("hasUnread", "desc"),
    orderBy("updatedAt", "desc"),
  );

  return onSnapshot(
    chatsQuery,
    (snapshot) => {
      const chats = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      callback(chats);
    },
    (error) => {
      console.error("Chat list listener error:", error);
      if (errorCallback) errorCallback(error);
    },
  );
};




// ===============================
// Users Listener (Directory)
// ===============================

export const subscribeToUsers = (callback, errorCallback) => {
  
  const usersQuery = query(
    collection(db, "users"),
    where("isActive", "==", true),
    orderBy("displayName", "asc")
  );

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      callback(users);
    },
    (error) => {
      console.error("Users listener error:", error);
      if (errorCallback) errorCallback(error);
    }
  );
};



// ===============================
// Messages Listener
// ===============================

/**
 * Subscribe to messages in a chat
 * Returns unsubscribe function
 */
export const subscribeToMessages = (
  chatId,
  callback,
  errorCallback,
  pageSize = 50,
) => {
  if (!chatId) {
    throw new Error("Chat ID is required");
  }

  const messagesQuery = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "desc"),
    limit(pageSize),
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Reverse for chronological display
      callback(messages.reverse());
    },
    (error) => {
      console.error("Messages listener error:", error);
      if (errorCallback) errorCallback(error);
    },
  );
};

/**
 * Subscribe to older messages (for infinite scroll)
 */
export const subscribeToOlderMessages = (
  chatId,
  lastDoc,
  callback,
  errorCallback,
  pageSize = 50,
) => {
  if (!chatId || !lastDoc) {
    throw new Error("Chat ID and lastDoc are required");
  }

  const messagesQuery = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "desc"),
    startAfter(lastDoc),
    limit(pageSize),
  );

  return getDocs(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      callback({
        messages: messages.reverse(),
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize,
      });
    },
    (error) => {
      console.error("Older messages listener error:", error);
      if (errorCallback) errorCallback(error);
    },
  );
};

// ===============================
// Single Message Listener
// ===============================

/**
 * Subscribe to a single message (useful for jump-to-message)
 */
export const subscribeToMessage = (
  chatId,
  messageId,
  callback,
  errorCallback,
) => {
  if (!chatId || !messageId) {
    throw new Error("Chat ID and Message ID are required");
  }

  const messageRef = doc(db, "chats", chatId, "messages", messageId);

  return onSnapshot(
    messageRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback({
          id: snapshot.id,
          ...snapshot.data(),
        });
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Message listener error:", error);
      if (errorCallback) errorCallback(error);
    },
  );
};

// ===============================
// Pinned Messages Listener
// ===============================

/**
 * Subscribe to pinned messages
 */
export const subscribeToPinnedMessages = (chatId, callback, errorCallback) => {
  if (!chatId) {
    throw new Error("Chat ID is required");
  }

  const pinnedQuery = query(
    collection(db, "chats", chatId, "messages"),
    where("isPinned", "==", true),
    orderBy("pinnedAt", "desc"),
  );

  return onSnapshot(
    pinnedQuery,
    (snapshot) => {
      const pinnedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      callback(pinnedMessages);
    },
    (error) => {
      console.error("Pinned messages listener error:", error);
      if (errorCallback) errorCallback(error);
    },
  );
};

// ===============================
// Typing Indicator Listener
// ===============================

// ===============================
// Unread Count Listener
// ===============================

/**
 * Subscribe to unread counts for a specific chat
 */
export const subscribeToUnreadCount = (
  chatId,
  userId,
  callback,
  errorCallback,
) => {
  if (!chatId || !userId) {
    throw new Error("Chat ID and User ID are required");
  }

  const chatRef = doc(db, "chats", chatId);

  return onSnapshot(
    chatRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const unreadCount = data.unreadCounts?.[userId] || 0;
        callback(unreadCount);
      } else {
        callback(0);
      }
    },
    (error) => {
      console.error("Unread count listener error:", error);
      if (errorCallback) errorCallback(error);
    },
  );
};
