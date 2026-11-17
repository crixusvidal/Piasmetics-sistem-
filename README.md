# Piasmetics: sistema de ventas, utilidad e inventario

App para llevar las ventas de una tienda: costos y utilidad, inventario con rotación, indicadores financieros y de marketing, lectura de boletas con escáner y OCR, y ventas desde chats de WhatsApp y Messenger. Funciona en PC, tablet y celular (iPhone y Android).

| Carpeta | Contenido |
|---|---|
| `tienda-app/` | La app (Expo y React Native). Su `README.md` explica todo; `GUIA-IPHONE.md` explica cómo instalarla en iPhone |
| `tienda-server/` | Servidor opcional que ordena boletas difíciles con IA (Claude). La app funciona sin él |
| `capturas/` | `mi-tienda-pc.zip` (la app lista para abrir en un PC con `iniciar.bat`), `mi-tienda-web.zip` y capturas de pantalla |

## Abrirla en un PC con Windows

Necesitas Git y Node.js (versión LTS). En PowerShell:

```powershell
git clone https://github.com/crixusvidal/Piasmetics-sistem-.git codigo
Expand-Archive codigo\capturas\mi-tienda-pc.zip -DestinationPath . -Force
.\mi-tienda\iniciar.bat
```

Para actualizar: `cd codigo`, `git pull` y volver a ejecutar `Expand-Archive`.

## Desarrollo

```bash
cd tienda-app
npm install
npx expo start
npm test && npm run typecheck && npx expo lint
```

Para regenerar el paquete de PC: `./tienda-app/scripts/empaquetar-web.sh`.
