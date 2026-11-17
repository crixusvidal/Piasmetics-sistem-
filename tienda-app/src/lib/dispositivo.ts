export type Formato = "celular" | "tablet" | "pc";

/**
 * Elige el formato según el tamaño de la ventana: funciona igual en iPhone,
 * Android, iPad, tablets Android y navegadores de escritorio.
 * Un celular en horizontal (poco alto) sigue usando el formato celular.
 */
export function formatoPara(ancho: number, alto: number): Formato {
  if (Math.min(ancho, alto) < 500 && ancho < 1024) return "celular";
  if (ancho >= 1024) return "pc";
  if (ancho >= 640) return "tablet";
  return "celular";
}
