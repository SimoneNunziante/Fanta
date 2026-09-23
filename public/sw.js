// Service worker: l'app funziona offline dopo la prima apertura, ma gli aggiornamenti si vedono subito.
// - File con hash nel nome (assets/*): non cambiano mai, quindi cache-first.
// - Tutto il resto (pagina, manifest, icone, dati, immagini): rete prima, cache solo se offline.
//   Con stale-while-revalidate nome, icona e pagina restavano vecchi fino a piu' riaperture.
const CACHE = "fanta-v4";

/**
 * Pre-carica subito cio' che serve offline: la pagina, i file che referenzia (JS/CSS con hash,
 * manifest, icone) e i dati dei giocatori. Senza questo, alla prima apertura quei file arrivano
 * prima che il service worker sia attivo e l'app offline non partirebbe.
 */
async function precarica() {
  const cache = await caches.open(CACHE);
  const home = self.registration.scope;
  const res = await fetch(home, { cache: "no-cache" });
  if (!res.ok) return;
  await cache.put(home, res.clone());
  const html = await res.text();
  const risorse = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => new URL(m[1], home))
    .filter((u) => u.origin === self.location.origin)
    .map((u) => u.href);
  await cache.addAll([...new Set([...risorse, new URL("data/giocatori.json", home).href])]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precarica().catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  // ignoreVary: gli script con crossorigin portano l'header Origin, la copia pre-caricata no.
  const inCache = await cache.match(req, { ignoreVary: true });
  if (inCache) return inCache;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    // "no-cache": ricontrolla col server anche se la cache HTTP del browser ha ancora una copia.
    const res = await fetch(req, { cache: "no-cache" });
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const inCache = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
    if (inCache) return inCache;
    // Offline e pagina mai vista con questo URL: ripiega sulla home dell'app.
    if (req.mode === "navigate") {
      const home = await cache.match(self.registration.scope, { ignoreVary: true });
      if (home) return home;
    }
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(url.pathname.includes("/assets/") ? cacheFirst(req) : networkFirst(req));
});
