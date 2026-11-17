import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { BarraH, GraficoBarras } from "../../components/GraficoBarras";
import { Aviso, Boton, Chips, Columnas, Grilla, Kpi, Pantalla, Seccion, Tarjeta } from "../../components/ui";
import { datosDemo } from "../../lib/demo";
import { dinero, num, pct } from "../../lib/formato";
import { kpisFinancieros, kpisProductos, periodoAnterior, serieDiaria, variacion, ventasPorCanal } from "../../lib/kpis";
import { useLayout } from "../../lib/layout";
import { aPeriodo, OPCIONES_PERIODO, type OpcionPeriodo } from "../../lib/periodo";
import { useStore } from "../../lib/store";
import { colores } from "../../lib/tema";

export default function Resumen() {
  const { datos, actualizar } = useStore();
  const [op, setOp] = useState<OpcionPeriodo>("30");
  const m = datos.ajustes.moneda;
  const { ancho } = useLayout();

  const { k, prev, serie, productos, canales } = useMemo(() => {
    const p = aPeriodo(op);
    return {
      canales: ventasPorCanal(datos, p),
      k: kpisFinancieros(datos, p),
      prev: kpisFinancieros(datos, periodoAnterior(p)),
      serie: serieDiaria(datos, p),
      productos: kpisProductos(datos, p),
    };
  }, [datos, op]);

  const ajustes = (
    <Pressable onPress={() => router.push("/ajustes")} accessibilityLabel="Ajustes" hitSlop={10}>
      <Ionicons name="settings-outline" size={24} color={colores.textoSec} />
    </Pressable>
  );

  if (datos.productos.length === 0 && datos.ventas.length === 0) {
    return (
      <Pantalla titulo="Mi Tienda" accion={ajustes}>
        <Tarjeta style={{ gap: 12 }}>
          <Text style={{ fontSize: 17, fontWeight: "600", color: colores.texto }}>Bienvenido 👋</Text>
          <Text style={{ color: colores.textoSec, lineHeight: 21 }}>
            Registra tus productos con su costo y precio, anota tus ventas o fotografía tus boletas para que la IA las lea.
            Aquí verás utilidad, márgenes, rotación de inventario y el rendimiento de tu publicidad.
          </Text>
          <Boton titulo="Agregar mi primer producto" onPress={() => router.push("/producto")} />
          <Boton titulo="Explorar con datos de ejemplo" variante="secundario" onPress={() => actualizar((d) => datosDemo(d.ajustes))} />
        </Tarjeta>
      </Pantalla>
    );
  }

  const stockBajo = productos.filter((p) => p.stockBajo);
  const sinMov = productos.filter((p) => p.sinMovimiento);
  const top = [...productos].sort((a, b) => b.utilidad - a.utilidad).slice(0, 5);
  const maxTop = Math.max(...top.map((t) => t.utilidad), 1);

  const etiquetasCanal = { tienda: "Tienda", whatsapp: "WhatsApp", messenger: "Messenger" } as const;
  const hayChats = canales.some((c) => c.canal !== "tienda" && c.transacciones > 0);
  const totalCanales = canales.reduce((a, c) => a + c.ventas, 0);
  const canalesSeccion = hayChats ? (
    <Seccion titulo="Ventas por canal">
      <Tarjeta>
        {canales
          .filter((c) => c.transacciones > 0)
          .map((c) => (
            <BarraH
              key={c.canal}
              etiqueta={`${etiquetasCanal[c.canal]} · ${c.transacciones} ventas`}
              valor={c.ventas}
              max={Math.max(...canales.map((x) => x.ventas), 1)}
              texto={`${dinero(c.ventas, m)} · ${pct(totalCanales > 0 ? c.ventas / totalCanales : null, 0)}`}
            />
          ))}
      </Tarjeta>
    </Seccion>
  ) : null;

  const topSeccion = top.some((t) => t.utilidad > 0) ? (
    <Seccion titulo="Productos más rentables">
      <Tarjeta>
        {top.map((t) => (
          <BarraH
            key={t.producto.id}
            etiqueta={`${t.producto.nombre} · ${t.unidades} u.`}
            valor={t.utilidad}
            max={maxTop}
            texto={`${dinero(t.utilidad, m)} · ${pct(t.margen, 0)}`}
          />
        ))}
      </Tarjeta>
    </Seccion>
  ) : null;

  const inventarioSeccion = (
    <Seccion titulo="Inventario">
            <Grilla>
              <Kpi
                etiqueta="Rotación de inventario"
                valor={`${num(k.rotacionInventario, 2)} veces`}
                detalle={`Anualizada: ${num(k.rotacionAnual, 1)} veces/año`}
                ayuda="Costo de ventas ÷ inventario promedio (a costo). Indica cuántas veces vendiste y repusiste tu inventario en el período. Más alto = el dinero no queda inmovilizado."
              />
              <Kpi
                etiqueta="Días de inventario"
                valor={`${num(k.diasInventario, 0)} días`}
                tono={k.diasInventario === null ? undefined : k.diasInventario <= 60 ? "bueno" : k.diasInventario <= 120 ? "alerta" : "critico"}
                ayuda="Días del período ÷ rotación. Es el tiempo promedio que un producto se queda en la tienda antes de venderse."
              />
              <Kpi
                etiqueta="GMROI"
                valor={num(k.gmroi, 2)}
                ayuda="Utilidad bruta ÷ inventario promedio. Cuánta utilidad genera cada peso invertido en mercadería. Sobre 1 significa que el inventario se paga solo en el período."
              />
              <Kpi etiqueta="Inventario a costo" valor={dinero(k.inventarioFinal, m)} detalle={`Promedio ${dinero(k.inventarioPromedio, m)}`} />
              <Kpi
                etiqueta="Punto de equilibrio"
                valor={dinero(k.puntoEquilibrio, m)}
                tono={k.puntoEquilibrio === null ? undefined : k.ventas >= k.puntoEquilibrio ? "bueno" : "alerta"}
                detalle={k.puntoEquilibrio ? `Llevas ${pct(k.ventas / k.puntoEquilibrio, 0)}` : undefined}
                ayuda="Ventas necesarias en el período para cubrir gastos y publicidad con tu margen bruto actual: (gastos + publicidad) ÷ margen bruto."
              />
              <Kpi etiqueta="Compras del período" valor={dinero(k.compras, m)} />
            </Grilla>
            {stockBajo.length > 0 && (
              <Aviso tono="alerta">
                Stock bajo: {stockBajo.map((p) => `${p.producto.nombre} (${p.producto.stock})`).join(", ")}
              </Aviso>
            )}
            {sinMov.length > 0 && (
              <Aviso tono="info">
                Sin ventas en el período: {sinMov.map((p) => p.producto.nombre).join(", ")}. Considera una promoción.
              </Aviso>
            )}
          </Seccion>
  );

  return (
    <Pantalla titulo="Mi Tienda" accion={ajustes}>
      <Chips opciones={OPCIONES_PERIODO} valor={op} onChange={setOp} />

      <Grilla>
        <Kpi etiqueta="Ventas" valor={dinero(k.ventas, m)} delta={variacion(k.ventas, prev.ventas)} />
        <Kpi
          etiqueta="Utilidad bruta"
          valor={dinero(k.utilidadBruta, m)}
          delta={variacion(k.utilidadBruta, prev.utilidadBruta)}
          detalle={`Margen ${pct(k.margenBruto)}`}
          ayuda="Ventas menos el costo de los productos vendidos. El margen bruto es la utilidad bruta dividida por las ventas."
        />
        <Kpi
          etiqueta="Utilidad neta"
          valor={dinero(k.utilidadNeta, m)}
          tono={k.utilidadNeta >= 0 ? "bueno" : "critico"}
          detalle={`Margen neto ${pct(k.margenNeto)}`}
          ayuda="Utilidad bruta menos gastos operacionales (arriendo, sueldos, servicios…) y la inversión en publicidad del período."
        />
        <Kpi etiqueta="Costo de ventas" valor={dinero(k.costoVentas, m)} detalle={`Markup ${pct(k.markup)}`} ayuda="Lo que te costaron los productos vendidos (costo promedio ponderado). El markup es cuánto le subes al costo en promedio." />
        <Kpi etiqueta="Ticket promedio" valor={dinero(k.ticketPromedio, m)} delta={variacion(k.ticketPromedio ?? 0, prev.ticketPromedio ?? 0)} detalle={`${k.transacciones} ventas · ${num(k.unidadesPorTicket)} u./venta`} />
        <Kpi etiqueta="Gastos + publicidad" valor={dinero(k.gastosOperacionales + k.inversionMarketing, m)} detalle={`Publicidad ${dinero(k.inversionMarketing, m)}`} />
      </Grilla>

      {ancho ? (
        <>
          <Columnas pesos={[1.7, 1]}>
            {[
              <Tarjeta key="grafico">
                      <GraficoBarras serie={serie} moneda={m} />
                    </Tarjeta>,
              <View key="top" style={{ gap: 12 }}>{topSeccion}</View>,
            ]}
          </Columnas>
          {canalesSeccion}
          {inventarioSeccion}
        </>
      ) : (
        <>
          <Tarjeta>
                  <GraficoBarras serie={serie} moneda={m} />
                </Tarjeta>
          {canalesSeccion}
          {inventarioSeccion}
          {topSeccion}
        </>
      )}

      <View style={{ height: 8 }} />
    </Pantalla>
  );
}
