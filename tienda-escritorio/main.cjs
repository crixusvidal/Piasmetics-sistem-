// Mi Tienda (escritorio): abre la app web en una ventana y guarda los datos en un archivo local.
const { app, BrowserWindow, ipcMain, shell, Menu } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PUERTO = 38491; // fijo, para que la app siempre abra en la misma dirección
const web = path.join(__dirname, "web");
const carpeta = () => path.join(app.getPath("userData"), "datos");
const archivo = () => path.join(carpeta(), "datos.json");

const tipos = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".svg": "image/svg+xml",
  ".ttf": "font/ttf", ".wasm": "application/wasm",
};

function servirApp() {
  return new Promise((resolver, rechazar) => {
    const servidor = http.createServer((req, res) => {
      const ruta = path.normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
      let f = path.join(web, ruta);
      if (!f.startsWith(web) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(web, "index.html");
      res.setHeader("Content-Type", tipos[path.extname(f)] || "application/octet-stream");
      fs.createReadStream(f).pipe(res);
    });
    servidor.on("error", rechazar);
    servidor.listen(PUERTO, "127.0.0.1", () => resolver(PUERTO));
  });
}

// --- Archivo de datos: se escribe en un temporal y se renombra, y se guarda una copia anterior (datos.anterior.json).
ipcMain.on("datos:carpeta", (e) => { e.returnValue = carpeta(); });
ipcMain.handle("datos:leer", async () => {
  try { return await fs.promises.readFile(archivo(), "utf8"); }
  catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
});
ipcMain.handle("datos:guardar", async (_e, texto) => {
  if (typeof texto !== "string") throw new Error("Datos inválidos");
  await fs.promises.mkdir(carpeta(), { recursive: true });
  const tmp = archivo() + ".tmp";
  await fs.promises.writeFile(tmp, texto, "utf8");
  if (fs.existsSync(archivo())) await fs.promises.copyFile(archivo(), path.join(carpeta(), "datos.anterior.json"));
  await fs.promises.rename(tmp, archivo());
});

async function crearVentana() {
  await servirApp();
  const ventana = new BrowserWindow({
    width: 1280, height: 820, minWidth: 380, minHeight: 600,
    title: "Mi Tienda", autoHideMenuBar: true, backgroundColor: "#f5f5f4",
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  ventana.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  ventana.webContents.on("will-navigate", (ev, url) => {
    if (!url.startsWith(`http://localhost:${PUERTO}`)) { ev.preventDefault(); shell.openExternal(url); }
  });
  // Descargas (respaldos): pregunta dónde guardar, por defecto en Documentos.
  ventana.webContents.session.on("will-download", (_e, item) => item.setSavePath(path.join(app.getPath("documents"), item.getFilename())));
  await ventana.loadURL(`http://localhost:${PUERTO}`);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    const [v] = BrowserWindow.getAllWindows();
    if (v) { if (v.isMinimized()) v.restore(); v.focus(); }
  });
  app.whenReady().then(() => { Menu.setApplicationMenu(null); return crearVentana(); }).catch((e) => { console.error(e); app.quit(); });
  app.on("window-all-closed", () => app.quit());
}
