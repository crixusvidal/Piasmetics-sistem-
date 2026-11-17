import { useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLayout } from "../lib/layout";
import { colores, radio } from "../lib/tema";

export function Pantalla({
  children,
  titulo,
  accion,
  estrecha,
}: {
  children: ReactNode;
  titulo: string;
  accion?: ReactNode;
  /** Formularios: en pantallas anchas se limitan a un ancho cómodo de lectura. */
  estrecha?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { anchoMax, margen, esPc, ancho } = useLayout();
  const max = estrecha && ancho ? 640 : anchoMax;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: margen, paddingTop: insets.top + (esPc ? 24 : 12), paddingBottom: 32, gap: esPc ? 16 : 12 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: "100%", maxWidth: max, alignSelf: "center", gap: esPc ? 16 : 12 }}>
        <View style={s.encabezado}>
          <Text style={[s.titulo, esPc && { fontSize: 30 }]}>{titulo}</Text>
          {accion}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

/** Reparte el contenido en columnas en pantallas anchas y lo apila en celular. */
export function Columnas({ children, pesos = [1, 1], gap = 16 }: { children: ReactNode[]; pesos?: number[]; gap?: number }) {
  const { ancho } = useLayout();
  if (!ancho) return <View style={{ gap: 12 }}>{children}</View>;
  return (
    <View style={{ flexDirection: "row", gap, alignItems: "flex-start" }}>
      {children.map((c, i) => (
        <View key={i} style={{ flex: pesos[i] ?? 1, minWidth: 0, gap: 12 }}>
          {c}
        </View>
      ))}
    </View>
  );
}

/** Cuadrícula de tarjetas: 1 columna en celular, 2 en tablet, 3 en PC. */
export function GrillaTarjetas({ children }: { children: ReactNode[] }) {
  const { columnasTarjetas } = useLayout();
  const gap = 12;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
      {children.map((c, i) => (
        <View key={i} style={{ flexBasis: `${100 / columnasTarjetas - 2}%`, flexGrow: 1, minWidth: columnasTarjetas === 1 ? "100%" : 260 }}>
          {c}
        </View>
      ))}
    </View>
  );
}

export function Tarjeta({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.tarjeta, style]}>{children}</View>;
}

export function Seccion({ titulo, children, extra }: { titulo: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <View style={{ gap: 8, marginTop: 4 }}>
      <View style={s.encabezado}>
        <Text style={s.seccion}>{titulo}</Text>
        {extra}
      </View>
      {children}
    </View>
  );
}

type Tono = "bueno" | "alerta" | "critico" | undefined;

export function Kpi({
  etiqueta,
  valor,
  detalle,
  delta,
  ayuda,
  tono,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  /** Variación vs período anterior (fracción). */
  delta?: number | null;
  ayuda?: string;
  tono?: Tono;
}) {
  const [abierto, setAbierto] = useState(false);
  const { columnasKpi, esPc } = useLayout();
  return (
    <Pressable
      onPress={() => ayuda && setAbierto((a) => !a)}
      style={[s.tarjeta, s.kpi, { flexBasis: `${100 / columnasKpi - 3}%`, minWidth: columnasKpi === 2 ? 150 : 170 }]}
      accessibilityRole={ayuda ? "button" : undefined}
      accessibilityHint={ayuda ? "Muestra qué significa este indicador" : undefined}
    >
      <Text style={s.kpiEtiqueta} numberOfLines={2}>
        {etiqueta}
        {ayuda ? "  ⓘ" : ""}
      </Text>
      <Text style={[s.kpiValor, esPc && { fontSize: 24 }, tono && { color: colorTono(tono) }]}>
        {tono ? iconoTono(tono) + " " : ""}
        {valor}
      </Text>
      {delta !== undefined && delta !== null && Number.isFinite(delta) && (
        <Text style={[s.kpiDetalle, { color: delta >= 0 ? colores.bueno : colores.critico }]}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta * 100).toFixed(1).replace(".", ",")}% vs. período anterior
        </Text>
      )}
      {detalle ? <Text style={s.kpiDetalle}>{detalle}</Text> : null}
      {abierto && ayuda ? <Text style={s.ayuda}>{ayuda}</Text> : null}
    </Pressable>
  );
}

const colorTono = (t: Exclude<Tono, undefined>) =>
  t === "bueno" ? colores.bueno : t === "alerta" ? colores.alerta : colores.critico;
const iconoTono = (t: Exclude<Tono, undefined>) => (t === "bueno" ? "✓" : t === "alerta" ? "!" : "✕");

export function Grilla({ children }: { children: ReactNode }) {
  return <View style={s.grilla}>{children}</View>;
}

export function Boton({
  titulo,
  onPress,
  variante = "primario",
  deshabilitado,
  style,
}: {
  titulo: string;
  onPress: () => void;
  variante?: "primario" | "secundario" | "peligro";
  deshabilitado?: boolean;
  style?: ViewStyle;
}) {
  const fondo =
    variante === "primario" ? colores.primario : variante === "peligro" ? colores.criticoSuave : colores.superficie;
  const texto = variante === "primario" ? "#fff" : variante === "peligro" ? colores.critico : colores.primario;
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.boton,
        { backgroundColor: fondo, opacity: deshabilitado ? 0.5 : pressed ? 0.8 : 1 },
        variante === "secundario" && { borderWidth: 1, borderColor: colores.borde },
        style,
      ]}
    >
      <Text style={[s.botonTexto, { color: texto }]}>{titulo}</Text>
    </Pressable>
  );
}

export function Campo({ etiqueta, style, ...props }: TextInputProps & { etiqueta: string }) {
  return (
    <View style={[{ gap: 4, flex: 1 }, style as ViewStyle]}>
      <Text style={s.campoEtiqueta}>{etiqueta}</Text>
      <TextInput accessibilityLabel={etiqueta} placeholderTextColor={colores.textoTenue} style={s.input} {...props} />
    </View>
  );
}

export function Chips<T extends string>({
  opciones,
  valor,
  onChange,
}: {
  opciones: { valor: T; etiqueta: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, alignItems: "center" }}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => onChange(o.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            style={[s.chip, activo && { backgroundColor: colores.primario, borderColor: colores.primario }]}
          >
            <Text style={[s.chipTexto, activo && { color: "#fff" }]}>{o.etiqueta}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Fila({
  titulo,
  subtitulo,
  derecha,
  derechaSub,
  onPress,
}: {
  titulo: string;
  subtitulo?: string;
  derecha?: string;
  derechaSub?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={s.fila}>
      <View style={{ flex: 1 }}>
        <Text style={s.filaTitulo} numberOfLines={1}>
          {titulo}
        </Text>
        {subtitulo ? <Text style={s.filaSub}>{subtitulo}</Text> : null}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        {derecha ? <Text style={s.filaTitulo}>{derecha}</Text> : null}
        {derechaSub ? <Text style={s.filaSub}>{derechaSub}</Text> : null}
      </View>
    </Pressable>
  );
}

export function Aviso({ tono, children }: { tono: "bueno" | "alerta" | "critico" | "info"; children: ReactNode }) {
  const fondo =
    tono === "bueno"
      ? colores.buenoSuave
      : tono === "alerta"
        ? colores.alertaSuave
        : tono === "critico"
          ? colores.criticoSuave
          : colores.primarioSuave;
  const color =
    tono === "bueno" ? colores.bueno : tono === "alerta" ? colores.alerta : tono === "critico" ? colores.critico : colores.primario;
  const icono = tono === "bueno" ? "✓" : tono === "alerta" ? "!" : tono === "critico" ? "✕" : "i";
  return (
    <View style={[s.aviso, { backgroundColor: fondo }]}>
      <Text style={{ color, fontWeight: "700" }}>{icono}</Text>
      <Text style={{ color: colores.texto, flex: 1, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

export const Vacio = ({ children }: { children: ReactNode }) => (
  <Text style={{ color: colores.textoSec, textAlign: "center", paddingVertical: 16 }}>{children}</Text>
);

export const s = StyleSheet.create({
  encabezado: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  titulo: { fontSize: 26, fontWeight: "700", color: colores.texto },
  seccion: { fontSize: 17, fontWeight: "700", color: colores.texto },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio,
    padding: 14,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpi: { flexGrow: 1, flexBasis: "45%", minWidth: 150, gap: 4 },
  kpiEtiqueta: { fontSize: 13, color: colores.textoSec },
  kpiValor: { fontSize: 20, fontWeight: "700", color: colores.texto },
  kpiDetalle: { fontSize: 12, color: colores.textoSec },
  ayuda: { fontSize: 12, color: colores.texto, backgroundColor: colores.primarioSuave, padding: 8, borderRadius: 8, marginTop: 4, lineHeight: 17 },
  boton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  botonTexto: { fontSize: 15, fontWeight: "600" },
  campoEtiqueta: { fontSize: 13, color: colores.textoSec },
  input: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
    color: colores.texto,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  chipTexto: { fontSize: 14, color: colores.texto },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colores.borde,
  },
  filaTitulo: { fontSize: 15, color: colores.texto, fontWeight: "500" },
  filaSub: { fontSize: 12, color: colores.textoSec, marginTop: 2 },
  aviso: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 10, alignItems: "flex-start" },
});
