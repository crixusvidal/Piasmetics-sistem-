# Mi Tienda: ventas, utilidad e inventario con IA

App de celular (iOS y Android, hecha con Expo y React Native) para llevar la contabilidad de una tienda:

- **Ventas**: anotas cada venta con sus productos y cantidades, y puedes cambiar el precio en el momento. La app calcula la utilidad usando el costo de cada producto y descuenta el stock.
- **Escáner de boletas**, que funciona como las apps que pasan una foto a PDF:
  1. **Escanear:** detecta los bordes de la boleta, la endereza y la recorta, y mejora el contraste. En Android usa Google ML Kit Document Scanner y en iOS, VisionKit.
  2. **Texto:** lee el texto con OCR en el mismo teléfono, sin internet (ML Kit en Android, Apple Vision en iOS). El texto se puede corregir.
  3. **Revisar:** un intérprete local arma el registro con proveedor, fecha, folio, productos, cantidades, precios, IVA y total. Lo revisas, lo editas y eliges si es *compra*, *venta* o *gasto*.
  4. **Guardar:** una compra suma stock, actualiza el costo con promedio ponderado y crea los productos nuevos.
  - **IA opcional:** si una boleta es difícil, el botón "✨ Mejorar con IA" envía solo el texto (no la foto) a tu servidor, que lo ordena con Claude.
- **Venta desde chat** (WhatsApp y Messenger): pegas la conversación con el cliente y la app propone la venta (cliente, productos con cantidad, total acordado, medio de pago y fecha). La revisas, la corriges y la guardas. Si en el chat acordaron un total distinto a la suma de los productos, un botón reparte el descuento entre las líneas. Las ventas quedan marcadas por canal y el Resumen muestra cuánto vendes por tienda, WhatsApp y Messenger. Todo se procesa en el dispositivo, sin enviar el chat a ningún servidor.
- **Inventario**: costo, precio, margen, stock, aviso de stock bajo, días de cobertura y sell-through de cada producto.
- **KPIs financieros**: ventas, costo de ventas, utilidad bruta y neta, margen bruto y neto, markup, ticket promedio, **rotación de inventario** (también anualizada), **días de inventario**, **GMROI**, punto de equilibrio y comparación con el período anterior.
- **KPIs de marketing**: para cada campaña (Instagram, TikTok, Google, volantes…) muestra **ROAS**, **ROI**, **CAC**, **CTR**, **CPC**, **CPM**, tasa de conversión y costo por venta. Al registrar una venta indicas de qué campaña llegó el cliente.

Si tocas un KPI que tenga el ícono ⓘ, la app te explica qué significa.

## Estructura

```
tienda-app/      App móvil (Expo + Expo Router + TypeScript)
  src/app/         Pantallas (Resumen, Movimientos, Boletas IA, Inventario, Marketing, formularios)
  src/lib/kpis.ts  Cálculo de todos los indicadores (con pruebas en kpis.test.ts)
  src/lib/operaciones.ts  Registrar ventas/compras, stock, costo promedio ponderado
  src/lib/escaner/   Escáner (escaner.ts), OCR (ocr.ts) e intérprete de boletas (parser.ts, con pruebas)
                     Las versiones .web.ts usan canvas + Tesseract.js para probar en el navegador
tienda-escritorio/ (en la raíz)  Envoltorio Electron que genera MiTienda.exe
tienda-server/   Servidor pequeño que analiza las fotos con la API de Claude
```

Los datos se guardan en el teléfono o navegador (AsyncStorage) y, en la app de escritorio (`tienda-escritorio/`), en un archivo `datos.json` del computador. En Ajustes → Respaldo se pueden exportar e importar (`src/lib/respaldo.ts`, con pruebas). Las fotos van solo al servidor propio, que guarda la API key de Anthropic, así la clave nunca queda dentro de la app.

## Cómo usarlo

### 1. Servidor de IA

```bash
cd tienda-server
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # tu clave de https://console.anthropic.com
export APP_TOKEN=una-clave-secreta    # la misma que pondrás en Ajustes de la app
npm start                             # escucha en el puerto 3001
```

Para que el celular lo alcance, en la app pon la IP de tu computador en la red local (por ejemplo `http://192.168.1.10:3001`). También puedes publicar el servidor en Render, Railway, Fly.io u otro servicio similar.

El servidor es opcional: el escaneo y la lectura funcionan sin él. Para la IA usa el modelo `claude-opus-5-5` con salida estructurada. La respuesta se valida contra un esquema y, si un filtro de seguridad rechaza la solicitud, la API la reintenta automáticamente con otro modelo.

### 2. App

El escáner de bordes y el OCR usan módulos nativos, así que **no funcionan en Expo Go**. Para eso necesitas una *development build*:

```bash
cd tienda-app
npm install
npx expo run:android          # o: npx eas-cli@latest build --profile development -p android
npx expo start --dev-client
```

Con Expo Go (`npx expo start`) funciona todo lo demás. En ese caso el escáner usa la cámara normal y el texto se puede escribir a mano.

Al abrir la app:

1. Ve a **Ajustes** (ícono ⚙️ en Resumen) y elige la moneda.
2. En la misma pantalla configura la dirección del servidor y el APP_TOKEN, y toca *Probar conexión*.
3. Si solo quieres explorar la app, toca *Explorar con datos de ejemplo*.

Para instalarla como app real usa `npx eas-cli@latest build -p android` (o `-p ios`).

### iPhone

| Opción | Costo | Qué funciona |
|---|---|---|
| **Versión web** (Safari → "Agregar a inicio") | Gratis | Todo; el escáner y el OCR corren en el navegador |
| **Expo Go** (`npx expo start` y escanear el QR) | Gratis | Todo menos el escáner de bordes y el OCR del teléfono (usa la IA del servidor o texto a mano) |
| **App nativa** (`npx eas-cli@latest build --profile development -p ios`) | Cuenta Apple Developer, 99 USD/año | Todo, con el escáner de VisionKit y OCR de Apple Vision. Se compila en la nube, sin Mac |

Para la versión web: `npx expo export -p web` genera la carpeta `dist/`, que se puede subir a cualquier hosting estático (Netlify, Vercel, Cloudflare Pages).

Para usarla en un PC sin hosting: `./scripts/empaquetar-web.sh` genera `capturas/mi-tienda-pc.zip` con la app, un servidor local y un lanzador de doble clic (`iniciar.bat` en Windows). Solo requiere Node.js.

Guía para iPhone (web, Expo Go y app nativa): ver `GUIA-IPHONE.md`.

### Un diseño para cada pantalla

La app detecta el tamaño de la ventana y cambia sola de formato (`src/lib/layout.ts`):

| Formato | Pantalla | Navegación | Contenido |
|---|---|---|---|
| **Celular** (iPhone y Android) | menos de 640 px | barra inferior | una columna, indicadores de a 2 |
| **Tablet** (iPad y Android) | 640 a 1023 px | barra lateral angosta | indicadores de a 3, gráfico junto a los productos rentables, tarjetas de campañas en 2 columnas |
| **PC** | 1024 px o más | barra lateral con nombres | contenido centrado de hasta 1240 px; venta y escáner en dos paneles (buscador / detalle, foto / registro editable) |

Un celular en horizontal sigue usando el formato celular.

### Pruebas

```bash
cd tienda-app && npm test && npm run typecheck && npx expo lint
cd tienda-server && npm run typecheck
```

## Fórmulas principales

| Indicador | Fórmula |
|---|---|
| Margen bruto | (ventas − costo de ventas) ÷ ventas |
| Utilidad neta | utilidad bruta − gastos − inversión en publicidad |
| Rotación de inventario | costo de ventas ÷ inventario promedio a costo |
| Días de inventario | días del período ÷ rotación |
| GMROI | utilidad bruta ÷ inventario promedio |
| Punto de equilibrio | (gastos + publicidad) ÷ margen bruto |
| ROAS | ventas atribuidas ÷ inversión |
| ROI de marketing | (utilidad bruta atribuida − inversión) ÷ inversión |
| CAC | inversión ÷ clientes nuevos |
| CTR / CPC / CPM | clics ÷ impresiones / inversión ÷ clics / inversión ÷ impresiones × 1000 |

El inventario inicial de cada período se reconstruye a partir del inventario actual, deshaciendo las compras y ventas posteriores. La inversión de cada campaña se reparte según los días que caen dentro del período.
