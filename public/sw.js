// Service Worker for Push Notifications

self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  if (!event.data) {
    console.log('[SW] No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data:', data);
    
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      vibrate: [200, 100, 200],
      data: data.data || {},
      tag: 'habit-reminder-' + Date.now(), // Unique tag to prevent grouping
      renotify: true, // Always notify even if same tag
      requireInteraction: false, // Auto-dismiss after a while
      silent: false, // Make sure sound plays
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    // Always show notification, even if app is in foreground
    event.waitUntil(
      self.registration.showNotification(data.title, options)
        .then(() => console.log('[SW] Notification shown successfully'))
        .catch((err) => console.error('[SW] Failed to show notification:', err))
    );
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});