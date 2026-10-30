// Función serverless de Vercel: avisos push de RandomIt (2 horas antes del cierre de cada sorteo).
//
// El servidor NO sabe a qué juegos quiere apostar nadie: cada dispositivo le sube solo las horas a
// las que toca avisar. A esas horas manda un push vacío y es el service worker del propio móvil el
// que mira qué sorteo cierra y compone la notificación. Por eso no hace falta cifrar contenido:
// solo la firma VAPID (ES256), que se hace con WebCrypto. Mismo diseño que TaskCTRL.
//
//   GET  /api/push                      -> { configured, devices, pending, lastRun, lastSend } | { configured: false, vars }
//                                          (comprobación: pending = dispositivos con avisos programados, lastRun =
//                                          última llamada del cron, lastSend = { at, status } del último push enviado)
//   GET  /api/push?run                  -> envía los avisos pendientes (lo llama un cron cada 5 min)
//   POST /api/push { action: 'key' }    -> { publicKey }  (clave VAPID pública)
//   POST /api/push { action: 'subscribe', device, sub }    -> { ok }
//   POST /api/push { action: 'schedule', device, times }   -> { ok, count }  (sustituye las horas)
//   POST /api/push { action: 'test', device }              -> { ok }  (aviso inmediato)
//   POST /api/push { action: 'unsubscribe', device }       -> { ok }
//
// `device` es un identificador aleatorio de 32 caracteres hex creado en el dispositivo.
// Almacenamiento: Upstash Redis (integración de Vercel), vía su API REST. Todas las claves empiezan
// por «rit:», así que puede compartir base de datos con las otras apps (TaskCTRL usa «tsk:», UnderCTRL «fin:»…).
// Las claves VAPID se crean solas la primera vez y se guardan en «rit:vapid».

// Variables de la base de datos (mismo criterio que PayCTRL: vale cualquier par …REST_API_URL/TOKEN)
function findRedisEnv(env = process.env) {
  const known = [['KV_REST_API_URL', 'KV_REST_API_TOKEN'], ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']];
  for (const [u, t] of known) if (env[u] && env[t]) return { url: env[u], token: env[t] };
  for (const k of Object.keys(env)) {
    const m = k.match(/^(.*)(REST_API_URL|REDIS_REST_URL)$/);
    if (!m || !/^https:\/\//.test(env[k] || '')) continue;
    const tk = m[1] + m[2].replace('URL', 'TOKEN');
    if (env[tk]) return { url: env[k], token: env[tk] };
  }
  return { url: null, token: null };
}
const { url: REDIS_URL, token: REDIS_TOKEN } = findRedisEnv();
const crypto = globalThis.crypto || require('crypto').webcrypto; // WebCrypto (global desde Node 19)
const DEVICE = /^[a-f0-9]{32}$/;
const MAX_TIMES = 200;
const MAX_AHEAD_MS = 15 * 864e5;
const PUSH_TTL_S = 30 * 60; // si el móvil está apagado más de media hora, ese aviso ya no llega

async function redis(...command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

// ---------- VAPID (RFC 8292) con WebCrypto ----------

const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const utf8 = (s) => new TextEncoder().encode(s);

let vapidCache;
async function vapidKeys() {
  if (vapidCache) return vapidCache;
  let raw = await redis('GET', 'rit:vapid');
  if (!raw) {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    await redis('SET', 'rit:vapid', JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }), 'NX');
    raw = await redis('GET', 'rit:vapid'); // por si otra llamada la creó a la vez
  }
  const jwk = JSON.parse(raw);
  const key = await crypto.subtle.importKey('jwk', { ...jwk, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const pub = new Uint8Array(65);
  pub[0] = 4;
  pub.set(unb64u(jwk.x), 1);
  pub.set(unb64u(jwk.y), 33);
  vapidCache = { key, publicKey: b64u(pub) };
  return vapidCache;
}

async function vapidHeader(endpoint, subject) {
  const { key, publicKey } = await vapidKeys();
  const head = b64u(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(utf8(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  // WebCrypto devuelve la firma ECDSA ya en formato r||s (64 bytes), que es el que pide JWT
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(`${head}.${body}`));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${publicKey}`;
}

// Push sin contenido: el service worker decide qué mostrar. Devuelve el código HTTP del servicio push.
async function sendPush(sub, subject) {
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: await vapidHeader(sub.endpoint, subject), TTL: String(PUSH_TTL_S), Urgency: 'high', 'Content-Length': '0' },
  });
  return res.status;
}

async function forget(device) {
  await redis('DEL', `rit:dev:${device}`, `rit:p:${device}`);
  await redis('SREM', 'rit:devs', device);
}

// Envía un push a cada dispositivo con alguna hora de aviso ya cumplida y borra esas horas
async function runDue(subject) {
  const now = Date.now();
  const devices = (await redis('SMEMBERS', 'rit:devs')) || [];
  let sent = 0;
  let gone = 0;
  for (const device of devices) {
    const due = await redis('ZRANGEBYSCORE', `rit:p:${device}`, '-inf', now, 'LIMIT', 0, 1);
    if (!due || !due.length) continue;
    await redis('ZREMRANGEBYSCORE', `rit:p:${device}`, '-inf', now);
    const raw = await redis('GET', `rit:dev:${device}`);
    if (!raw) { await forget(device); continue; }
    try {
      const status = await sendPush(JSON.parse(raw), subject);
      await redis('SET', 'rit:lastsend', JSON.stringify({ at: now, status }));
      if (status === 404 || status === 410) { await forget(device); gone++; } else if (status < 300) sent++;
    } catch (_) { /* el servicio push no responde: se reintentará en el próximo aviso */ }
  }
  await redis('SET', 'rit:lastrun', String(now));
  return { devices: devices.length, sent, gone };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const subject = `https://${req.headers.host || 'randomit-seven.vercel.app'}`;
  // Comprobación: qué variables de base de datos ve el servidor (solo los nombres, nunca sus valores)
  const vars = Object.keys(process.env).filter((k) => /KV|REDIS|UPSTASH|REST_API/.test(k)).sort();
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(req.method === 'GET' ? 200 : 503).json({ configured: false, error: 'not-configured', vars });
  }
  if (req.method === 'GET' || req.method === 'HEAD') { // el cron puede estar configurado con cualquiera de los dos
    const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    if ('run' in q) return res.status(200).json({ ok: true, ...(await runDue(subject)) });
    try {
      const devices = (await redis('SMEMBERS', 'rit:devs')) || [];
      const counts = await Promise.all(devices.map((d) => redis('ZCARD', `rit:p:${d}`)));
      const lastRun = Number(await redis('GET', 'rit:lastrun')) || null;
      const lastSend = JSON.parse((await redis('GET', 'rit:lastsend')) || 'null');
      return res.status(200).json({ configured: true, devices: devices.length, pending: counts.filter(Boolean).length, lastRun, lastSend });
    } catch (err) {
      return res.status(200).json({ configured: false, error: `redis: ${err.message}`, vars });
    }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { action, device } = body;
  if (action === 'key') return res.status(200).json({ publicKey: (await vapidKeys()).publicKey });
  if (!DEVICE.test(device || '')) return res.status(400).json({ error: 'bad-request' });

  if (action === 'subscribe') {
    const sub = body.sub || {};
    if (!/^https:\/\//.test(sub.endpoint || '') || JSON.stringify(sub).length > 4000) return res.status(400).json({ error: 'bad-sub' });
    await redis('SET', `rit:dev:${device}`, JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys || {} }));
    await redis('SADD', 'rit:devs', device);
    return res.status(200).json({ ok: true });
  }
  if (action === 'schedule') {
    const now = Date.now();
    const times = Array.isArray(body.times) ? body.times : [];
    const ok = [...new Set(times.filter((t) => Number.isFinite(t) && t > now - 3600e3 && t < now + MAX_AHEAD_MS))].slice(0, MAX_TIMES);
    if (!(await redis('EXISTS', `rit:dev:${device}`))) return res.status(404).json({ error: 'no-device' });
    await redis('DEL', `rit:p:${device}`);
    if (ok.length) await redis('ZADD', `rit:p:${device}`, ...ok.flatMap((t) => [t, String(t)]));
    return res.status(200).json({ ok: true, count: ok.length });
  }
  if (action === 'test') {
    const raw = await redis('GET', `rit:dev:${device}`);
    if (!raw) return res.status(404).json({ error: 'no-device' });
    const status = await sendPush(JSON.parse(raw), subject);
    if (status === 404 || status === 410) { await forget(device); return res.status(410).json({ error: 'gone' }); }
    return res.status(status < 300 ? 200 : 502).json({ ok: status < 300, status });
  }
  if (action === 'unsubscribe') {
    await forget(device);
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ error: 'bad-action' });
};
