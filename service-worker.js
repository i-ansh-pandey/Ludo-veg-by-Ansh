
const CACHE = "ludo-veg-cache-v1";
const ASSETS = [
  ".","/index.html","/style.css","/script.js","/manifest.webmanifest",
  "/assets/ui/crown.svg",
  "/assets/veg/cabbage.svg","/assets/veg/potato.svg","/assets/veg/sweetcorn.svg","/assets/veg/tomato.svg"
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r=>r || fetch(e.request)));
});
