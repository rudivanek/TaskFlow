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
  const targetUrl = event.notification.data?.url ?? "/chat";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
