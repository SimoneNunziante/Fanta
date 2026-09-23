// Service worker minimale: stale-while-revalidate su tutte le risorse dello stesso dominio,
// cosi' l'app funziona anche offline dopo la prima apertura e si aggiorna in background.
const CACHE = "fantamantra-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const inCache = await cache.match(req);
      const daRete = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => inCache);
      return inCache ?? daRete;
    }),
  );
});
