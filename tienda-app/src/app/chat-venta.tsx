import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { Aviso, Boton, Campo, Chips, Columnas, Fila, Pantalla, Seccion, Tarjeta } from "../components/ui";
import { ajustarATotal, interpretarChat, type CanalChat, type PropuestaChat } from "../lib/chat/parser";
import { dinero, leerNumero } from "../lib/formato";
import { hoy } from "../lib/kpis";
import { useLayout } from "../lib/layout";
import { nuevoId, registrarVenta } from "../lib/operaciones";
import { useStore } from "../lib/store";
import { colores } from "../lib/tema";
import type { Venta } from "../lib/types";

interface Linea {
  productoId: string;
  cantidad: string;
  precio: string;
}

type CanalElegible = Exclude<CanalChat, "otro">;

const CANALES: { valor: CanalElegible; etiqueta: string }[] = [
  { valor: "whatsapp", etiqueta: "WhatsApp" },
  { valor: "messenger", etiqueta: "Messenger" },
];

export default function ChatVenta() {
  const { datos, actualizar } = useStore();
  const m = datos.ajustes.moneda;
  const { ancho } = useLayout();

  const [texto, setTexto] = useState("");
  const [propuesta, setPropuesta] = useState<PropuestaChat | null>(null);
  const [cliente, setCliente] = useState("");
  const [canal, setCanal] = useState<CanalElegible>("whatsapp");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [fecha, setFecha] = useState(hoy());
  const [pago, setPago] = useState<Venta["metodoPago"]>("transferencia");
  const [campanaId, setCampanaId] = useState("ninguna");
  const [clienteNuevo, setClienteNuevo] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const producto = (id: string) => datos.productos.find((p) => p.id === id);

  const interpretar = () => {
    const r = interpretarChat(texto, datos.productos, hoy());
    setPropuesta(r);
    setCliente(r.cliente);
    setCanal(r.canal === "messenger" ? "messenger" : "whatsapp");
    setFecha(r.fecha);
    setPago(r.metodoPago === "otro" ? "transferencia" : r.metodoPago);
    setLineas(r.lineas.map((l) => ({ productoId: l.productoId, cantidad: String(l.cantidad), precio: String(producto(l.productoId)?.precio ?? 0) })));
  };

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? datos.productos.filter((p) => p.nombre.toLowerCase().includes(q)).slice(0, 5) : [];
  }, [busqueda, datos.productos]);

  const agregar = (id: string) => {
    setLineas((ls) => (ls.some((l) => l.productoId === id) ? ls : [...ls, { productoId: id, cantidad: "1", precio: String(producto(id)?.precio ?? 0) }]));
    setBusqueda("");
  };

  const calculo = lineas.map((l) => ({ cantidad: leerNumero(l.cantidad), precio: leerNumero(l.precio) }));
  const total = calculo.reduce((s, l) => s + l.cantidad * l.precio, 0);
  const costo = lineas.reduce((s, l, i) => s + calculo[i].cantidad * (producto(l.productoId)?.costo ?? 0), 0);
  const totalChat = propuesta?.totalChat ?? null;
  const difiere = totalChat !== null && total > 0 && Math.abs(total - totalChat) > 0.5;
  const sinStock = lineas.filter((l, i) => (producto(l.productoId)?.stock ?? 0) < calculo[i].cantidad);
  const campanasActivas = datos.campanas.filter((c) => c.fin >= fecha && c.inicio <= fecha);
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha);

  const guardar = () => {
    const items = lineas
      .map((l, i) => ({ l, c: calculo[i], p: producto(l.productoId) }))
      .filter((x) => x.p && x.c.cantidad > 0)
      .map((x) => ({ productoId: x.p!.id, nombre: x.p!.nombre, cantidad: x.c.cantidad, precio: x.c.precio, costo: x.p!.costo }));
    const venta: Venta = {
      id: nuevoId(),
      fecha,
      items,
      metodoPago: pago,
      campanaId: campanaId === "ninguna" ? undefined : campanaId,
      clienteNuevo,
      origen: "chat",
      canal,
      cliente: cliente.trim() || undefined,
    };
    actualizar((d) => registrarVenta(d, venta));
    router.back();
  };

  const entrada = (
    <View style={{ gap: 10 }}>
      <Tarjeta style={{ gap: 8 }}>
        <Text style={{ color: colores.textoSec, lineHeight: 20 }}>
          Copia la conversación con el cliente y pégala aquí. Sirve el chat exportado de WhatsApp, lo copiado de Messenger o un texto simple como
          «2 jeans y 1 polera, pago por transferencia».
        </Text>
        <TextInput
          accessibilityLabel="Conversación"
          multiline
          value={texto}
          onChangeText={setTexto}
          placeholder={"[12/11/26, 14:32] Camila: Quiero 2 jeans y una polera\n[12/11/26, 14:35] Tienda: El total es $55.980"}
          placeholderTextColor={colores.textoTenue}
          style={{
            minHeight: 220,
            borderWidth: 1,
            borderColor: colores.borde,
            borderRadius: 10,
            padding: 12,
            backgroundColor: "#fff",
            fontSize: 14,
            color: colores.texto,
            textAlignVertical: "top",
          }}
        />
        <Boton titulo="Interpretar chat →" onPress={interpretar} deshabilitado={!texto.trim() || datos.productos.length === 0} />
        {datos.productos.length === 0 && <Text style={{ color: colores.critico, fontSize: 12 }}>Primero agrega productos al inventario para que pueda reconocerlos.</Text>}
        <Text style={{ color: colores.textoTenue, fontSize: 12 }}>Todo se procesa en tu dispositivo; el chat no se guarda ni se envía a ningún servidor.</Text>
      </Tarjeta>
    </View>
  );

  const revision = propuesta && (
    <Seccion titulo="Revisa la venta">
      {propuesta.notas.map((n, i) => (
        <Aviso key={i} tono={i === 0 && propuesta.lineas.length === 0 ? "critico" : "info"}>
          {n}
        </Aviso>
      ))}
      {propuesta.autores.length > 1 && (
        <>
          <Text style={{ color: colores.textoSec, fontSize: 13 }}>¿Quién es el cliente?</Text>
          <Chips opciones={propuesta.autores.map((a) => ({ valor: a, etiqueta: a }))} valor={cliente} onChange={setCliente} />
        </>
      )}
      <Campo etiqueta="Cliente" value={cliente} onChangeText={setCliente} placeholder="Nombre del cliente" />
      <Text style={{ color: colores.textoSec, fontSize: 13 }}>Canal</Text>
      <Chips opciones={CANALES} valor={canal} onChange={setCanal} />

      {lineas.map((l, i) => {
        const p = producto(l.productoId);
        const cambiar = (c: Partial<Linea>) => setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, ...c } : x)));
        return (
          <Tarjeta key={l.productoId} style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ fontWeight: "600", color: colores.texto, flex: 1 }}>{p?.nombre ?? "Producto eliminado"}</Text>
              <Pressable onPress={() => setLineas((ls) => ls.filter((_, j) => j !== i))} hitSlop={8}>
                <Text style={{ color: colores.critico }}>Quitar</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Campo etiqueta="Cantidad" keyboardType="numeric" value={l.cantidad} onChangeText={(t) => cambiar({ cantidad: t })} />
              <Campo etiqueta="Precio unitario" keyboardType="numeric" value={l.precio} onChangeText={(t) => cambiar({ precio: t })} />
            </View>
            <Text style={{ color: colores.textoSec, fontSize: 12 }}>
              Subtotal {dinero(calculo[i].cantidad * calculo[i].precio, m)} · Stock {p?.stock ?? 0}
            </Text>
          </Tarjeta>
        );
      })}

      <Campo etiqueta="Agregar otro producto" placeholder="Buscar por nombre" value={busqueda} onChangeText={setBusqueda} />
      {resultados.map((p) => (
        <Fila key={p.id} titulo={p.nombre} subtitulo={`Stock ${p.stock}`} derecha={dinero(p.precio, m)} onPress={() => agregar(p.id)} />
      ))}

      {difiere && totalChat !== null && (
        <Aviso tono="alerta">
          En el chat acordaron un total de {dinero(totalChat, m)}, pero los productos suman {dinero(total, m)}.{"\n"}
          <Text
            style={{ color: colores.primario, fontWeight: "600" }}
            onPress={() => {
              const nuevos = ajustarATotal(calculo, totalChat);
              setLineas((ls) => ls.map((l, i) => ({ ...l, precio: String(nuevos[i]) })));
            }}
          >
            Ajustar los precios al total del chat
          </Text>
        </Aviso>
      )}
      {totalChat !== null && !difiere && total > 0 && <Aviso tono="bueno">El total coincide con el que se acordó en el chat.</Aviso>}
      {sinStock.length > 0 && <Aviso tono="alerta">No hay stock suficiente de: {sinStock.map((l) => producto(l.productoId)?.nombre).join(", ")}.</Aviso>}

      <Text style={{ color: colores.textoSec, fontSize: 13 }}>Medio de pago</Text>
      <Chips
        opciones={[
          { valor: "transferencia", etiqueta: "Transferencia" },
          { valor: "efectivo", etiqueta: "Efectivo" },
          { valor: "tarjeta", etiqueta: "Tarjeta" },
          { valor: "otro", etiqueta: "Otro" },
        ]}
        valor={pago}
        onChange={setPago}
      />
      <Campo etiqueta="Fecha (AAAA-MM-DD)" value={fecha} onChangeText={setFecha} />
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

      <Tarjeta style={{ gap: 4 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colores.texto }}>Total {dinero(total, m)}</Text>
        <Text style={{ color: colores.textoSec }}>
          Utilidad {dinero(total - costo, m)} · Margen {total > 0 ? Math.round(((total - costo) / total) * 100) : 0}%
        </Text>
      </Tarjeta>
      <Boton titulo="Guardar venta" onPress={guardar} deshabilitado={lineas.length === 0 || total <= 0 || !fechaValida} />
      <Boton titulo="Empezar de nuevo" variante="secundario" onPress={() => setPropuesta(null)} />
    </Seccion>
  );

  return (
    <Pantalla titulo="Venta desde chat">
      {revision && !ancho ? (
        revision
      ) : revision ? (
        <Columnas pesos={[1, 1.3]}>
          {[
            <View key="chat" style={{ gap: 10 }}>
              <Tarjeta style={{ gap: 6 }}>
                <Text style={{ fontWeight: "600", color: colores.texto }}>Conversación ({propuesta?.mensajes} mensajes)</Text>
                <Text style={{ color: colores.textoSec, fontSize: 13, lineHeight: 19 }}>{texto}</Text>
              </Tarjeta>
            </View>,
            <View key="venta">{revision}</View>,
          ]}
        </Columnas>
      ) : (
        entrada
      )}
    </Pantalla>
  );
}
