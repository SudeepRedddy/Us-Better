// Service Worker for Push Notifications

self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  // Default values in case parsing fails
  let title = 'New Notification';
  let options = {
    body: 'You have a new update.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/' },
    tag: 'habit-reminder',
    renotify: true
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
      options.icon = data.icon || options.icon;
      options.badge = data.badge || options.badge;
      options.data = data.data || options.data;
      // Unique tag to ensure multiple notifications show up
      options.tag = 'habit-reminder-' + Date.now();
    } catch (err) {
      console.error('[SW] Error parsing JSON:', err);
      // We continue with defaults so you at least see *something*
    }
  }

  // iOS-Specific options
  // Remove actions/vibrate as they are sometimes problematic on iOS PWAs
  const notificationPromise = self.registration.showNotification(title, options);
  event.waitUntil(notificationPromise);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Handle opening the app
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Immediate activation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});