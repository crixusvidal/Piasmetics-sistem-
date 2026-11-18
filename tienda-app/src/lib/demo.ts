import { hoy, sumarDias } from "./kpis";
import { DATOS_VACIOS, registrarCompra, registrarVenta } from "./operaciones";
import type { Ajustes, Datos, Producto, Venta } from "./types";

const NOMBRES = ["Camila", "Javier", "Fernanda", "Diego", "Valentina", "Matías", "Constanza", "Ignacio"];

/** Genera 60 días de datos de ejemplo para explorar la app. */
export function datosDemo(ajustes: Ajustes = DATOS_VACIOS.ajustes): Datos {
  let semilla = 42;
  const rnd = () => {
    semilla = (semilla * 16807) % 2147483647;
    return semilla / 2147483647;
  };
  const fin = hoy();
  const inicio = sumarDias(fin, -59);

  const base: Omit<Producto, "stock">[] = [
    { id: "p1", nombre: "Polera algodón básica", categoria: "Ropa", costo: 4500, precio: 9990, stockMinimo: 10 },
    { id: "p2", nombre: "Jeans clásico", categoria: "Ropa", costo: 12000, precio: 24990, stockMinimo: 6 },
    { id: "p3", nombre: "Polerón canguro", categoria: "Ropa", costo: 11000, precio: 22990, stockMinimo: 5 },
    { id: "p4", nombre: "Calcetines pack 3", categoria: "Accesorios", costo: 1800, precio: 4990, stockMinimo: 15 },
    { id: "p5", nombre: "Gorro de lana", categoria: "Accesorios", costo: 2500, precio: 6990, stockMinimo: 8 },
    { id: "p6", nombre: "Zapatillas urbanas", categoria: "Calzado", costo: 19000, precio: 39990, stockMinimo: 4 },
    { id: "p7", nombre: "Bolso de tela", categoria: "Accesorios", costo: 3000, precio: 7990, stockMinimo: 5 },
    { id: "p8", nombre: "Chaqueta cortaviento", categoria: "Ropa", costo: 16000, precio: 34990, stockMinimo: 3 },
  ];
  const popularidad = [5, 2.5, 1.5, 4, 1.2, 1, 0.6, 0.15];

  let d: Datos = {
    ...DATOS_VACIOS,
    ajustes,
    gastos: [],
    productos: base.map((p) => ({ ...p, stock: 0 })),
    campanas: [
      { id: "c1", nombre: "Lanzamiento invierno", canal: "Instagram", inicio: sumarDias(fin, -55), fin: sumarDias(fin, -35), inversion: 60000, impresiones: 42000, clics: 1150 },
      { id: "c2", nombre: "Volantes barrio", canal: "Volantes", inicio: sumarDias(fin, -40), fin: sumarDias(fin, -30), inversion: 25000, impresiones: 2000, clics: 60 },
      { id: "c3", nombre: "Promo 2x1 polerones", canal: "TikTok", inicio: sumarDias(fin, -20), fin: sumarDias(fin, -1), inversion: 80000, impresiones: 95000, clics: 2600 },
    ],
  };

  // Stock inicial y reposiciones cada ~2 semanas.
  for (let semana = 0; semana < 60; semana += 14) {
    d = registrarCompra(d, {
      id: `cm${semana}`,
      fecha: sumarDias(inicio, semana),
      proveedor: semana === 0 ? "Distribuidora Textil Sur" : "Mayorista Centro",
      origen: "manual",
      items: base.map((p, i) => ({
        productoId: p.id,
        descripcion: p.nombre,
        cantidad: Math.max(2, Math.round(popularidad[i] * (semana === 0 ? 14 : 9))),
        costoUnitario: Math.round(p.costo * (0.95 + rnd() * 0.1)),
      })),
    });
  }

  let n = 0;
  for (let dia = 0; dia < 60; dia++) {
    const fecha = sumarDias(inicio, dia);
    const activa = d.campanas.find((c) => fecha >= c.inicio && fecha <= c.fin);
    const finDeSemana = [0, 6].includes(new Date(fecha + "T12:00:00").getDay());
    const nVentas = Math.round(2 + rnd() * 4 + (finDeSemana ? 3 : 0) + (activa ? 2 : 0));
    for (let k = 0; k < nVentas; k++) {
      const items: Venta["items"] = [];
      const lineas = 1 + Math.floor(rnd() * 2.2);
      for (let l = 0; l < lineas; l++) {
        const total = popularidad.reduce((a, b) => a + b, 0);
        let r = rnd() * total;
        let idx = 0;
        while (r > popularidad[idx]) r -= popularidad[idx++];
        const p = d.productos[Math.min(idx, d.productos.length - 1)];
        if (p.stock <= 0 || items.some((i) => i.productoId === p.id)) continue;
        items.push({ productoId: p.id, nombre: p.nombre, cantidad: 1, precio: p.precio, costo: p.costo });
      }
      if (items.length === 0) continue;
      const deCampana = activa && rnd() < 0.35;
      const porChat = !deCampana && rnd() < 0.22;
      d = registrarVenta(d, {
        id: `v${n++}`,
        fecha,
        items,
        metodoPago: rnd() < 0.55 ? "tarjeta" : rnd() < 0.7 ? "efectivo" : "transferencia",
        campanaId: deCampana ? activa!.id : undefined,
        clienteNuevo: deCampana ? rnd() < 0.7 : rnd() < 0.15,
        origen: porChat ? "chat" : "manual",
        canal: porChat ? (rnd() < 0.6 ? "whatsapp" : "messenger") : undefined,
        cliente: porChat ? NOMBRES[Math.floor(rnd() * NOMBRES.length)] : undefined,
      });
    }
  }

  for (let mes = 0; mes < 2; mes++) {
    const f = sumarDias(inicio, mes * 30 + 1);
    d.gastos.push(
      { id: `ga${mes}`, fecha: f, categoria: "arriendo", descripcion: "Arriendo local", monto: 350000, origen: "manual" },
      { id: `gs${mes}`, fecha: sumarDias(f, 4), categoria: "servicios", descripcion: "Luz, agua e internet", monto: 65000, origen: "manual" },
      { id: `gu${mes}`, fecha: sumarDias(f, 28), categoria: "sueldos", descripcion: "Vendedor part-time", monto: 280000, origen: "manual" },
    );
  }
  return d;
}
