"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { selectFirebaseUserId } from "@/store/slices/chatSlice";

import { setupPresence } from "@/lib/chat-sdk/presence";

export function usePresence() {
  const userId = useSelector(selectFirebaseUserId);

  useEffect(() => {
    if (!userId) return;

    setupPresence(userId);
  }, [userId]);
}
