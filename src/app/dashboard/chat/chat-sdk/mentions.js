// lib/firebase/mentions.js

// ===============================
// Mentions Parsing & Utilities
// ===============================


export const parseMentions = (text) => {
  if (!text) return [];

  // Match patterns like @userId or @[userId](Name)
  const mentionRegex = /@\[?([a-zA-Z0-9_-]+)\]?(?:\([^)]+\))?/g;
  const matches = [...text.matchAll(mentionRegex)];

  // Extract unique user IDs
  const userIds = [...new Set(matches.map((match) => match[1]))];

  return userIds;
};

/**
 * Format text with mentions for display
 * Converts @userId to clickable mentions
 */
export const formatMentionsForDisplay = (text, users) => {
  if (!text) return text;

  let formattedText = text;

  // Replace user IDs with display names
  users.forEach((user) => {
    const regex = new RegExp(`@${user.id}\\b`, "g");
    formattedText = formattedText.replace(regex, `@${user.name}`);
  });

  return formattedText;
};

/**
 * Check if message mentions current user
 */
export const mentionsUser = (mentions, userId) => {
  if (!mentions || !Array.isArray(mentions)) return false;
  return mentions.includes(userId);
};

/**
 * Get list of users mentioned in message
 */
export const getMentionedUsers = (mentions, allUsers) => {
  if (!mentions || !allUsers) return [];

  return allUsers.filter((user) => mentions.includes(user.id));
};

/**
 * Insert mention into text at cursor position
 * Used by mention picker UI
 */
export const insertMention = (text, cursorPosition, userId, displayName) => {
  const before = text.substring(0, cursorPosition);
  const after = text.substring(cursorPosition);

  // Find the @ symbol position
  const lastAtIndex = before.lastIndexOf("@");

  if (lastAtIndex === -1) {
    // No @ found, just append
    return {
      text: `${before}@${displayName} ${after}`,
      cursorPosition: before.length + displayName.length + 2,
    };
  }

  // Replace from @ to cursor with mention
  const beforeAt = before.substring(0, lastAtIndex);
  const newText = `${beforeAt}@${displayName} ${after}`;
  const newCursorPosition = beforeAt.length + displayName.length + 2;

  return {
    text: newText,
    cursorPosition: newCursorPosition,
  };
};

/**
 * Get mention suggestions based on query
 * Used by mention picker dropdown
 */
export const getMentionSuggestions = (query, members, maxResults = 5) => {
  if (!query || !members) return [];

  const lowercaseQuery = query.toLowerCase();

  return members
    .filter((member) => {
      const nameMatch = member.name.toLowerCase().includes(lowercaseQuery);
      const emailMatch = member.email?.toLowerCase().includes(lowercaseQuery);
      return nameMatch || emailMatch;
    })
    .slice(0, maxResults);
};

/**
 * Check if cursor is in mention context
 * Returns { inMention: boolean, query: string, startPos: number }
 */
export const getMentionContext = (text, cursorPosition) => {
  if (!text || cursorPosition === 0) {
    return { inMention: false, query: "", startPos: -1 };
  }

  const textBeforeCursor = text.substring(0, cursorPosition);

  // Find last @ symbol
  const lastAtIndex = textBeforeCursor.lastIndexOf("@");

  if (lastAtIndex === -1) {
    return { inMention: false, query: "", startPos: -1 };
  }

  // Check if there's a space after @
  const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
  const hasSpace = textAfterAt.includes(" ");

  if (hasSpace) {
    return { inMention: false, query: "", startPos: -1 };
  }

  return {
    inMention: true,
    query: textAfterAt,
    startPos: lastAtIndex,
  };
};

/**
 * Validate mentions array
 */
export const validateMentions = (mentions, allowedUserIds) => {
  if (!mentions || !Array.isArray(mentions)) return [];

  // Filter out duplicates and invalid user IDs
  const uniqueMentions = [...new Set(mentions)];

  if (!allowedUserIds) return uniqueMentions;

  // Only keep mentions of users who are members
  return uniqueMentions.filter((userId) => allowedUserIds.includes(userId));
};