// Service worker for TaskFlow — handles web push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "TaskFlow", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? "TaskFlow", {
      body: data.body ?? "",
      icon: data.icon ?? "/pwa-192.png",
      badge: data.badge ?? "/pwa-64.png",
      data: { url: data.url ?? "/chat" },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          // App is open — post message to switch to chat mode
          clientList[0].postMessage({ type: "NOTIFICATION_CLICK" });
          return clientList[0].focus();
        }
        // App is closed — open directly at /chat
        if (clients.openWindow) {
          return clients.openWindow(self.location.origin + "/chat");
        }
      })
  );
});