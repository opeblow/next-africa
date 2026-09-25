self.addEventListener("push", (event) => {
  let data;
  try { data = event.data.json(); } catch { return; }
  event.waitUntil(self.registration.showNotification(data.title || "NEXT Africa", {
    body: data.body, icon: "/favicon.svg", tag: "next-reminders", data: { url: "/?view=nudges" },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(new URL("/?view=nudges", self.location.origin).href));
});
