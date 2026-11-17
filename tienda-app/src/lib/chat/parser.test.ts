import { describe, expect, it } from "vitest";
import type { Producto } from "../types";
import { ajustarATotal, interpretarChat, parsearMensajes, productosEnMensaje } from "./parser";

const prod = (id: string, nombre: string, precio: number): Producto => ({ id, nombre, categoria: "", costo: precio / 2, precio, stock: 10, stockMinimo: 2 });
const PRODUCTOS = [
  prod("polera", "Polera algodón básica", 9990),
  prod("jeans", "Jeans clásico", 24990),
  prod("poleron", "Polerón canguro", 22990),
  prod("calcetines", "Calcetines pack 3", 4990),
  prod("zapatillas", "Zapatillas urbanas", 39990),
];
const cantidades = (t: string) => Object.fromEntries(productosEnMensaje(t, PRODUCTOS).map((x) => [x.producto.id, x.cantidad]));

describe("parsearMensajes", () => {
  it("WhatsApp Android", () => {
    const { mensajes, formato } = parsearMensajes(`12/11/2026 14:30 - Camila: Hola! Tienes jeans?
12/11/2026 14:31 - Tienda: Sí
quedan 33
12/11/2026 14:32 - Camila: <Multimedia omitido>`);
    expect(formato).toBe("whatsapp");
    expect(mensajes).toEqual([
      { autor: "Camila", texto: "Hola! Tienes jeans?", fecha: "2026-11-12" },
      { autor: "Tienda", texto: "Sí\nquedan 33", fecha: "2026-11-12" },
    ]);
  });

  it("WhatsApp iOS con corchetes y año de 2 dígitos", () => {
    const { mensajes } = parsearMensajes("[12/11/26, 14:32:10] Camila: Quiero 2 jeans");
    expect(mensajes[0]).toEqual({ autor: "Camila", texto: "Quiero 2 jeans", fecha: "2026-11-12" });
  });

  it("Messenger con 'Nombre: texto' y sin confundir 'Total:' con un autor", () => {
    const { mensajes, formato } = parsearMensajes(`Pedro Gómez: Hola, quiero una polera
Vendedora: Claro, te queda
Total: $9.990`);
    expect(formato).toBe("generico");
    expect(mensajes.map((m) => m.autor)).toEqual(["Pedro Gómez", "Vendedora"]);
    expect(mensajes[1].texto).toContain("Total: $9.990");
  });

  it("texto plano", () => {
    const { mensajes, formato } = parsearMensajes("2 poleras y 1 jeans");
    expect(formato).toBe("plano");
    expect(mensajes).toHaveLength(1);
  });
});

describe("productosEnMensaje", () => {
  it("cantidades con número, palabra, plural y 'x2'", () => {
    expect(cantidades("Quiero 2 jeans y una polera")).toEqual({ jeans: 2, polera: 1 });
    expect(cantidades("dos poleras x3 calcetines")).toMatchObject({ polera: 2 });
    expect(cantidades("jeans x2")).toEqual({ jeans: 2 });
    expect(cantidades("3 pack de calcetines")).toEqual({ calcetines: 3 });
  });

  it("un precio no se toma como cantidad", () => {
    expect(cantidades("polera 9990 y jeans 24990")).toEqual({ polera: null, jeans: null });
  });

  it("distingue productos con nombre parecido", () => {
    expect(cantidades("quiero el poleron canguro")).toEqual({ poleron: null });
    expect(cantidades("una polera")).toEqual({ polera: 1 });
  });

  it("sin coincidencias", () => {
    expect(productosEnMensaje("hola, buenas tardes", PRODUCTOS)).toEqual([]);
  });
});

describe("interpretarChat", () => {
  const CHAT = `12/11/2026 14:30 - Camila: Hola! Tienes jeans clásicos?
12/11/2026 14:31 - Tienda: Sí, quedan 33. ¿Cuántos?
12/11/2026 14:32 - Camila: Quiero 2 jeans y una polera algodón
12/11/2026 14:35 - Tienda: Perfecto, el total es $55.980. ¿Transfieres?
12/11/2026 14:40 - Camila: Listo, transferí`;

  it("arma la venta completa", () => {
    const r = interpretarChat(CHAT, PRODUCTOS, "2026-11-20");
    expect(r.canal).toBe("whatsapp");
    expect(r.autores).toEqual(["Camila", "Tienda"]);
    expect(r.cliente).toBe("Camila");
    expect(r.fecha).toBe("2026-11-12");
    expect(r.metodoPago).toBe("transferencia");
    expect(r.totalChat).toBe(55980);
    expect(r.lineas).toEqual([
      { productoId: "jeans", cantidad: 2, explicita: true },
      { productoId: "polera", cantidad: 1, explicita: true },
    ]);
  });

  it("texto plano usa la fecha de hoy y avisa", () => {
    const r = interpretarChat("2 poleras y 3 pack de calcetines, pago en efectivo", PRODUCTOS, "2026-11-20");
    expect(r.fecha).toBe("2026-11-20");
    expect(r.metodoPago).toBe("efectivo");
    expect(r.lineas.map((l) => [l.productoId, l.cantidad])).toEqual([["polera", 2], ["calcetines", 3]]);
    expect(r.notas.join(" ")).toContain("fechas");
  });

  it("sin productos reconocidos", () => {
    const r = interpretarChat("Hola, ¿a qué hora abren?", PRODUCTOS, "2026-11-20");
    expect(r.lineas).toEqual([]);
    expect(r.notas[0]).toContain("No se reconoció");
  });

  it("detecta Messenger por el texto", () => {
    expect(interpretarChat("Mensaje de Messenger: quiero 1 jeans", PRODUCTOS, "2026-11-20").canal).toBe("messenger");
  });
});

describe("ajustarATotal", () => {
  it("reparte un descuento proporcionalmente y cuadra el total", () => {
    const precios = ajustarATotal([{ cantidad: 2, precio: 10000 }, { cantidad: 1, precio: 5000 }], 22000);
    expect(precios).toEqual([8800, 4400]);
    expect(2 * precios[0] + precios[1]).toBe(22000);
  });
  it("sin líneas no falla", () => {
    expect(ajustarATotal([], 100)).toEqual([]);
  });
});
