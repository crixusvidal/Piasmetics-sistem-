import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { registrarDialogos, type Dialogo } from "../lib/confirmar";
import { colores } from "../lib/tema";
import { Boton } from "./ui";

/** Muestra los diálogos de confirmar() y avisar() dentro de la app (web). */
export function Dialogos() {
  const [d, setD] = useState<Dialogo | null>(null);

  useEffect(() => {
    registrarDialogos(setD);
    return () => registrarDialogos(null);
  }, []);

  if (!d) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "rgba(11,11,11,0.45)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 1000,
      }}
    >
      <View style={{ backgroundColor: colores.superficie, borderRadius: 14, padding: 18, gap: 10, width: "100%", maxWidth: 360 }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: colores.texto }}>{d.titulo}</Text>
        {d.mensaje ? <Text style={{ color: colores.textoSec, lineHeight: 20 }}>{d.mensaje}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          {d.onSi ? (
            <>
              <Boton titulo="Cancelar" variante="secundario" onPress={() => setD(null)} style={{ flex: 1 }} />
              <Boton
                titulo="Confirmar"
                variante="peligro"
                onPress={() => {
                  const fn = d.onSi;
                  setD(null);
                  fn?.();
                }}
                style={{ flex: 1 }}
              />
            </>
          ) : (
            <Boton titulo="Aceptar" onPress={() => setD(null)} style={{ flex: 1 }} />
          )}
        </View>
      </View>
    </View>
  );
}
