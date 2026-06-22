// ============================================================
// sw.js — VERSI HOSTING (pwa-yogis.infinityfreeapp.com)
// Path disesuaikan dengan struktur root hosting
// ============================================================

const CACHE_NAME = 'toko-pwa-v2';

const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install: cache file inti
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching core assets');
        // Gunakan Promise.allSettled agar 1 file gagal tidak batalkan semua
        return Promise.allSettled(
          urlsToCache.map(url =>
            cache.add(url).catch(err => console.warn('Skip cache:', url, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: hapus cache lama
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: cache first, lalu network (kecuali API & CDN)
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // Skip request API (harus real-time)
  if (url.includes('/api-toko/') || url.includes('.php')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Skip CDN eksternal
  if (url.includes('cdn.tailwindcss') || url.includes('cdnjs.') || url.includes('jsdelivr.')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
  );
});
