# RandomIt

*by OmT Finance*

Versión **1.2.0** (se muestra en la pantalla de inicio). Las correcciones y ajustes suben el último número (1.0.1); las novedades, el del medio (1.1.0).

App web instalable (PWA) que genera combinaciones aleatorias para los sorteos de Loterías y Apuestas del Estado.

## Funcionamiento

- Pantalla de inicio con el logo; al pulsar **Entrar** se pasa a los juegos.
- Siempre en vertical: en Android la app instalada se bloquea en vertical; en iPhone, que no permite bloquearla, se muestra un aviso para girar el móvil.
- Al pulsar un juego se abre una ventana emergente: el bombo gira, los números van cambiando y se fijan uno a uno. **Otra combinación** repite el sorteo.
  - **Euromillones**: 5 números del 1 al 50 y 2 estrellas del 1 al 12.
  - **La Primitiva**: 6 números del 1 al 49.
  - **El Gordo de la Primitiva**: 5 números del 1 al 54 y el número clave del 0 al 9.
  - **Bonoloto**: 6 números del 1 al 49.
  - **La Quiniela**: 1, X o 2 en los 14 partidos y el Pleno al 15 (0, 1, 2 o M goles por equipo).
- Cada juego muestra el **bote del próximo sorteo** y su fecha, en la tarjeta y en la ventana del resultado. Los datos vienen de la web oficial de Loterías y Apuestas del Estado a través de `api/botes` (función de Vercel, con 30 minutos de caché); sin conexión se muestran los últimos guardados mientras el sorteo no haya pasado.
- Los números salen del generador criptográfico del navegador (`crypto.getRandomValues`), sin sesgo, y se muestran ordenados.
- Si el sistema tiene activado «Reducir movimiento», el resultado aparece sin animación.

En el menú ⋯ están las **opciones de visualización**: modo oscuro, claro o automático y cuatro fondos (Amatista, Rubí, Turquesa y Oro). Se guardan en el propio dispositivo (`localStorage`).

## Instalar en el móvil

En móvil y tablet, al entrar aparece un aviso con estos pasos (adaptados a iPhone/iPad o Android). Sale cada vez hasta que se marca «No mostrar más», y no aparece en escritorio ni cuando la app ya se abre desde el icono de la pantalla de inicio.

- **iPhone (Safari):** Compartir → «Añadir a pantalla de inicio».
- **Android (Chrome):** menú ⋮ → «Instalar aplicación».

## Desarrollo

Es un sitio estático sin dependencias ni paso de compilación, más la función `api/botes.js`, que se ejecuta en Vercel (región París, en `vercel.json`). Para probar la parte estática en local:

```bash
python3 -m http.server 8000
```

Al cambiar archivos, sube la versión de `CACHE` en `sw.js` para que los móviles instalados descarguen la nueva versión.

## Despliegue

Importa el repositorio en [Vercel](https://vercel.com/new) con el preset **Other** (sin comando de compilación). Cada `git push` a `main` se despliega automáticamente.
