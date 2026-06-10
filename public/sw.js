const CACHE_NAME = 'personal-os-cache-v1';

// Add list of files to cache here.
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Very basic fetch handler to satisfy PWA installability requirements
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // If both cache and network fail, it's offline and uncached.
          // For a true offline-first app, you'd serve an offline fallback here.
          return new Response("Offline Mode");
        });
      })
  );
});
