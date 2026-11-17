import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Boton, Campo, Chips, Pantalla } from "../components/ui";
import { confirmar } from "../lib/confirmar";
import { leerNumero } from "../lib/formato";
import { hoy, sumarDias } from "../lib/kpis";
import { eliminarCampana, guardarCampana, nuevoId } from "../lib/operaciones";
import { useStore } from "../lib/store";
import { colores } from "../lib/tema";
import { CANALES } from "../lib/types";

const esFecha = (f: string) => /^\d{4}-\d{2}-\d{2}$/.test(f);

export default function CampanaForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { datos, actualizar } = useStore();
  const c = datos.campanas.find((x) => x.id === id);

  const [nombre, setNombre] = useState(c?.nombre ?? "");
  const [canal, setCanal] = useState<string>(c?.canal ?? "Instagram");
  const [inicio, setInicio] = useState(c?.inicio ?? hoy());
  const [fin, setFin] = useState(c?.fin ?? sumarDias(hoy(), 14));
  const [inversion, setInversion] = useState(c ? String(c.inversion) : "");
  const [impresiones, setImpresiones] = useState(c ? String(c.impresiones) : "");
  const [clics, setClics] = useState(c ? String(c.clics) : "");

  const valido = nombre.trim() && esFecha(inicio) && esFecha(fin) && fin >= inicio && leerNumero(inversion) >= 0;

  return (
    <Pantalla estrecha titulo={c ? "Editar campaña" : "Nueva campaña"}>
      <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ej: Promo día de la madre" />
      <Text style={{ color: colores.textoSec, fontSize: 13 }}>Canal</Text>
      <Chips opciones={CANALES.map((x) => ({ valor: x as string, etiqueta: x }))} valor={canal} onChange={setCanal} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Campo etiqueta="Inicio (AAAA-MM-DD)" value={inicio} onChangeText={setInicio} />
        <Campo etiqueta="Fin (AAAA-MM-DD)" value={fin} onChangeText={setFin} />
      </View>
      <Campo etiqueta="Inversión total" keyboardType="numeric" value={inversion} onChangeText={setInversion} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Campo etiqueta="Impresiones / alcance" keyboardType="numeric" value={impresiones} onChangeText={setImpresiones} />
        <Campo etiqueta="Clics / consultas" keyboardType="numeric" value={clics} onChangeText={setClics} />
      </View>
      <Text style={{ color: colores.textoSec, fontSize: 12, lineHeight: 17 }}>
        Encuentras impresiones y clics en las estadísticas de Meta, TikTok o Google Ads. Para volantes, usa la cantidad repartida como impresiones y
        las consultas recibidas como clics. Puedes actualizar los números mientras la campaña corre.
      </Text>
      <Boton
        titulo="Guardar campaña"
        deshabilitado={!valido}
        onPress={() => {
          actualizar((d) =>
            guardarCampana(d, {
              id: c?.id ?? nuevoId(),
              nombre: nombre.trim(),
              canal,
              inicio,
              fin,
              inversion: leerNumero(inversion),
              impresiones: leerNumero(impresiones),
              clics: leerNumero(clics),
            }),
          );
          router.back();
        }}
      />
      {c && (
        <Boton
          titulo="Eliminar campaña"
          variante="peligro"
          onPress={() =>
            confirmar("¿Eliminar campaña?", "Las ventas asociadas quedarán sin campaña.", () => {
              actualizar((d) => eliminarCampana(d, c.id));
              router.back();
            })
          }
        />
      )}
    </Pantalla>
  );
}
