// Service Worker for Push Notifications
// This handles push events and notification clicks

self.addEventListener("push", async (event) => {
  console.log("[SW] Push event received:", event);

  if (!event.data) {
    console.log("[SW] Push event has no data");
    return;
  }

  try {
    const data = JSON.parse(event.data.text());
    const { message, body, icon, badge, tag, url } = data;

    const options = {
      body: body || message,
      icon: icon || "/icon-192x192.png",
      badge: badge || "/badge-72x72.png",
      tag: tag || "default",
      data: {
        url: url || "/",
        ...data
      },
      actions: [
        {
          action: "open",
          title: "Open App"
        },
        {
          action: "close",
          title: "Close"
        }
      ],
      requireInteraction: false,
      silent: false
    };

    event.waitUntil(
      self.registration.showNotification(message || "New Notification", options)
    );

    console.log("[SW] Notification displayed:", message);
  } catch (error) {
    console.error("[SW] Error processing push event:", error);
  }
});

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification click received:", event);

  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clients) {
        if (client.url === urlToOpen && "focus" in client) {
          console.log("[SW] Focusing existing window:", client.url);
          return client.focus();
        }
      }

      // If no existing window found, open a new one
      if (clients.openWindow) {
        console.log("[SW] Opening new window:", urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed:", event.notification.tag);
});

// Handle background sync for offline notifications
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("[SW] Background sync triggered");
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic if needed
  console.log("[SW] Performing background sync");
}

// Handle push subscription changes
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[SW] Push subscription changed:", event);
  
  event.waitUntil(
    // Handle subscription refresh
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.vapidPublicKey
    }).then((subscription) => {
      console.log("[SW] Push subscription refreshed");
      // Send new subscription to server
      return fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription }),
      });
    })
  );
});

console.log("[SW] Push notification service worker loaded");
