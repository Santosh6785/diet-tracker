const CACHE = "diet-tracker-BUILD_VERSION_20260507";
const ASSETS = [
  "./index.html", "./manifest.json",
  "./icon-192.png", "./icon-512.png",
  "./summary.html", "./offline.html"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS.filter(a => !a.includes("offline") || true)))
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
    e.respondWith(
      fetch(e.request).catch(()=>new Response('{"version":"offline"}',{headers:{"Content-Type":"application/json"}}))
    );
    return;
  }

  // Network First for HTML and SW files — serve offline.html as fallback
  if(e.request.url.endsWith("/")||e.request.url.endsWith("index.html")||e.request.url.endsWith("sw.js")){
    e.respondWith(
      fetch(e.request).then(resp=>{
        if(resp&&resp.status===200) caches.open(CACHE).then(c=>c.put(e.request,resp.clone()));
        return resp;
      }).catch(()=>caches.match(e.request).then(cached=>cached||caches.match("./offline.html")))
    );
    return;
  }

  // Cache First for icons and static assets
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached) return cached;
      return fetch(e.request).then(resp=>{
        if(resp&&resp.status===200) caches.open(CACHE).then(c=>c.put(e.request,resp.clone()));
        return resp;
      }).catch(()=>caches.match("./offline.html"));
    })
  );
});

// Background Sync: notify clients to flush pending Firebase writes
self.addEventListener("sync", e => {
  if(e.tag === "dt-sync-writes"){
    e.waitUntil(
      self.clients.matchAll().then(clients=>
        clients.forEach(c=>c.postMessage({type:"SYNC_QUEUE_FLUSH"}))
      )
    );
  }
});
