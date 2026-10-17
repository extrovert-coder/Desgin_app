/**
 * Offline Student Assistant — Service Worker
 * Demonstrates: Offline First Architecture, Cache Versioning & Stale/Fallback Management
 */

const CACHE_NAME = 'osa-cache-v1';

// Comprehensive precache manifest covering the complete application shell and import graph
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/css/variables.css',
  './assets/css/base.css',
  './assets/css/layout.css',
  './assets/css/components.css',
  './assets/css/animations.css',
  './js/app.js',
  './js/utils/dom.js',
  './js/core/eventBus.js',
  './js/core/router.js',
  './js/core/theme.js',
  './js/data/stores.js',
  './js/data/db.js',
  './js/data/repository.js',
  './js/services/notesService.js',
  './js/services/tasksService.js',
  './js/services/quizService.js',
  './js/services/plannerService.js',
  './js/services/exportService.js',
  './js/components/modal.js',
  './js/components/confirm.js',
  './js/components/toast.js',
  './js/modules/dashboard/dashboardView.js',
  './js/modules/notes/notesView.js',
  './js/modules/tasks/tasksView.js',
  './js/modules/quiz/quizView.js',
  './js/modules/planner/plannerView.js',
  './js/modules/settings/settingsView.js'
];

/**
 * Installation: Precache application shell
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Precaching application shell...');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error('[ServiceWorker] Precache failed:', err);
      })
  );
});

/**
 * Activation: Clean up obsolete caches safely without deleting unrelated caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name.startsWith('osa-cache-') && name !== CACHE_NAME) {
              console.log('[ServiceWorker] Purging obsolete cache:', name);
              return caches.delete(name);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch Event: Cache-First for static assets, network-first with cached index.html fallback for navigation
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests (bypass POST operations like test runners or data endpoints)
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Ignore cross-origin and non-http schemes
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle SPA Navigation requests (e.g. entering via sub-route or refreshing)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            return networkResponse;
          }
        } catch (err) {
          // Network failed (device is offline)
        }

        const cached = await caches.match(request) ||
                       await caches.match('./index.html') ||
                       await caches.match('./');
        if (cached) {
          return cached;
        }

        return new Response('<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>Offline</h1><p>Please check your connection.</p></body></html>', {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      })()
    );
    return;
  }

  // Cache-First strategy for static assets (CSS, JS, images, icons)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch from network and dynamically cache
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Provide friendly fallback if asset is completely missing
          if (request.destination === 'image') {
            return caches.match('./assets/icons/favicon.svg');
          }
          return new Response('Offline: Asset not available in local cache.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
    })
  );
});

/**
 * Communication channel for manual updates
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
