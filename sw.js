/* SAS STOCK — fonctionnement hors ligne. Changer VERSION à chaque mise à jour. */
const VERSION = 'sas-stock-2.9.2';
const FICHIERS = ['./', 'index.html', 'lic.js', 'core.js', 'ui.js', 'ui2.js', 'ui3.js', 'fb.js', 'facture.js', 'plus.js', 'lots.js', 'inventaire.js', 'notif.js', 'tarifs.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.pathname.endsWith('.apk')) return; // le fichier d'installation Android n'est pas mis en cache
  if (u.origin !== location.origin && !(u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/'))) return; // ne jamais intercepter Firebase ni les autres sites
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request, { cache: 'no-cache' }).then(r => { if (r && r.ok) { const copie = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copie)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
