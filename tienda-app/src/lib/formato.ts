const cache = new Map<string, Intl.NumberFormat>();

function fmt(moneda: string, compacto: boolean) {
  const k = `${moneda}-${compacto}`;
  let f = cache.get(k);
  if (!f) {
    try {
      f = new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: moneda,
        maximumFractionDigits: ["CLP", "COP", "PYG"].includes(moneda) ? 0 : 2,
        notation: compacto ? "compact" : "standard",
      });
    } catch {
      f = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });
    }
    cache.set(k, f);
  }
  return f;
}

export const dinero = (n: number | null | undefined, moneda: string, compacto = false) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : fmt(moneda, compacto).format(n);

export const pct = (n: number | null | undefined, decimales = 1) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : `${(n * 100).toFixed(decimales).replace(".", ",")}%`;

export const num = (n: number | null | undefined, decimales = 1) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? "—"
    : n.toLocaleString("es-CL", { maximumFractionDigits: decimales });

/** Convierte texto ingresado ("12.990", "12990,5") a número. */
export function leerNumero(s: string): number {
  const limpio = s.replace(/[^\d,.-]/g, "");
  if (/,\d{1,2}$/.test(limpio)) return Number(limpio.replace(/\./g, "").replace(",", ".")) || 0;
  if (/\.\d{3}(\.|$)/.test(limpio)) return Number(limpio.replace(/\./g, "").replace(",", ".")) || 0;
  return Number(limpio.replace(",", ".")) || 0;
}

export const fechaCorta = (f: string) => {
  const [, m, d] = f.split("-");
  return `${d}/${m}`;
};
