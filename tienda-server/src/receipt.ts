import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// Esquema de la boleta/factura que devuelve la IA. La app muestra estos datos
// para que el usuario los revise y corrija antes de guardarlos.
export const ReceiptSchema = z.object({
  tipo: z
    .enum(["compra", "venta", "gasto"])
    .describe(
      "compra = boleta/factura de un proveedor con mercadería para revender; " +
        "venta = boleta emitida por la tienda a un cliente; " +
        "gasto = servicios, arriendo, publicidad u otros gastos operacionales",
    ),
  comercio: z.string().describe("Nombre del emisor de la boleta"),
  fecha: z.string().describe("Fecha en formato YYYY-MM-DD; vacío si no se lee"),
  numero_documento: z.string().describe("Folio o número; vacío si no aparece"),
  moneda: z.string().describe("Código ISO de moneda, por ejemplo CLP, PEN, MXN, USD"),
  items: z.array(
    z.object({
      descripcion: z.string(),
      cantidad: z.number(),
      precio_unitario: z.number().describe("Precio por unidad, impuestos incluidos"),
      total: z.number(),
    }),
  ),
  impuesto: z.number().describe("Monto de IVA/IGV u otro impuesto; 0 si no aparece"),
  total: z.number().describe("Total pagado del documento"),
  categoria_gasto: z
    .string()
    .describe("Si tipo = gasto: arriendo, servicios, publicidad, sueldos, otros. Vacío si no aplica"),
  confianza: z.enum(["alta", "media", "baja"]).describe("Qué tan legible y seguro es el resultado"),
  notas: z.string().describe("Advertencias para el usuario: partes ilegibles, montos dudosos, etc."),
});

export type Receipt = z.infer<typeof ReceiptSchema>;

const SYSTEM = `Eres un asistente contable para pequeñas tiendas de Latinoamérica.
Recibes la foto de una boleta, factura o ticket y extraes sus datos con exactitud.
- Lee los números tal como aparecen. En muchos países el punto separa miles ("12.990" = 12990); interpreta según el contexto y la moneda.
- No inventes ítems ni montos. Si algo no se lee, déjalo en 0 o vacío y explícalo en "notas".
- Si la suma de los ítems no coincide con el total, conserva ambos valores y avísalo en "notas".
- Responde en español.`;

const client = new Anthropic();

export class ReceiptError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}

type UserContent = Anthropic.Beta.Messages.BetaContentBlockParam[];

async function extract(content: UserContent): Promise<Receipt> {
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    // Si un clasificador de seguridad rechaza la solicitud, la API reintenta
    // automáticamente con un modelo alternativo.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "medium",
      format: betaZodOutputFormat(ReceiptSchema),
    },
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    throw new ReceiptError("La IA no pudo procesar esta boleta. Ingresa los datos manualmente.");
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new ReceiptError("No se pudo leer la boleta completa. Intenta con una foto más nítida.");
  }
  return response.parsed_output;
}

const instruction = (hint?: string) =>
  hint ? `Extrae los datos de este documento. Contexto del usuario: ${hint}` : "Extrae los datos de este documento.";

/** Analiza la foto de una boleta. */
export function analyzeReceipt(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  hint?: string,
): Promise<Receipt> {
  return extract([
    { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
    { type: "text", text: instruction(hint) },
  ]);
}

/**
 * Analiza el texto que el OCR del teléfono ya extrajo de la boleta. Es más
 * barato y rápido que enviar la imagen; el texto puede traer errores de OCR.
 */
export function analyzeReceiptText(ocrText: string, hint?: string): Promise<Receipt> {
  return extract([
    {
      type: "text",
      text:
        `Este es el texto que un OCR extrajo de una boleta (puede tener errores de lectura y columnas desordenadas):\n\n` +
        `<texto_ocr>\n${ocrText}\n</texto_ocr>\n\n${instruction(hint)}`,
    },
  ]);
}
