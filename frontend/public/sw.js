self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Simple network-first strategy; falls back to cache when offline
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
