import { router } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Boton, Chips, Columnas, Fila, Pantalla, Tarjeta, Vacio } from "../../components/ui";
import { useLayout } from "../../lib/layout";
import { confirmar } from "../../lib/confirmar";
import { dinero, fechaCorta } from "../../lib/formato";
import { costoVenta, totalCompra, totalVenta } from "../../lib/kpis";
import { eliminarCompra, eliminarGasto, eliminarVenta } from "../../lib/operaciones";
import { useStore } from "../../lib/store";

type Vista = "ventas" | "compras" | "gastos";
const LIMITE = 100;

export default function Ventas() {
  const { datos, actualizar } = useStore();
  const [vista, setVista] = useState<Vista>("ventas");
  const m = datos.ajustes.moneda;
  const { ancho } = useLayout();

  const ventas = useMemo(() => [...datos.ventas].reverse().sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, LIMITE), [datos.ventas]);
  const compras = useMemo(() => [...datos.compras].reverse().sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, LIMITE), [datos.compras]);
  const gastos = useMemo(() => [...datos.gastos].reverse().sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, LIMITE), [datos.gastos]);
  const campana = (id?: string) => datos.campanas.find((c) => c.id === id)?.nombre;

  return (
    <Pantalla titulo="Movimientos">
      <Columnas pesos={[1, 2.6]}>
        {[
          <View key="izq" style={{ gap: 12 }}>
            <View style={{ flexDirection: ancho ? "column" : "row", gap: 8 }}>
                    <Boton titulo="+ Venta" onPress={() => router.push("/venta-nueva")} style={ancho ? undefined : { flex: 1 }} />
                    <Boton titulo="+ Gasto" variante="secundario" onPress={() => router.push("/gasto-nuevo")} style={ancho ? undefined : { flex: 1 }} />
                    <Boton titulo="Escanear" variante="secundario" onPress={() => router.push("/escanear")} style={ancho ? undefined : { flex: 1 }} />
            <Boton titulo="💬 Chat" variante="secundario" onPress={() => router.push("/chat-venta")} style={ancho ? undefined : { flex: 1 }} />
                  </View>
                  <Chips
                    opciones={[
                      { valor: "ventas", etiqueta: `Ventas (${datos.ventas.length})` },
                      { valor: "compras", etiqueta: `Compras (${datos.compras.length})` },
                      { valor: "gastos", etiqueta: `Gastos (${datos.gastos.length})` },
                    ]}
                    valor={vista}
                    onChange={setVista}
                  />
          </View>,
          <View key="der">
            <Tarjeta style={{ paddingVertical: 4 }}>
                    {vista === "ventas" &&
                      (ventas.length === 0 ? (
                        <Vacio>Aún no registras ventas.</Vacio>
                      ) : (
                        ventas.map((v) => {
                          const t = totalVenta(v);
                          return (
                            <Fila
                              key={v.id}
                              titulo={v.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ")}
                              subtitulo={[fechaCorta(v.fecha), v.cliente, v.canal === "whatsapp" ? "WhatsApp" : v.canal === "messenger" ? "Messenger" : undefined, v.metodoPago, campana(v.campanaId) && `📣 ${campana(v.campanaId)}`, v.origen === "ia" && "IA"]
                                .filter(Boolean)
                                .join(" · ")}
                              derecha={dinero(t, m)}
                              derechaSub={`Utilidad ${dinero(t - costoVenta(v), m)}`}
                              onPress={() => confirmar("¿Anular venta?", "El stock vendido se devolverá al inventario.", () => actualizar((d) => eliminarVenta(d, v.id)))}
                            />
                          );
                        })
                      ))}
                    {vista === "compras" &&
                      (compras.length === 0 ? (
                        <Vacio>Registra compras a proveedores escaneando sus boletas o facturas.</Vacio>
                      ) : (
                        compras.map((c) => (
                          <Fila
                            key={c.id}
                            titulo={c.proveedor}
                            subtitulo={`${fechaCorta(c.fecha)} · ${c.items.length} ítems${c.origen === "ia" ? " · IA" : ""}`}
                            derecha={dinero(totalCompra(c), m)}
                            onPress={() => confirmar("¿Eliminar compra?", "Se restará el stock que ingresó con esta compra.", () => actualizar((d) => eliminarCompra(d, c.id)))}
                          />
                        ))
                      ))}
                    {vista === "gastos" &&
                      (gastos.length === 0 ? (
                        <Vacio>Registra arriendo, sueldos, servicios y otros gastos para ver tu utilidad neta.</Vacio>
                      ) : (
                        gastos.map((g) => (
                          <Fila
                            key={g.id}
                            titulo={g.descripcion || g.categoria}
                            subtitulo={`${fechaCorta(g.fecha)} · ${g.categoria}${g.origen === "ia" ? " · IA" : ""}`}
                            derecha={dinero(g.monto, m)}
                            onPress={() => confirmar("¿Eliminar gasto?", g.descripcion, () => actualizar((d) => eliminarGasto(d, g.id)))}
                          />
                        ))
                      ))}
                  </Tarjeta>
          </View>,
        ]}
      </Columnas>
    </Pantalla>
  );
}
