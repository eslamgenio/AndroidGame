// Service worker template. The build replaces the two placeholders below
// with a hash of the build and the list of every file the game needs
// (see build/serviceWorker.ts), so the game works offline after one visit.
const CACHE = 'patch-notes-__VERSION__';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

// Drop caches from older builds.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Cache first: every build gets a new cache, so cached files are never stale
// for long. Page navigations fall back to the cached app shell when offline.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: request.mode === 'navigate' }).then(
      (cached) =>
        cached ??
        fetch(request).catch(() => (request.mode === 'navigate' ? caches.match('./') : Response.error())),
    ),
  );
});
