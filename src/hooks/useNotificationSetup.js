"use client";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";

import {
  addNotification,
  fetchNotificationMeta,
} from "@/store/slices/notificationSlice";

export const useNotificationSetup = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!messaging) return;

    const setupNotifications = async () => {
      try {
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
          const token = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          });

          await fetch("/api/push/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              device: "web",
            }),
          });

          // Listen for foreground messages
          onMessage(messaging, (payload) => {
            // ============================================
            // HANDLE CHAT NOTIFICATIONS
            // ============================================
            if (payload.data?.type === "NEW_MESSAGE") {
              if (document.hidden) {
                const notification = new Notification(
                  payload.notification?.title || "New Message",
                  {
                    body: payload.notification?.body || "",
                    icon: "/icons/icon-192.png",
                    tag: `chat-${payload.data.chatId}`,
                    data: {
                      chatId: payload.data.chatId,
                      url: `/dashboard/chat?chatId=${payload.data.chatId}`,
                    },
                  },
                );

                notification.onclick = function (event) {
                  event.preventDefault();
                  window.focus();
                  window.location.href = this.data.url;
                };
              }
              return;
            }

            // ============================================
            // HANDLE OTHER NOTIFICATIONS (Tasks, mentions, etc.)
            // ============================================
            dispatch(
              addNotification({
                id: payload.data?.id || Date.now().toString(),
                title: payload.notification?.title,
                body: payload.notification?.body,
                type: payload.data?.type || "GENERAL",
                link: payload.data?.link,
                task_id: payload.data?.task_id,
                is_mention: payload.data?.is_mention === "true",
                unread: true,
                created_at:
                  payload.data?.created_at || new Date().toISOString(),
              }),
            );
            dispatch(fetchNotificationMeta());

            if (document.hidden) {
              new Notification(payload.notification?.title || "Notification", {
                body: payload.notification?.body || "",
                icon: "/icons/icon-192.png",
                tag: payload.data?.type,
              });
            }
          });
        }
      } catch (error) {
        
      }
    };

    setupNotifications();

    // Handle background notifications (from service worker)
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "NEW_NOTIFICATION") {
          const payload = event.data.payload;

          if (payload.data?.type === "NEW_MESSAGE") {
            return;
          }

          dispatch(
            addNotification({
              id: payload.data?.id || Date.now().toString(),
              title: payload.notification?.title,
              body: payload.notification?.body,
              type: payload.data?.type || "GENERAL",
              link: payload.data?.link,
              task_id: payload.data?.task_id,
              is_mention: payload.data?.is_mention === "true",
              unread: true,
              created_at: payload.data?.created_at || new Date().toISOString(),
            }),
          );
          dispatch(fetchNotificationMeta());
        }
      });
    }
  }, [dispatch]);
};
