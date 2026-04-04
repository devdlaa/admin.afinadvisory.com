/* global self */
importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"
);



firebase.initializeApp({
  apiKey: "AIzaSyBkahB5Y6rovzShztU_mtqJ2obamLIL8TE",
  authDomain: "test-env-afinadvisory-2a0af.firebaseapp.com",
  projectId: "test-env-afinadvisory-2a0af",
  storageBucket: "test-env-afinadvisory-2a0af.firebasestorage.app",
  messagingSenderId: "914949246139",
  appId: "1:914949246139:web:04646f37bcaea199b72d9e",
});



const messaging = firebase.messaging();


// Handle background messages
messaging.onBackgroundMessage(function (payload) {
  

  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: payload.data?.type || "general",
    requireInteraction: false,
    data: {
      link: payload.data?.link || "/notifications",
      task_id: payload.data?.task_id,
      type: payload.data?.type,
    },
  };

  self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "NEW_NOTIFICATION",
          payload,
        });
      });
    });
  return self.registration
    .showNotification(notificationTitle, notificationOptions)
    .then(() => {
   
    })
    .catch((error) => {
      console.error("[Service Worker] Error showing notification:");
    });
});

// Handle notification clicks
self.addEventListener("notificationclick", function (event) {


  event.notification.close();

  const link = event.notification?.data?.link || "/notifications";
  const fullUrl = new URL(link, self.location.origin).href;



  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        

        // Focus existing tab if available
        for (const client of clientList) {
      
          if (client.url === fullUrl && "focus" in client) {
      
            return client.focus();
          }
        }
        // Open new tab
        if (clients.openWindow) {
     
          return clients.openWindow(fullUrl);
        }
      })
      .catch((error) => {
        console.error(
          "[Service Worker] Error handling notification click:",
          
        );
      })
  );
});

// Log service worker activation
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activated");
});

// Log service worker installation
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installed");
});

console.log("[Service Worker] Setup complete");
