import { describe, expect, it } from "vitest";
import { datosDemo } from "./demo";
import { inventarioAl, inversionEnPeriodo, kpisCampana, kpisFinancieros, valorInventario, ventasPorCanal } from "./kpis";
import { buscarProducto, DATOS_VACIOS, eliminarVenta, registrarCompra, registrarVenta } from "./operaciones";
import type { Datos } from "./types";

function base(): Datos {
  return {
    ...DATOS_VACIOS,
    productos: [{ id: "a", nombre: "Polera azul", categoria: "", costo: 0, precio: 1000, stock: 0, stockMinimo: 2 }],
  };
}

describe("operaciones de inventario", () => {
  it("la compra suma stock y calcula costo promedio ponderado", () => {
    let d = registrarCompra(base(), { id: "c1", fecha: "2026-01-01", proveedor: "X", origen: "manual", items: [{ productoId: "a", descripcion: "", cantidad: 10, costoUnitario: 400 }] });
    d = registrarCompra(d, { id: "c2", fecha: "2026-01-02", proveedor: "X", origen: "manual", items: [{ productoId: "a", descripcion: "", cantidad: 10, costoUnitario: 600 }] });
    expect(d.productos[0].stock).toBe(20);
    expect(d.productos[0].costo).toBe(500);
  });

  it("la venta descuenta stock y anularla lo devuelve", () => {
    let d = registrarCompra(base(), { id: "c1", fecha: "2026-01-01", proveedor: "X", origen: "manual", items: [{ productoId: "a", descripcion: "", cantidad: 10, costoUnitario: 400 }] });
    d = registrarVenta(d, { id: "v1", fecha: "2026-01-03", metodoPago: "efectivo", clienteNuevo: false, origen: "manual", items: [{ productoId: "a", nombre: "", cantidad: 3, precio: 1000, costo: 400 }] });
    expect(d.productos[0].stock).toBe(7);
    expect(eliminarVenta(d, "v1").productos[0].stock).toBe(10);
  });
});

describe("KPIs financieros", () => {
  // Compra 10 u. a $400 el día 1, vende 4 u. a $1000 en el período 2–11.
  let d = registrarCompra(base(), { id: "c1", fecha: "2026-01-01", proveedor: "X", origen: "manual", items: [{ productoId: "a", descripcion: "", cantidad: 10, costoUnitario: 400 }] });
  d = registrarVenta(d, { id: "v1", fecha: "2026-01-05", metodoPago: "efectivo", clienteNuevo: true, origen: "manual", campanaId: "k", items: [{ productoId: "a", nombre: "", cantidad: 4, precio: 1000, costo: 400 }] });
  d = { ...d, gastos: [{ id: "g", fecha: "2026-01-06", categoria: "arriendo", descripcion: "", monto: 1000, origen: "manual" }] };
  d = { ...d, campanas: [{ id: "k", nombre: "", canal: "", inicio: "2026-01-02", fin: "2026-01-11", inversion: 500, impresiones: 10000, clics: 100 }] };
  const k = kpisFinancieros(d, { desde: "2026-01-02", hasta: "2026-01-11" });

  it("ventas, costo y márgenes", () => {
    expect(k.ventas).toBe(4000);
    expect(k.costoVentas).toBe(1600);
    expect(k.utilidadBruta).toBe(2400);
    expect(k.margenBruto).toBeCloseTo(0.6);
    expect(k.markup).toBeCloseTo(1.5);
    expect(k.utilidadNeta).toBe(2400 - 1000 - 500);
    expect(k.ticketPromedio).toBe(4000);
  });

  it("rotación de inventario = costo de ventas / inventario promedio", () => {
    expect(k.inventarioInicial).toBe(4000); // 10 × 400
    expect(k.inventarioFinal).toBe(2400); // 6 × 400
    expect(k.inventarioPromedio).toBe(3200);
    expect(k.rotacionInventario).toBeCloseTo(0.5);
    expect(k.diasInventario).toBeCloseTo(20); // 10 días / 0.5
    expect(k.gmroi).toBeCloseTo(0.75);
    expect(k.puntoEquilibrio).toBeCloseTo(1500 / 0.6);
  });

  it("KPIs de campaña", () => {
    const m = kpisCampana(d, d.campanas[0]);
    expect(m.ctr).toBeCloseTo(0.01);
    expect(m.cpc).toBe(5);
    expect(m.cpm).toBe(50);
    expect(m.roas).toBe(8);
    expect(m.cac).toBe(500);
    expect(m.roi).toBeCloseTo((2400 - 500) / 500);
    expect(m.tasaConversion).toBeCloseTo(0.01);
  });

  it("prorratea la inversión de campañas por días", () => {
    expect(inversionEnPeriodo(d.campanas[0], { desde: "2026-01-02", hasta: "2026-01-06" })).toBe(250);
    expect(inversionEnPeriodo(d.campanas[0], { desde: "2026-02-01", hasta: "2026-02-10" })).toBe(0);
  });
});

describe("datos demo", () => {
  it("el inventario reconstruido es coherente con el actual", () => {
    const d = datosDemo();
    expect(d.ventas.length).toBeGreaterThan(200);
    expect(inventarioAl(d, "2999-01-01")).toBeCloseTo(valorInventario(d.productos));
    expect(d.productos.every((p) => p.stock >= 0)).toBe(true);
  });
});

describe("buscarProducto", () => {
  it("encuentra coincidencias aproximadas", () => {
    const ps = base().productos;
    expect(buscarProducto(ps, "POLERA AZUL T-M")?.id).toBe("a");
    expect(buscarProducto(ps, "Pantalón negro")).toBeUndefined();
  });
});

describe("ventas por canal", () => {
  it("separa tienda, WhatsApp y Messenger", () => {
    let d = registrarCompra(base(), { id: "c1", fecha: "2026-01-01", proveedor: "X", origen: "manual", items: [{ productoId: "a", descripcion: "", cantidad: 20, costoUnitario: 400 }] });
    const venta = (id: string, cant: number, canal?: "whatsapp" | "messenger") =>
      ({ id, fecha: "2026-01-05", metodoPago: "efectivo" as const, clienteNuevo: false, origen: "manual" as const, canal, items: [{ productoId: "a", nombre: "", cantidad: cant, precio: 1000, costo: 400 }] });
    d = registrarVenta(d, venta("v1", 2));
    d = registrarVenta(d, venta("v2", 3, "whatsapp"));
    d = registrarVenta(d, venta("v3", 1, "whatsapp"));
    d = registrarVenta(d, venta("v4", 5, "messenger"));
    const r = Object.fromEntries(ventasPorCanal(d, { desde: "2026-01-01", hasta: "2026-01-31" }).map((c) => [c.canal, c]));
    expect(r.tienda).toMatchObject({ ventas: 2000, transacciones: 1, utilidad: 1200 });
    expect(r.whatsapp).toMatchObject({ ventas: 4000, transacciones: 2, utilidad: 2400 });
    expect(r.messenger).toMatchObject({ ventas: 5000, transacciones: 1 });
  });
});
