import { describe, expect, it } from "vitest";
import { aNumero, detectarFecha, parsearBoleta } from "./parser";

describe("aNumero", () => {
  it.each([
    ["12.990", 12990],
    ["$ 1.234.567", 1234567],
    ["1.234,50", 1234.5],
    ["1,234.50", 1234.5],
    ["12,5", 12.5],
    ["990", 990],
    ["-500", -500],
  ])("%s → %s", (t, n) => expect(aNumero(t)).toBe(n));
});

describe("detectarFecha", () => {
  it("formatos comunes", () => {
    expect(detectarFecha("FECHA: 10/11/2026 14:32")).toBe("2026-11-10");
    expect(detectarFecha("Emisión 2026-03-05")).toBe("2026-03-05");
    expect(detectarFecha("05-03-26")).toBe("2026-03-05");
    expect(detectarFecha("Santiago, 7 de octubre de 2026")).toBe("2026-10-07");
  });
});

describe("parsearBoleta", () => {
  it("factura de proveedor con cantidad x precio", () => {
    const r = parsearBoleta(`DISTRIBUIDORA TEXTIL SUR SPA
RUT: 76.123.456-7
FACTURA ELECTRONICA N° 004512
Fecha: 10/11/2026
POLERA ALGODON BASICA
12 X 4.600 55.200
CALCETINES PACK 3 20 x $1.750 $35.000
CINTURON CUERO CAFE 5 X 5.200 26.000
NETO 97.647
IVA 19% 18.553
TOTAL $116.200`);
    expect(r.comercio).toBe("DISTRIBUIDORA TEXTIL SUR SPA");
    expect(r.numero_documento).toBe("004512");
    expect(r.fecha).toBe("2026-11-10");
    expect(r.total).toBe(116200);
    expect(r.impuesto).toBe(18553);
    expect(r.items).toEqual([
      { descripcion: "POLERA ALGODON BASICA", cantidad: 12, precio_unitario: 4600, total: 55200 },
      { descripcion: "CALCETINES PACK 3", cantidad: 20, precio_unitario: 1750, total: 35000 },
      { descripcion: "CINTURON CUERO CAFE", cantidad: 5, precio_unitario: 5200, total: 26000 },
    ]);
    expect(r.confianza).toBe("alta");
    expect(r.tipo).toBe("compra");
  });

  it("boleta de supermercado con un precio por línea", () => {
    const r = parsearBoleta(`SUPERMERCADO EL ALMACEN
BOLETA ELECTRONICA 88231
07-11-2026 18:45 CAJA 3
BOLSA PAPEL 150
DETERGENTE 3L $6.990
ESPONJA X2 1.290
SUBTOTAL 8.430
TOTAL 8.430
EFECTIVO 10.000
VUELTO 1.570`);
    expect(r.total).toBe(8430);
    expect(r.items.map((i) => [i.descripcion, i.total])).toEqual([
      ["BOLSA PAPEL", 150],
      ["DETERGENTE 3L", 6990],
      ["ESPONJA X2", 1290],
    ]);
    expect(r.confianza).toBe("alta");
  });

  it("columnas: cantidad, precio unitario y total", () => {
    const r = parsearBoleta(`FERRETERIA LOS ANDES
Fecha 2026-11-01
TORNILLO 1/2 100 25 2.500
PINTURA LATEX 2 8.990 17.980
TOTAL 20.480`);
    expect(r.items).toEqual([
      { descripcion: "TORNILLO 1/2", cantidad: 100, precio_unitario: 25, total: 2500 },
      { descripcion: "PINTURA LATEX", cantidad: 2, precio_unitario: 8990, total: 17980 },
    ]);
  });

  it("OCR que separa descripciones y precios", () => {
    const r = parsearBoleta(`TIENDA ROSITA
12/11/2026
JEANS CLASICO
POLERON CANGURO
24.990
22.990
TOTAL 47.980`);
    expect(r.items.map((i) => i.total)).toEqual([24990, 22990]);
    expect(r.total).toBe(47980);
  });

  it("detecta gastos de servicios", () => {
    const r = parsearBoleta(`ENEL DISTRIBUCION CHILE S.A.
Consumo 245 kWh
Fecha emisión 03/11/2026
TOTAL A PAGAR $ 48.320`);
    expect(r.tipo).toBe("gasto");
    expect(r.categoria_gasto).toBe("servicios");
    expect(r.total).toBe(48320);
  });

  it("texto ilegible no se cae", () => {
    const r = parsearBoleta("@@@ ### \n ...");
    expect(r.confianza).toBe("baja");
    expect(r.items).toEqual([]);
  });
});

describe("descripción y precio en líneas separadas", () => {
  it("empareja cada descripción con el precio siguiente", () => {
    const r = parsearBoleta(`KIOSKO DON PEPE
01/11/2026
CUADERNO UNIVERSITARIO
2.490
LAPIZ PASTA AZUL
390
TOTAL 2.880`);
    expect(r.items.map((i) => [i.descripcion, i.total])).toEqual([
      ["CUADERNO UNIVERSITARIO", 2490],
      ["LAPIZ PASTA AZUL", 390],
    ]);
    expect(r.confianza).toBe("alta");
  });
});

describe("texto real de OCR", () => {
  it("nombre con número seguido de la línea de cantidad", () => {
    const r = parsearBoleta(`NN
DISTRIBUIDORA TEXTIL SUR SPA
RUT: 76.123.456-7
Av. Matta 1234, santiago
FACTURA ELECTRONICA Ne 004512
Fecha: 10/11/2026 Hora: 15:42
POLERA ALGODON BASICA
12 X 4.600 55.200
CALCETINES PACK 3
20 X 1.750 35.000
CINTURON CUERO CAFE
5 X 5.200 26.000
NETO 97.647
IVA 19% 18.553
TOTAL 116.200
Gracias por su compra`);
    expect(r.comercio).toBe("DISTRIBUIDORA TEXTIL SUR SPA");
    expect(r.items.map((i) => [i.descripcion, i.cantidad, i.precio_unitario])).toEqual([
      ["POLERA ALGODON BASICA", 12, 4600],
      ["CALCETINES PACK 3", 20, 1750],
      ["CINTURON CUERO CAFE", 5, 5200],
    ]);
    expect(r.total).toBe(116200);
    expect(r.confianza).toBe("alta");
  });
});

describe("ruido de OCR", () => {
  it("ignora basura de los bordes", () => {
    const r = parsearBoleta(`_—]—eee
|| DISTRIBUIDORA TEXTIL SUR SPA |
Fecha: 10/11/2026
| CALCETINES PACK 3
20 X 1.750 35.000
TOTAL 35.000 |`);
    expect(r.comercio).toBe("DISTRIBUIDORA TEXTIL SUR SPA");
    expect(r.items[0].descripcion).toBe("CALCETINES PACK 3");
    expect(r.total).toBe(35000);
  });
});
