'use strict';

// Versión de la app (se ve en la pantalla de inicio). Arreglos y ajustes: 1.0.x; novedades: 1.x.0.
const APP_VERSION = '1.4.4';
const DISPLAY_KEY = 'randomit:display';
const NOTIF_KEY = 'randomit:notif';

// Sorteos: grupos de bolas (cantidad, mínimo —1 si no se indica— y máximo) o, en La Quiniela, 14 partidos 1 X 2 y el Pleno al 15.
// `desc` no se ve en la tarjeta: es el texto que leen los lectores de pantalla.
const GAMES = {
  euromillones: {
    name: 'Euromillones',
    desc: '5 números (1–50) + 2 estrellas (1–12)',
    groups: [{ label: 'Números', count: 5, max: 50 }, { label: 'Estrellas', count: 2, max: 12, star: true }],
  },
  eurodreams: {
    name: 'EuroDreams',
    desc: '6 números (1–40) + 1 sueño (1–5)',
    groups: [{ label: 'Números', count: 6, max: 40 }, { label: 'Sueño', count: 1, max: 5, key: true }],
  },
  primitiva: {
    name: 'La Primitiva',
    desc: '6 números (1–49) + reintegro (0–9)',
    groups: [{ label: 'Números', count: 6, max: 49 }, { label: 'Reintegro', count: 1, min: 0, max: 9, key: true }],
  },
  gordo: {
    name: 'El Gordo de la Primitiva',
    desc: '5 números (1–54) + número clave (0–9)',
    groups: [{ label: 'Números', count: 5, max: 54 }, { label: 'Número clave', count: 1, min: 0, max: 9, key: true }],
  },
  bonoloto: {
    name: 'Bonoloto',
    desc: '6 números (1–49)',
    groups: [{ label: 'Números', count: 6, max: 49 }],
  },
  quiniela: {
    name: 'La Quiniela',
    desc: '14 partidos 1 X 2 + Pleno al 15',
    quiniela: true,
  },
};
const SIGNS = ['1', 'X', '2'];
const GOALS = ['0', '1', '2', 'M'];

const ICONS = {
  // Juegos
  euromillones: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  eurodreams: '<path d="M19.5 14.5a8 8 0 0 1-10-10 8 8 0 1 0 10 10z"/><path d="M17 3.5v4M15 5.5h4"/>',
  primitiva: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><g fill="currentColor" stroke="none"><circle cx="9.5" cy="8" r="1.2"/><circle cx="14.5" cy="8" r="1.2"/><circle cx="9.5" cy="12" r="1.2"/><circle cx="14.5" cy="12" r="1.2"/><circle cx="9.5" cy="16" r="1.2"/></g><circle cx="14.5" cy="16" r="1.6"/>',
  gordo: '<path d="M4.5 17l-1.5-9 5 3.8L12 5l4 6.8L21 8l-1.5 9z"/><path d="M5 20.5h14"/>',
  bonoloto: '<circle cx="12" cy="7.5" r="4"/><circle cx="7.5" cy="15.5" r="4"/><circle cx="16.5" cy="15.5" r="4"/>',
  quiniela: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8.5l3.3 2.4-1.3 3.9h-4l-1.3-3.9z"/><path d="M12 8.5V3.5M15.3 10.9l4.6-1.6M14 14.8l2.8 4M10 14.8l-2.8 4M8.7 10.9L4.1 9.3"/>',
  // Interfaz
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  bellOff: '<path d="M6 16.5V11a6 6 0 0 1 9.6-4.8M18 11v5.5l1.5 2h-12"/><path d="M10 20.5a2 2 0 0 0 4 0"/><path d="M4 4l16 16"/>',
  send: '<path d="M20.5 3.5L10 14"/><path d="M20.5 3.5l-6.5 17-4-6.5-6.5-4z"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.1-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
};
const icon = (name, size = 22) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

// Logo de RandomIt: anillo fino, anillo discontinuo, arco y un dado de líneas finas
let logoCount = 0;
function logoSVG(size) {
  const id = `rit-g${logoCount++}`;
  return `
    <svg class="logo-mark" viewBox="0 0 120 120" width="${size}" height="${size}" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <defs>
        <linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#7c4dff"/><stop offset=".55" stop-color="#b57cff"/><stop offset="1" stop-color="#f0b8ff"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" stroke="url(#${id})" stroke-width="1.2" opacity=".55"/>
      <circle cx="60" cy="60" r="42" stroke="url(#${id})" stroke-width=".8" stroke-dasharray="2 5" opacity=".6"/>
      <path class="logo-arc" pathLength="1" d="M60 8 A52 52 0 0 1 90.56 102.07" stroke="url(#${id})" stroke-width="3"/>
      <circle class="logo-dot" cx="90.56" cy="102.07" r="3" fill="#ffd36b" stroke="none"/>
      <g transform="rotate(-12 60 60)">
        <rect x="40" y="40" width="40" height="40" rx="9" stroke="url(#${id})" stroke-width="1.8"/>
        <g fill="url(#${id})">
          <circle cx="50" cy="50" r="3"/><circle cx="70" cy="50" r="3"/><circle cx="60" cy="60" r="3"/>
          <circle cx="50" cy="70" r="3"/><circle cx="70" cy="70" r="3"/>
        </g>
      </g>
    </svg>`;
}
document.querySelectorAll('[data-logo]').forEach((el) => { el.innerHTML = logoSVG(Number(el.dataset.logo)); });
document.getElementById('app-version').textContent = `Versión ${APP_VERSION}`;

// ---------- Azar ----------

// Entero uniforme en [0, n) con el generador criptográfico del navegador (sin sesgo de módulo)
function randInt(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return buf[0] % n;
}

// k números distintos del min al max, ordenados de menor a mayor
function pick(k, max, min = 1) {
  const n = max - min + 1;
  const pool = Array.from({ length: n }, (_, i) => i + min);
  for (let i = 0; i < k; i++) {
    const j = i + randInt(n - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, k).sort((a, b) => a - b);
}

// ---------- Datos ----------

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}

const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- Juegos ----------

$('games').innerHTML = Object.entries(GAMES).map(([key, g]) => `
  <button class="game ${key}" type="button" data-game="${key}" aria-label="${g.name}: ${g.desc}">
    <span class="game-icon">${icon(key, 24)}</span>
    <span class="game-name">${g.name}</span>
  </button>`).join('');

$('games').addEventListener('click', (e) => {
  const btn = e.target.closest('button.game');
  if (btn) openDraw(btn.dataset.game);
});

// ---------- Sorteo (hoja emergente con animación) ----------

let drawId = 0;
let rollTimer = null;

function stopDraw() {
  drawId++;
  clearInterval(rollTimer);
  rollTimer = null;
}

function closeSheet() {
  stopDraw();
  document.querySelector('.sheet-backdrop')?.remove();
}

const DRUM = `
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true">
    <g class="ring-b"><circle cx="50" cy="50" r="46" stroke-width="1" stroke-dasharray="2 6" opacity=".6"/></g>
    <g class="ring-a"><circle cx="50" cy="50" r="38" stroke-width="1.2" opacity=".5"/><path d="M50 12 A38 38 0 0 1 86 62" stroke-width="2.4"/></g>
    <g class="mix" stroke-width="1.2">
      <circle cx="50" cy="34" r="6"/><circle cx="64" cy="46" r="6"/><circle cx="60" cy="63" r="6"/>
      <circle cx="42" cy="64" r="6"/><circle cx="35" cy="47" r="6"/><circle cx="50" cy="50" r="4.5" fill="currentColor" opacity=".35"/>
    </g>
  </svg>`;

function openDraw(key) {
  closeSheet();
  const game = GAMES[key];
  const back = document.createElement('div');
  back.className = 'sheet-backdrop center';
  back.innerHTML = `
    <div class="sheet draw-sheet ${key}" role="dialog" aria-modal="true" aria-labelledby="draw-title">
      <div class="drum">${DRUM}</div>
      <h2 class="sheet-title" id="draw-title">${game.name}</h2>
      <p class="muted small draw-status" aria-live="polite"></p>
      <div class="draw-body"></div>
      <div class="draw-actions">
        <button class="ghost-btn" type="button" data-again>Otra combinación</button>
        <button class="done-btn" type="button" data-close>Cerrar</button>
      </div>
    </div>`;
  document.body.append(back);
  back.addEventListener('click', (e) => { if (e.target === back) closeSheet(); });
  back.querySelector('[data-close]').addEventListener('click', closeSheet);
  back.querySelector('[data-again]').addEventListener('click', () => runDraw(key, back));
  runDraw(key, back);
}

// Cada «unidad» (una bola o un partido) va cambiando al azar hasta que se fija en su valor final
function ballUnit(el, final, max, min = 1) {
  const span = el.querySelector('span') || el;
  return {
    tick: () => { span.textContent = min + randInt(max - min + 1); },
    lock: () => { span.textContent = final; el.classList.add('locked'); },
  };
}

function choiceUnit(row, cells, final) {
  return {
    tick: () => {
      const hot = randInt(cells.length);
      cells.forEach((c, i) => c.classList.toggle('hot', i === hot));
    },
    lock: () => {
      cells.forEach((c) => c.classList.toggle('hot', c.textContent === final));
      row.classList.add('locked');
    },
  };
}

function ballSpanHTML(g = {}) {
  return `<span class="ball${g.star ? ' star' : ''}${g.key ? ' key' : ''}"><span>–</span></span>`;
}

function runDraw(key, back) {
  stopDraw();
  const id = drawId;
  const game = GAMES[key];
  const sheet = back.querySelector('.sheet');
  const body = sheet.querySelector('.draw-body');
  const status = sheet.querySelector('.draw-status');
  const drum = sheet.querySelector('.drum');
  const again = sheet.querySelector('[data-again]');
  const units = [];
  let step; // ms entre cada valor que se fija

  if (game.quiniela) {
    const signs = Array.from({ length: 14 }, () => SIGNS[randInt(3)]);
    const pleno = [GOALS[randInt(4)], GOALS[randInt(4)]];
    body.innerHTML = `
      <div class="quini">${signs.map((_, i) => `
        <div class="q-row"><span class="q-n">${i + 1}</span>${SIGNS.map((s) => `<span class="q-cell">${s}</span>`).join('')}</div>`).join('')}
      </div>
      <div class="pleno">
        <p class="label">Pleno al 15</p>
        <div class="pleno-teams">
          <div class="pleno-team">${ballSpanHTML()}Local</div>
          <div class="pleno-team">${ballSpanHTML()}Visitante</div>
        </div>
      </div>`;
    body.querySelectorAll('.q-row').forEach((row, i) => units.push(choiceUnit(row, [...row.querySelectorAll('.q-cell')], signs[i])));
    body.querySelectorAll('.pleno .ball').forEach((el, i) => units.push({
      tick: () => { el.firstChild.textContent = GOALS[randInt(4)]; },
      lock: () => { el.firstChild.textContent = pleno[i]; el.classList.add('locked'); },
    }));
    step = 140;
  } else {
    body.innerHTML = game.groups.map((g) => `
      <div class="draw-group">
        ${game.groups.length > 1 ? `<p class="label">${g.label}</p>` : ''}
        <div class="balls">${Array.from({ length: g.count }, () => ballSpanHTML(g)).join('')}</div>
      </div>`).join('');
    body.querySelectorAll('.draw-group').forEach((groupEl, gi) => {
      const g = game.groups[gi];
      const nums = pick(g.count, g.max, g.min);
      groupEl.querySelectorAll('.ball').forEach((el, i) => units.push(ballUnit(el, nums[i], g.max, g.min)));
    });
    step = 420;
  }

  // Sin animaciones (preferencia del sistema): resultado directo
  if (reducedMotion.matches) {
    units.forEach((u) => u.lock());
    drum.classList.add('stopped');
    status.textContent = 'Tu combinación';
    again.disabled = false;
    return;
  }

  status.textContent = 'Mezclando el bombo…';
  drum.classList.remove('stopped');
  again.disabled = true;

  let locked = 0;
  rollTimer = setInterval(() => {
    for (let i = locked; i < units.length; i++) units[i].tick();
  }, 70);

  const lockNext = () => {
    if (id !== drawId) return;
    units[locked].lock();
    locked++;
    navigator.vibrate?.(8);
    if (locked < units.length) {
      // En La Quiniela, pausa antes del Pleno al 15
      setTimeout(lockNext, game.quiniela && locked === 14 ? 520 : step);
      return;
    }
    clearInterval(rollTimer);
    rollTimer = null;
    drum.classList.add('stopped');
    status.textContent = 'Tu combinación';
    again.disabled = false;
  };
  setTimeout(lockNext, 900);
}

// ---------- Menú ⋯ ----------

const MENU = [
  { label: 'Avisos', icon: 'bell', run: () => openNotifSheet() },
  { label: 'Opciones de visualización', icon: 'palette', run: () => openDisplaySheet() },
];

function openMenu() {
  const menu = $('menu');
  menu.innerHTML = MENU.map((m, i) =>
    `<button class="menu-item" role="menuitem" data-i="${i}">${icon(m.icon, 20)}<span>${m.label}</span></button>`).join('');
  menu.querySelectorAll('.menu-item').forEach((b) => b.addEventListener('click', () => {
    closeMenu();
    MENU[b.dataset.i].run();
  }));
  const r = $('menu-btn').getBoundingClientRect();
  menu.style.top = `${r.bottom + 6}px`;
  menu.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
  menu.hidden = false;
  $('menu-btn').setAttribute('aria-expanded', 'true');
}

function closeMenu() {
  $('menu').hidden = true;
  $('menu-btn').setAttribute('aria-expanded', 'false');
}

$('menu-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  if ($('menu').hidden) openMenu();
  else closeMenu();
});
document.addEventListener('click', (e) => {
  if (!$('menu').hidden && !e.target.closest('#menu')) closeMenu();
});
window.addEventListener('resize', closeMenu);

// ---------- Opciones de visualización (modo y fondo) ----------

const WALLS = {
  amatista: { name: 'Amatista', c: ['167 139 250', '240 171 252', '192 132 252', '109 40 217'] },
  rubi: { name: 'Rubí', c: ['244 63 94', '251 113 133', '236 72 153', '190 18 60'] },
  turquesa: { name: 'Turquesa', c: ['45 212 191', '103 232 249', '20 184 166', '8 145 178'] },
  oro: { name: 'Oro', c: ['251 191 36', '253 230 138', '245 158 11', '180 83 9'] },
};
const lightQuery = matchMedia('(prefers-color-scheme: light)');
let display = { theme: 'auto', wall: 'amatista', ...load(DISPLAY_KEY, {}) };
if (!WALLS[display.wall]) display.wall = 'amatista';

function applyDisplay() {
  const light = display.theme === 'light' || (display.theme === 'auto' && lightQuery.matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  document.documentElement.dataset.wall = display.wall;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', light ? '#f6f1fc' : '#100a1f');
}
lightQuery.addEventListener('change', () => { if (display.theme === 'auto') applyDisplay(); });

// Miniatura de un fondo con los mismos degradados que el real
function wallPreview(key) {
  const [c1, c2, c3, c4] = WALLS[key].c;
  const light = document.documentElement.dataset.theme === 'light';
  const a = light ? 0.4 : 0.5;
  const base = light ? '#f6f1fc' : '#100a1f';
  return `radial-gradient(70% 60% at 15% 10%, rgb(${c1} / ${a}), transparent 70%), radial-gradient(60% 55% at 90% 25%, rgb(${c2} / ${a * 0.8}), transparent 72%),
    radial-gradient(70% 60% at 75% 95%, rgb(${c3} / ${a * 0.85}), transparent 70%), radial-gradient(60% 55% at 5% 85%, rgb(${c4} / ${a * 0.8}), transparent 72%), ${base}`;
}

function openDisplaySheet() {
  closeSheet();
  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  document.body.append(back);
  back.addEventListener('click', (e) => { if (e.target === back) closeSheet(); });

  const draw = () => {
    back.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Opciones de visualización">
        <h2 class="sheet-title">Opciones de visualización</h2>
        <p class="opt-label">Modo</p>
        <div class="seg" role="group" aria-label="Modo">
          ${[['dark', 'Oscuro'], ['light', 'Claro'], ['auto', 'Automático']].map(([v, l]) =>
            `<button type="button" data-theme-opt="${v}" class="${display.theme === v ? 'on' : ''}" aria-pressed="${display.theme === v}">${l}</button>`).join('')}
        </div>
        <p class="muted small">${display.theme === 'auto' ? 'Sigue el modo claro u oscuro del sistema.' : '&nbsp;'}</p>
        <p class="opt-label">Fondo</p>
        <div class="walls">
          ${Object.entries(WALLS).map(([k, w]) =>
            `<button type="button" class="wall ${display.wall === k ? 'on' : ''}" data-wall-opt="${k}" style="background:${wallPreview(k)}" aria-pressed="${display.wall === k}">${w.name}</button>`).join('')}
        </div>
        <div class="body-actions"><button class="done-btn" type="button">Listo</button></div>
      </div>`;
    back.querySelectorAll('[data-theme-opt]').forEach((b) => b.addEventListener('click', () => {
      display.theme = b.dataset.themeOpt;
      save(DISPLAY_KEY, display);
      applyDisplay();
      draw();
    }));
    back.querySelectorAll('[data-wall-opt]').forEach((b) => b.addEventListener('click', () => {
      display.wall = b.dataset.wallOpt;
      save(DISPLAY_KEY, display);
      applyDisplay();
      draw();
    }));
    back.querySelector('.done-btn').addEventListener('click', closeSheet);
  };
  draw();
}

// ---------- Avisos: 2 horas antes del cierre de cada sorteo ----------
// Los horarios y el texto de los avisos están en schedule.js (lo comparte el service worker).
// Ajustes en localStorage (NOTIF_KEY) y copia en IndexedDB para el service worker.

const ua = navigator.userAgent;
// El iPad con iPadOS se identifica como Mac, pero tiene pantalla táctil
const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const canNotify = () => 'Notification' in window && 'serviceWorker' in navigator;
const canPush = () => canNotify() && 'PushManager' in window;

const DAY_NAMES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const drawDays = (g) => (g.days.length === 7 ? 'todos los días' : g.days.map((d) => DAY_NAMES[d]).join(', ').replace(/, ([^,]+)$/, ' y $1'));

let notif = { on: false, games: Object.keys(DRAWS), ...load(NOTIF_KEY, {}) };
notif.games = notif.games.filter((k) => DRAWS[k]);
let meta = {}; // { device, subscribed, last } — en IndexedDB, compartido con el service worker
let serverOK = null; // null: sin comprobar · true/false
let pendingGame = null; // juego del aviso tocado, para abrir su sorteo tras «Entrar»

function toast(text) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 2600);
}

async function saveNotif() {
  save(NOTIF_KEY, notif);
  await kvSet('notif', notif).catch(() => {});
}

async function saveMeta(patch) {
  meta = { ...meta, ...patch };
  await kvSet('meta', meta).catch(() => {});
}

async function checkServer() {
  try {
    const res = await fetch('api/push', { cache: 'no-store' });
    serverOK = res.ok && (await res.json()).configured === true;
  } catch (_) {
    serverOK = false;
  }
  return serverOK;
}

const randomHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

// Suscribe este dispositivo al servidor de avisos y le sube las horas
async function subscribePush() {
  if (!canPush() || !(await checkServer())) { await saveMeta({ subscribed: false }); return false; }
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { publicKey } = await pushApi({ action: 'key' });
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64u(publicKey) });
    }
    const device = meta.device || randomHex(16);
    await pushApi({ action: 'subscribe', device, sub: sub.toJSON() });
    await saveMeta({ device, subscribed: true });
    await syncSchedule();
    return true;
  } catch (_) {
    await saveMeta({ subscribed: false });
    return false;
  }
}

async function refreshSchedule() {
  if (!meta.subscribed) return;
  try { await syncSchedule(); } catch (_) { /* sin conexión: se reintentará */ }
}

async function enableNotifications() {
  if (!canNotify()) {
    alert(isIOS && !isStandalone()
      ? 'En el iPhone y el iPad los avisos solo funcionan con la app añadida a la pantalla de inicio. Añádela desde Safari (Compartir → Añadir a pantalla de inicio), ábrela desde su icono y actívalos ahí.'
      : 'Este navegador no permite notificaciones.');
    return false;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    alert('Sin permiso no puedo avisarte. Puedes darlo en los ajustes del móvil o del navegador (Notificaciones → RandomIt).');
    return false;
  }
  notif.on = true;
  await saveNotif();
  const pushed = await subscribePush();
  (await navigator.serviceWorker.ready).showNotification('Avisos activados ✅', {
    body: pushed
      ? 'Te avisaré 2 horas antes de que cierre cada sorteo que elijas.'
      : 'El servidor de avisos no está disponible todavía: de momento no podré avisarte.',
    icon: 'icons/icon-192.png',
    tag: 'randomit-test',
  });
  return true;
}

async function disableNotifications() {
  notif.on = false;
  await saveNotif();
  await refreshSchedule(); // sube una lista vacía: el servidor deja de avisar
}

async function sendTest() {
  if (meta.subscribed) {
    try {
      await pushApi({ action: 'test', device: meta.device });
      toast('Aviso enviado: llega en unos segundos');
      return;
    } catch (_) {
      toast('El servidor no ha podido enviarlo');
      return;
    }
  }
  const n = buildNotification(null);
  (await navigator.serviceWorker.ready).showNotification(n.title, { body: n.body, tag: 'randomit-test', icon: 'icons/icon-192.png' });
}

function openNotifSheet() {
  closeSheet();
  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  document.body.append(back);
  back.addEventListener('click', (e) => { if (e.target === back) closeSheet(); });

  const draw = () => {
    const perm = canNotify() ? Notification.permission : 'unsupported';
    const active = notif.on && perm === 'granted';
    let status;
    if (perm === 'unsupported') {
      status = ['bad', 'Este navegador no puede mostrar avisos', isIOS && !isStandalone()
        ? 'En iPhone y iPad: añade RandomIt a la pantalla de inicio desde Safari y ábrela desde su icono.' : 'Prueba con Chrome o Safari actualizados.'];
    } else if (perm === 'denied') {
      status = ['bad', 'Avisos bloqueados', 'Permite las notificaciones de RandomIt en los ajustes del móvil o del navegador.'];
    } else if (!active) {
      status = ['', 'Avisos desactivados', 'Actívalos y te avisaré 2 horas antes de que cierre cada sorteo.'];
    } else if (meta.subscribed) {
      status = ['ok', 'Avisos activados', 'Llegan aunque la app esté cerrada.'];
    } else {
      status = ['bad', 'Avisos sin servidor', serverOK === false
        ? 'El servidor de avisos no está disponible (falta configurarlo en Vercel).' : 'Comprobando el servidor de avisos…'];
    }
    back.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Avisos">
        <h2 class="sheet-title">Avisos</h2>
        <div class="notif-status ${status[0]}">${icon(active ? 'bell' : 'bellOff', 22)}<span><b>${status[1]}</b><small>${status[2]}</small></span></div>
        <div class="row-btns">
          ${active
            ? `<button type="button" class="ghost-btn" data-test>${icon('send', 17)} Probar aviso</button><button type="button" class="ghost-btn" data-off>${icon('bellOff', 17)} Desactivar</button>`
            : perm !== 'unsupported' && perm !== 'denied' ? `<button type="button" class="done-btn" data-on>${icon('bell', 18)} Activar avisos</button>` : ''}
        </div>
        <p class="opt-label">Avisarme 2 horas antes del cierre de</p>
        <div class="notif-games">
          ${Object.entries(DRAWS).map(([k, g]) => `
            <button type="button" class="notif-game ${k} ${notif.games.includes(k) ? 'on' : ''}" data-game-opt="${k}" aria-pressed="${notif.games.includes(k)}">
              <span class="ng-icon">${icon(k, 18)}</span>
              <span class="ng-text"><b>${g.name}</b><small>${drawDays(g)} · cierra a las ${closeLabel(k)}</small></span>
              <span class="ng-check" aria-hidden="true"></span>
            </button>`).join('')}
        </div>
        <p class="muted small">Horas de España. La Quiniela no tiene una hora de cierre fija (depende de los partidos de cada jornada), así que no avisa.</p>
        <div class="body-actions"><button class="done-btn" type="button" data-close>Listo</button></div>
      </div>`;
  };
  draw();
  if (serverOK === null) checkServer().then(draw);
  back.addEventListener('click', async (e) => {
    if (e.target.closest('[data-close]')) return closeSheet();
    if (e.target.closest('[data-on]')) { await enableNotifications(); draw(); return; }
    if (e.target.closest('[data-off]')) { await disableNotifications(); draw(); return; }
    if (e.target.closest('[data-test]')) { sendTest(); return; }
    const opt = e.target.closest('[data-game-opt]');
    if (opt) {
      const k = opt.dataset.gameOpt;
      notif.games = notif.games.includes(k) ? notif.games.filter((x) => x !== k) : [...notif.games, k];
      await saveNotif();
      draw();
      refreshSchedule();
    }
  });
}

async function initNotifications() {
  // Abierta desde un aviso (app cerrada): ?jugar=<juego>
  const want = new URLSearchParams(location.search).get('jugar');
  if (want && GAMES[want]) {
    pendingGame = want;
    history.replaceState(null, '', location.pathname);
  }
  // Aviso tocado con la app ya abierta
  navigator.serviceWorker?.addEventListener('message', (e) => {
    const game = e.data && e.data.type === 'open-game' && e.data.game;
    if (!game || !GAMES[game]) return;
    if ($('splash')) pendingGame = game;
    else openDraw(game);
  });
  try { meta = (await kvGet('meta')) || {}; } catch (_) { meta = {}; }
  await kvSet('notif', notif).catch(() => {});
  if (notif.on && canPush() && Notification.permission === 'granted') {
    if (meta.subscribed) refreshSchedule();
    else subscribePush();
  }
}

// ---------- Pantalla de inicio ----------

// Sin botón Entrar: el logo aparece (el arco se dibuja), se ve un instante y se pasa sola a la app
// con la transición de cristal, como en ChatCTRL.
const SPLASH_HOLD_MS = 1700;
const SPLASH_OUT_MS = 1200;
function enterApp() {
  const body = document.body;
  if (!$('splash') || body.classList.contains('entering')) return;
  body.classList.add('entering');
  setTimeout(() => {
    $('splash').remove();
    body.classList.remove('booting', 'entering');
    // Si se ha abierto desde un aviso, directo al sorteo de ese juego
    if (pendingGame) { openDraw(pendingGame); pendingGame = null; } else maybeShowInstallHint();
  }, SPLASH_OUT_MS);
}
setTimeout(enterApp, SPLASH_HOLD_MS);
// Abierta desde un aviso: se entra antes
setTimeout(() => { if (pendingGame) enterApp(); }, 380);

// ---------- Aviso: añadir a la pantalla de inicio (solo móvil y tablet) ----------

const INSTALL_HINT_KEY = 'randomit:installHint';

const HINT_ICONS = {
  share: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M7 10.5H6a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-1"/>',
  more: '<circle cx="12" cy="5.5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="18.5" r="1.5" fill="currentColor"/>',
  add: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
};
const hintIcon = (name) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${HINT_ICONS[name]}</svg>`;

function maybeShowInstallHint() {
  // Escritorio, app ya abierta desde la pantalla de inicio o «No mostrar más» marcado: no se muestra
  if (!(isIOS || isAndroid) || isStandalone()) return;
  if (load(INSTALL_HINT_KEY, null) === 'off') return;

  const steps = isIOS
    ? [
        ['share', 'Pulsa el botón <b>Compartir</b> de Safari (abajo en el iPhone, arriba en el iPad).'],
        ['add', 'Desliza hacia abajo y elige <b>Añadir a pantalla de inicio</b>.'],
        ['check', 'Pulsa <b>Añadir</b>. El icono de RandomIt aparecerá junto a tus apps.'],
      ]
    : [
        ['more', 'Pulsa el menú <b>⋮</b> de Chrome, arriba a la derecha.'],
        ['add', 'Elige <b>Añadir a pantalla de inicio</b> o <b>Instalar aplicación</b>.'],
        ['check', 'Confirma con <b>Instalar</b>. El icono de RandomIt aparecerá junto a tus apps.'],
      ];

  closeSheet();
  const back = document.createElement('div');
  back.className = 'sheet-backdrop center';
  back.innerHTML = `
    <div class="sheet install-sheet" role="dialog" aria-modal="true" aria-labelledby="install-title">
      <span class="install-logo">${logoSVG(56)}</span>
      <h2 class="sheet-title" id="install-title">Añade RandomIt a tu pantalla de inicio</h2>
      <p class="muted small">Así la abrirás como una app más, a pantalla completa y con un solo toque.</p>
      <ol class="install-steps">
        ${steps.map(([ic, text]) => `<li><span class="step-icon">${hintIcon(ic)}</span><span>${text}</span></li>`).join('')}
      </ol>
      <div class="install-footer">
        <label class="no-more"><input type="checkbox" id="install-no-more" /> No mostrar más</label>
        <button class="done-btn" type="button" id="install-ok">Aceptar</button>
      </div>
    </div>`;
  document.body.append(back);
  back.querySelector('#install-ok').addEventListener('click', () => {
    if (back.querySelector('#install-no-more').checked) save(INSTALL_HINT_KEY, 'off');
    closeSheet();
  });
}

// ---------- Siempre en vertical ----------
// Android (app instalada) respeta la orientación del manifiesto y este bloqueo;
// iOS no permite bloquearla, así que en horizontal se muestra un aviso para girar el móvil.
try { screen.orientation?.lock?.('portrait').catch(() => {}); } catch (_) { /* no compatible */ }

// ---------- Sin zoom (Safari en iOS ignora user-scalable=no) ----------

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

applyDisplay();
initNotifications();
// Botes guardados por versiones anteriores, que los leían de la web oficial
try { localStorage.removeItem('randomit:botes'); } catch (_) { /* sin almacenamiento */ }

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
