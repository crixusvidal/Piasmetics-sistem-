import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { guardarAlmacen, leerAlmacen } from "./almacen";
import { DATOS_VACIOS } from "./operaciones";
import { normalizarDatos } from "./respaldo";
import type { Datos } from "./types";

const CLAVE = "mi-tienda:datos:v1";

interface Store {
  datos: Datos;
  cargando: boolean;
  /** Aplica una transformación pura (ver operaciones.ts) y la guarda. */
  actualizar: (fn: (d: Datos) => Datos) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<Datos>(DATOS_VACIOS);
  const [cargando, setCargando] = useState(true);
  const listo = useRef(false);

  useEffect(() => {
    leerAlmacen(CLAVE)
      .then((raw) => {
        if (raw) setDatos(normalizarDatos(JSON.parse(raw) as Datos));
      })
      .catch((e) => console.warn("No se pudieron cargar los datos", e))
      .finally(() => {
        listo.current = true;
        setCargando(false);
      });
  }, []);

  useEffect(() => {
    if (!listo.current) return;
    guardarAlmacen(CLAVE, JSON.stringify(datos)).catch((e) => console.warn("No se pudo guardar", e));
  }, [datos]);

  const actualizar = useCallback((fn: (d: Datos) => Datos) => setDatos((d) => fn(d)), []);
  const valor = useMemo(() => ({ datos, cargando, actualizar }), [datos, cargando, actualizar]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fuera de StoreProvider");
  return s;
}
