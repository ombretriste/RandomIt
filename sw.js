// Cambia la versión al modificar archivos para que los móviles descarguen la nueva versión
const CACHE = 'randomit-v19';
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'schedule.js',
  'app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

importScripts('schedule.js');

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Red primero (para recibir actualizaciones); caché si no hay conexión. La API nunca se cachea.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).pathname.includes('/api/')) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ---------- Avisos ----------

// El push llega vacío: se buscan los sorteos cuyo aviso (2 h antes del cierre) acaba de cumplirse.
// Siempre se muestra algo (Safari retira el permiso si un push no enseña notificación).
async function handlePush() {
  const notif = (await kvGet('notif')) || {};
  const meta = (await kvGet('meta')) || {};
  const now = Date.now();
  const due = reminders(notif.games || [], now - 25 * 60e3, now + 5 * 60e3).filter((r) => r.remind > (meta.last || 0));
  const latest = due.length ? due[due.length - 1].remind : 0;
  const n = buildNotification(due.filter((r) => r.remind === latest));
  if (latest) await kvSet('meta', { ...meta, last: latest });
  await self.registration.showNotification(n.title, {
    body: n.body,
    tag: `randomit-${n.game || 'aviso'}`,
    renotify: true,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    data: { game: n.game },
  });
  // Se vuelven a subir las horas de los próximos días: la cadena de avisos sigue aunque no se abra la app
  try { await syncSchedule(); } catch (_) { /* sin conexión: se reintentará */ }
}
self.addEventListener('push', (event) => event.waitUntil(handlePush()));

// Al tocar el aviso se abre la app; tras pulsar «Entrar» se abre el sorteo de ese juego
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const game = (event.notification.data && event.notification.data.game) || '';
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.length) {
      wins[0].postMessage({ type: 'open-game', game });
      return wins[0].focus();
    }
    return self.clients.openWindow(game ? `./?jugar=${game}` : './');
  })());
});
