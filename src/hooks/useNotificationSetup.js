"use client";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";

import { addNotification } from "@/store/slices/notificationSlice";

export const useNotificationSetup = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!messaging) return;

    const setupNotifications = async () => {
      try {
        // Request permission
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
            console.log("Foreground message received:", payload);

            // ============================================
            // HANDLE CHAT NOTIFICATIONS
            // ============================================
            if (payload.data?.type === "NEW_MESSAGE") {
              // Chat unread counts are already handled by Firestore real-time listener
              // Just show browser notification if user is not on the tab
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

                // Handle notification click
                notification.onclick = function (event) {
                  event.preventDefault();
                  window.focus();
                  window.location.href = this.data.url;
                };
              }
              return; // Don't add chat notifications to Redux notification store
            }

            // ============================================
            // HANDLE OTHER NOTIFICATIONS (Tasks, etc.)
            // ============================================
            dispatch(
              addNotification({
                id: Date.now().toString(),
                title: payload.notification?.title,
                body: payload.notification?.body,
                type: payload.data?.type || "GENERAL",
                link: payload.data?.link,
                task_id: payload.data?.task_id,
                unread: true,
                created_at: new Date().toISOString(),
              }),
            );

            // Show browser notification if tab not focused
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
        console.error("Notification setup failed:", error);
      }
    };

    setupNotifications();

    // Handle background notifications (from service worker)
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "NEW_NOTIFICATION") {
          const payload = event.data.payload;

          console.log("Message from SW to client:", payload);

          // Chat notifications don't go to Redux
          if (payload.data?.type === "NEW_MESSAGE") {
            return;
          }

          // Other notifications
          dispatch(
            addNotification({
              id: Date.now().toString(),
              title: payload.notification?.title,
              body: payload.notification?.body,
              type: payload.data?.type || "GENERAL",
              link: payload.data?.link,
              task_id: payload.data?.task_id,
              unread: true,
              created_at: new Date().toISOString(),
            }),
          );
        }
      });
    }
  }, [dispatch]);
};
