@echo off
cd /d "%~dp0"
if not exist "MiTienda-win32-x64\MiTienda.exe" (
  echo Preparando Mi Tienda, un momento...
  copy /b mi-tienda-windows.zip.parte0 + mi-tienda-windows.zip.parte1 mi-tienda-windows.zip >nul || goto error
  powershell -NoProfile -Command "Expand-Archive -Path 'mi-tienda-windows.zip' -DestinationPath '.' -Force" || goto error
  del mi-tienda-windows.zip
)
if not exist "MiTienda-win32-x64\MiTienda.exe" goto error
start "" "MiTienda-win32-x64\MiTienda.exe"
exit /b 0
:error
echo Algo fallo. Si tienes antivirus, puede haber eliminado MiTienda.exe.
pause
exit /b 1
