const cacheName = "recicla-cache-v1";
const assets = [
  "/",
  "/index.html",
  "/styles.css",
  "/script.js",
  "/manifest.json",
  "https://unpkg.com/leaflet@1.9.3/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(cacheName).then(c => c.addAll(assets)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
