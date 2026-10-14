self.addEventListener("notificationclick", (event) => {
  const requestedPath = event.notification.data?.url;
  event.notification.close();

  event.waitUntil((async () => {
    let targetUrl = self.location.origin;
    if (typeof requestedPath === "string") {
      const parsed = new URL(requestedPath, self.location.origin);
      if (parsed.origin === self.location.origin) targetUrl = parsed.href;
    }

    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.focus();
        if (client.url !== targetUrl && "navigate" in client) await client.navigate(targetUrl);
        return;
      }
    }
    await self.clients.openWindow(targetUrl);
  })());
});
