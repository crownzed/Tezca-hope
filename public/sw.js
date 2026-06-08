/**
 * Service Worker — PWA offline cache + Push notifications.
 * File này được serve từ /sw.js (public folder).
 */

const CACHE_NAME = 'tezca-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: xóa cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Không cache API calls
  if (request.url.includes('/api/') || request.url.includes('/ws')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful GET responses
        if (request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  let data = { title: 'Tezca', body: 'Bạn có thông báo mới' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Tezca', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'default',
      data: { url: data.url || '/' },
    })
  );
});

// Click notification → mở app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus tab đang mở nếu có
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Mở tab mới
      return self.clients.openWindow(url);
    })
  );
});
