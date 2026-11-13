/* Service worker — Comité de la Somme (site + admin)
   Mises à jour automatiques : les fichiers du site sont toujours relus sur le réseau en priorité.
   Ce fichier n'a JAMAIS besoin d'être modifié lors d'une mise à jour du site. */
const VERSION = 'v4'; /* v4 : menu sans Régionaux ; v3 : notifications push + données hors ligne */
const SHELL = 'cd80-shell-' + VERSION;
const RUNTIME = 'cd80-runtime-' + VERSION;

/* Notifications push (Firebase Cloud Messaging) : affiche les notifications envoyées depuis la console Firebase.
   Si le chargement échoue, le reste du service worker fonctionne normalement. */
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
  firebase.initializeApp({
  "apiKey": "AIzaSyDmi9aL4oXkqCokL_0nM70zyuexTQcrZj4",
  "authDomain": "comite-f1488.firebaseapp.com",
  "projectId": "comite-f1488",
  "storageBucket": "comite-f1488.firebasestorage.app",
  "messagingSenderId": "892199685134",
  "appId": "1:892199685134:web:b25f78d61bd6245c68005f"
});
  firebase.messaging();
} catch (e) { /* push indisponible */ }

const PRECACHE = [
  './', 'index.html', 'offline.html', 'base.css', 'hub.css', 'nav.js', 'footer.js', 'pwa.js', 'track.js',
  'logocomite.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'clubs.html', 'calendrier.html', 'cdc.html', 'championnats.html', 'classement.html', 'comite.html',
  'archives.html', 'resultats.html', 'tirages.html', 'documentations.html', 'annuaire.html', 'coupe-de-france.html', 'regionaux.html', 'confidentialite.html',
  'site-data.js', 'event.js', 'cms.js', 'hub.js', 'hub.css', 'push.js', 'agenda.js', 'meteo.js', 'firebase-config.js', 'fonts.css', 'manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      /* un fichier manquant ne doit pas bloquer l'installation */
      .then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('cd80-') && k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Jamais de cache pour les données en direct (base, connexion admin, mesures) */
const LIVE = /(firestore|identitytoolkit|securetoken|firebaseinstallations|firebaselogging|googleapis\.com\/(identitytoolkit|v1|v0))/i;
const STATIC_CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com\/firebasejs|cdnjs\.cloudflare\.com)\//;

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || LIVE.test(url.href)) return;
  if (req.headers.has('range') || /\.pdf$/i.test(url.pathname)) return; /* PDF : toujours en direct */

  /* Fichiers du site (pages, CSS, JS, images) : TOUJOURS le réseau d'abord → les mises à jour
     apparaissent tout de suite, sans rien modifier ici. Le cache ne sert que hors connexion
     (ou si le réseau met plus de 4 s à répondre). */
  if (url.origin === location.origin) {
    e.respondWith(
      new Promise(resolve => {
        const fromCache = () => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('offline.html') : Response.error()));
        const timer = setTimeout(() => fromCache().then(r => r && r.type !== 'error' && resolve(r)), 4000);
        fetch(req, { cache: 'no-cache' })
          .then(r => {
            clearTimeout(timer);
            if (r.ok) { const c = r.clone(); caches.open(SHELL).then(x => x.put(req, c)); }
            resolve(r);
          })
          .catch(() => { clearTimeout(timer); fromCache().then(resolve); });
      })
    );
    return;
  }

  /* Polices et bibliothèques versionnées (Google Fonts, Firebase SDK, cdnjs) : cache + rafraîchi en arrière-plan */
  if (STATIC_CDN.test(url.href)) {
    e.respondWith(
      caches.open(RUNTIME).then(cache =>
        cache.match(req).then(hit => {
          const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') cache.put(req, r.clone()); return r; }).catch(() => hit);
          return hit || net;
        })
      )
    );
  }
});
