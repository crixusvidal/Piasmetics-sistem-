const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("miTiendaDisco", {
  carpeta: ipcRenderer.sendSync("datos:carpeta"),
  leer: () => ipcRenderer.invoke("datos:leer"),
  guardar: (texto) => ipcRenderer.invoke("datos:guardar", texto),
});
