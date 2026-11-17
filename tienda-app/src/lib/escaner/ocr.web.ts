/**
 * OCR en el navegador con Tesseract.js (se carga desde CDN la primera vez,
 * junto con el idioma español). Todo el reconocimiento ocurre en el equipo.
 */
export const motorOcr = "Tesseract.js (en el navegador)";

/** En web el OCR siempre está disponible; existe por paridad con la versión nativa. */
export class OcrNoDisponible extends Error {}

const VERSION = "7.0.0";

interface Trabajador {
  recognize(img: string): Promise<{ data: { text: string } }>;
}
interface TesseractGlobal {
  createWorker(lang: string, oem?: number, opts?: Record<string, unknown> & { logger?: (m: { status: string; progress: number }) => void }): Promise<Trabajador>;
}

/**
 * Por defecto todo se descarga del CDN. Si la página define
 * globalThis.__OCR_LOCAL__ (una URL base), el motor, el núcleo y el idioma se
 * cargan desde archivos propios: sirve donde el CDN está bloqueado.
 */
const baseLocal = (): string | undefined => (globalThis as unknown as { __OCR_LOCAL__?: string }).__OCR_LOCAL__;

let cargando: Promise<TesseractGlobal> | null = null;
function cargarTesseract(): Promise<TesseractGlobal> {
  const g = globalThis as unknown as { Tesseract?: TesseractGlobal };
  if (g.Tesseract) return Promise.resolve(g.Tesseract);
  cargando ??= new Promise((ok, mal) => {
    const s = document.createElement("script");
    const local = baseLocal();
    s.src = local ? `${local}tesseract.min.js` : `https://cdn.jsdelivr.net/npm/tesseract.js@${VERSION}/dist/tesseract.min.js`;
    s.onload = () => (g.Tesseract ? ok(g.Tesseract) : mal(new Error("No se pudo iniciar el OCR.")));
    s.onerror = () => {
      cargando = null;
      mal(new Error("No se pudo descargar el motor de OCR. Revisa tu conexión."));
    };
    document.head.appendChild(s);
  });
  return cargando;
}

let trabajador: Promise<Trabajador> | null = null;
let progreso: ((p: number) => void) | undefined;

export async function extraerTexto(uri: string, alProgreso?: (p: number) => void): Promise<string> {
  progreso = alProgreso;
  const T = await cargarTesseract();
  const local = baseLocal();
  trabajador ??= T.createWorker("spa", 1, {
    logger: (m) => {
      if (m.status === "recognizing text") progreso?.(m.progress);
    },
    ...(local ? { workerPath: `${local}worker.min.js`, corePath: local, langPath: local, workerBlobURL: false, gzip: true } : {}),
  }).catch((e) => {
    trabajador = null;
    throw e;
  });
  const w = await trabajador;
  const r = await w.recognize(uri);
  return r.data.text;
}
