import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { Boton, Campo, Chips, Pantalla } from "../components/ui";
import { leerNumero } from "../lib/formato";
import { hoy } from "../lib/kpis";
import { agregarGasto, nuevoId } from "../lib/operaciones";
import { useStore } from "../lib/store";
import { colores } from "../lib/tema";
import { CATEGORIAS_GASTO, type CategoriaGasto } from "../lib/types";

export default function GastoNuevo() {
  const { actualizar } = useStore();
  const [categoria, setCategoria] = useState<CategoriaGasto>("arriendo");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(hoy());

  return (
    <Pantalla estrecha titulo="Nuevo gasto">
      <Text style={{ color: colores.textoSec, fontSize: 13 }}>Categoría</Text>
      <Chips opciones={CATEGORIAS_GASTO.map((c) => ({ valor: c, etiqueta: c[0].toUpperCase() + c.slice(1) }))} valor={categoria} onChange={setCategoria} />
      {categoria === "publicidad" && (
        <Text style={{ color: colores.textoSec, fontSize: 12 }}>
          Tip: para medir ROAS y CAC, registra la publicidad como campaña en la pestaña Marketing en vez de como gasto.
        </Text>
      )}
      <Campo etiqueta="Descripción" value={descripcion} onChangeText={setDescripcion} placeholder="Ej: Cuenta de luz octubre" />
      <Campo etiqueta="Monto" keyboardType="numeric" value={monto} onChangeText={setMonto} />
      <Campo etiqueta="Fecha (AAAA-MM-DD)" value={fecha} onChangeText={setFecha} />
      <Boton
        titulo="Guardar gasto"
        deshabilitado={leerNumero(monto) <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)}
        onPress={() => {
          actualizar((d) => agregarGasto(d, { id: nuevoId(), fecha, categoria, descripcion: descripcion.trim(), monto: leerNumero(monto), origen: "manual" }));
          router.back();
        }}
      />
    </Pantalla>
  );
}
