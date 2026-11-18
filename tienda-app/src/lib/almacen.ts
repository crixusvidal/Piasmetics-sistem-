import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Dónde se guardan los datos. En la app de escritorio (.exe) los guarda un
 * archivo en la carpeta del usuario; en el navegador y el celular, el
 * almacenamiento local (AsyncStorage).
 */
export interface DiscoLocal {
  leer: () => Promise<string | null>;
  guardar: (texto: string) => Promise<void>;
  /** Carpeta donde queda el archivo de datos (para mostrarla al usuario). */
  carpeta?: string;
}

declare global {
  interface Window {
    miTiendaDisco?: DiscoLocal;
  }
}

function disco(): DiscoLocal | undefined {
  return typeof window !== "undefined" ? window.miTiendaDisco : undefined;
}

export const guardadoEnArchivo = () => !!disco();
export const carpetaDeDatos = () => disco()?.carpeta;

export async function leerAlmacen(clave: string): Promise<string | null> {
  const d = disco();
  return d ? d.leer() : AsyncStorage.getItem(clave);
}

export async function guardarAlmacen(clave: string, texto: string): Promise<void> {
  const d = disco();
  if (d) await d.guardar(texto);
  else await AsyncStorage.setItem(clave, texto);
}
