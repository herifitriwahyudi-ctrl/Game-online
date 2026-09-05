const CACHE_NAME = 'dragons-hunter-v11';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/login.html',
  '/register.html',
  '/index.html',
  '/admin.html',
  '/admin-user-history.html',
  '/pembayaran.html',
  '/payline.html',
  '/firebase-config.js',
  '/background-dragon.png',
  '/header-dragon.png',
  '/monyet.png',
  '/serigala.png',
  '/panda.png',
  '/beruang.png',
  '/gajah.png',
  '/singa.png',
  '/rusa.png',
  '/kucing.png',
  '/burung.png',
  '/kelinci.png',
  '/naga.mp4',
  '/harimau.mp4',
  '/intro-dragon.mp4',
  '/icon-192.png',
  '/icon-512.png',
  '/screenshot-game.png',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
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

// Fetch handler dengan strategi hybrid
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

  // Network First untuk halaman penting
  const importantFiles = ['/login.html', '/admin.html', '/register.html', '/firebase-config.js', '/manifest.json', '/admin-user-history.html', '/payline.html'];
  
  if (importantFiles.some(file => event.request.url.includes(file))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache First dengan revalidation untuk file statis
  if (event.request.url.includes('/')) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((response) => {
              if (response && response.status === 200 && response.type !== 'opaque') {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              }
              return response;
            })
            .catch(() => cachedResponse);

          // Return cached response immediately, update in background
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetchPromise;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/login.html');
          }
        })
    );
    return;
  }

  // Network First untuk file lainnya
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle cache update messages
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// Push notification
self.addEventListener('push', (event) => {
  let data = {};
  
  try {
    data = event.data.json();
  } catch (error) {
    data = {
      title: 'Dragons Hunter',
      body: event.data.text(),
      icon: 'icon-192.png',
      url: '/'
    };
  }
  
  const options = {
    body: data.body || 'Anda memiliki notifikasi baru',
    icon: data.icon || 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Buka'
      },
      {
        action: 'close',
        title: 'Tutup'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Dragons Hunter', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const url = event.notification.data.url || '/';
        
        // Cek apakah ada window yang sudah terbuka
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        
        // Buka window baru jika tidak ada
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background Sync untuk transaksi pending
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncPendingTransactions());
  }
  
  if (event.tag === 'sync-game-data') {
    event.waitUntil(syncGameData());
  }
});

// Periodik Sync untuk update data
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-game-data') {
    event.waitUntil(updateGameData());
  }
});

// Fungsi sinkronisasi transaksi pending
async function syncPendingTransactions() {
  try {
    const cache = await caches.open('pending-transactions');
    const pendingTransactions = await cache.keys();
    
    for (const request of pendingTransactions) {
      const response = await cache.match(request);
      const transaction = await response.json();
      
      // Kirim ke Firebase
      const dbUrl = await getFirebaseUrl();
      const fetchResponse = await fetch(dbUrl + '/transactions.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transaction)
      });
      
      if (fetchResponse.ok) {
        await cache.delete(request);
      }
    }
    
    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        message: 'Transaksi pending berhasil disinkronkan'
      });
    });
    
    return true;
  } catch (error) {
    console.error('Sync error:', error);
    return false;
  }
}

// Fungsi sinkronisasi data game
async function syncGameData() {
  try {
    const cache = await caches.open('game-data');
    const cachedData = await cache.match('/game-data.json');
    
    if (cachedData) {
      const data = await cachedData.json();
      
      // Kirim data ke Firebase
      const dbUrl = await getFirebaseUrl();
      const fetchResponse = await fetch(dbUrl + '/game-stats.json', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      return fetchResponse.ok;
    }
    
    return false;
  } catch (error) {
    console.error('Sync game data error:', error);
    return false;
  }
}

// Fungsi update data game
async function updateGameData() {
  try {
    const cache = await caches.open('game-data');
    const dbUrl = await getFirebaseUrl();
    
    // Fetch data terbaru dari Firebase
    const response = await fetch(dbUrl + '/config/rtp.json');
    if (response.ok) {
      const data = await response.json();
      await cache.put('/rtp-config.json', new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json'
        }
      }));
    }
    
    return true;
  } catch (error) {
    console.error('Update game data error:', error);
    return false;
  }
}

// Fungsi mendapatkan URL Firebase dari config
async function getFirebaseUrl() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const configResponse = await cache.match('/firebase-config.js');
    
    if (configResponse) {
      const configText = await configResponse.text();
      // Extract databaseURL dari config
      const match = configText.match(/databaseURL\s*:\s*['"]([^'"]+)['"]/);
      if (match) {
        return match[1];
      }
    }
    
    // Fallback URL (ganti dengan URL Firebase Anda)
    return 'https://dragonhunter-2fdb7-default-rtdb.asia-southeast1.firebasedatabase.app';
  } catch (error) {
    console.error('Get Firebase URL error:', error);
    return 'https://dragonhunter-2fdb7-default-rtdb.asia-southeast1.firebasedatabase.app';
  }
}

// Precache semua asset game
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all([
        cache.addAll(urlsToCache),
        // Precache gambar hewan
        cache.addAll([
          '/monyet.png',
          '/serigala.png',
          '/panda.png',
          '/beruang.png',
          '/gajah.png',
          '/singa.png',
          '/rusa.png',
          '/kucing.png',
          '/burung.png',
          '/kelinci.png'
        ]).catch(() => {}),
        // Precache video
        cache.addAll([
          '/naga.mp4',
          '/harimau.mp4',
          '/intro-dragon.mp4'
        ]).catch(() => {})
      ]);
    })
  );
});

// Handle offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html').then((cachedPage) => {
          if (cachedPage) {
            return cachedPage;
          }
          return caches.match('/login.html');
        });
      })
    );
  }
});

// Cek update service worker secara berkala
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Cek update config
      const cache = await caches.open(CACHE_NAME);
      const configResponse = await cache.match('/firebase-config.js');
      
      if (configResponse) {
        try {
          const networkResponse = await fetch('/firebase-config.js');
          if (networkResponse && networkResponse.ok) {
            await cache.put('/firebase-config.js', networkResponse.clone());
          }
        } catch (error) {
          console.log('Offline - menggunakan cache config');
        }
      }
    })()
  );
});

// Periodic cache cleanup
setInterval(async () => {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  // Hapus cache yang sudah tidak digunakan (lebih dari 7 hari)
  for (const key of keys) {
    const response = await cache.match(key);
    if (response) {
      const dateHeader = response.headers.get('date');
      if (dateHeader) {
        const cacheDate = new Date(dateHeader);
        const now = new Date();
        const diffDays = (now - cacheDate) / (1000 * 60 * 60 * 24);
        
        if (diffDays > 7) {
          await cache.delete(key);
          console.log('Cache dihapus:', key.url);
        }
      }
    }
  }
}, 1000 * 60 * 60); // Setiap 1 jam
