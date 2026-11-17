import type { Campana, Compra, Datos, Fecha, Gasto, Producto, Venta } from "./types";

// ---------- utilidades de fecha ----------

export function hoy(): Fecha {
  return aFecha(new Date());
}

export function aFecha(d: Date): Fecha {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function desdeFecha(f: Fecha): Date {
  const [y, m, d] = f.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function sumarDias(f: Fecha, dias: number): Fecha {
  const d = desdeFecha(f);
  d.setDate(d.getDate() + dias);
  return aFecha(d);
}

/** Días entre dos fechas, ambos extremos incluidos. */
export function diasEntre(desde: Fecha, hasta: Fecha): number {
  const ms = desdeFecha(hasta).getTime() - desdeFecha(desde).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

export interface Periodo {
  desde: Fecha;
  hasta: Fecha;
}

export function periodoUltimosDias(dias: number, fin: Fecha = hoy()): Periodo {
  return { desde: sumarDias(fin, -(dias - 1)), hasta: fin };
}

export function periodoAnterior(p: Periodo): Periodo {
  const dias = diasEntre(p.desde, p.hasta);
  return { desde: sumarDias(p.desde, -dias), hasta: sumarDias(p.desde, -1) };
}

const enPeriodo = (f: Fecha, p: Periodo) => f >= p.desde && f <= p.hasta;

// ---------- totales por documento ----------

export const totalVenta = (v: Venta) => v.items.reduce((s, i) => s + i.cantidad * i.precio, 0);
export const costoVenta = (v: Venta) => v.items.reduce((s, i) => s + i.cantidad * i.costo, 0);
export const unidadesVenta = (v: Venta) => v.items.reduce((s, i) => s + i.cantidad, 0);
export const totalCompra = (c: Compra) => c.items.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0);

/** Valor del inventario actual a costo. */
export const valorInventario = (productos: Producto[]) =>
  productos.reduce((s, p) => s + Math.max(p.stock, 0) * p.costo, 0);

/**
 * Valor del inventario (a costo) al cierre de una fecha, reconstruido desde el
 * inventario actual: se restan las compras posteriores y se suman de vuelta los
 * costos de lo vendido después de esa fecha.
 */
export function inventarioAl(datos: Datos, fecha: Fecha): number {
  let valor = valorInventario(datos.productos);
  for (const c of datos.compras) {
    if (c.fecha > fecha) valor -= c.items.filter((i) => i.productoId).reduce((s, i) => s + i.cantidad * i.costoUnitario, 0);
  }
  for (const v of datos.ventas) {
    if (v.fecha > fecha) valor += costoVenta(v);
  }
  return Math.max(valor, 0);
}

/** Inversión de una campaña prorrateada a los días que caen dentro del período. */
export function inversionEnPeriodo(c: Campana, p: Periodo): number {
  const desde = c.inicio > p.desde ? c.inicio : p.desde;
  const hasta = c.fin < p.hasta ? c.fin : p.hasta;
  if (desde > hasta) return 0;
  const total = Math.max(diasEntre(c.inicio, c.fin), 1);
  return (c.inversion * diasEntre(desde, hasta)) / total;
}

const div = (a: number, b: number) => (b === 0 ? null : a / b);

// ---------- KPIs financieros ----------

export interface KpisFinancieros {
  ventas: number;
  costoVentas: number;
  utilidadBruta: number;
  margenBruto: number | null;
  markup: number | null;
  gastosOperacionales: number;
  inversionMarketing: number;
  utilidadNeta: number;
  margenNeto: number | null;
  transacciones: number;
  unidades: number;
  ticketPromedio: number | null;
  unidadesPorTicket: number | null;
  compras: number;
  inventarioInicial: number;
  inventarioFinal: number;
  inventarioPromedio: number;
  /** Veces que el inventario se vendió completo en el período. */
  rotacionInventario: number | null;
  /** Rotación llevada a un año de 365 días. */
  rotacionAnual: number | null;
  /** Días promedio que un producto permanece en bodega. */
  diasInventario: number | null;
  /** Utilidad bruta por cada peso invertido en inventario. */
  gmroi: number | null;
  /** Ventas necesarias para cubrir gastos fijos + marketing. */
  puntoEquilibrio: number | null;
  dias: number;
}

export function kpisFinancieros(datos: Datos, p: Periodo): KpisFinancieros {
  const ventas = datos.ventas.filter((v) => enPeriodo(v.fecha, p));
  const gastos = datos.gastos.filter((g) => enPeriodo(g.fecha, p));
  const compras = datos.compras.filter((c) => enPeriodo(c.fecha, p));

  const totalVentas = ventas.reduce((s, v) => s + totalVenta(v), 0);
  const cogs = ventas.reduce((s, v) => s + costoVenta(v), 0);
  const unidades = ventas.reduce((s, v) => s + unidadesVenta(v), 0);
  const utilidadBruta = totalVentas - cogs;
  const gastosOp = gastos.reduce((s, g) => s + g.monto, 0);
  const marketing = datos.campanas.reduce((s, c) => s + inversionEnPeriodo(c, p), 0);
  const utilidadNeta = utilidadBruta - gastosOp - marketing;

  const dias = diasEntre(p.desde, p.hasta);
  const invIni = inventarioAl(datos, sumarDias(p.desde, -1));
  const invFin = inventarioAl(datos, p.hasta);
  const invProm = (invIni + invFin) / 2;
  const rotacion = div(cogs, invProm);
  const margenBruto = div(utilidadBruta, totalVentas);

  return {
    ventas: totalVentas,
    costoVentas: cogs,
    utilidadBruta,
    margenBruto,
    markup: div(utilidadBruta, cogs),
    gastosOperacionales: gastosOp,
    inversionMarketing: marketing,
    utilidadNeta,
    margenNeto: div(utilidadNeta, totalVentas),
    transacciones: ventas.length,
    unidades,
    ticketPromedio: div(totalVentas, ventas.length),
    unidadesPorTicket: div(unidades, ventas.length),
    compras: compras.reduce((s, c) => s + totalCompra(c), 0),
    inventarioInicial: invIni,
    inventarioFinal: invFin,
    inventarioPromedio: invProm,
    rotacionInventario: rotacion,
    rotacionAnual: rotacion === null ? null : (rotacion * 365) / dias,
    diasInventario: rotacion ? dias / rotacion : null,
    gmroi: div(utilidadBruta, invProm),
    puntoEquilibrio: margenBruto && margenBruto > 0 ? (gastosOp + marketing) / margenBruto : null,
    dias,
  };
}

/** Variación porcentual entre dos valores (null si no hay base). */
export function variacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return (actual - anterior) / Math.abs(anterior);
}

// ---------- análisis por producto ----------

export interface KpiProducto {
  producto: Producto;
  unidades: number;
  ventas: number;
  utilidad: number;
  margen: number | null;
  /** Días que alcanza el stock actual al ritmo de venta del período. */
  diasCobertura: number | null;
  /** % de unidades disponibles que se vendieron. */
  sellThrough: number | null;
  stockBajo: boolean;
  sinMovimiento: boolean;
}

export function kpisProductos(datos: Datos, p: Periodo): KpiProducto[] {
  const dias = diasEntre(p.desde, p.hasta);
  const acum = new Map<string, { unidades: number; ventas: number; costo: number }>();
  for (const v of datos.ventas) {
    if (!enPeriodo(v.fecha, p)) continue;
    for (const i of v.items) {
      const a = acum.get(i.productoId) ?? { unidades: 0, ventas: 0, costo: 0 };
      a.unidades += i.cantidad;
      a.ventas += i.cantidad * i.precio;
      a.costo += i.cantidad * i.costo;
      acum.set(i.productoId, a);
    }
  }
  return datos.productos.map((producto) => {
    const a = acum.get(producto.id) ?? { unidades: 0, ventas: 0, costo: 0 };
    const porDia = a.unidades / dias;
    return {
      producto,
      unidades: a.unidades,
      ventas: a.ventas,
      utilidad: a.ventas - a.costo,
      margen: div(a.ventas - a.costo, a.ventas),
      diasCobertura: porDia > 0 ? producto.stock / porDia : null,
      sellThrough: div(a.unidades, a.unidades + Math.max(producto.stock, 0)),
      stockBajo: producto.stock <= producto.stockMinimo,
      sinMovimiento: a.unidades === 0 && producto.stock > 0,
    };
  });
}

/** Ventas y utilidad por día del período, para el gráfico. */
export function serieDiaria(datos: Datos, p: Periodo): { fecha: Fecha; ventas: number; utilidad: number }[] {
  const dias = diasEntre(p.desde, p.hasta);
  const serie = Array.from({ length: dias }, (_, i) => ({ fecha: sumarDias(p.desde, i), ventas: 0, utilidad: 0 }));
  const idx = new Map(serie.map((d, i) => [d.fecha, i]));
  for (const v of datos.ventas) {
    const i = idx.get(v.fecha);
    if (i === undefined) continue;
    const t = totalVenta(v);
    serie[i].ventas += t;
    serie[i].utilidad += t - costoVenta(v);
  }
  return serie;
}

export function gastosPorCategoria(gastos: Gasto[], p: Periodo): Record<string, number> {
  const r: Record<string, number> = {};
  for (const g of gastos) if (enPeriodo(g.fecha, p)) r[g.categoria] = (r[g.categoria] ?? 0) + g.monto;
  return r;
}

// ---------- KPIs de marketing ----------

export interface KpisCampana {
  campana: Campana;
  inversion: number;
  impresiones: number;
  clics: number;
  /** Click-through rate: clics / impresiones. */
  ctr: number | null;
  /** Costo por clic. */
  cpc: number | null;
  /** Costo por mil impresiones. */
  cpm: number | null;
  ventasAtribuidas: number;
  numeroVentas: number;
  /** Ventas / clics. */
  tasaConversion: number | null;
  /** Return on ad spend: ventas atribuidas / inversión. */
  roas: number | null;
  clientesNuevos: number;
  /** Costo de adquisición de cliente: inversión / clientes nuevos. */
  cac: number | null;
  utilidadAtribuida: number;
  /** (Utilidad bruta atribuida − inversión) / inversión. */
  roi: number | null;
  costoPorVenta: number | null;
}

export function kpisCampana(datos: Datos, c: Campana): KpisCampana {
  const ventas = datos.ventas.filter((v) => v.campanaId === c.id);
  const ventasAtribuidas = ventas.reduce((s, v) => s + totalVenta(v), 0);
  const utilidad = ventas.reduce((s, v) => s + totalVenta(v) - costoVenta(v), 0);
  const nuevos = ventas.filter((v) => v.clienteNuevo).length;
  return {
    campana: c,
    inversion: c.inversion,
    impresiones: c.impresiones,
    clics: c.clics,
    ctr: div(c.clics, c.impresiones),
    cpc: div(c.inversion, c.clics),
    cpm: c.impresiones ? (c.inversion / c.impresiones) * 1000 : null,
    ventasAtribuidas,
    numeroVentas: ventas.length,
    tasaConversion: div(ventas.length, c.clics),
    roas: div(ventasAtribuidas, c.inversion),
    clientesNuevos: nuevos,
    cac: div(c.inversion, nuevos),
    utilidadAtribuida: utilidad,
    roi: div(utilidad - c.inversion, c.inversion),
    costoPorVenta: div(c.inversion, ventas.length),
  };
}

export interface ResumenMarketing {
  inversion: number;
  ventasAtribuidas: number;
  roas: number | null;
  roi: number | null;
  cac: number | null;
  ctr: number | null;
  cpc: number | null;
  clientesNuevos: number;
  /** % de las ventas totales del período que vino de campañas. */
  participacionVentas: number | null;
  /** Inversión en marketing como % de las ventas del período. */
  marketingSobreVentas: number | null;
}

export function resumenMarketing(datos: Datos, p: Periodo): ResumenMarketing {
  const ventas = datos.ventas.filter((v) => enPeriodo(v.fecha, p));
  const total = ventas.reduce((s, v) => s + totalVenta(v), 0);
  const atribuidas = ventas.filter((v) => v.campanaId);
  const ventasAtribuidas = atribuidas.reduce((s, v) => s + totalVenta(v), 0);
  const utilidad = atribuidas.reduce((s, v) => s + totalVenta(v) - costoVenta(v), 0);
  const nuevos = atribuidas.filter((v) => v.clienteNuevo).length;
  const activas = datos.campanas.filter((c) => inversionEnPeriodo(c, p) > 0);
  const inversion = activas.reduce((s, c) => s + inversionEnPeriodo(c, p), 0);
  // Impresiones y clics también prorrateados por días dentro del período.
  const factor = (c: Campana) => (c.inversion ? inversionEnPeriodo(c, p) / c.inversion : 0);
  const impresiones = activas.reduce((s, c) => s + c.impresiones * factor(c), 0);
  const clics = activas.reduce((s, c) => s + c.clics * factor(c), 0);
  return {
    inversion,
    ventasAtribuidas,
    roas: div(ventasAtribuidas, inversion),
    roi: div(utilidad - inversion, inversion),
    cac: div(inversion, nuevos),
    ctr: div(clics, impresiones),
    cpc: div(inversion, clics),
    clientesNuevos: nuevos,
    participacionVentas: div(ventasAtribuidas, total),
    marketingSobreVentas: div(inversion, total),
  };
}

// ---------- ventas por canal ----------

export type CanalVenta = "tienda" | "whatsapp" | "messenger";

export interface VentasCanal {
  canal: CanalVenta;
  ventas: number;
  transacciones: number;
  utilidad: number;
}

/** Ventas, número de ventas y utilidad por canal (tienda, WhatsApp, Messenger). */
export function ventasPorCanal(datos: Datos, p: Periodo): VentasCanal[] {
  const acum: Record<CanalVenta, VentasCanal> = {
    tienda: { canal: "tienda", ventas: 0, transacciones: 0, utilidad: 0 },
    whatsapp: { canal: "whatsapp", ventas: 0, transacciones: 0, utilidad: 0 },
    messenger: { canal: "messenger", ventas: 0, transacciones: 0, utilidad: 0 },
  };
  for (const v of datos.ventas) {
    if (!enPeriodo(v.fecha, p)) continue;
    const a = acum[v.canal ?? "tienda"];
    const t = totalVenta(v);
    a.ventas += t;
    a.transacciones += 1;
    a.utilidad += t - costoVenta(v);
  }
  return Object.values(acum);
}
