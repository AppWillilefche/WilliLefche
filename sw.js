// Service Worker · Willilefche (Escuela Municipal de Valcheta)
// Soporte de notificaciones push de OneSignal
try {
  importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
} catch (e) {
  // Ignorar si se carga offline
}

const CACHE_NAME = 'willilefche-pwa-v1.15.17';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './OneSignalSDKWorker.js',
  './css/styles.css',
  './js/firebase-config.js',
  './js/notifications.js',
  './js/data.js',
  './js/auth.js',
  './js/app.js',
  './img/logo-willilefche.jpg',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/hero.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Estrategia Network-First con respaldo en caché (garantiza ver siempre la última versión online y funcionar offline)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
