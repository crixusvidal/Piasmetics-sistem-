import type { Ajustes, BoletaIA } from "./types";

/** Envía la foto al servidor propio, que la analiza con Claude. */
export async function analizarBoleta(
  ajustes: Ajustes,
  imagenBase64: string,
  mediaType: string,
  pista?: string,
): Promise<BoletaIA> {
  if (!ajustes.servidorUrl) {
    throw new Error("Configura la dirección del servidor de IA en Ajustes.");
  }
  const url = ajustes.servidorUrl.replace(/\/+$/, "") + "/api/boletas/analizar";
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ajustes.claveApp ? { Authorization: `Bearer ${ajustes.claveApp}` } : {}),
      },
      body: JSON.stringify({ imageBase64: imagenBase64, mediaType, hint: pista }),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor de IA. Revisa la dirección y tu conexión.");
  }
  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(cuerpo.error ?? `Error del servidor (${res.status})`);
  return cuerpo.receipt as BoletaIA;
}

/** Envía solo el texto del OCR (más barato que la foto) para que la IA lo ordene. */
export async function analizarTextoBoleta(ajustes: Ajustes, texto: string, pista?: string): Promise<BoletaIA> {
  if (!ajustes.servidorUrl) {
    throw new Error("Configura la dirección del servidor de IA en Ajustes.");
  }
  const url = ajustes.servidorUrl.replace(/\/+$/, "") + "/api/boletas/analizar-texto";
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ajustes.claveApp ? { Authorization: `Bearer ${ajustes.claveApp}` } : {}),
      },
      body: JSON.stringify({ text: texto, hint: pista }),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor de IA. Revisa la dirección y tu conexión.");
  }
  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(cuerpo.error ?? `Error del servidor (${res.status})`);
  return cuerpo.receipt as BoletaIA;
}
