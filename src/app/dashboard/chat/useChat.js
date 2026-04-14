"use client";

import { useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";

import { subscribeToChats, subscribeToUsers } from "@/lib/firebase";

import {
  selectChats,
  selectUsers,
  selectChatsLoading,
  selectFirebaseUserId,
  setChats,
  setUsers,
  setChatsLoading,
  setUsersLoading,
} from "@/store/slices/chatSlice";

/**
 * Hook to manage combined chat + user list (WhatsApp style)
 */
export function useChats() {
  const dispatch = useDispatch();
  const chats = useSelector(selectChats);
  const users = useSelector(selectUsers);
  const loading = useSelector(selectChatsLoading);
  const userId = useSelector(selectFirebaseUserId);

  // Subscribe to chats
  useEffect(() => {
    if (!userId) return;

    dispatch(setChatsLoading(true));

    const unsubscribe = subscribeToChats(
      userId,
      (chats) => {
        dispatch(setChats(chats));
      },
      (error) => {
        console.error("Chats listener error:", error);
        dispatch(setChatsLoading(false));
      },
    );

    return () => unsubscribe();
  }, [userId, dispatch]);

  // Subscribe to users
  useEffect(() => {
    dispatch(setUsersLoading(true));

    const unsubscribe = subscribeToUsers(
      (users) => {
        dispatch(setUsers(users));
      },
      (error) => {
        console.error("Users listener error:", error);
        dispatch(setUsersLoading(false));
      },
    );

    return () => unsubscribe();
  }, [dispatch]);

  // Combine chats + users (WhatsApp style)
  const combinedList = useMemo(() => {
    if (!userId) return [];

    // Active chats
    const chatItems = chats.map((chat) => {
      const isGroup = chat.type === "group";
      const otherUser = isGroup
        ? null
        : users.find((u) => chat.memberIds.includes(u.id) && u.id !== userId);

      return {
        type: "chat",
        id: chat.id,
        chatId: chat.id,
        name: isGroup ? chat.name : otherUser?.displayName || "Unknown",
        avatarUrl: isGroup ? chat.avatarUrl : otherUser?.avatarUrl,
        lastMessage: chat.lastMessage,
        updatedAt: chat.updatedAt,
        unreadCount: chat.unreadCounts?.[userId] || 0,
        isGroup,
      };
    });

    // Users without chats
    const chatUserIds = new Set();
    chats.forEach((chat) => {
      if (chat.type !== "group") {
        chat.memberIds.forEach((id) => {
          if (id !== userId) chatUserIds.add(id);
        });
      }
    });

    const userItems = users
      .filter((u) => u.id !== userId && !chatUserIds.has(u.id))
      .map((u) => ({
        type: "user",
        id: u.id,
        userId: u.id,
        name: u.displayName,
        email: u.email,
        avatarUrl: u.avatarUrl,
        unreadCount: 0,
        isGroup: false,
      }));

    // Sort: unread first, then by time, then alphabetically
    return [
      ...chatItems.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        if (a.updatedAt && b.updatedAt) {
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        }
        return 0;
      }),
      ...userItems.sort((a, b) => a.name.localeCompare(b.name)),
    ];
  }, [chats, users, userId]);

  return {
    chats,
    users,
    combinedList,
    loading,
  };
}
