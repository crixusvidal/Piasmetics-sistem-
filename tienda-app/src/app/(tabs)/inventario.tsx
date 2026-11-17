import { router } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Boton, Campo, Chips, Columnas, Fila, Grilla, Kpi, Pantalla, Tarjeta, Vacio } from "../../components/ui";
import { dinero, num, pct } from "../../lib/formato";
import { kpisProductos, valorInventario } from "../../lib/kpis";
import { aPeriodo } from "../../lib/periodo";
import { useStore } from "../../lib/store";

type Orden = "nombre" | "utilidad" | "rotacion" | "stock";

export default function Inventario() {
  const { datos } = useStore();
  const m = datos.ajustes.moneda;
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState<Orden>("utilidad");

  const filas = useMemo(() => {
    const ks = kpisProductos(datos, aPeriodo("30")).filter((k) => k.producto.nombre.toLowerCase().includes(q.trim().toLowerCase()));
    const cmp: Record<Orden, (a: (typeof ks)[0], b: (typeof ks)[0]) => number> = {
      nombre: (a, b) => a.producto.nombre.localeCompare(b.producto.nombre),
      utilidad: (a, b) => b.utilidad - a.utilidad,
      rotacion: (a, b) => (a.diasCobertura ?? Infinity) - (b.diasCobertura ?? Infinity),
      stock: (a, b) => a.producto.stock - b.producto.stock,
    };
    return ks.sort(cmp[orden]);
  }, [datos, q, orden]);

  const valorVenta = datos.productos.reduce((s, p) => s + Math.max(p.stock, 0) * p.precio, 0);
  const valorCosto = valorInventario(datos.productos);

  return (
    <Pantalla titulo="Inventario">
      <Columnas pesos={[1, 2.3]}>
        {[
          <View key="izq" style={{ gap: 12 }}>
            <Grilla>
                    <Kpi etiqueta="Inventario a costo" valor={dinero(valorCosto, m)} detalle={`${datos.productos.length} productos`} />
                    <Kpi
                      etiqueta="Utilidad potencial"
                      valor={dinero(valorVenta - valorCosto, m)}
                      detalle={`Si vendes todo a ${dinero(valorVenta, m, true)}`}
                      ayuda="Diferencia entre el valor del stock a precio de venta y a costo."
                    />
                  </Grilla>
                  <Boton titulo="+ Agregar producto" onPress={() => router.push("/producto")} />
                  <Campo etiqueta="Buscar" placeholder="Nombre del producto" value={q} onChangeText={setQ} />
                  <Chips
                    opciones={[
                      { valor: "utilidad", etiqueta: "Más rentables" },
                      { valor: "rotacion", etiqueta: "Se agotan antes" },
                      { valor: "stock", etiqueta: "Menos stock" },
                      { valor: "nombre", etiqueta: "A–Z" },
                    ]}
                    valor={orden}
                    onChange={setOrden}
                  />
          </View>,
          <View key="der">
            <Tarjeta style={{ paddingVertical: 4 }}>
                    {filas.length === 0 ? (
                      <Vacio>No hay productos.</Vacio>
                    ) : (
                      filas.map((k) => {
                        const p = k.producto;
                        const margenUnit = p.precio > 0 ? (p.precio - p.costo) / p.precio : null;
                        return (
                          <Fila
                            key={p.id}
                            titulo={`${k.stockBajo ? "⚠️ " : ""}${p.nombre}`}
                            subtitulo={`Stock ${p.stock} · costo ${dinero(p.costo, m)} · margen ${pct(margenUnit, 0)}\n30 días: ${k.unidades} u. vendidas · cobertura ${k.diasCobertura === null ? "—" : num(k.diasCobertura, 0) + " días"} · sell-through ${pct(k.sellThrough, 0)}`}
                            derecha={dinero(p.precio, m)}
                            derechaSub={k.utilidad ? `+${dinero(k.utilidad, m, true)}` : undefined}
                            onPress={() => router.push({ pathname: "/producto", params: { id: p.id } })}
                          />
                        );
                      })
                    )}
                  </Tarjeta>
          </View>,
        ]}
      </Columnas>
    </Pantalla>
  );
}
