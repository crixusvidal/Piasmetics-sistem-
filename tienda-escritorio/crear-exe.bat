@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Necesitas instalar Node.js desde https://nodejs.org y volver a abrir este archivo. & pause & exit /b 1)
echo Instalando lo necesario (la primera vez tarda unos minutos)...
call npm --prefix ..\tienda-app install || goto error
call npm install || goto error
call npm run empaquetar || goto error
echo.
echo Listo. Se abrira la carpeta con MiTienda.exe
start "" "%~dp0salida\MiTienda-win32-x64"
pause
exit /b 0
:error
echo Algo fallo. Revisa los mensajes de arriba.
pause
exit /b 1
