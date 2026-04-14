// lib/firebase/index.js
// Central export point for all Firebase chat functionality

// ===============================
// Core Config
// ===============================
export { app, auth, db, messaging } from "../firebase";

// ===============================
// Chat Operations
// ===============================
export {
  createDirectChat,
  createGroupChat,
  addMemberToGroup,
  removeMemberFromGroup,
  promoteToAdmin,
  demoteAdmin,
  updateGroupDetails,
  deleteGroup,
  markChatAsRead,
  leaveGroup,
} from "./chat";

// ===============================
// Message Operations
// ===============================
export {
  sendTextMessage,
  sendAttachmentMessage,
  forwardMessage,
  editMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
  fetchMessages,
  fetchPinnedMessages,
} from "./messages";

// ===============================
// Real-time Listeners
// ===============================
export {
  subscribeToChats,
  subscribeToMessages,
  subscribeToOlderMessages,
  subscribeToMessage,
  subscribeToPinnedMessages,
  subscribeToTyping,
  subscribeToUnreadCount,
  subscribeToUsers
} from "./listeners";




// ===============================
// Reactions
// ===============================
export {
  toggleReaction,
  removeReaction,
  getReactionSummary,
  hasUserReacted,
  getUsersWhoReacted,
} from "./reactions";

// ===============================
// Mentions
// ===============================
export {
  parseMentions,
  formatMentionsForDisplay,
  mentionsUser,
  getMentionedUsers,
  insertMention,
  getMentionSuggestions,
  getMentionContext,
  validateMentions,
} from "./mentions";

// ===============================
// Utilities
// ===============================
export {
  timestampToDate,
  formatChatTimestamp,
  formatMessageTimestamp,
  isToday,
  generateDirectChatId,
  isDirectChat,
  isGroupChat,
  getOtherUserId,
  validateFileAttachment,
  getFileTypeCategory,
  formatFileSize,
  parseFirebaseError,
  truncateText,
  getMessagePreview,
  getTotalUnreadCount,
  formatUnreadCount,
} from "./utils";