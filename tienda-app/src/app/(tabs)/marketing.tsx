import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Aviso, Boton, Chips, Grilla, GrillaTarjetas, Kpi, Pantalla, Seccion, Tarjeta, Vacio } from "../../components/ui";
import { dinero, fechaCorta, num, pct } from "../../lib/formato";
import { kpisCampana, resumenMarketing } from "../../lib/kpis";
import { aPeriodo, OPCIONES_PERIODO, type OpcionPeriodo } from "../../lib/periodo";
import { useStore } from "../../lib/store";
import { colores } from "../../lib/tema";

export default function Marketing() {
  const { datos } = useStore();
  const m = datos.ajustes.moneda;
  const [op, setOp] = useState<OpcionPeriodo>("90");

  const r = useMemo(() => resumenMarketing(datos, aPeriodo(op)), [datos, op]);
  const campanas = useMemo(
    () => datos.campanas.map((c) => kpisCampana(datos, c)).sort((a, b) => b.campana.inicio.localeCompare(a.campana.inicio)),
    [datos],
  );
  const mejor = [...campanas].filter((c) => c.roas !== null).sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))[0];

  return (
    <Pantalla titulo="Marketing">
      <Boton titulo="+ Nueva campaña" onPress={() => router.push("/campana")} />
      <Chips opciones={OPCIONES_PERIODO} valor={op} onChange={setOp} />
      <Grilla>
        <Kpi etiqueta="Inversión" valor={dinero(r.inversion, m)} detalle={`${pct(r.marketingSobreVentas)} de las ventas`} ayuda="Inversión de campañas activas en el período, prorrateada por días." />
        <Kpi etiqueta="Ventas por publicidad" valor={dinero(r.ventasAtribuidas, m)} detalle={`${pct(r.participacionVentas)} del total`} ayuda="Ventas marcadas como provenientes de una campaña al registrarlas." />
        <Kpi
          etiqueta="ROAS"
          valor={r.roas === null ? "—" : `${num(r.roas, 2)}x`}
          tono={r.roas === null ? undefined : r.roas >= 3 ? "bueno" : r.roas >= 1 ? "alerta" : "critico"}
          ayuda="Retorno sobre inversión publicitaria = ventas atribuidas ÷ inversión. 3x significa $3 vendidos por cada $1 invertido. Bajo 1x pierdes dinero."
        />
        <Kpi
          etiqueta="ROI de marketing"
          valor={pct(r.roi, 0)}
          tono={r.roi === null ? undefined : r.roi >= 0 ? "bueno" : "critico"}
          ayuda="(Utilidad bruta de las ventas atribuidas − inversión) ÷ inversión. A diferencia del ROAS, considera el costo de los productos."
        />
        <Kpi etiqueta="CAC" valor={dinero(r.cac, m)} detalle={`${r.clientesNuevos} clientes nuevos`} ayuda="Costo de adquisición de cliente = inversión ÷ clientes nuevos que llegaron por publicidad." />
        <Kpi etiqueta="CTR · CPC" valor={pct(r.ctr, 2)} detalle={`CPC ${dinero(r.cpc, m)}`} ayuda="CTR = clics ÷ impresiones (qué tan atractivo es el anuncio). CPC = costo por clic." />
      </Grilla>

      {mejor && campanas.length > 1 && (
        <Aviso tono="info">
          Tu campaña con mejor retorno es «{mejor.campana.nombre}» ({mejor.campana.canal}) con ROAS {num(mejor.roas, 2)}x.
        </Aviso>
      )}

      <Seccion titulo="Campañas">
        {campanas.length === 0 ? (
          <Tarjeta>
            <Vacio>Registra tus campañas (Instagram, TikTok, volantes…) con su inversión, impresiones y clics. Luego, al anotar una venta, indica de qué campaña vino.</Vacio>
          </Tarjeta>
        ) : (
            <GrillaTarjetas>
            {campanas.map((k) => (
            <Pressable key={k.campana.id} onPress={() => router.push({ pathname: "/campana", params: { id: k.campana.id } })}>
              <Tarjeta style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: colores.texto, fontSize: 15 }}>{k.campana.nombre}</Text>
                    <Text style={{ color: colores.textoSec, fontSize: 12 }}>
                      {k.campana.canal} · {fechaCorta(k.campana.inicio)} – {fechaCorta(k.campana.fin)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontWeight: "700",
                      fontSize: 15,
                      color: k.roas === null ? colores.textoSec : k.roas >= 3 ? colores.bueno : k.roas >= 1 ? colores.alerta : colores.critico,
                    }}
                  >
                    ROAS {k.roas === null ? "—" : `${num(k.roas, 2)}x`}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 6 }}>
                  {[
                    ["Inversión", dinero(k.inversion, m)],
                    ["Ventas", `${dinero(k.ventasAtribuidas, m)} (${k.numeroVentas})`],
                    ["ROI", pct(k.roi, 0)],
                    ["CAC", dinero(k.cac, m)],
                    ["CTR", pct(k.ctr, 2)],
                    ["CPC", dinero(k.cpc, m)],
                    ["CPM", dinero(k.cpm, m)],
                    ["Conversión", pct(k.tasaConversion, 2)],
                    ["Costo/venta", dinero(k.costoPorVenta, m)],
                  ].map(([e, v]) => (
                    <View key={e} style={{ width: "33.3%" }}>
                      <Text style={{ fontSize: 11, color: colores.textoSec }}>{e}</Text>
                      <Text style={{ fontSize: 13, color: colores.texto, fontWeight: "600" }}>{v}</Text>
                    </View>
                  ))}
                </View>
              </Tarjeta>
            </Pressable>
          ))}
            </GrillaTarjetas>
        )}
      </Seccion>
    </Pantalla>
  );
}
