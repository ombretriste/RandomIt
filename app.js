'use strict';

// Versión de la app (se ve en la pantalla de inicio). Arreglos y ajustes: 1.0.x; novedades: 1.x.0.
const APP_VERSION = '1.0.0';
const DISPLAY_KEY = 'randomit:display';

// Sorteos: grupos de bolas (cantidad y máximo) o, en La Quiniela, 14 partidos 1 X 2 y el Pleno al 15
const GAMES = {
  euromillones: {
    name: 'Euromillones',
    desc: '5 números del 1 al 50 y 2 estrellas del 1 al 12',
    groups: [{ label: 'Números', count: 5, max: 50 }, { label: 'Estrellas', count: 2, max: 12, star: true }],
  },
  primitiva: {
    name: 'La Primitiva',
    desc: '6 números del 1 al 49',
    groups: [{ label: 'Números', count: 6, max: 49 }],
  },
  bonoloto: {
    name: 'Bonoloto',
    desc: '6 números del 1 al 49',
    groups: [{ label: 'Números', count: 6, max: 49 }],
  },
  quiniela: {
    name: 'La Quiniela',
    desc: '14 partidos con 1 X 2 y el Pleno al 15',
    quiniela: true,
  },
};
const SIGNS = ['1', 'X', '2'];
const GOALS = ['0', '1', '2', 'M'];

const ICONS = {
  // Juegos
  euromillones: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  primitiva: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><g fill="currentColor" stroke="none"><circle cx="9.5" cy="8" r="1.2"/><circle cx="14.5" cy="8" r="1.2"/><circle cx="9.5" cy="12" r="1.2"/><circle cx="14.5" cy="12" r="1.2"/><circle cx="9.5" cy="16" r="1.2"/></g><circle cx="14.5" cy="16" r="1.6"/>',
  bonoloto: '<circle cx="12" cy="7.5" r="4"/><circle cx="7.5" cy="15.5" r="4"/><circle cx="16.5" cy="15.5" r="4"/>',
  quiniela: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8.5l3.3 2.4-1.3 3.9h-4l-1.3-3.9z"/><path d="M12 8.5V3.5M15.3 10.9l4.6-1.6M14 14.8l2.8 4M10 14.8l-2.8 4M8.7 10.9L4.1 9.3"/>',
  // Interfaz
  go: '<path d="M9 5l7 7-7 7"/>',
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
      <path d="M60 8 A52 52 0 0 1 90.56 102.07" stroke="url(#${id})" stroke-width="3"/>
      <circle cx="90.56" cy="102.07" r="3" fill="#ffd36b" stroke="none"/>
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

// k números distintos del 1 al max, ordenados de menor a mayor
function pick(k, max) {
  const pool = Array.from({ length: max }, (_, i) => i + 1);
  for (let i = 0; i < k; i++) {
    const j = i + randInt(max - i);
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
  <button class="game ${key}" type="button" data-game="${key}">
    <span class="game-icon">${icon(key, 28)}</span>
    <span class="game-text"><span class="game-name">${g.name}</span><span class="game-desc">${g.desc}</span></span>
    <span class="game-go">${icon('go', 18)}</span>
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
function ballUnit(el, final, max) {
  const span = el.querySelector('span') || el;
  return {
    tick: () => { span.textContent = randInt(max) + 1; },
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

function ballSpanHTML(star) {
  return `<span class="ball${star ? ' star' : ''}"><span>–</span></span>`;
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
        <div class="balls">${Array.from({ length: g.count }, () => ballSpanHTML(g.star)).join('')}</div>
      </div>`).join('');
    body.querySelectorAll('.draw-group').forEach((groupEl, gi) => {
      const g = game.groups[gi];
      const nums = pick(g.count, g.max);
      groupEl.querySelectorAll('.ball').forEach((el, i) => units.push(ballUnit(el, nums[i], g.max)));
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

// ---------- Pantalla de inicio ----------

$('enter-btn').addEventListener('click', () => {
  const body = document.body;
  if (body.classList.contains('entering')) return;
  body.classList.add('entering');
  setTimeout(() => {
    $('splash').remove();
    body.classList.remove('booting', 'entering');
    maybeShowInstallHint();
  }, 820);
});

// ---------- Aviso: añadir a la pantalla de inicio (solo móvil y tablet) ----------

const INSTALL_HINT_KEY = 'randomit:installHint';
const ua = navigator.userAgent;
// El iPad con iPadOS se identifica como Mac, pero tiene pantalla táctil
const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
