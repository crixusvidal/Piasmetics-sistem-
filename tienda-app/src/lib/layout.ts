import { useWindowDimensions } from "react-native";
import { formatoPara, type Formato } from "./dispositivo";

export type { Formato };

export interface InfoLayout {
  formato: Formato;
  /** Pantalla ancha: tablet o PC (barra lateral y paneles en columnas). */
  ancho: boolean;
  esPc: boolean;
  /** Columnas de las grillas de indicadores. */
  columnasKpi: number;
  /** Columnas de las listas de tarjetas (campañas). */
  columnasTarjetas: number;
  /** Ancho máximo del contenido; undefined en celular. */
  anchoMax?: number;
  margen: number;
  altoGrafico: number;
}

export function useLayout(): InfoLayout {
  const { width, height } = useWindowDimensions();
  const formato = formatoPara(width, height);
  return {
    formato,
    ancho: formato !== "celular",
    esPc: formato === "pc",
    columnasKpi: formato === "celular" ? 2 : 3,
    columnasTarjetas: formato === "pc" ? 3 : formato === "tablet" ? 2 : 1,
    anchoMax: formato === "pc" ? 1240 : formato === "tablet" ? 940 : undefined,
    margen: formato === "pc" ? 32 : formato === "tablet" ? 24 : 16,
    altoGrafico: formato === "pc" ? 230 : formato === "tablet" ? 180 : 140,
  };
}
