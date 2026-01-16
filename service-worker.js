/**
 * Service Worker for LOGiQA PWA
 * Handles caching and offline functionality
 */

const CACHE_NAME = 'logiqa-v13'; // Fixed verifyOtp type: email
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles/main.css',
    '/main.js',
    '/router/router.js',
    '/api/api-client.js',
    '/api/auth-service.js',
    '/api/orders-service.js',
    '/pages/projects/projects.js',
    '/pages/projects/projects.css',
    '/pages/executive/executive.js',
    '/pages/executive/executive.css',
    '/pages/profile/profile.js',
    '/pages/profile/profile.css',
    '/pages/profile/orders/orders.js',
    '/pages/profile/orders/orders.css',
    '/components/project-modal.js',
    '/components/project-modal.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip external requests
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached version
                    return cachedResponse;
                }

                // Fetch from network and cache
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200) {
                            return response;
                        }

                        // Clone response for caching
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseClone);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Offline fallback for HTML pages
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/');
                        }
                    });
            })
    );
});
