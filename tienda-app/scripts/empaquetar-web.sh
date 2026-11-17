#!/usr/bin/env bash
# Genera mi-tienda-pc.zip: la app web + un servidor local + lanzadores de doble clic.
set -euo pipefail
cd "$(dirname "$0")/.."
npx expo export -p web
rm -rf paquete && mkdir -p paquete/mi-tienda
cp -r dist paquete/mi-tienda/app
cp scripts/servidor-local.cjs paquete/mi-tienda/servidor-local.cjs
printf '@echo off\r\ncd /d "%%~dp0"\r\nwhere node >nul 2>nul || (echo Necesitas instalar Node.js desde https://nodejs.org y volver a abrir este archivo. & pause & exit /b 1)\r\nnode servidor-local.cjs app 3000\r\npause\r\n' > paquete/mi-tienda/iniciar.bat
printf '#!/usr/bin/env bash\ncd "$(dirname "$0")"\ncommand -v node >/dev/null || { echo "Instala Node.js desde https://nodejs.org"; exit 1; }\nnode servidor-local.cjs app 3000\n' > paquete/mi-tienda/iniciar.command
chmod +x paquete/mi-tienda/iniciar.command
cat > paquete/mi-tienda/LEEME.txt <<'TXT'
MI TIENDA (versión para PC)

1. Instala Node.js (versión LTS) desde https://nodejs.org si no lo tienes.
2. Windows: haz doble clic en iniciar.bat.   Mac/Linux: ejecuta iniciar.command.
3. Se abre el navegador en http://localhost:3000. Deja la ventana negra abierta mientras usas la app.

Para verla como celular en Chrome o Edge: aprieta F12 y luego Ctrl+Shift+M.
Tus datos se guardan en este navegador. La primera lectura de texto de una boleta necesita internet.
TXT
rm -f ../capturas/mi-tienda-pc.zip
(cd paquete && zip -qr ../../capturas/mi-tienda-pc.zip mi-tienda)
rm -rf paquete
echo "Listo: capturas/mi-tienda-pc.zip"
