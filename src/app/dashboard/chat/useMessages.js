"use client";

import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";

import { markChatAsRead, subscribeToMessages } from "@/lib/chat-sdk";

import {
  selectMessagesForChat,
  selectFirebaseUserId,
  setMessages,
  setMessagesLoading,
  clearMessages,
} from "@/store/slices/chatSlice";


import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Hook to manage messages for a specific chat
 */
export function useMessages(chatId) {
  const dispatch = useDispatch();
  const userId = useSelector(selectFirebaseUserId);

  const { items: messages, loading } = useSelector(
    selectMessagesForChat(chatId),
  );

  const messagesEndRef = useRef(null);

  // ===============================
  // Subscribe to messages
  // ===============================
  useEffect(() => {
    if (!chatId) return;

    dispatch(setMessagesLoading({ chatId, loading: true }));

    const unsubscribe = subscribeToMessages(
      chatId,
      (messages) => {
        dispatch(setMessages({ chatId, messages }));
        dispatch(setMessagesLoading({ chatId, loading: false }));
      },
      (error) => {
        console.error("Messages listener error:", error);
        dispatch(setMessagesLoading({ chatId, loading: false }));
      },
    );

    return () => {
      unsubscribe();
      dispatch(clearMessages({ chatId }));
    };
  }, [chatId, dispatch]);

  // ===============================
  // Auto-scroll
  // ===============================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ===============================
  // Delivery + Read Receipts
  // ===============================
  useEffect(() => {
    if (!messages.length || !userId || !chatId) return;

    messages.forEach((msg) => {
      const messageRef = doc(db, "chats", chatId, "messages", msg.id);

      // ✅ DELIVERED
      if (!msg.deliveredTo?.[userId]) {
        updateDoc(messageRef, {
          [`deliveredTo.${userId}`]: serverTimestamp(),
        }).catch(() => {});
      }

      // ✅ READ
      if (!msg.readBy?.[userId]) {
        updateDoc(messageRef, {
          [`readBy.${userId}`]: serverTimestamp(),
        }).catch(() => {});
      }
    });

    // ✅ SINGLE READ CALL
    markChatAsRead({ chatId, userId }).catch(() => {});
  }, [messages, userId, chatId]);

  return {
    messages,
    loading,
    messagesEndRef,
  };
}
