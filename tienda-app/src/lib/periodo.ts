import { periodoUltimosDias, type Periodo } from "./kpis";

export type OpcionPeriodo = "7" | "30" | "90" | "365";

export const OPCIONES_PERIODO: { valor: OpcionPeriodo; etiqueta: string }[] = [
  { valor: "7", etiqueta: "7 días" },
  { valor: "30", etiqueta: "30 días" },
  { valor: "90", etiqueta: "90 días" },
  { valor: "365", etiqueta: "1 año" },
];

export const aPeriodo = (o: OpcionPeriodo): Periodo => periodoUltimosDias(Number(o));
