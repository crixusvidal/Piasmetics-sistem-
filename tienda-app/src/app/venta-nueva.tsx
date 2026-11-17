import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { Aviso, Boton, Campo, Chips, Columnas, Fila, Pantalla, Seccion, Tarjeta, Vacio } from "../components/ui";
import { dinero, leerNumero } from "../lib/formato";
import { hoy } from "../lib/kpis";
import { nuevoId, registrarVenta } from "../lib/operaciones";
import { useStore } from "../lib/store";
import { colores } from "../lib/tema";
import type { Venta } from "../lib/types";

interface Linea {
  productoId: string;
  cantidad: string;
  precio: string;
}

export default function VentaNueva() {
  const { datos, actualizar } = useStore();
  const m = datos.ajustes.moneda;
  const [busqueda, setBusqueda] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [fecha, setFecha] = useState(hoy());
  const [pago, setPago] = useState<Venta["metodoPago"]>("efectivo");
  const [campanaId, setCampanaId] = useState<string>("ninguna");
  const [clienteNuevo, setClienteNuevo] = useState(false);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return datos.productos.filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q)).slice(0, 8);
  }, [busqueda, datos.productos]);

  const producto = (id: string) => datos.productos.find((p) => p.id === id)!;
  const agregar = (id: string) => {
    setLineas((ls) =>
      ls.some((l) => l.productoId === id)
        ? ls.map((l) => (l.productoId === id ? { ...l, cantidad: String(leerNumero(l.cantidad) + 1) } : l))
        : [...ls, { productoId: id, cantidad: "1", precio: String(producto(id).precio) }],
    );
    setBusqueda("");
  };

  const total = lineas.reduce((s, l) => s + leerNumero(l.cantidad) * leerNumero(l.precio), 0);
  const costo = lineas.reduce((s, l) => s + leerNumero(l.cantidad) * producto(l.productoId).costo, 0);
  const sinStock = lineas.filter((l) => producto(l.productoId).stock < leerNumero(l.cantidad));
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  const campanasActivas = datos.campanas.filter((c) => c.fin >= fecha && c.inicio <= fecha);

  const guardar = () => {
    const venta: Venta = {
      id: nuevoId(),
      fecha,
      metodoPago: pago,
      campanaId: campanaId === "ninguna" ? undefined : campanaId,
      clienteNuevo,
      origen: "manual",
      items: lineas
        .filter((l) => leerNumero(l.cantidad) > 0)
        .map((l) => {
          const p = producto(l.productoId);
          return { productoId: p.id, nombre: p.nombre, cantidad: leerNumero(l.cantidad), precio: leerNumero(l.precio), costo: p.costo };
        }),
    };
    actualizar((d) => registrarVenta(d, venta));
    router.back();
  };

  return (
    <Pantalla titulo="Registrar venta">
      <Columnas pesos={[1, 1.15]}>
        {[
          <View key="izq" style={{ gap: 12 }}>
      <Campo etiqueta="Buscar producto" placeholder="Nombre o categoría" value={busqueda} onChangeText={setBusqueda} />
      <Tarjeta style={{ paddingVertical: 4 }}>
        {datos.productos.length === 0 ? (
          <View style={{ paddingVertical: 8, gap: 8 }}>
            <Vacio>Primero agrega productos a tu inventario.</Vacio>
            <Boton titulo="Agregar producto" onPress={() => router.push("/producto")} />
          </View>
        ) : (
          resultados.map((p) => (
            <Fila key={p.id} titulo={p.nombre} subtitulo={`Stock ${p.stock}`} derecha={dinero(p.precio, m)} derechaSub="Tocar para agregar" onPress={() => agregar(p.id)} />
          ))
        )}
      </Tarjeta>
          </View>,
          <View key="der" style={{ gap: 12 }}>
      {lineas.length > 0 && (
        <Seccion titulo="Detalle">
          {lineas.map((l, i) => {
            const p = producto(l.productoId);
            const actualizarLinea = (c: Partial<Linea>) => setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, ...c } : x)));
            return (
              <Tarjeta key={l.productoId} style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontWeight: "600", color: colores.texto, flex: 1 }}>{p.nombre}</Text>
                  <Pressable onPress={() => setLineas((ls) => ls.filter((_, j) => j !== i))} hitSlop={8}>
                    <Text style={{ color: colores.critico }}>Quitar</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Campo etiqueta="Cantidad" keyboardType="numeric" value={l.cantidad} onChangeText={(t) => actualizarLinea({ cantidad: t })} />
                  <Campo etiqueta="Precio unitario" keyboardType="numeric" value={l.precio} onChangeText={(t) => actualizarLinea({ precio: t })} />
                </View>
                <Text style={{ color: colores.textoSec, fontSize: 12 }}>
                  Subtotal {dinero(leerNumero(l.cantidad) * leerNumero(l.precio), m)} · Utilidad{" "}
                  {dinero(leerNumero(l.cantidad) * (leerNumero(l.precio) - p.costo), m)}
                </Text>
              </Tarjeta>
            );
          })}
        </Seccion>
      )}

      <Campo etiqueta="Fecha (AAAA-MM-DD)" value={fecha} onChangeText={setFecha} />
      <Text style={{ color: colores.textoSec, fontSize: 13 }}>Medio de pago</Text>
      <Chips
        opciones={[
          { valor: "efectivo", etiqueta: "Efectivo" },
          { valor: "tarjeta", etiqueta: "Tarjeta" },
          { valor: "transferencia", etiqueta: "Transferencia" },
          { valor: "otro", etiqueta: "Otro" },
        ]}
        valor={pago}
        onChange={setPago}
      />
      {datos.campanas.length > 0 && (
        <>
          <Text style={{ color: colores.textoSec, fontSize: 13 }}>¿Llegó por alguna publicidad?</Text>
          <Chips
            opciones={[{ valor: "ninguna", etiqueta: "No / no sé" }, ...(campanasActivas.length ? campanasActivas : datos.campanas).map((c) => ({ valor: c.id, etiqueta: `${c.canal}: ${c.nombre}` }))]}
            valor={campanaId}
            onChange={setCampanaId}
          />
        </>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: colores.texto }}>Cliente nuevo</Text>
        <Switch value={clienteNuevo} onValueChange={setClienteNuevo} />
      </View>

      {sinStock.length > 0 && <Aviso tono="alerta">Vendes más unidades de las que hay en stock de: {sinStock.map((l) => producto(l.productoId).nombre).join(", ")}.</Aviso>}

      <Tarjeta style={{ gap: 4 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colores.texto }}>Total {dinero(total, m)}</Text>
        <Text style={{ color: colores.textoSec }}>
          Utilidad {dinero(total - costo, m)} · Margen {total > 0 ? Math.round(((total - costo) / total) * 100) : 0}%
        </Text>
      </Tarjeta>
      <Boton titulo="Guardar venta" onPress={guardar} deshabilitado={lineas.length === 0 || total <= 0 || !fechaValida} />
          </View>,
        ]}
      </Columnas>
    </Pantalla>
  );
}
