// Update this version number whenever you deploy new features
const CACHE_NAME = 'stocksage-v2-20251201'; // Updated for network printer + offline fixes
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new service worker version:', CACHE_NAME);
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('[SW] Failed to cache some resources:', err);
        });
      })
  );
});

// Fetch event - Network First strategy for better updates
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // For HTML files and API calls, always try network first
  if (request.method === 'GET' && 
      (request.headers.get('accept')?.includes('text/html') || 
       request.url.includes('/api/'))) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the new version if successful
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache when offline
          return caches.match(request);
        })
    );
  } else {
    // For other resources, cache first
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request);
        })
    );
  }
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new service worker:', CACHE_NAME);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});
