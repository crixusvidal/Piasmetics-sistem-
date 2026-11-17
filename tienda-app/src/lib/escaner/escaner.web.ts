import * as ImagePicker from "expo-image-picker";
import type { Escaneo } from "./escaner";

export type { Escaneo } from "./escaner";

/**
 * Versión web: no hay escáner nativo, así que "escaneamos" la foto en un canvas:
 * escala de grises, estiramiento de contraste y umbral adaptativo (Bradley),
 * que deja el papel blanco y el texto negro como un escáner.
 */
async function procesar(uri: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((ok, mal) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => mal(new Error("No se pudo abrir la imagen."));
    i.src = uri;
  });
  const MAX = 2000;
  const escala = Math.min(1, MAX / Math.max(img.width, img.height));
  const W = Math.round(img.width * escala);
  const H = Math.round(img.height * escala);
  const lienzo = document.createElement("canvas");
  lienzo.width = W;
  lienzo.height = H;
  const c0 = lienzo.getContext("2d")!;
  c0.drawImage(img, 0, 0, W, H);
  const orig = c0.getImageData(0, 0, W, H).data;

  // 1) grises
  const grisTodo = new Uint8ClampedArray(W * H);
  const histTodo = new Uint32Array(256);
  for (let i = 0; i < W * H; i++) {
    grisTodo[i] = (orig[i * 4] * 299 + orig[i * 4 + 1] * 587 + orig[i * 4 + 2] * 114) / 1000;
    histTodo[grisTodo[i]]++;
  }

  // 2) recorte automático del papel: umbral de Otsu separa papel (claro) del fondo,
  //    y se recorta a las filas/columnas donde predomina el papel.
  const otsu = umbralOtsu(histTodo, W * H);
  const filaClara = (y: number, x0: number, x1: number) => {
    let n = 0;
    for (let x = x0; x < x1; x++) if (grisTodo[y * W + x] > otsu) n++;
    return n / (x1 - x0);
  };
  let y0 = 0, y1 = H - 1;
  while (y0 < H - 1 && filaClara(y0, 0, W) < 0.3) y0++;
  while (y1 > y0 && filaClara(y1, 0, W) < 0.3) y1--;
  const colClara = (x: number) => {
    let n = 0;
    for (let y = y0; y <= y1; y++) if (grisTodo[y * W + x] > otsu) n++;
    return n / (y1 - y0 + 1);
  };
  let x0 = 0, x1 = W - 1;
  while (x0 < W - 1 && colClara(x0) < 0.5) x0++;
  while (x1 > x0 && colClara(x1) < 0.5) x1--;
  // Si el recorte es muy chico (foto ya recortada o sin fondo), se usa la imagen completa.
  if ((x1 - x0) * (y1 - y0) < W * H * 0.15) {
    x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1;
  }
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const datos = ctx.createImageData(w, h);
  const px = datos.data;
  const gris = new Uint8ClampedArray(w * h);
  const hist = new Uint32Array(256);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const g = grisTodo[(y + y0) * W + (x + x0)];
      gris[y * w + x] = g;
      hist[g]++;
    }

  // 3) contraste: estira entre los percentiles 1% y 99%
  const pct = (p: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) if ((acc += hist[v]) >= p * w * h) return v;
    return 255;
  };
  const bajo = pct(0.01);
  const alto = Math.max(pct(0.99), bajo + 1);
  for (let i = 0; i < gris.length; i++) gris[i] = ((gris[i] - bajo) * 255) / (alto - bajo);

  // 4) umbral adaptativo con imagen integral (ventana ~1/16 del ancho)
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    let fila = 0;
    for (let x = 1; x <= w; x++) {
      fila += gris[(y - 1) * w + (x - 1)];
      integral[y * (w + 1) + x] = integral[(y - 1) * (w + 1) + x] + fila;
    }
  }
  const r = Math.max(8, Math.round(w / 32));
  const T = 0.15;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - r), x2 = Math.min(w, x + r + 1);
      const y1 = Math.max(0, y - r), y2 = Math.min(h, y + r + 1);
      const n = (x2 - x1) * (y2 - y1);
      const suma = integral[y2 * (w + 1) + x2] - integral[y1 * (w + 1) + x2] - integral[y2 * (w + 1) + x1] + integral[y1 * (w + 1) + x1];
      const v = gris[y * w + x] * n < suma * (1 - T) ? 0 : 255;
      const k = (y * w + x) * 4;
      px[k] = px[k + 1] = px[k + 2] = v;
      px[k + 3] = 255;
    }
  }
  // 5) borra manchas negras que tocan el borde (restos del fondo o sombras),
  //    sin tocar el texto, que no llega al borde.
  const visto = new Uint8Array(w * h);
  const pila: number[] = [];
  const negro = (i: number) => px[i * 4] === 0;
  for (let x = 0; x < w; x++) pila.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) pila.push(y * w, y * w + w - 1);
  while (pila.length) {
    const i = pila.pop()!;
    if (visto[i] || !negro(i)) continue;
    visto[i] = 1;
    px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 255;
    const x = i % w;
    if (x > 0) pila.push(i - 1);
    if (x < w - 1) pila.push(i + 1);
    if (i >= w) pila.push(i - w);
    if (i < w * (h - 1)) pila.push(i + w);
  }
  ctx.putImageData(datos, 0, 0);
  return canvas.toDataURL("image/png");
}

function umbralOtsu(hist: Uint32Array, total: number): number {
  let suma = 0;
  for (let v = 0; v < 256; v++) suma += v * hist[v];
  let sumaB = 0, pesoB = 0, mejor = 0, umbral = 128;
  for (let v = 0; v < 256; v++) {
    pesoB += hist[v];
    if (pesoB === 0) continue;
    const pesoF = total - pesoB;
    if (pesoF === 0) break;
    sumaB += v * hist[v];
    const mB = sumaB / pesoB;
    const mF = (suma - sumaB) / pesoF;
    const varianza = pesoB * pesoF * (mB - mF) ** 2;
    if (varianza > mejor) {
      mejor = varianza;
      umbral = v;
    }
  }
  return umbral;
}

async function elegir(camara: boolean): Promise<Escaneo | null> {
  const r = camara
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  if (r.canceled || !r.assets?.[0]) return null;
  return { uri: await procesar(r.assets[0].uri), procesada: true, detalle: "Escaneada en el navegador: papel recortado, contraste y blanco/negro." };
}

export const escanearConCamara = () => elegir(true);
export const importarImagen = () => elegir(false);
