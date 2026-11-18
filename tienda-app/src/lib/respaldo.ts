import { DATOS_VACIOS } from "./operaciones";
import type { Datos } from "./types";

/** Identifica los archivos de respaldo creados por esta app. */
const FORMATO = "mi-tienda-respaldo";
const VERSION = 1;

const LISTAS = ["productos", "ventas", "compras", "gastos", "campanas"] as const;

/** Completa lo que falte (por ejemplo, datos guardados por versiones antiguas). */
export function normalizarDatos(d: Partial<Datos> | null | undefined): Datos {
  const base = d ?? {};
  return { ...DATOS_VACIOS, ...base, ajustes: { ...DATOS_VACIOS.ajustes, ...(base.ajustes ?? {}) } };
}

/** Texto JSON del respaldo: todos los datos más la fecha y la versión del formato. */
export function crearRespaldo(datos: Datos, ahora: Date = new Date()): string {
  return JSON.stringify({ formato: FORMATO, version: VERSION, creado: ahora.toISOString(), datos }, null, 2);
}

/** Nombre sugerido para el archivo, p. ej. "mi-tienda-respaldo-2026-11-18.json". */
export function nombreArchivoRespaldo(ahora: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `mi-tienda-respaldo-${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}.json`;
}

export type ResultadoRespaldo = { ok: true; datos: Datos; creado?: string } | { ok: false; error: string };

/** Lee y valida un respaldo. Acepta también un JSON que sea directamente los datos. */
export function leerRespaldo(texto: string): ResultadoRespaldo {
  let obj: unknown;
  try {
    obj = JSON.parse(texto);
  } catch {
    return { ok: false, error: "El archivo no es un respaldo válido (no se pudo leer)." };
  }
  if (!obj || typeof obj !== "object") return { ok: false, error: "El archivo no es un respaldo válido." };
  const raiz = obj as Record<string, unknown>;
  const envuelto = raiz.formato === FORMATO;
  if (envuelto && typeof raiz.version === "number" && raiz.version > VERSION) {
    return { ok: false, error: "El respaldo viene de una versión más nueva de la app. Actualiza la app e inténtalo otra vez." };
  }
  const datos = (envuelto ? raiz.datos : raiz) as Record<string, unknown> | undefined;
  if (!datos || typeof datos !== "object") return { ok: false, error: "El respaldo está vacío o dañado." };
  for (const k of LISTAS) {
    if (!Array.isArray(datos[k])) return { ok: false, error: `Al respaldo le falta la lista de ${k}.` };
  }
  return { ok: true, datos: normalizarDatos(datos as unknown as Datos), creado: envuelto ? String(raiz.creado ?? "") || undefined : undefined };
}
