import { useState } from "react";
import { Text } from "react-native";
import { Aviso, Boton, Campo, Chips, Pantalla, Seccion, Tarjeta } from "../components/ui";
import { confirmar } from "../lib/confirmar";
import { datosDemo } from "../lib/demo";
import { DATOS_VACIOS } from "../lib/operaciones";
import { useStore } from "../lib/store";
import { colores } from "../lib/tema";

const MONEDAS = ["CLP", "PEN", "MXN", "COP", "ARS", "USD", "EUR"];

export default function Ajustes() {
  const { datos, actualizar } = useStore();
  const a = datos.ajustes;
  const [url, setUrl] = useState(a.servidorUrl);
  const [clave, setClave] = useState(a.claveApp);
  const [prueba, setPrueba] = useState<{ ok: boolean; msg: string } | null>(null);

  const guardarServidor = () => {
    actualizar((d) => ({ ...d, ajustes: { ...d.ajustes, servidorUrl: url.trim(), claveApp: clave.trim() } }));
    setPrueba(null);
  };

  const probar = async () => {
    guardarServidor();
    try {
      const r = await fetch(url.trim().replace(/\/+$/, "") + "/api/salud");
      setPrueba(r.ok ? { ok: true, msg: "Conexión correcta con el servidor de IA." } : { ok: false, msg: `El servidor respondió ${r.status}.` });
    } catch {
      setPrueba({ ok: false, msg: "No se pudo conectar. Revisa la dirección (ej: http://192.168.1.10:3001)." });
    }
  };

  return (
    <Pantalla estrecha titulo="Ajustes">
      <Seccion titulo="Moneda">
        <Chips
          opciones={MONEDAS.map((m) => ({ valor: m, etiqueta: m }))}
          valor={a.moneda}
          onChange={(moneda) => actualizar((d) => ({ ...d, ajustes: { ...d.ajustes, moneda } }))}
        />
      </Seccion>

      <Seccion titulo="Servidor de IA para boletas">
        <Tarjeta style={{ gap: 10 }}>
          <Text style={{ color: colores.textoSec, lineHeight: 19 }}>
            Las fotos se envían a tu propio servidor (carpeta tienda-server), que las analiza con Claude. Así tu clave de Anthropic nunca queda guardada en
            el teléfono.
          </Text>
          <Campo etiqueta="Dirección del servidor" value={url} onChangeText={setUrl} placeholder="http://192.168.1.10:3001" autoCapitalize="none" autoCorrect={false} />
          <Campo etiqueta="Clave de la app (APP_TOKEN)" value={clave} onChangeText={setClave} secureTextEntry autoCapitalize="none" />
          <Boton titulo="Guardar y probar conexión" onPress={probar} deshabilitado={!url.trim()} />
          {prueba && <Aviso tono={prueba.ok ? "bueno" : "critico"}>{prueba.msg}</Aviso>}
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Datos">
        <Text style={{ color: colores.textoSec }}>
          {datos.productos.length} productos · {datos.ventas.length} ventas · {datos.compras.length} compras · {datos.gastos.length} gastos ·{" "}
          {datos.campanas.length} campañas. Se guardan solo en este dispositivo.
        </Text>
        <Boton
          titulo="Cargar datos de ejemplo"
          variante="secundario"
          onPress={() => confirmar("¿Cargar datos de ejemplo?", "Reemplazará todos tus datos actuales.", () => actualizar((d) => datosDemo(d.ajustes)))}
        />
        <Boton
          titulo="Borrar todos los datos"
          variante="peligro"
          onPress={() => confirmar("¿Borrar todo?", "Se eliminarán productos, ventas, compras, gastos y campañas. No se puede deshacer.", () => actualizar((d) => ({ ...DATOS_VACIOS, ajustes: d.ajustes })))}
        />
      </Seccion>
    </Pantalla>
  );
}
