import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import { analyzeReceipt, analyzeReceiptText, ReceiptError } from "./receipt.js";

const PORT = Number(process.env.PORT ?? 3001);
// Clave compartida entre la app y este servidor, para que nadie más use tu
// cuenta de Anthropic. Configúrala igual en Ajustes dentro de la app.
const APP_TOKEN = process.env.APP_TOKEN ?? "";

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

const app = express();
app.use(express.json({ limit: "12mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/api/salud", (_req, res) => {
  res.json({ ok: true });
});

function autorizado(req: express.Request, res: express.Response): boolean {
  if (APP_TOKEN && req.header("authorization") !== `Bearer ${APP_TOKEN}`) {
    res.status(401).json({ error: "Clave de la app incorrecta. Revísala en Ajustes." });
    return false;
  }
  return true;
}

function responderError(err: unknown, res: express.Response) {
  if (err instanceof ReceiptError) {
    res.status(err.status).json({ error: err.message });
  } else if (err instanceof Anthropic.RateLimitError) {
    res.status(429).json({ error: "Demasiadas solicitudes a la IA. Espera un momento." });
  } else if (err instanceof Anthropic.AuthenticationError) {
    console.error("API key de Anthropic inválida o ausente");
    res.status(500).json({ error: "El servidor no tiene una API key válida de Anthropic." });
  } else if (err instanceof Anthropic.BadRequestError) {
    console.error(err.message);
    res.status(400).json({ error: "La imagen o el texto no son válidos o son demasiado grandes." });
  } else if (err instanceof Anthropic.APIConnectionError) {
    res.status(503).json({ error: "No hay conexión con el servicio de IA." });
  } else {
    console.error(err);
    res.status(500).json({ error: "Error inesperado al analizar la boleta." });
  }
}

const leerPista = (hint: unknown) => (typeof hint === "string" ? hint.slice(0, 500) : undefined);

app.post("/api/boletas/analizar", async (req, res) => {
  if (!autorizado(req, res)) return;
  const { imageBase64, mediaType, hint } = req.body ?? {};
  if (typeof imageBase64 !== "string" || imageBase64.length < 100) {
    res.status(400).json({ error: "Falta la imagen de la boleta." });
    return;
  }
  const type: MediaType = MEDIA_TYPES.includes(mediaType) ? mediaType : "image/jpeg";
  try {
    const receipt = await analyzeReceipt(imageBase64.replace(/^data:image\/\w+;base64,/, ""), type, leerPista(hint));
    res.json({ receipt });
  } catch (err) {
    responderError(err, res);
  }
});

// Recibe solo el texto que el OCR del teléfono ya extrajo (más barato que la foto).
app.post("/api/boletas/analizar-texto", async (req, res) => {
  if (!autorizado(req, res)) return;
  const { text, hint } = req.body ?? {};
  if (typeof text !== "string" || text.trim().length < 5) {
    res.status(400).json({ error: "Falta el texto de la boleta." });
    return;
  }
  try {
    const receipt = await analyzeReceiptText(text.slice(0, 20000), leerPista(hint));
    res.json({ receipt });
  } catch (err) {
    responderError(err, res);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de boletas escuchando en http://localhost:${PORT}`);
  if (!APP_TOKEN) console.warn("Aviso: APP_TOKEN no está configurado; cualquiera podría usar este servidor.");
});
