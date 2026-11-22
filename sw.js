// Venezia KYC service worker: caches only the app's own screens so it opens fast.
// It never caches member data: calls to the Society's Google server always go to the network.
const CACHE = 'vkyc-v1';
const SHELL = ['./', 'index.html', 'app.css?v=1', 'app.js?v=1', 'config.js?v=1', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // server calls and fonts: network only
  // Network first, so updates reach members at once; fall back to the cached screens when offline.
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: url.pathname.endsWith('/') || url.pathname.endsWith('index.html') }).then(r => r || caches.match('index.html')))
  );
});
