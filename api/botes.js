// Función serverless de Vercel: bote del próximo sorteo de cada juego, según la web oficial
// de Loterías y Apuestas del Estado (que no permite pedirlo directamente desde el navegador).
//
//   GET /api/botes -> { botes: { euromillones: { bote, fecha, dia }, ... }, at }
//
// `bote` en euros, `fecha` AAAA-MM-DD del sorteo y `dia` el día de la semana. Un juego sin
// bote anunciado no aparece. La respuesta se guarda 30 min en la caché de Vercel.

const GAME_IDS = {
  euromillones: 'EMIL',
  primitiva: 'LAPR',
  gordo: 'ELGR',
  bonoloto: 'BONO',
  quiniela: 'LAQU',
};

// La web oficial rechaza peticiones que no parecen de un navegador: hacen falta las sec-ch-ua y
// Sec-Fetch-*, y Accept solo con application/json (con */* también la rechaza)
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'es-ES,es;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Referer: 'https://www.loteriasyapuestas.es/es',
  'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

async function nextDraw(gameId) {
  const url = `https://www.loteriasyapuestas.es/servicios/proximosv3?game_id=${gameId}&num=2`;
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const draws = await res.json();
  if (!Array.isArray(draws)) throw new Error('formato');
  // Primer sorteo con bote anunciado, mejor si ya está abierto a apuestas
  const withBote = draws.filter((d) => Number(d.premio_bote) > 0);
  const d = withBote.find((x) => x.estado === 'abierto') || withBote[0];
  if (!d) return null;
  return { bote: Number(d.premio_bote), fecha: String(d.fecha).slice(0, 10), dia: d.dia_semana || null };
}

module.exports = async (req, res) => {
  const entries = await Promise.allSettled(
    Object.entries(GAME_IDS).map(async ([key, id]) => [key, await nextDraw(id)])
  );
  const botes = {};
  for (const e of entries) {
    if (e.status === 'fulfilled' && e.value[1]) botes[e.value[0]] = e.value[1];
  }
  if (!entries.some((e) => e.status === 'fulfilled')) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'upstream' });
  }
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
  return res.status(200).json({ botes, at: Date.now() });
};
