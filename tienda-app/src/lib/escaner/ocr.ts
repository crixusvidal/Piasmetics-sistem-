/**
 * OCR en el propio teléfono, sin internet: Google ML Kit (Android) y Apple
 * Vision (iOS) mediante expo-text-extractor.
 */
export const motorOcr = "ML Kit / Apple Vision (en el teléfono)";

type Extractor = { isSupported: boolean; extractTextFromImage(uri: string): Promise<string[]> };

function cargar(): Extractor | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-text-extractor") as Extractor;
  } catch {
    return null;
  }
}

/** El OCR nativo no existe en Expo Go; ahí la pantalla ofrece alternativas. */
export class OcrNoDisponible extends Error {}

export async function extraerTexto(uri: string, _alProgreso?: (p: number) => void): Promise<string> {
  const ex = cargar();
  if (!ex || !ex.isSupported) {
    throw new OcrNoDisponible("El lector de texto del teléfono no está disponible en Expo Go.");
  }
  const bloques = await ex.extractTextFromImage(uri);
  return bloques.join("\n");
}
