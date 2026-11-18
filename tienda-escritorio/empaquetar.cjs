// Genera "Mi Tienda" para Windows: salida/MiTienda-win32-x64/MiTienda.exe y salida/mi-tienda-windows.zip.
// Funciona en Windows, Mac y Linux (necesita Node.js e internet la primera vez).
// Uso: npm run empaquetar   (desde tienda-escritorio, con tienda-app/ al lado)
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { packager } = require("@electron/packager");

const aqui = __dirname;
const app = path.join(aqui, "..", "tienda-app");
const prep = path.join(aqui, ".preparado");
const salida = path.join(aqui, "salida");

(async () => {
  console.log("1/4 Compilando la app web…");
  execSync("npx expo export -p web", { cwd: app, stdio: "inherit" });
  fs.rmSync(prep, { recursive: true, force: true });
  fs.mkdirSync(prep, { recursive: true });
  fs.cpSync(path.join(app, "dist"), path.join(prep, "web"), { recursive: true });
  for (const f of ["main.cjs", "preload.cjs"]) fs.copyFileSync(path.join(aqui, f), path.join(prep, f));
  fs.writeFileSync(path.join(prep, "package.json"), JSON.stringify({ name: "mi-tienda", productName: "Mi Tienda", version: "1.0.0", main: "main.cjs" }));

  console.log("2/4 Empaquetando para Windows…");
  fs.rmSync(salida, { recursive: true, force: true });
  const [dir] = await packager({
    dir: prep, out: salida, name: "MiTienda", platform: "win32", arch: "x64", overwrite: true,
    asar: true, prune: false, quiet: true,
  });

  console.log("3/4 Agregando instrucciones…");
  fs.writeFileSync(path.join(dir, "LEEME.txt"), [
    "MI TIENDA (Windows)",
    "",
    "1. Descomprime esta carpeta donde quieras (por ejemplo, en Documentos).",
    "2. Haz doble clic en MiTienda.exe. No necesitas instalar nada más.",
    "   (Si Windows muestra 'Windows protegió su PC', toca 'Más información' y luego 'Ejecutar de todas formas':",
    "   pasa porque la app no está firmada digitalmente.)",
    "",
    "Tus datos se guardan en un archivo de este computador:",
    "   %APPDATA%\\MiTienda\\datos\\datos.json",
    "(copia la ruta en el Explorador de archivos). Al actualizar la app, tus datos se conservan.",
    "Además se mantiene una copia anterior en datos.anterior.json.",
    "",
    "Aun así, descarga un respaldo cada cierto tiempo: Ajustes > Respaldo > Descargar respaldo.",
    "La primera lectura de texto de una boleta necesita internet.",
    "",
  ].join("\r\n"));

  console.log("4/4 Comprimiendo…");
  const zip = path.join(salida, "mi-tienda-windows.zip");
  try {
    if (process.platform === "win32") execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${dir}' -DestinationPath '${zip}' -Force"`, { stdio: "inherit" });
    else execSync(`zip -qr "${zip}" "${path.basename(dir)}"`, { cwd: path.dirname(dir), stdio: "inherit" });
  } catch { console.log("(No se pudo crear el zip; usa la carpeta directamente.)"); }
  console.log("\nListo. Abre:", path.join(dir, "MiTienda.exe"));
})().catch((e) => { console.error(e); process.exit(1); });
