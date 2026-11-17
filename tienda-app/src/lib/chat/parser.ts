import { aNumero } from "../escaner/parser";
import type { Producto, Venta } from "../types";

/**
 * Convierte una conversación de WhatsApp o Messenger pegada como texto en una
 * propuesta de venta: cliente, productos con cantidad, total acordado, medio de
 * pago y fecha. Todo ocurre en el dispositivo; el usuario revisa antes de guardar.
 */

export type CanalChat = "whatsapp" | "messenger" | "otro";

export interface Mensaje {
  autor: string;
  texto: string;
  /** AAAA-MM-DD, si el chat trae fechas. */
  fecha?: string;
}

export interface LineaChat {
  productoId: string;
  cantidad: number;
  /** true si el chat dice la cantidad ("2 jeans"); false si se asumió 1. */
  explicita: boolean;
}

export interface PropuestaChat {
  canal: CanalChat;
  autores: string[];
  cliente: string;
  fecha: string;
  metodoPago: Venta["metodoPago"];
  lineas: LineaChat[];
  /** Total que se mencionó en el chat ("el total es $55.980"), si hay. */
  totalChat: number | null;
  mensajes: number;
  notas: string[];
}

// ---------- mensajes ----------

// WhatsApp iOS: [12/11/26, 14:32:10] Nombre: texto   ·   Android: 12/11/2026 14:32 - Nombre: texto
const RE_WHATSAPP =
  /^‎?\[?(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4}),?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[ap]\.?\s?m\.?)?\]?\s*(?:-\s*)?([^:]{1,60}?):\s(.*)$/i;
// Messenger y otros: "Nombre: texto"
const RE_GENERICO = /^([A-Za-zÁÉÍÓÚÑÜáéíóúñü][^:\d]{0,38}?):\s(.+)$/;
const NO_AUTOR = /^(total|subtotal|nota|ojo|precio|pedido|direcci[oó]n|nombre|tel[eé]fono|cantidad|fecha|pago|banco|cuenta|rut|monto|producto|talla|color|env[ií]o|despacho|datos|importante)$/i;

const fechaDe = (d: string, m: string, y: string) => {
  const anio = y.length === 2 ? 2000 + Number(y) : Number(y);
  const mes = Number(m);
  const dia = Number(d);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return undefined;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
};

const OMITIDO = /^<?(multimedia omitido|media omitted|imagen omitida|audio omitido|se elimin[oó] este mensaje|mensaje eliminado)>?$/i;

export function parsearMensajes(texto: string): { mensajes: Mensaje[]; formato: "whatsapp" | "generico" | "plano" } {
  const lineas = texto.replace(/\r/g, "").split("\n");
  const mensajes: Mensaje[] = [];
  let formato: "whatsapp" | "generico" | "plano" = "plano";

  for (const cruda of lineas) {
    const linea = cruda.trim();
    if (!linea) continue;
    const w = linea.match(RE_WHATSAPP);
    if (w) {
      formato = "whatsapp";
      mensajes.push({ autor: w[4].trim(), texto: w[5].trim(), fecha: fechaDe(w[1], w[2], w[3]) });
      continue;
    }
    if (formato !== "whatsapp") {
      const g = linea.match(RE_GENERICO);
      if (g && !NO_AUTOR.test(g[1].trim())) {
        mensajes.push({ autor: g[1].trim(), texto: g[2].trim() });
        formato = "generico";
        continue;
      }
    }
    // Línea suelta: continuación del mensaje anterior (o texto plano).
    const ultimo = mensajes[mensajes.length - 1];
    if (ultimo) ultimo.texto += "\n" + linea;
    else mensajes.push({ autor: "", texto: linea });
  }
  return { mensajes: mensajes.filter((m) => !OMITIDO.test(m.texto.trim())), formato };
}

// ---------- palabras, cantidades y productos ----------

const quitarTildes = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const tokens = (s: string) => quitarTildes(s).match(/[a-z0-9]+(?:[.,][0-9]{3})*/g) ?? [];
const raiz = (w: string) => (w.length > 4 && w.endsWith("es") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);

const NUMEROS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
};

function comoCantidad(t: string): number | null {
  if (t in NUMEROS) return NUMEROS[t];
  if (/^\d+$/.test(t)) {
    const n = Number(t);
    return n >= 1 && n <= 500 ? n : null; // 9990 es un precio, no una cantidad
  }
  return null;
}

function cantidadJunto(toks: string[], pos: number, desde: number): number | null {
  for (let i = pos - 1; i >= Math.max(desde, pos - 3); i--) {
    const c = comoCantidad(toks[i]);
    if (c !== null) return c;
  }
  const sig = toks[pos + 1];
  if (sig) {
    const m = sig.match(/^x(\d{1,3})$/) ?? sig.match(/^(\d{1,3})x$/);
    if (m) return Number(m[1]);
    if (sig === "x" && toks[pos + 2]) return comoCantidad(toks[pos + 2]);
  }
  return null;
}

const palabrasProducto = (p: Producto) =>
  tokens(p.nombre)
    .filter((t) => /^[a-z]+$/.test(t) && t.length > 2)
    .map(raiz);

/** Productos del inventario mencionados en un mensaje, con su cantidad si aparece. */
export function productosEnMensaje(texto: string, productos: Producto[]): { producto: Producto; cantidad: number | null }[] {
  const toks = tokens(texto);
  const raices = toks.map(raiz);
  const candidatos: { producto: Producto; pos: number; puntaje: number }[] = [];
  for (const producto of productos) {
    const pp = palabrasProducto(producto);
    if (pp.length === 0) continue;
    const posiciones = pp.map((w) => raices.indexOf(w));
    const halladas = posiciones.filter((x) => x >= 0).length;
    const cabeza = posiciones[0];
    const puntaje = halladas / pp.length;
    if (cabeza >= 0) candidatos.push({ producto, pos: cabeza, puntaje });
    else if (puntaje >= 0.6) candidatos.push({ producto, pos: Math.min(...posiciones.filter((x) => x >= 0)), puntaje });
  }
  // Si dos productos comparten la palabra principal, gana el que más palabras tiene en común.
  candidatos.sort((a, b) => b.puntaje - a.puntaje);
  const usadas = new Set<number>();
  const elegidos = candidatos.filter((c) => (usadas.has(c.pos) ? false : (usadas.add(c.pos), true))).sort((a, b) => a.pos - b.pos);
  let anterior = -1;
  return elegidos.map((c) => {
    const cantidad = cantidadJunto(toks, c.pos, anterior + 1);
    anterior = c.pos;
    return { producto: c.producto, cantidad };
  });
}

// ---------- pago, total, canal ----------

const PAGOS: { metodo: Venta["metodoPago"]; re: RegExp }[] = [
  { metodo: "transferencia", re: /transfer|deposit|yape|plin\b|cuenta rut|cuenta corriente|cuenta vista|\bcbu\b|\bclabe\b/gi },
  { metodo: "efectivo", re: /efectivo|contra ?entrega|\bcash\b/gi },
  { metodo: "tarjeta", re: /tarjeta|d[eé]bito|cr[eé]dito|webpay|link de pago|mercado ?pago/gi },
];

function detectarPago(texto: string): Venta["metodoPago"] {
  let mejor: Venta["metodoPago"] = "otro";
  let pos = -1;
  for (const { metodo, re } of PAGOS) {
    for (const m of texto.matchAll(re)) {
      if ((m.index ?? 0) > pos) {
        pos = m.index ?? 0;
        mejor = metodo;
      }
    }
  }
  return mejor;
}

function detectarTotal(texto: string): number | null {
  let total: number | null = null;
  for (const m of texto.matchAll(/total[^0-9$\n]{0,20}\$?\s?(\d[\d.,]*)/gi)) {
    const v = aNumero(m[1]);
    if (v !== null && v > 0) total = v;
  }
  return total;
}

// ---------- propuesta ----------

export function interpretarChat(texto: string, productos: Producto[], hoy: string): PropuestaChat {
  const { mensajes, formato } = parsearMensajes(texto);
  const notas: string[] = [];

  const autores = [...new Set(mensajes.map((m) => m.autor).filter(Boolean))];
  const fechas = mensajes.map((m) => m.fecha).filter((f): f is string => !!f);
  const fecha = fechas.length ? fechas[fechas.length - 1] : hoy;

  // Por producto se queda con la última cantidad dicha explícitamente.
  const porProducto = new Map<string, LineaChat>();
  for (const m of mensajes) {
    for (const { producto, cantidad } of productosEnMensaje(m.texto, productos)) {
      const previo = porProducto.get(producto.id);
      if (cantidad !== null) porProducto.set(producto.id, { productoId: producto.id, cantidad, explicita: true });
      else if (!previo) porProducto.set(producto.id, { productoId: producto.id, cantidad: 1, explicita: false });
    }
  }
  const lineas = [...porProducto.values()];

  const completo = mensajes.map((m) => m.texto).join("\n");
  const totalChat = detectarTotal(completo);
  const canal: CanalChat = formato === "whatsapp" || /whatsapp/i.test(texto) ? "whatsapp" : /messenger|facebook/i.test(texto) ? "messenger" : "otro";

  if (mensajes.length === 0) notas.push("El texto está vacío.");
  else if (lineas.length === 0) notas.push("No se reconoció ningún producto del inventario. Agrégalos a mano o revisa que los nombres coincidan.");
  else {
    if (lineas.some((l) => !l.explicita)) notas.push("Donde el chat no dice la cantidad se asumió 1. Revísala.");
    notas.push("Se incluyen productos mencionados en cualquier parte de la conversación; quita los que el cliente no compró.");
  }
  if (!fechas.length) notas.push("El chat no trae fechas; se usará la de hoy.");

  return { canal, autores, cliente: autores[0] ?? "", fecha, metodoPago: detectarPago(completo), lineas, totalChat, mensajes: mensajes.length, notas };
}

/**
 * Reparte un total acordado entre los productos, proporcional a su precio
 * actual (por ejemplo, para reflejar un descuento pactado en el chat).
 * Devuelve el nuevo precio unitario de cada línea.
 */
export function ajustarATotal(lineas: { cantidad: number; precio: number }[], total: number): number[] {
  const subtotal = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
  if (subtotal <= 0 || lineas.length === 0) return lineas.map((l) => l.precio);
  const factor = total / subtotal;
  const nuevos = lineas.map((l) => Math.round(l.precio * factor));
  const diff = total - nuevos.reduce((s, p, i) => s + p * lineas[i].cantidad, 0);
  const ultimo = lineas.length - 1;
  if (diff !== 0 && lineas[ultimo].cantidad > 0) nuevos[ultimo] += Math.round(diff / lineas[ultimo].cantidad);
  return nuevos;
}
