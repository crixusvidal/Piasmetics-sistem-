import type { Campana, Compra, Datos, Gasto, Producto, Venta } from "./types";

export const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const DATOS_VACIOS: Datos = {
  productos: [],
  ventas: [],
  compras: [],
  gastos: [],
  campanas: [],
  ajustes: { moneda: "CLP", servidorUrl: "", claveApp: "" },
};

/** Registra una venta y descuenta el stock de cada producto vendido. */
export function registrarVenta(d: Datos, venta: Venta): Datos {
  const vendidos = new Map<string, number>();
  for (const i of venta.items) vendidos.set(i.productoId, (vendidos.get(i.productoId) ?? 0) + i.cantidad);
  return {
    ...d,
    ventas: [...d.ventas, venta],
    productos: d.productos.map((p) => (vendidos.has(p.id) ? { ...p, stock: p.stock - vendidos.get(p.id)! } : p)),
  };
}

/** Anula una venta y devuelve las unidades al stock. */
export function eliminarVenta(d: Datos, id: string): Datos {
  const venta = d.ventas.find((v) => v.id === id);
  if (!venta) return d;
  const devueltos = new Map<string, number>();
  for (const i of venta.items) devueltos.set(i.productoId, (devueltos.get(i.productoId) ?? 0) + i.cantidad);
  return {
    ...d,
    ventas: d.ventas.filter((v) => v.id !== id),
    productos: d.productos.map((p) => (devueltos.has(p.id) ? { ...p, stock: p.stock + devueltos.get(p.id)! } : p)),
  };
}

/**
 * Registra una compra a proveedor: suma stock y recalcula el costo con
 * promedio ponderado: (stock·costo + cantidad·costoNuevo) / (stock + cantidad).
 */
export function registrarCompra(d: Datos, compra: Compra): Datos {
  const productos = d.productos.map((p) => {
    const items = compra.items.filter((i) => i.productoId === p.id);
    if (items.length === 0) return p;
    let stock = Math.max(p.stock, 0);
    let valor = stock * p.costo;
    for (const i of items) {
      stock += i.cantidad;
      valor += i.cantidad * i.costoUnitario;
    }
    return { ...p, stock: p.stock + items.reduce((s, i) => s + i.cantidad, 0), costo: stock > 0 ? valor / stock : p.costo };
  });
  return { ...d, compras: [...d.compras, compra], productos };
}

export function eliminarCompra(d: Datos, id: string): Datos {
  const compra = d.compras.find((c) => c.id === id);
  if (!compra) return d;
  // Se revierte el stock; el costo promedio se mantiene (no es reversible con exactitud).
  return {
    ...d,
    compras: d.compras.filter((c) => c.id !== id),
    productos: d.productos.map((p) => {
      const cant = compra.items.filter((i) => i.productoId === p.id).reduce((s, i) => s + i.cantidad, 0);
      return cant ? { ...p, stock: p.stock - cant } : p;
    }),
  };
}

export const guardarProducto = (d: Datos, p: Producto): Datos => ({
  ...d,
  productos: d.productos.some((x) => x.id === p.id) ? d.productos.map((x) => (x.id === p.id ? p : x)) : [...d.productos, p],
});

export const eliminarProducto = (d: Datos, id: string): Datos => ({
  ...d,
  productos: d.productos.filter((p) => p.id !== id),
});

export const agregarGasto = (d: Datos, g: Gasto): Datos => ({ ...d, gastos: [...d.gastos, g] });
export const eliminarGasto = (d: Datos, id: string): Datos => ({ ...d, gastos: d.gastos.filter((g) => g.id !== id) });

export const guardarCampana = (d: Datos, c: Campana): Datos => ({
  ...d,
  campanas: d.campanas.some((x) => x.id === c.id) ? d.campanas.map((x) => (x.id === c.id ? c : x)) : [...d.campanas, c],
});

export const eliminarCampana = (d: Datos, id: string): Datos => ({
  ...d,
  campanas: d.campanas.filter((c) => c.id !== id),
  ventas: d.ventas.map((v) => (v.campanaId === id ? { ...v, campanaId: undefined } : v)),
});

/** Busca el producto cuyo nombre más se parece a la descripción de una boleta. */
export function buscarProducto(productos: Producto[], descripcion: string): Producto | undefined {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
  const palabras = new Set(norm(descripcion));
  let mejor: Producto | undefined;
  let puntaje = 0;
  for (const p of productos) {
    const pp = norm(p.nombre);
    if (pp.length === 0) continue;
    const comunes = pp.filter((w) => palabras.has(w)).length;
    const s = comunes / pp.length;
    if (s > puntaje) {
      puntaje = s;
      mejor = p;
    }
  }
  return puntaje >= 0.5 ? mejor : undefined;
}
