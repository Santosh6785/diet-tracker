const CACHE = "diet-tracker-BUILD_VERSION_20260507";
const ASSETS = ["./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

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
  if(e.request.method !== "GET") return;

  // Never cache version.json
  if(e.request.url.includes("version.json")){
    e.respondWith(fetch(e.request));
    return;
  }

  // Network First for HTML and SW files
  if(e.request.url.endsWith("/")||e.request.url.endsWith("index.html")||e.request.url.endsWith("sw.js")){
    e.respondWith(
      fetch(e.request).then(resp=>{
        if(resp&&resp.status===200) caches.open(CACHE).then(c=>c.put(e.request,resp.clone()));
        return resp;
      }).catch(()=>caches.match(e.request))
    );
    return;
  }

  // Cache First for icons
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached) return cached;
      return fetch(e.request).then(resp=>{
        if(resp&&resp.status===200) caches.open(CACHE).then(c=>c.put(e.request,resp.clone()));
        return resp;
      });
    })
  );
});
