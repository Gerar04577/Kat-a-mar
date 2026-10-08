/* Kat-a-Mar — service worker — v29
   Le numéro doit toujours correspondre à const VERSION dans index.html. */
const CACHE = "kat-a-mar-v29";
/* Le cours du permis hauturier est une page à part du dépôt : sans lui dans
   cette liste, il n'était jamais disponible sans réseau. */
const FILES = ["./", "./index.html", "./permis-hauturier.html",
               "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      /* addAll échoue en bloc si un seul fichier manque : on met chaque
         fichier séparément pour qu'un absent n'empêche pas les autres. */
      .then((cache) => Promise.all(FILES.map((f) => cache.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/*
  Document HTML : réseau d'abord, cache en secours.
  La nouvelle version publiée sur GitHub Pages s'installe donc dès la première
  ouverture en ligne, sans devoir changer le nom du cache à la main.

  CHAQUE PAGE EST RANGÉE SOUS SA PROPRE ADRESSE. Jusqu'à la v28 elles étaient
  toutes rangées sous « ./index.html » : ouvrir le cours du permis écrasait
  donc l'application elle-même dans le cache, et hors ligne on pouvait
  obtenir le cours à la place de l'application, ou l'inverse.

  Autres fichiers : cache d'abord, puis réseau.
*/
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const isDocument = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isDocument) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        /* Secours hors ligne : la page demandée, puis l'application. On ne
           renvoie l'application à la place d'une autre page que si cette
           page n'a jamais été vue. */
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
