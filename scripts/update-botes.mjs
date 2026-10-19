// Descarga el bote del próximo sorteo de cada juego de la web oficial de Loterías y Apuestas
// del Estado y lo guarda en botes.json, que lee la app. Lo ejecuta la tarea programada de
// GitHub (.github/workflows/botes.yml); la web oficial bloquea las peticiones desde Vercel.
//
// botes.json -> { botes: { euromillones: { bote, fecha, dia }, ... }, at }
// Solo se reescribe si cambia algún bote o fecha, para no generar commits (ni despliegues) de más.

import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../botes.json', import.meta.url);

const GAME_IDS = {
  euromillones: 'EMIL',
  eurodreams: 'EDMS', // su primer premio es una renta fija; la app solo usa la fecha
  primitiva: 'LAPR',
  gordo: 'ELGR',
  bonoloto: 'BONO',
  quiniela: 'LAQU',
};

// La web oficial rechaza peticiones que no parecen de un navegador: hacen falta las sec-ch-ua y Sec-Fetch-*
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'es-ES,es;q=0.9',
  Referer: 'https://www.loteriasyapuestas.es/es',
  'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function nextDraw(gameId) {
  const url = `https://www.loteriasyapuestas.es/servicios/proximosv3?game_id=${gameId}&num=2`;
  // A veces la web rechaza una petición suelta (403/406): se reintenta un par de veces
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const draws = await res.json();
      if (!Array.isArray(draws)) throw new Error('formato inesperado');
      // Primer sorteo con bote anunciado, mejor si ya está abierto a apuestas
      const withBote = draws.filter((d) => Number(d.premio_bote) > 0);
      const d = withBote.find((x) => x.estado === 'abierto') || withBote[0];
      return d ? { bote: Number(d.premio_bote), fecha: String(d.fecha).slice(0, 10), dia: d.dia_semana || null } : null;
    }
    if (attempt >= 3) throw new Error(`HTTP ${res.status}`);
    await sleep(5000 * attempt);
  }
}

let previous = {};
try { previous = JSON.parse(readFileSync(FILE, 'utf8')).botes || {}; } catch (_) { /* primera vez */ }

const botes = {};
let failures = 0;
for (const [key, id] of Object.entries(GAME_IDS)) {
  try {
    const draw = await nextDraw(id);
    if (draw) botes[key] = draw;
    console.log(`${key}: ${draw ? `${draw.bote} € (${draw.fecha})` : 'sin bote'}`);
  } catch (err) {
    failures++;
    console.log(`${key}: ERROR ${err.message}`);
    if (previous[key]) botes[key] = previous[key]; // se conserva el último conocido
  }
}

if (failures === Object.keys(GAME_IDS).length) {
  console.error('La web oficial no ha respondido para ningún juego.');
  process.exit(1);
}

if (JSON.stringify(botes) === JSON.stringify(previous)) {
  console.log('Sin cambios.');
} else {
  writeFileSync(FILE, JSON.stringify({ botes, at: Date.now() }, null, 2) + '\n');
  console.log('botes.json actualizado.');
}
