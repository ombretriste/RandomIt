# RandomIt

*by OmT Finance*

Versión **1.5.2** (se muestra en la pantalla de inicio). Las correcciones y ajustes suben el último número (1.0.1); las novedades, el del medio (1.1.0).

App web instalable (PWA) que genera combinaciones aleatorias para los sorteos de Loterías y Apuestas del Estado.

## Funcionamiento

- Pantalla de inicio con el logo; al pulsar **Entrar** se pasa a los juegos.
- Siempre en vertical: en Android la app instalada se bloquea en vertical; en iPhone, que no permite bloquearla, se muestra un aviso para girar el móvil.
- Al pulsar un juego se abre una ventana emergente: el bombo gira, los números van cambiando y se fijan uno a uno. **Otra combinación** repite el sorteo.
  - **Euromillones**: 5 números del 1 al 50 y 2 estrellas del 1 al 12.
  - **EuroDreams**: 6 números del 1 al 40 y 1 sueño del 1 al 5.
  - **La Primitiva**: 6 números del 1 al 49 y el reintegro del 0 al 9.
  - **El Gordo de la Primitiva**: 5 números del 1 al 54 y el número clave del 0 al 9.
  - **Bonoloto**: 6 números del 1 al 49.
  - **La Quiniela**: 1, X o 2 en los 14 partidos y el Pleno al 15 (0, 1, 2 o M goles por equipo).
- Los números salen del generador criptográfico del navegador (`crypto.getRandomValues`), sin sesgo, y se muestran ordenados.
- Si el sistema tiene activado «Reducir movimiento», el resultado aparece sin animación.

En el menú ⋯ están las **opciones de visualización**: modo oscuro, claro o automático y cuatro fondos (Amatista, Rubí, Turquesa y Oro). Se guardan en el propio dispositivo (`localStorage`).

## Avisos

En el menú ⋯ → **Avisos** se activan las notificaciones: llegan **2 horas antes de que cierre** el plazo para jugar a cada sorteo elegido, aunque la app esté cerrada. Al tocar el aviso se abre la app y, tras pulsar Entrar, el sorteo de ese juego.

| Juego | Días | Cierre | Aviso |
|---|---|---|---|
| Euromillones | martes y viernes | 20:30 | 18:30 |
| EuroDreams | lunes y jueves | 20:30 | 18:30 |
| La Primitiva | lunes, jueves y sábado | 21:15 | 19:15 |
| El Gordo de la Primitiva | domingo | 21:00 | 19:00 |
| Bonoloto | todos los días | 21:00 | 19:00 |

Horas de España (`schedule.js`, que también usa el service worker). La Quiniela no avisa porque su cierre cambia cada jornada.

Funcionamiento (mismo diseño que TaskCTRL): la app sube a `api/push` solo las horas de aviso de los próximos 14 días; el servidor manda a esas horas un push vacío y el service worker compone la notificación y vuelve a subir las horas. Necesita:

1. **Upstash Redis** conectado al proyecto en Vercel (Storage). Puede ser la misma base de datos que las otras apps: las claves de RandomIt empiezan por `rit:`. Las claves VAPID se crean solas. `GET /api/push` debe responder `configured: true`.
2. Un **cron** (cron-job.org) que llame cada 5 minutos a `https://randomit-seven.vercel.app/api/push?run`.
3. En iPhone/iPad, la app añadida a la pantalla de inicio (iOS 16.4 o posterior).

## Instalar en el móvil

En móvil y tablet, al entrar aparece un aviso con estos pasos (adaptados a iPhone/iPad o Android). Sale cada vez hasta que se marca «No mostrar más», y no aparece en escritorio ni cuando la app ya se abre desde el icono de la pantalla de inicio.

- **iPhone (Safari):** Compartir → «Añadir a pantalla de inicio».
- **Android (Chrome):** menú ⋮ → «Instalar aplicación».

## Analítica

Vercel Web Analytics (se activa en la pestaña Analytics del proyecto de Vercel, sin cookies). La app es una sola página, así que cada función se cuenta como una página virtual con `track()` en `app.js`. Solo se envía el nombre de la función, nunca datos de la app, y `beforeSend` (en `index.html`) quita de la dirección lo que va tras `?` o `#`.

## Desarrollo

Es un sitio estático sin dependencias ni paso de compilación, más la función `api/push.js` (avisos), que se ejecuta en Vercel. Para probar la parte estática en local:

```bash
python3 -m http.server 8000
```

Al cambiar archivos, sube la versión de `CACHE` en `sw.js` para que los móviles instalados descarguen la nueva versión.

## Despliegue

Importa el repositorio en [Vercel](https://vercel.com/new) con el preset **Other** (sin comando de compilación). Cada `git push` a `main` se despliega automáticamente.
