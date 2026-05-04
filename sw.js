const CACHE = "diet-tracker-v5";
const ASSETS = ["./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

// Network First strategy — always try network, fall back to cache
// This ensures home screen always shows latest version when online
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // Only handle GET requests for our own origin
  if(e.request.method !== "GET") return;

  e.respondWith(
    fetch(e.request)
      .then(networkResp => {
        // Network succeeded — update cache with fresh version
        if(networkResp && networkResp.status === 200) {
          const clone = networkResp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return networkResp;
      })
      .catch(() => {
        // Network failed — serve from cache (offline mode)
        return caches.match(e.request)
          .then(cached => cached || caches.match("./index.html"));
      })
  );
});
