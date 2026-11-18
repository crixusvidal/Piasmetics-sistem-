import { useState } from "react";
import { Platform, Share, Text } from "react-native";
import { Aviso, Boton, Campo, Chips, Pantalla, Seccion, Tarjeta } from "../components/ui";
import { carpetaDeDatos, guardadoEnArchivo } from "../lib/almacen";
import { avisar, confirmar } from "../lib/confirmar";
import { datosDemo } from "../lib/demo";
import { DATOS_VACIOS } from "../lib/operaciones";
import { crearRespaldo, leerRespaldo, nombreArchivoRespaldo } from "../lib/respaldo";
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

  const [pegado, setPegado] = useState("");
  const web = Platform.OS === "web";

  const exportar = async () => {
    const texto = crearRespaldo(datos);
    if (web) {
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
      enlace.download = nombreArchivoRespaldo();
      enlace.click();
      URL.revokeObjectURL(enlace.href);
    } else {
      await Share.share({ title: nombreArchivoRespaldo(), message: texto });
    }
  };

  const importarTexto = (texto: string) => {
    const r = leerRespaldo(texto);
    if (!r.ok) return avisar("No se pudo restaurar", r.error);
    const n = r.datos;
    confirmar(
      "¿Restaurar este respaldo?",
      `Contiene ${n.productos.length} productos, ${n.ventas.length} ventas, ${n.compras.length} compras, ${n.gastos.length} gastos y ${n.campanas.length} campañas. Reemplazará todos tus datos actuales.`,
      () => {
        actualizar(() => n);
        setPegado("");
      },
      "Restaurar",
    );
  };

  const elegirArchivo = () => {
    const entrada = document.createElement("input");
    entrada.type = "file";
    entrada.accept = ".json,application/json";
    entrada.onchange = async () => {
      const archivo = entrada.files?.[0];
      if (archivo) importarTexto(await archivo.text());
    };
    entrada.click();
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

      <Seccion titulo="Respaldo">
        <Tarjeta style={{ gap: 10 }}>
          <Text style={{ color: colores.textoSec, lineHeight: 19 }}>
            {guardadoEnArchivo()
              ? `Tus datos se guardan en un archivo de este computador${carpetaDeDatos() ? ` (${carpetaDeDatos()})` : ""}. `
              : "Tus datos se guardan solo en este dispositivo. "}
            Descarga un respaldo cada cierto tiempo y guárdalo en un lugar seguro; con él puedes recuperar todo o pasar tus datos a otro equipo.
          </Text>
          <Boton titulo={web ? "Descargar respaldo" : "Compartir respaldo"} onPress={exportar} />
          {web ? (
            <Boton titulo="Restaurar desde un archivo" variante="secundario" onPress={elegirArchivo} />
          ) : (
            <>
              <Campo etiqueta="Pega aquí el texto del respaldo" value={pegado} onChangeText={setPegado} multiline autoCapitalize="none" autoCorrect={false} />
              <Boton titulo="Restaurar" variante="secundario" onPress={() => importarTexto(pegado)} deshabilitado={!pegado.trim()} />
            </>
          )}
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
