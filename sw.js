// Margini: tiene in cache il programma per funzionare offline.
// Libri e appunti NON passano di qui: stanno in IndexedDB sul dispositivo.
// prefisso diverso per la versione amici: le due app condividono il dominio
const P = self.registration.scope.includes('/margini-app/') ? 'margini-app-' : 'margini-';
const V = P + 'v10';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest',
  'icon-180.png', 'icon-192.png', 'icon-512.png',
  'vendor/pdf.min.js', 'vendor/pdf.worker.min.js',
  'vendor/epub.min.js', 'vendor/jszip.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V && (P === 'margini-' ? !k.startsWith('margini-app-') : k.startsWith(P))).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Pagina: rete prima (così gli aggiornamenti arrivano subito), cache se sei offline.
// Librerie e icone: cache prima, aggiornamento in background.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put('index.html', copy)); }
        return res;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }
  e.respondWith(
    caches.open(V).then(async c => {
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => {
        if (res.ok) c.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
