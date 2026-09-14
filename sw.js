const CACHE_NAME = 'dragons-hunter-v12';

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

// File yang selalu ambil dari network dulu (penting)
const NETWORK_FIRST_FILES = [
  '/login.html',
  '/admin.html',
  '/register.html',
  '/firebase-config.js',
  '/manifest.json',
  '/admin-user-history.html',
  '/payline.html',
  '/index.html'
];

// ==================== INSTALL ====================
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Precache utama (wajib berhasil)
      await cache.addAll(urlsToCache);

      // Precache tambahan (opsional — gagal tidak masalah)
      await Promise.all([
        cache.addAll([
          '/monyet.png', '/serigala.png', '/panda.png', '/beruang.png',
          '/gajah.png', '/singa.png', '/rusa.png', '/kucing.png',
          '/burung.png', '/kelinci.png'
        ]).catch(() => {}),
        cache.addAll([
          '/naga.mp4', '/harimau.mp4', '/intro-dragon.mp4'
        ]).catch(() => {})
      ]);

      console.log('✅ SW installed, cache:', CACHE_NAME);
      await self.skipWaiting();
    })()
  );
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Hapus cache lama
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Hapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );

      // Update firebase-config.js dari network (kalau online)
      try {
        const cache = await caches.open(CACHE_NAME);
        const networkResponse = await fetch('/firebase-config.js', { cache: 'no-store' });
        if (networkResponse && networkResponse.ok) {
          await cache.put('/firebase-config.js', networkResponse.clone());
          console.log('🔄 firebase-config.js diperbarui');
        }
      } catch (error) {
        console.log('⚠️ Offline - pakai cache config');
      }

      await self.clients.claim();
      console.log('✅ SW activated:', CACHE_NAME);
    })()
  );
});

// ==================== FETCH ====================
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // Skip Firebase / gstatic / googleapis (biarkan langsung ke network)
  if (url.includes('firebase') || url.includes('googleapis') || url.includes('gstatic')) {
    return;
  }

  // Halaman penting → Network First
  if (NETWORK_FIRST_FILES.some(file => url.includes(file))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Navigasi halaman → Network First dengan fallback offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return caches.match('/login.html');
        })
    );
    return;
  }

  // Asset statis → Cache First dengan background revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// ==================== MESSAGE ====================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(event.data.urls))
    );
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(names.map((n) => caches.delete(n)))
      )
    );
  }
});

// ==================== PUSH NOTIFICATION ====================
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (error) {
    data = {
      title: 'Dragons Hunter',
      body: event.data ? event.data.text() : 'Notifikasi baru',
      icon: 'icon-192.png',
      url: '/'
    };
  }

  const options = {
    body: data.body || 'Anda memiliki notifikasi baru',
    icon: data.icon || 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Buka' },
      { action: 'close', title: 'Tutup' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Dragons Hunter', options)
  );
});

// ==================== NOTIFICATION CLICK ====================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = (event.notification.data && event.notification.data.url) || '/';

      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// ==================== BACKGROUND SYNC ====================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncPendingTransactions());
  }
  if (event.tag === 'sync-game-data') {
    event.waitUntil(syncGameData());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-game-data') {
    event.waitUntil(updateGameData());
  }
});

async function syncPendingTransactions() {
  try {
    const cache = await caches.open('pending-transactions');
    const pendingTransactions = await cache.keys();

    for (const request of pendingTransactions) {
      const response = await cache.match(request);
      const transaction = await response.json();
      const dbUrl = await getFirebaseUrl();

      const fetchResponse = await fetch(dbUrl + '/transactions.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });

      if (fetchResponse.ok) {
        await cache.delete(request);
      }
    }

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

async function syncGameData() {
  try {
    const cache = await caches.open('game-data');
    const cachedData = await cache.match('/game-data.json');

    if (cachedData) {
      const data = await cachedData.json();
      const dbUrl = await getFirebaseUrl();
      const fetchResponse = await fetch(dbUrl + '/game-stats.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

async function updateGameData() {
  try {
    const cache = await caches.open('game-data');
    const dbUrl = await getFirebaseUrl();

    const response = await fetch(dbUrl + '/config/rtp.json');
    if (response.ok) {
      const data = await response.json();
      await cache.put('/rtp-config.json', new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    return true;
  } catch (error) {
    console.error('Update game data error:', error);
    return false;
  }
}

async function getFirebaseUrl() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const configResponse = await cache.match('/firebase-config.js');

    if (configResponse) {
      const configText = await configResponse.text();
      const match = configText.match(/databaseURL\s*:\s*['"]([^'"]+)['"]/);
      if (match) return match[1];
    }
    return 'https://dragonhunter-2fdb7-default-rtdb.asia-southeast1.firebasedatabase.app';
  } catch (error) {
    console.error('Get Firebase URL error:', error);
    return 'https://dragonhunter-2fdb7-default-rtdb.asia-southeast1.firebasedatabase.app';
  }
}

// ==================== CACHE CLEANUP (7 hari) ====================
// Dijalankan sekali saat SW aktif, bukan pakai setInterval (SW bisa mati kapan saja)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();

        for (const key of keys) {
          const response = await cache.match(key);
          if (response) {
            const dateHeader = response.headers.get('date');
            if (dateHeader) {
              const cacheDate = new Date(dateHeader);
              const diffDays = (Date.now() - cacheDate) / (1000 * 60 * 60 * 24);
              if (diffDays > 7) {
                await cache.delete(key);
                console.log('🗑️ Cache dihapus (kadaluarsa):', key.url);
              }
            }
          }
        }
      } catch (err) {
        console.error('Cache cleanup error:', err);
      }
    })()
  );
});
