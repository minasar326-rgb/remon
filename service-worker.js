const CACHE_NAME = 'abu-sefeen-cache-v1';
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
      console.log('[SW] Caching assets');
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const cacheCopy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
        }
        return res;
      }).catch(() => cached);
      return cached || networked;
    })
  );
});
