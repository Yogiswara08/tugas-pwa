const CACHE_NAME = 'toko-pwa-v1';
const urlsToCache = [
  '/Platform/app-toko/',
  '/Platform/app-toko/index.html',
  '/Platform/app-toko/app.js',
  '/Platform/app-toko/manifest.json',
  '/Platform/app-toko/icons/icon-192x192.png',
  '/Platform/app-toko/icons/icon-512x512.png'
];

// Install: cache file inti
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching core assets');
        return cache.addAll(urlsToCache);
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

// Fetch: cache first, lalu network (kecuali API)
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Jangan cache request API (get_barang.php) karena data harus real-time
  if (url.includes('/api-toko/') || url.includes('get_barang.php')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          // Simpan ke cache untuk request yang sukses
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