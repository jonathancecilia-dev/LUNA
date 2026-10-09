/* LUNA — service worker minimal : l'appli s'ouvre sans réseau.
   Stratégie : on sert la copie en cache tout de suite, et on la met à jour en arrière-plan
   (la nouvelle version apparaît à l'ouverture suivante). Rien d'autre n'est stocké ici :
   les données (réveil) restent dans le localStorage de l'appareil. */
const CACHE = 'luna-corps-v3';
const ASSETS = ['./', './index.html', './luna-journal.js', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit || caches.match('./index.html'));
      e.waitUntil(net.catch(() => {}));
      return hit || net;
    })
  );
});
