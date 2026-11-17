import type { BoletaIA } from "../types";

/**
 * Intérprete local del texto de una boleta (sin IA): a partir del texto que
 * entrega el OCR detecta el emisor, la fecha, el folio, los ítems, el IVA y el total.
 * Está pensado para boletas y facturas de Latinoamérica ($ con punto de miles).
 */

const MESES: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12,
};

// Líneas que no son productos.
const NO_ITEM =
  /\b(sub\s?-?total|total|neto|iva|igv|impuesto|exento|vuelto|cambio|efectivo|tarjeta|d[eé]bito|cr[eé]dito|pago|rut|r\.u\.t|ruc|nit|folio|boleta|factura|giro|direcci[oó]n|fecha|hora|caja|cajero|vendedor|cliente|tel[eé]fono|fono|www\.|gracias|timbre|sii|res\.?\s|resoluci[oó]n|descuento total|propina|redondeo|transacci[oó]n|autorizaci[oó]n|n[°º]\s*operaci)/i;

const ES_TOTAL = /\b(total(\s+a\s+pagar|\s+pagado|\s+general|\s+venta|\s+boleta)?|monto\s+total|importe\s+total|a\s+pagar)\b/i;
const NO_ES_TOTAL = /\b(sub\s?-?total|total\s+neto|total\s+iva|total\s+exento|total\s+descuento|total\s+items?|total\s+art)/i;
const ES_IVA = /\b(iva|igv|i\.v\.a|impuesto)\b/i;

const GASTO = [
  { re: /\b(enel|cge|chilquinta|electricidad|energ[ií]a el[eé]ctrica|kwh|luz)\b/i, cat: "servicios" },
  { re: /\b(aguas|agua potable|esval|essbio|m3)\b/i, cat: "servicios" },
  { re: /\b(internet|telefon[ií]a|movistar|entel|claro|wom|vtr|gtd|fibra)\b/i, cat: "servicios" },
  { re: /\b(arriendo|alquiler|renta mensual)\b/i, cat: "arriendo" },
  { re: /\b(meta platforms|facebook ads|google ads|tiktok ads|publicidad|imprenta|volantes)\b/i, cat: "publicidad" },
  { re: /\b(remuneraci[oó]n|liquidaci[oó]n de sueldo|honorarios)\b/i, cat: "sueldos" },
] as const;

/** Convierte "12.990", "$ 1.234,50", "1,234.50" o "990" a número. */
export function aNumero(s: string): number | null {
  let t = s.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(t)) return null;
  const neg = t.startsWith("-");
  t = t.replace(/-/g, "");
  const ultPunto = t.lastIndexOf(".");
  const ultComa = t.lastIndexOf(",");
  if (ultPunto >= 0 && ultComa >= 0) {
    const dec = ultPunto > ultComa ? "." : ",";
    const mil = dec === "." ? "," : ".";
    t = t.split(mil).join("").replace(dec, ".");
  } else if (ultPunto >= 0 || ultComa >= 0) {
    const sep = ultPunto >= 0 ? "." : ",";
    const partes = t.split(sep);
    // "12.990" o "1.234.567": separador de miles. "12.5" o "12,50": decimales.
    const miles = partes.length > 2 || partes[partes.length - 1].length === 3;
    t = miles ? partes.join("") : partes.slice(0, -1).join("") + "." + partes[partes.length - 1];
  }
  const n = Number(t);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

// Un monto: "$12.990", "12.990", "1.234,50", "990". Evita capturar fechas y horas.
const RE_MONTO =
  /(?<![\d/:\p{L}-])-?\$?\s?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?(?![\d/:\p{L}])|(?<![\d/:.,\p{L}-])-?\$?\s?\d+(?:[.,]\d{1,2})?(?![\d/:.,\p{L}])/gu;

function montos(linea: string): { valor: number; texto: string; indice: number }[] {
  const r: { valor: number; texto: string; indice: number }[] = [];
  for (const m of linea.matchAll(RE_MONTO)) {
    const valor = aNumero(m[0]);
    if (valor !== null) r.push({ valor, texto: m[0], indice: m.index ?? 0 });
  }
  return r;
}

const letras = (s: string) => (s.match(/[a-záéíóúñü]/gi) ?? []).length;

export function detectarFecha(texto: string): string {
  const valida = (y: number, m: number, d: number) => {
    if (y < 100) y += 2000;
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return "";
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };
  let m = texto.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) return valida(+m[1], +m[2], +m[3]);
  m = texto.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/);
  if (m) {
    const f = valida(+m[3], +m[2], +m[1]);
    if (f) return f;
  }
  m = texto.match(/\b(\d{1,2})\s*(?:de\s+)?(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-z]*\.?\s*(?:de\s+|del\s+)?(\d{4})\b/i);
  if (m) return valida(+m[3], MESES[m[2].toLowerCase()], +m[1]);
  return "";
}

export function parsearBoleta(texto: string): BoletaIA {
  const lineas = texto
    .split(/\r?\n/)
    // Limpia ruido típico del OCR en los bordes: "| TEXTO", "_—]", etc.
    .map((l) => l.replace(/\s+/g, " ").replace(/^[|_\-—–=~\[\]{}()<>'"`´.,;:!¡¿?*#\\/ ]+/, "").replace(/[|_\-—–=~\[\]{}<>'"`´;!¡¿?*#\\ ]+$/, "").trim())
    .filter((l) => l && letras(l) + (l.match(/\d/g) ?? []).length >= 2);
  const notas: string[] = [];

  // --- emisor: primera línea con suficientes letras que no sea un encabezado genérico
  const candidato = (l: string) =>
    letras(l) >= 3 &&
    letras(l) / l.replace(/\s/g, "").length >= 0.6 &&
    !/^(boleta|factura|ticket|r\.?u\.?t|rut|ruc|giro|direcci|fecha|tel|fono|www|n[°º]|folio|documento)/i.test(l) &&
    !/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(l);
  // Preferimos una línea con una palabra real (4+ letras distintas de una repetición tipo "eee").
  const palabraReal = (l: string) => (l.match(/[a-záéíóúñ]{4,}/gi) ?? []).some((w) => new Set(w.toLowerCase()).size >= 3);
  const primeras = lineas.slice(0, 6);
  const comercio = primeras.find((l) => candidato(l) && palabraReal(l)) ?? primeras.find(candidato) ?? "";

  // --- folio / número de documento
  const folio =
    texto.match(/(?:folio|n[°ºo]\.?|nro\.?|n[uú]mero|boleta\s+electr[oó]nica\s+n[°ºo]?)\s*:?\s*(\d{3,12})/i)?.[1] ?? "";

  // --- total: última línea "TOTAL" (no subtotal) con monto, o la línea siguiente
  let total = 0;
  let idxTotal = -1;
  lineas.forEach((l, i) => {
    if (!ES_TOTAL.test(l) || NO_ES_TOTAL.test(l)) return;
    let ms = montos(l);
    if (ms.length === 0 && lineas[i + 1]) ms = montos(lineas[i + 1]);
    const v = ms.length ? ms[ms.length - 1].valor : 0;
    if (v > 0 && v >= total * 0.5) {
      total = Math.max(total, v);
      if (v === total) idxTotal = i;
    }
  });

  // --- impuesto
  let impuesto = 0;
  for (const [i, l] of lineas.entries()) {
    if (!ES_IVA.test(l) || /\b(incluido|incl\.?)\b/i.test(l) && montos(l).length === 0) continue;
    let ms = montos(l).filter((m) => !/%/.test(l.slice(m.indice, m.indice + m.texto.length + 1)));
    if (ms.length === 0 && lineas[i + 1]) ms = montos(lineas[i + 1]);
    const v = ms.length ? ms[ms.length - 1].valor : 0;
    if (v > 0 && (total === 0 || v < total)) {
      impuesto = v;
      break;
    }
  }

  // --- ítems: zona entre el encabezado y el total
  const fin = idxTotal >= 0 ? idxTotal : lineas.length;
  const items: BoletaIA["items"] = [];
  const soloTexto: string[] = [];
  const soloMonto: number[] = [];
  let pendiente = ""; // descripción en una línea, precio en la siguiente
  let racha = 0; // líneas seguidas que solo tienen texto

  const agregar = (descripcion: string, cantidad: number, precio: number, tot?: number) => {
    const desc = descripcion.replace(/^[\s\-*·.:#]+|[\s\-*·.:$]+$/g, "").trim();
    if (!desc || precio <= 0) return;
    items.push({ descripcion: desc, cantidad, precio_unitario: precio, total: tot ?? cantidad * precio });
  };

  for (let i = 0; i < fin; i++) {
    const l = lineas[i];
    const soloTextoLinea = letras(l) >= 2 && montos(l).length === 0 && !NO_ITEM.test(l);
    if (soloTextoLinea) racha++;
    else if (montos(l).length === 0 || letras(l) >= 2) racha = 0;
    if (NO_ITEM.test(l) || /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(l) || /\d{1,2}:\d{2}/.test(l)) {
      pendiente = "";
      continue;
    }
    if (l === comercio) continue;

    // "2 x 1.990  3.980"  /  "POLERA 2 X $4.990 $9.980"  /  "2 UN x 1.990"
    const mx = l.match(/^(.*?)(\d+(?:[.,]\d+)?)\s*(?:un\.?|uds?\.?|u\.?)?\s*[xX×*]\s*\$?\s?([\d.,]+)(?:\s+\$?\s?([\d.,]+))?\s*$/);
    if (mx) {
      const cant = aNumero(mx[2]) ?? 1;
      const pu = aNumero(mx[3]) ?? 0;
      const tot = mx[4] ? aNumero(mx[4]) ?? cant * pu : cant * pu;
      // La descripción puede ir en la misma línea, en la anterior o en la siguiente.
      const desc = letras(mx[1]) >= 2 ? mx[1] : pendiente;
      if (letras(desc) >= 2) {
        if (desc === pendiente) soloTexto.pop();
        agregar(desc, cant, pu, tot);
      } else if (i + 1 < fin && letras(lineas[i + 1]) >= 2 && montos(lineas[i + 1]).length === 0) {
        agregar(lineas[i + 1], cant, pu, tot); // descripción debajo de la cantidad
        i++;
      }
      pendiente = "";
      continue;
    }

    const ms = montos(l);
    const nLetras = letras(l);
    // Descripción con un número en el nombre ("PACK 3") seguida de "20 X 1.750": es solo descripción.
    const siguiente = lineas[i + 1] ?? "";
    if (nLetras >= 2 && /^\s*\d+(?:[.,]\d+)?\s*(?:un\.?|uds?\.?|u\.?)?\s*[xX×*]\s*\$?\s?\d/.test(siguiente)) {
      pendiente = l;
      soloTexto.push(l);
      continue;
    }
    if (nLetras >= 2 && ms.length > 0) {
      const ultimo = ms[ms.length - 1];
      const desc = l.slice(0, ms[0].indice);
      if (letras(desc) < 2) {
        pendiente = "";
        continue;
      }
      // "DESC  2  4.990  9.980": cantidad, precio unitario y total
      if (ms.length >= 3) {
        const [a, b, c] = ms.slice(-3).map((m) => m.valor);
        if (Number.isInteger(a) && a > 0 && a < 1000 && Math.abs(a * b - c) <= Math.max(1, c * 0.02)) {
          agregar(desc, a, b, c);
          pendiente = "";
          continue;
        }
      }
      // "DESC  2  9.980": cantidad pequeña y total
      if (ms.length >= 2) {
        const a = ms[ms.length - 2];
        if (Number.isInteger(a.valor) && a.valor > 0 && a.valor < 100 && !/[.,]/.test(a.texto) && ultimo.valor > a.valor) {
          agregar(desc, a.valor, ultimo.valor / a.valor, ultimo.valor);
          pendiente = "";
          continue;
        }
      }
      agregar(desc, 1, ultimo.valor, ultimo.valor);
      pendiente = "";
      continue;
    }
    if (nLetras >= 2 && ms.length === 0) {
      pendiente = l;
      soloTexto.push(l);
      continue;
    }
    if (nLetras < 2 && ms.length > 0) {
      const v = ms[ms.length - 1].valor;
      if (pendiente && racha === 1) {
        // descripción en la línea anterior y precio en esta
        const q = ms.length >= 2 && Number.isInteger(ms[0].valor) && ms[0].valor < 100 ? ms[0].valor : 1;
        agregar(pendiente, q, v / q, v);
        soloTexto.pop();
        pendiente = "";
        racha = 0;
      } else {
        soloMonto.push(v);
      }
    }
  }

  // OCR que separa columnas: primero todas las descripciones y después todos los precios.
  if (items.length === 0 && soloTexto.length > 0 && soloTexto.length === soloMonto.length) {
    soloTexto.forEach((d, i) => agregar(d, 1, soloMonto[i], soloMonto[i]));
    notas.push("Los productos y precios se emparejaron por orden; verifica que correspondan.");
  }

  // --- tipo de documento
  let tipo: BoletaIA["tipo"] = "compra";
  let categoria = "";
  for (const g of GASTO) {
    if (g.re.test(texto)) {
      tipo = "gasto";
      categoria = g.cat;
      break;
    }
  }

  const suma = items.reduce((s, i) => s + i.total, 0);
  if (total === 0 && suma > 0) {
    total = suma;
    notas.push("No se encontró la palabra TOTAL; se usó la suma de los productos.");
  }
  if (total === 0) {
    const todos = lineas.flatMap(montos).map((m) => m.valor);
    if (todos.length) {
      total = Math.max(...todos);
      notas.push("Total estimado como el monto más alto del documento.");
    }
  }
  const cuadra = total > 0 && suma > 0 && Math.abs(suma - total) <= Math.max(1, total * 0.01);
  if (tipo !== "gasto" && items.length === 0) notas.push("No se reconocieron productos; agrégalos a mano.");
  else if (tipo !== "gasto" && !cuadra && total > 0) notas.push("La suma de los productos no coincide con el total; revisa líneas o descuentos.");

  const fecha = detectarFecha(texto);
  if (!fecha) notas.push("No se encontró la fecha; se usará la de hoy.");

  return {
    tipo,
    comercio,
    fecha,
    numero_documento: folio,
    moneda: "",
    items,
    impuesto,
    total,
    categoria_gasto: categoria,
    confianza: cuadra && fecha ? "alta" : total > 0 ? "media" : "baja",
    notas: notas.join(" "),
  };
}
