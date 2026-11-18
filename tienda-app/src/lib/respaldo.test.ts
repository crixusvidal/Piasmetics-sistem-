import { describe, expect, it } from "vitest";
import { datosDemo } from "./demo";
import { DATOS_VACIOS } from "./operaciones";
import { crearRespaldo, leerRespaldo, nombreArchivoRespaldo, normalizarDatos } from "./respaldo";

describe("datos de ejemplo", () => {
  it("no contaminan los datos vacíos al generarse", () => {
    datosDemo(DATOS_VACIOS.ajustes);
    expect(DATOS_VACIOS.gastos).toEqual([]);
  });
});

describe("respaldo de datos", () => {
  it("exportar e importar devuelve exactamente los mismos datos", () => {
    const datos = datosDemo(DATOS_VACIOS.ajustes);
    const r = leerRespaldo(crearRespaldo(datos, new Date("2026-11-18T10:00:00Z")));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.datos).toEqual(datos);
      expect(r.creado).toBe("2026-11-18T10:00:00.000Z");
    }
  });

  it("rechaza texto que no es JSON y archivos ajenos", () => {
    expect(leerRespaldo("hola").ok).toBe(false);
    expect(leerRespaldo("[]").ok).toBe(false);
    expect(leerRespaldo('{"productos":[]}').ok).toBe(false);
    expect(leerRespaldo("null").ok).toBe(false);
  });

  it("rechaza un respaldo de una versión futura", () => {
    const r = leerRespaldo(JSON.stringify({ formato: "mi-tienda-respaldo", version: 99, datos: DATOS_VACIOS }));
    expect(r.ok).toBe(false);
  });

  it("completa los ajustes que falten", () => {
    const { ajustes, ...sinAjustes } = DATOS_VACIOS;
    void ajustes;
    const r = leerRespaldo(JSON.stringify(sinAjustes));
    expect(r.ok && r.datos.ajustes.moneda).toBe("CLP");
    expect(normalizarDatos(null)).toEqual(DATOS_VACIOS);
  });

  it("nombra el archivo con la fecha", () => {
    expect(nombreArchivoRespaldo(new Date(2026, 10, 8))).toBe("mi-tienda-respaldo-2026-11-08.json");
  });
});
