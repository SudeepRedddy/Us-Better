// public/sw.js
self.addEventListener('push', (event) => {
  // Default values
  let title = 'New Notification';
  let options = {
    body: 'You have a new update.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'habit-reminder-' + Date.now(),
    renotify: true
  };

  // Parse the server payload
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
      options.icon = data.icon || options.icon;
      options.badge = data.badge || options.badge;
      if (data.data) options.data = data.data;
    } catch (err) {
      console.error('Error parsing push data', err);
    }
  }

  // Show the notification (No actions, No vibration)
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Open the app
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});