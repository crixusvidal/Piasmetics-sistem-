import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";

const MAX_LADO = 1568;

/** Reduce la imagen y la entrega en base64 (JPEG) para enviarla al servidor de IA. */
export async function aBase64(uri: string): Promise<string> {
  const { ancho, alto } = await new Promise<{ ancho: number; alto: number }>((ok) =>
    Image.getSize(
      uri,
      (ancho, alto) => ok({ ancho, alto }),
      () => ok({ ancho: 0, alto: 0 }),
    ),
  );
  const ctx = ImageManipulator.manipulate(uri);
  const escala = ancho && alto ? Math.min(1, MAX_LADO / Math.max(ancho, alto)) : 1;
  if (escala < 1) ctx.resize({ width: Math.round(ancho * escala), height: Math.round(alto * escala) });
  const img = await ctx.renderAsync();
  const r = await img.saveAsync({ base64: true, compress: 0.75, format: SaveFormat.JPEG });
  if (!r.base64) throw new Error("No se pudo leer la imagen.");
  return r.base64;
}
