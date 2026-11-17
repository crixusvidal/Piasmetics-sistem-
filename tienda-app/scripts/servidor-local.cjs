// Servidor mínimo para abrir la versión web de la app en tu PC (solo necesita Node.js).
const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const raiz = path.resolve(process.argv[2] || __dirname);
const puerto = Number(process.argv[3] || process.env.PORT || 3000);
const tipos = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".svg": "image/svg+xml",
  ".ttf": "font/ttf", ".wasm": "application/wasm", ".gz": "application/gzip",
};

const servidor = http.createServer((req, res) => {
  const ruta = path.normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  let archivo = path.join(raiz, ruta);
  if (!archivo.startsWith(raiz) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) archivo = path.join(raiz, "index.html");
  res.setHeader("Content-Type", tipos[path.extname(archivo)] || "application/octet-stream");
  fs.createReadStream(archivo).pipe(res);
});

servidor.on("error", (e) => {
  console.error(e.code === "EADDRINUSE" ? `El puerto ${puerto} está ocupado. Cierra la otra ventana o usa otro: node servidor-local.cjs . 3001` : e.message);
  process.exit(1);
});

servidor.listen(puerto, "127.0.0.1", () => {
  const url = `http://localhost:${puerto}`;
  console.log(`\nMi Tienda está lista en ${url}\nDeja esta ventana abierta mientras la usas. Ciérrala para detenerla.\n`);
  const abrir = process.platform === "win32" ? `start "" ${url}` : process.platform === "darwin" ? `open ${url}` : `xdg-open ${url}`;
  exec(abrir, () => {});
});
