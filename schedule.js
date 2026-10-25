// Horarios de cierre de los sorteos, cálculo de los avisos (2 horas antes del cierre), texto de las
// notificaciones y estado compartido con el service worker (IndexedDB). Sin DOM: el service worker
// lo carga con importScripts.
'use strict';

// Cierre de la validación de apuestas, en hora de España, según la web oficial de Loterías y
// Apuestas del Estado. `days`: 0 = domingo … 6 = sábado. La Quiniela no está porque su cierre
// cambia cada jornada (según los partidos).
const DRAWS = {
  euromillones: { name: 'Euromillones', days: [2, 5], close: [20, 30] },
  eurodreams: { name: 'EuroDreams', days: [1, 4], close: [20, 30] },
  primitiva: { name: 'La Primitiva', days: [1, 4, 6], close: [21, 15] },
  gordo: { name: 'El Gordo de la Primitiva', days: [0], close: [21, 0] }, // a veces 21:15: mejor avisar antes
  bonoloto: { name: 'Bonoloto', days: [0, 1, 2, 3, 4, 5, 6], close: [21, 0] },
};
const REMIND_BEFORE_MS = 2 * 3600e3;
const HORIZON_DAYS = 14; // horas de aviso que se suben al servidor cada vez

// ---------- Hora de España ----------

const madridFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Madrid', hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});
function madridParts(ms) {
  const p = Object.fromEntries(madridFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month - 1, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second };
}
// Diferencia entre la hora de España y la UTC en ese instante (1 h en invierno, 2 h en verano)
function madridOffset(ms) {
  const p = madridParts(ms);
  return Date.UTC(p.y, p.m, p.d, p.h, p.min, p.s) - Math.floor(ms / 1000) * 1000;
}
// Instante (ms) de una hora de reloj en España, sea cual sea la zona horaria del dispositivo
function madridTime(y, m, d, h, min) {
  const guess = Date.UTC(y, m, d, h, min);
  const t = guess - madridOffset(guess);
  return guess - madridOffset(t);
}

const pad2 = (n) => String(n).padStart(2, '0');
const closeLabel = (key) => `${DRAWS[key].close[0]}:${pad2(DRAWS[key].close[1])}`;

// Avisos de los juegos elegidos cuya hora cae en [from, to), ordenados: { game, close, remind }
function reminders(games, from, to) {
  const out = [];
  const start = madridParts(from - 864e5);
  const days = Math.ceil((to - from) / 864e5) + 2;
  for (let i = 0; i <= days; i++) {
    const day = new Date(Date.UTC(start.y, start.m, start.d + i));
    for (const key of games) {
      const g = DRAWS[key];
      if (!g || !g.days.includes(day.getUTCDay())) continue;
      const close = madridTime(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), g.close[0], g.close[1]);
      const remind = close - REMIND_BEFORE_MS;
      if (remind >= from && remind < to) out.push({ game: key, close, remind });
    }
  }
  return out.sort((a, b) => a.remind - b.remind);
}

// Texto de la notificación para los avisos de un mismo momento (o uno genérico si no hay ninguno)
function buildNotification(items) {
  if (!items || !items.length) {
    return { title: 'RandomIt', body: 'Se acerca el cierre de un sorteo. Entra y saca tu combinación.', game: null };
  }
  if (items.length === 1) {
    const key = items[0].game;
    return {
      title: `${DRAWS[key].name}: quedan 2 horas`,
      body: `Puedes jugar hasta las ${closeLabel(key)}. Entra en RandomIt y saca tu combinación.`,
      game: key,
    };
  }
  return {
    title: 'Quedan 2 horas para jugar',
    body: items.map((it) => `${DRAWS[it.game].name} (hasta las ${closeLabel(it.game)})`).join(' · '),
    game: items[0].game,
  };
}

// ---------- IndexedDB: ajustes de avisos compartidos con el service worker ----------
// 'notif': { on, games } · 'meta': { device, subscribed, last }

let ritDB;
function ritOpen() {
  ritDB = ritDB || new Promise((resolve, reject) => {
    const req = indexedDB.open('randomit', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return ritDB;
}
async function kvGet(key) {
  const db = await ritOpen();
  return new Promise((resolve, reject) => {
    const r = db.transaction('kv').objectStore('kv').get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function kvSet(key, value) {
  const db = await ritOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Servidor de avisos (api/push.js) ----------

async function pushApi(body) {
  const res = await fetch('api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// Sube al servidor las horas de aviso de los próximos días (nada más: ni juegos ni datos personales)
async function syncSchedule() {
  const meta = (await kvGet('meta')) || {};
  const notif = (await kvGet('notif')) || {};
  if (!meta.device || !meta.subscribed) return false;
  const now = Date.now();
  const times = notif.on ? [...new Set(reminders(notif.games || [], now, now + HORIZON_DAYS * 864e5).map((r) => r.remind))] : [];
  await pushApi({ action: 'schedule', device: meta.device, times });
  return true;
}
