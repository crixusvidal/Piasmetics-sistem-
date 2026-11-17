import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Boton, Campo, Pantalla, Tarjeta } from "../components/ui";
import { confirmar } from "../lib/confirmar";
import { dinero, leerNumero, pct } from "../lib/formato";
import { eliminarProducto, guardarProducto, nuevoId } from "../lib/operaciones";
import { useStore } from "../lib/store";
import { colores } from "../lib/tema";

export default function ProductoForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { datos, actualizar } = useStore();
  const existente = datos.productos.find((p) => p.id === id);
  const m = datos.ajustes.moneda;

  const [nombre, setNombre] = useState(existente?.nombre ?? "");
  const [categoria, setCategoria] = useState(existente?.categoria ?? "");
  const [costo, setCosto] = useState(existente ? String(Math.round(existente.costo * 100) / 100) : "");
  const [precio, setPrecio] = useState(existente ? String(existente.precio) : "");
  const [stock, setStock] = useState(existente ? String(existente.stock) : "");
  const [minimo, setMinimo] = useState(existente ? String(existente.stockMinimo) : "3");

  const c = leerNumero(costo);
  const p = leerNumero(precio);

  const guardar = () => {
    actualizar((d) =>
      guardarProducto(d, {
        id: existente?.id ?? nuevoId(),
        nombre: nombre.trim(),
        categoria: categoria.trim(),
        costo: c,
        precio: p,
        stock: leerNumero(stock),
        stockMinimo: leerNumero(minimo),
      }),
    );
    router.back();
  };

  return (
    <Pantalla estrecha titulo={existente ? "Editar producto" : "Nuevo producto"}>
      <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ej: Polera algodón talla M" />
      <Campo etiqueta="Categoría" value={categoria} onChangeText={setCategoria} placeholder="Ej: Ropa" />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Campo etiqueta="Costo unitario" keyboardType="numeric" value={costo} onChangeText={setCosto} />
        <Campo etiqueta="Precio de venta" keyboardType="numeric" value={precio} onChangeText={setPrecio} />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Campo etiqueta="Stock actual" keyboardType="numeric" value={stock} onChangeText={setStock} />
        <Campo etiqueta="Avisar si baja de" keyboardType="numeric" value={minimo} onChangeText={setMinimo} />
      </View>
      <Tarjeta style={{ gap: 4 }}>
        <Text style={{ color: colores.texto, fontWeight: "600" }}>
          Ganas {dinero(p - c, m)} por unidad
        </Text>
        <Text style={{ color: colores.textoSec }}>
          Margen {pct(p > 0 ? (p - c) / p : null)} · Markup {pct(c > 0 ? (p - c) / c : null)}
        </Text>
        {existente && <Text style={{ color: colores.textoSec, fontSize: 12 }}>El costo se actualiza solo (promedio ponderado) al registrar compras.</Text>}
      </Tarjeta>
      <Boton titulo="Guardar" onPress={guardar} deshabilitado={!nombre.trim() || p <= 0} />
      {existente && (
        <Boton
          titulo="Eliminar producto"
          variante="peligro"
          onPress={() =>
            confirmar("¿Eliminar producto?", "Las ventas pasadas se mantienen en los reportes.", () => {
              actualizar((d) => eliminarProducto(d, existente.id));
              router.back();
            })
          }
        />
      )}
    </Pantalla>
  );
}
