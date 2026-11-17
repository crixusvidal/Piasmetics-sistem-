import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { dinero, fechaCorta } from "../lib/formato";
import { useLayout } from "../lib/layout";
import { colores } from "../lib/tema";

interface Punto {
  fecha: string;
  ventas: number;
  utilidad: number;
}

/**
 * Barras de ventas por día (o por semana si el período es largo).
 * Tocar una barra muestra su detalle arriba del gráfico.
 */
export function GraficoBarras({ serie, moneda }: { serie: Punto[]; moneda: string }) {
  const grupos = useMemo(() => {
    const tam = serie.length > 45 ? 7 : 1;
    const r: { etiqueta: string; ventas: number; utilidad: number }[] = [];
    for (let i = 0; i < serie.length; i += tam) {
      const trozo = serie.slice(i, i + tam);
      r.push({
        etiqueta: tam === 1 ? fechaCorta(trozo[0].fecha) : `Sem. ${fechaCorta(trozo[0].fecha)}`,
        ventas: trozo.reduce((s, p) => s + p.ventas, 0),
        utilidad: trozo.reduce((s, p) => s + p.utilidad, 0),
      });
    }
    return r;
  }, [serie]);

  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(...grupos.map((g) => g.ventas), 1);
  const activo = sel !== null ? grupos[sel] : null;
  const total = grupos.reduce((s, g) => s + g.ventas, 0);
  const ALTO = useLayout().altoGrafico;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ minHeight: 38 }}>
        {activo ? (
          <>
            <Text style={{ fontSize: 13, color: colores.textoSec }}>{activo.etiqueta}</Text>
            <Text style={{ fontSize: 15, color: colores.texto, fontWeight: "600" }}>
              Ventas {dinero(activo.ventas, moneda)} · Utilidad {dinero(activo.utilidad, moneda)}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 13, color: colores.textoSec }}>
              Ventas por {grupos.length < serie.length ? "semana" : "día"} · toca una barra
            </Text>
            <Text style={{ fontSize: 15, color: colores.texto, fontWeight: "600" }}>Total {dinero(total, moneda)}</Text>
          </>
        )}
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: ALTO, gap: 2 }}>
        {grupos.map((g, i) => (
          <Pressable
            key={i}
            onPress={() => setSel(sel === i ? null : i)}
            onHoverIn={() => setSel(i)}
            accessibilityLabel={`${g.etiqueta}: ventas ${dinero(g.ventas, moneda)}`}
            style={{ flex: 1, height: "100%", justifyContent: "flex-end" }}
          >
            <View
              style={{
                height: Math.max((g.ventas / max) * ALTO, g.ventas > 0 ? 2 : 0),
                backgroundColor: colores.serie1,
                opacity: sel === null || sel === i ? 1 : 0.35,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
              }}
            />
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colores.borde, paddingTop: 4 }}>
        <Text style={{ fontSize: 11, color: colores.textoTenue }}>{grupos[0]?.etiqueta}</Text>
        <Text style={{ fontSize: 11, color: colores.textoTenue }}>{grupos[grupos.length - 1]?.etiqueta}</Text>
      </View>
    </View>
  );
}

/** Barra horizontal simple para rankings (ej. ventas por producto). */
export function BarraH({ etiqueta, valor, max, texto }: { etiqueta: string; valor: number; max: number; texto: string }) {
  return (
    <View style={{ gap: 4, paddingVertical: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ fontSize: 14, color: colores.texto, flex: 1 }} numberOfLines={1}>
          {etiqueta}
        </Text>
        <Text style={{ fontSize: 14, color: colores.texto, fontWeight: "600" }}>{texto}</Text>
      </View>
      <View style={{ height: 8, backgroundColor: colores.fondo, borderRadius: 4 }}>
        <View style={{ height: 8, width: `${max > 0 ? Math.max((valor / max) * 100, 0) : 0}%`, backgroundColor: colores.serie1, borderRadius: 4 }} />
      </View>
    </View>
  );
}
