const CACHE_NAME = 'abu-sefeen-cache-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './login.html',
  './dashboard.html',
  './attendance.html',
  './students.html',
  './student.html',
  './reports.html',
  './settings.html',
  './css/style.css',
  './css/dashboard.css',
  './css/responsive.css',
  './js/utils.js',
  './js/security.js',
  './js/auth.js',
  './js/firebase-config.js',
  './js/activity.js',
  './js/students.js',
  './js/attendance.js',
  './js/scanner.js',
  './js/reports.js',
  './js/settings.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching fresh assets v2');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('SW cache error:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-First with Cache Fallback for absolute freshness
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Ignore external CDNs from hard caching
  if (event.request.url.includes('firebase') || event.request.url.includes('googleapis')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
