const CACHE_NAME = 'dragons-hunter-v1';
const urlsToCache = [
  '/',
  '/login.html',
  '/register.html',
  '/index.html',
  '/admin.html',
  '/pembayaran.html',
  '/firebase-config.js',
  '/background-dragon.png',
  '/header-dragon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/intro-dragon.mp4',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch handler dengan strategi Cache First
self.addEventListener('fetch', (event) => {
  // Skip untuk API Firebase dan cross-origin requests
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') || 
      event.request.url.includes('gstatic')) {
    return;
  }
  
  // Skip untuk metode non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Jika ada di cache, kembalikan
        if (cachedResponse) {
          return cachedResponse;
        }

        // Jika tidak ada di cache, fetch dari network
        return fetch(event.request)
          .then((response) => {
            // Jika response valid, simpan di cache
            if (!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }

            // Clone response dan simpan di cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Jika offline dan halaman tidak ada di cache, kembalikan fallback
            if (event.request.mode === 'navigate') {
              return caches.match('/login.html');
            }
          });
      })
  );
});

// Message handler untuk update cache
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notifikasi push (opsional)
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: data.icon || 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Klik notifikasi
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});
