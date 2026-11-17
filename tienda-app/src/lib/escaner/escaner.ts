import * as ImagePicker from "expo-image-picker";
import type { ScanDocumentOptions, ScanDocumentResponse } from "react-native-document-scanner-plugin";

/**
 * Captura tipo "escáner de documentos" (como las apps que pasan fotos a PDF):
 * detecta los bordes de la boleta, corrige la perspectiva, recorta y mejora el
 * contraste. Usa Google ML Kit Document Scanner (Android) y VisionKit (iOS).
 */
export interface Escaneo {
  uri: string;
  /** true si la imagen pasó por el escáner (bordes, recorte y contraste). */
  procesada: boolean;
  detalle: string;
}

type Escaner = { scanDocument(o?: ScanDocumentOptions): Promise<ScanDocumentResponse> };

function cargarEscaner(): Escaner | null {
  try {
    // El módulo nativo no existe en Expo Go: ahí usamos la cámara normal.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-document-scanner-plugin").default as Escaner;
  } catch {
    return null;
  }
}

const aUri = (p: string) => (p.startsWith("/") ? `file://${p}` : p);

export async function escanearConCamara(): Promise<Escaneo | null> {
  const escaner = cargarEscaner();
  if (escaner) {
    const r = await escaner.scanDocument({ maxNumDocuments: 1, croppedImageQuality: 90 });
    if (r.status === "cancel" || !r.scannedImages?.length) return null;
    return { uri: aUri(r.scannedImages[0]), procesada: true, detalle: "Bordes detectados, perspectiva corregida y recortada." };
  }
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) throw new Error("Activa el acceso a la cámara para escanear boletas.");
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 });
  if (r.canceled || !r.assets?.[0]) return null;
  return { uri: r.assets[0].uri, procesada: false, detalle: "Foto normal (el escáner de bordes requiere la app instalada, no Expo Go)." };
}

export async function importarImagen(): Promise<Escaneo | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
  if (r.canceled || !r.assets?.[0]) return null;
  return { uri: r.assets[0].uri, procesada: false, detalle: "Imagen importada desde la galería." };
}
