# Piasmetics: sistema de ventas, utilidad e inventario

App para llevar las ventas de una tienda: costos y utilidad, inventario con rotación, indicadores financieros y de marketing, lectura de boletas con escáner y OCR, y ventas desde chats de WhatsApp y Messenger. Funciona en PC, tablet y celular (iPhone y Android).

| Carpeta | Contenido |
|---|---|
| `tienda-app/` | La app (Expo y React Native). Su `README.md` explica todo; `GUIA-IPHONE.md` explica cómo instalarla en iPhone |
| `tienda-escritorio/` | La app como programa de Windows (`MiTienda.exe`), con los datos guardados en un archivo del computador |
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

## Crear MiTienda.exe (Windows)

Con Git y Node.js instalados, en PowerShell:

```powershell
git clone https://github.com/crixusvidal/Piasmetics-sistem-.git codigo   # o git pull si ya lo tienes
codigo\tienda-escritorio\crear-exe.bat
```

Tarda unos minutos la primera vez y abre la carpeta `salida\MiTienda-win32-x64`; ahí está `MiTienda.exe` (no necesita Node para usarse, puedes copiar la carpeta donde quieras). Los datos quedan en `%APPDATA%\MiTienda\datos\datos.json` y se conservan al actualizar. Windows puede avisar que la app no está firmada: «Más información» y «Ejecutar de todas formas».

### Sin compilar: `MiTienda.exe` ya hecho

Después de `git pull`, haz doble clic en `capturas\mi-tienda-windows\abrir-mi-tienda.bat`: une los dos pedazos del programa, lo descomprime en esa misma carpeta (`MiTienda-win32-x64\MiTienda.exe`) y lo abre. Está partido en dos porque GitHub no acepta archivos de más de 100 MB. No está probado en un Windows real.

## Respaldo

En **Ajustes → Respaldo** puedes descargar todos tus datos en un archivo y restaurarlos después (o llevarlos a otro equipo). Haz uno cada cierto tiempo.

## Desarrollo

```bash
cd tienda-app
npm install
npx expo start
npm test && npm run typecheck && npx expo lint
```

Para regenerar el paquete de PC: `./tienda-app/scripts/empaquetar-web.sh`.
