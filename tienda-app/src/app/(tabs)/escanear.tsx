import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from "react-native";
import { Aviso, Boton, Campo, Chips, Columnas, Pantalla, Seccion, Tarjeta } from "../../components/ui";
import { avisar } from "../../lib/confirmar";
import { escanearConCamara, importarImagen, type Escaneo } from "../../lib/escaner/escaner";
import { aBase64 } from "../../lib/escaner/imagen";
import { extraerTexto, motorOcr, OcrNoDisponible } from "../../lib/escaner/ocr";
import { parsearBoleta } from "../../lib/escaner/parser";
import { dinero, leerNumero } from "../../lib/formato";
import { analizarBoleta, analizarTextoBoleta } from "../../lib/ia";
import { hoy } from "../../lib/kpis";
import { useLayout } from "../../lib/layout";
import { agregarGasto, buscarProducto, guardarProducto, nuevoId, registrarCompra, registrarVenta } from "../../lib/operaciones";
import { useStore } from "../../lib/store";
import { colores } from "../../lib/tema";
import { CATEGORIAS_GASTO, type BoletaIA, type CategoriaGasto, type Datos, type Producto } from "../../lib/types";

/** Cómo se registra cada línea de la boleta. "nuevo" crea el producto; "omitir" no la registra. */
type Vinculo = { tipo: "producto"; id: string } | { tipo: "nuevo" } | { tipo: "omitir" };

interface LineaEditable {
  descripcion: string;
  cantidad: string;
  precio: string;
  vinculo: Vinculo;
  /** Precio de venta para productos nuevos creados desde una compra. */
  precioVenta: string;
}

interface Borrador {
  tipo: BoletaIA["tipo"];
  comercio: string;
  fecha: string;
  total: string;
  categoria: CategoriaGasto;
  confianza?: BoletaIA["confianza"];
  notas?: string;
  lineas: LineaEditable[];
  fuente: "escaner" | "ia";
}

type Paso = "escanear" | "texto" | "revisar";
const PASOS: { id: Paso; titulo: string }[] = [
  { id: "escanear", titulo: "Escanear" },
  { id: "texto", titulo: "Texto" },
  { id: "revisar", titulo: "Revisar" },
];

export default function Escanear() {
  const { datos, actualizar } = useStore();
  const m = datos.ajustes.moneda;
  const { ancho } = useLayout();
  const [paso, setPaso] = useState<Paso>("escanear");
  const [escaneo, setEscaneo] = useState<Escaneo | null>(null);
  const [texto, setTexto] = useState("");
  const [ocrProgreso, setOcrProgreso] = useState<number | null>(null);
  const [cargandoIA, setCargandoIA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [b, setB] = useState<Borrador | null>(null);

  const aBorrador = (r: BoletaIA, fuente: Borrador["fuente"], productos: Producto[]): Borrador => ({
    tipo: r.tipo,
    comercio: r.comercio,
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(r.fecha) ? r.fecha : hoy(),
    total: r.total ? String(r.total) : "",
    categoria: (CATEGORIAS_GASTO as readonly string[]).includes(r.categoria_gasto) ? (r.categoria_gasto as CategoriaGasto) : "otros",
    confianza: r.confianza,
    notas: r.notas,
    fuente,
    lineas: r.items.map((i) => {
      const p = buscarProducto(productos, i.descripcion);
      const unit = i.precio_unitario || (i.cantidad ? i.total / i.cantidad : 0);
      return {
        descripcion: i.descripcion,
        cantidad: String(i.cantidad || 1),
        precio: String(Math.round(unit * 100) / 100),
        vinculo: p ? { tipo: "producto", id: p.id } : r.tipo === "compra" ? { tipo: "nuevo" } : { tipo: "omitir" },
        precioVenta: String(Math.round(unit * 2)),
      };
    }),
  });

  /** Paso 1 → 2 → 3: escanear, pasar a texto (OCR) e interpretar en el teléfono. */
  const capturar = async (fn: () => Promise<Escaneo | null>) => {
    setError(null);
    try {
      const e = await fn();
      if (!e) return;
      setEscaneo(e);
      setB(null);
      setTexto("");
      setPaso("texto");
      setOcrProgreso(0);
      let t: string;
      try {
        t = await extraerTexto(e.uri, setOcrProgreso);
      } catch (err) {
        if (!(err instanceof OcrNoDisponible)) throw err;
        // Expo Go no trae el lector de texto del teléfono. Con servidor de IA
        // configurado, la IA lee la foto; si no, el texto se escribe a mano.
        if (datos.ajustes.servidorUrl) {
          const r = await analizarBoleta(datos.ajustes, await aBase64(e.uri), "image/jpeg");
          setB(aBorrador(r, "ia", datos.productos));
          setPaso("revisar");
        } else {
          setError("En Expo Go no está el lector de texto. Escribe el texto de la boleta abajo, configura el servidor de IA en Ajustes o instala la app completa.");
        }
        return;
      }
      setTexto(t);
      interpretar(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcrProgreso(null);
    }
  };

  const interpretar = (t: string) => {
    if (!t.trim()) {
      setError("No se encontró texto en la imagen. Intenta escanear con más luz o escribe el texto a mano.");
      return;
    }
    setError(null);
    setB(aBorrador(parsearBoleta(t), "escaner", datos.productos));
    setPaso("revisar");
  };

  const mejorarConIA = async () => {
    setCargandoIA(true);
    setError(null);
    try {
      const r = await analizarTextoBoleta(datos.ajustes, texto);
      setB(aBorrador(r, "ia", datos.productos));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCargandoIA(false);
    }
  };

  const manual = () => {
    setEscaneo(null);
    setTexto("");
    setError(null);
    setB({ tipo: "compra", comercio: "", fecha: hoy(), total: "", categoria: "otros", lineas: [nuevaLinea()], fuente: "escaner" });
    setPaso("revisar");
  };

  const reiniciar = () => {
    setB(null);
    setEscaneo(null);
    setTexto("");
    setError(null);
    setPaso("escanear");
  };

  const guardar = () => {
    if (!b) return;
    const origen = b.fuente;
    const lineas = b.lineas.filter((l) => l.vinculo.tipo !== "omitir" && leerNumero(l.cantidad) > 0);
    actualizar((d0) => {
      let d: Datos = d0;
      if (b.tipo === "gasto") {
        const monto = leerNumero(b.total) || b.lineas.reduce((s, l) => s + leerNumero(l.cantidad) * leerNumero(l.precio), 0);
        return agregarGasto(d, { id: nuevoId(), fecha: b.fecha, categoria: b.categoria, descripcion: b.comercio, monto, origen });
      }
      // Crea los productos nuevos y resuelve el id de cada línea.
      const ids = lineas.map((l) => {
        if (l.vinculo.tipo === "producto") return l.vinculo.id;
        const id = nuevoId();
        const costo = b.tipo === "compra" ? leerNumero(l.precio) : 0;
        d = guardarProducto(d, {
          id,
          nombre: l.descripcion || "Producto sin nombre",
          categoria: "",
          costo: 0,
          precio: b.tipo === "compra" ? leerNumero(l.precioVenta) || costo * 2 : leerNumero(l.precio),
          stock: 0,
          stockMinimo: 3,
        });
        return id;
      });
      if (b.tipo === "compra") {
        return registrarCompra(d, {
          id: nuevoId(),
          fecha: b.fecha,
          proveedor: b.comercio || "Proveedor",
          origen,
          items: lineas.map((l, i) => ({ productoId: ids[i], descripcion: l.descripcion, cantidad: leerNumero(l.cantidad), costoUnitario: leerNumero(l.precio) })),
        });
      }
      return registrarVenta(d, {
        id: nuevoId(),
        fecha: b.fecha,
        metodoPago: "otro",
        clienteNuevo: false,
        origen,
        items: lineas.map((l, i) => {
          const p = d.productos.find((x) => x.id === ids[i])!;
          return { productoId: p.id, nombre: p.nombre, cantidad: leerNumero(l.cantidad), precio: leerNumero(l.precio), costo: p.costo };
        }),
      });
    });
    const tipo = b.tipo;
    reiniciar();
    avisar("Guardado", tipo === "compra" ? "Compra registrada y stock actualizado." : tipo === "venta" ? "Venta registrada." : "Gasto registrado.");
  };

  const sumaLineas = b?.lineas.filter((l) => l.vinculo.tipo !== "omitir").reduce((s, l) => s + leerNumero(l.cantidad) * leerNumero(l.precio), 0) ?? 0;
  const descuadre = b && b.tipo !== "gasto" && leerNumero(b.total) > 0 && Math.abs(sumaLineas - leerNumero(b.total)) > Math.max(1, leerNumero(b.total) * 0.01);
  const idxPaso = PASOS.findIndex((p) => p.id === paso);
  const ocupado = ocrProgreso !== null;

  const enColumnas = ancho && paso !== "escanear" && escaneo !== null;
  const imagenTarjeta = escaneo ? (
    <Tarjeta style={{ gap: 6 }}>
                  <Image source={{ uri: escaneo.uri }} style={{ width: "100%", height: 260, borderRadius: 8, backgroundColor: colores.fondo }} resizeMode="contain" />
                  <Text style={{ fontSize: 12, color: colores.textoSec }}>
                    {escaneo.procesada ? "✓ " : ""}
                    {escaneo.detalle}
                  </Text>
                </Tarjeta>
  ) : null;
  const bloqueEscanear = paso === "escanear" && (
        <Tarjeta style={{ gap: 10 }}>
          <Text style={{ color: colores.textoSec, lineHeight: 20 }}>
            Funciona como una app de escáner: detecta los bordes de la boleta, la endereza y la recorta. Luego lee el texto en tu teléfono (sin internet) y
            arma el registro para que lo revises antes de guardar.
          </Text>
          <Boton titulo="📄 Escanear con la cámara" onPress={() => capturar(escanearConCamara)} />
          <Boton titulo="🖼️ Importar imagen" variante="secundario" onPress={() => capturar(importarImagen)} />
          <Pressable onPress={manual}>
            <Text style={{ color: colores.primario, textAlign: "center", paddingVertical: 4 }}>Ingresar una compra manualmente</Text>
          </Pressable>
        </Tarjeta>
      );
  const bloqueTexto = paso === "texto" && (
        <>
          {!enColumnas && imagenTarjeta}
          {ocupado ? (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", padding: 12 }}>
              <ActivityIndicator color={colores.primario} />
              <Text style={{ color: colores.textoSec }}>
                Leyendo texto{ocrProgreso ? ` ${Math.round(ocrProgreso * 100)}%` : "…"} · {motorOcr}
              </Text>
            </View>
          ) : (
            <Seccion titulo="Texto reconocido">
              <Text style={{ fontSize: 12, color: colores.textoSec }}>Puedes corregir el texto antes de interpretarlo.</Text>
              <TextInput
                multiline
                value={texto}
                onChangeText={setTexto}
                placeholder="Escribe o pega aquí el texto de la boleta"
                placeholderTextColor={colores.textoTenue}
                style={{
                  minHeight: 220,
                  borderWidth: 1,
                  borderColor: colores.borde,
                  borderRadius: 10,
                  padding: 12,
                  backgroundColor: "#fff",
                  fontFamily: "monospace",
                  fontSize: 13,
                  color: colores.texto,
                  textAlignVertical: "top",
                }}
              />
              <Boton titulo="Interpretar texto →" onPress={() => interpretar(texto)} deshabilitado={!texto.trim()} />
              <Boton titulo="Escanear otra vez" variante="secundario" onPress={reiniciar} />
            </Seccion>
          )}
        </>
      );
  const bloqueRevisar = paso === "revisar" && b && (
        <Seccion titulo="Revisa y corrige el registro">
          <Aviso tono={b.confianza === "alta" ? "bueno" : b.confianza === "media" ? "alerta" : "critico"}>
            {b.fuente === "ia" ? "Ordenado con IA" : "Interpretado en el teléfono"}
            {b.confianza ? ` · confianza ${b.confianza}` : ""}. {b.notas}
          </Aviso>
          {texto.trim() !== "" && datos.ajustes.servidorUrl !== "" && b.fuente !== "ia" && (
            <Boton titulo={cargandoIA ? "Consultando IA…" : "✨ Mejorar con IA (opcional)"} variante="secundario" onPress={mejorarConIA} deshabilitado={cargandoIA} />
          )}
          <Chips
            opciones={[
              { valor: "compra", etiqueta: "Compra a proveedor" },
              { valor: "venta", etiqueta: "Venta" },
              { valor: "gasto", etiqueta: "Gasto" },
            ]}
            valor={b.tipo}
            onChange={(tipo) => setB({ ...b, tipo })}
          />
          <Campo etiqueta={b.tipo === "compra" ? "Proveedor" : b.tipo === "venta" ? "Cliente / detalle" : "Descripción"} value={b.comercio} onChangeText={(t) => setB({ ...b, comercio: t })} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Campo etiqueta="Fecha (AAAA-MM-DD)" value={b.fecha} onChangeText={(t) => setB({ ...b, fecha: t })} />
            <Campo etiqueta="Total boleta" keyboardType="numeric" value={b.total} onChangeText={(t) => setB({ ...b, total: t })} />
          </View>

          {b.tipo === "gasto" ? (
            <Chips opciones={CATEGORIAS_GASTO.map((c) => ({ valor: c, etiqueta: c }))} valor={b.categoria} onChange={(categoria) => setB({ ...b, categoria })} />
          ) : (
            <>
              {b.lineas.map((l, i) => (
                <EditorLinea
                  key={i}
                  linea={l}
                  tipo={b.tipo === "venta" ? "venta" : "compra"}
                  productos={datos.productos}
                  moneda={m}
                  onChange={(nl) => setB({ ...b, lineas: b.lineas.map((x, j) => (j === i ? nl : x)) })}
                  onQuitar={() => setB({ ...b, lineas: b.lineas.filter((_, j) => j !== i) })}
                />
              ))}
              <Pressable onPress={() => setB({ ...b, lineas: [...b.lineas, nuevaLinea()] })}>
                <Text style={{ color: colores.primario, paddingVertical: 4 }}>+ Agregar línea</Text>
              </Pressable>
              <Text style={{ color: colores.textoSec }}>Suma de líneas registradas: {dinero(sumaLineas, m)}</Text>
              {descuadre && <Aviso tono="alerta">La suma de las líneas no coincide con el total de la boleta. Puede que falte una línea o haya descuentos.</Aviso>}
            </>
          )}
          <Boton titulo="Guardar" onPress={guardar} deshabilitado={!/^\d{4}-\d{2}-\d{2}$/.test(b.fecha)} />
          {texto.trim() !== "" && <Boton titulo="← Volver al texto" variante="secundario" onPress={() => setPaso("texto")} />}
          <Boton titulo="Descartar" variante="secundario" onPress={reiniciar} />
          {!datos.ajustes.servidorUrl && (
            <Text style={{ fontSize: 12, color: colores.textoSec, textAlign: "center" }}>
              ¿Quieres que la IA ordene boletas difíciles?{" "}
              <Text style={{ color: colores.primario }} onPress={() => router.push("/ajustes")}>
                Configura el servidor
              </Text>
            </Text>
          )}
        </Seccion>
      );

  return (
    <Pantalla titulo="Escanear boleta">
      {/* Indicador de pasos: Escanear → Texto → Revisar → Guardar */}
      <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="progressbar">
        {PASOS.map((p, i) => {
          const hecho = i < idxPaso;
          const actual = i === idxPaso;
          return (
            <Pressable
              key={p.id}
              disabled={!hecho || ocupado}
              onPress={() => setPaso(p.id)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: "center",
                backgroundColor: actual ? colores.primario : hecho ? colores.primarioSuave : colores.superficie,
                borderWidth: 1,
                borderColor: actual ? colores.primario : colores.borde,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: actual ? "#fff" : hecho ? colores.primario : colores.textoSec }}>
                {hecho ? "✓" : `${i + 1}.`} {p.titulo}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error && <Aviso tono="critico">{error}</Aviso>}

      {enColumnas ? (
        <Columnas pesos={[1, 1.35]}>
          {[
            <View key="img" style={{ gap: 12 }}>
              {imagenTarjeta}
            </View>,
            <View key="paso" style={{ gap: 12 }}>
              {bloqueTexto}
              {bloqueRevisar}
            </View>,
          ]}
        </Columnas>
      ) : (
        <>
          {bloqueEscanear}
          {bloqueTexto}
          {bloqueRevisar}
        </>
      )}
    </Pantalla>
  );
}

const nuevaLinea = (): LineaEditable => ({ descripcion: "", cantidad: "1", precio: "", vinculo: { tipo: "nuevo" }, precioVenta: "" });

function EditorLinea({
  linea,
  tipo,
  productos,
  moneda,
  onChange,
  onQuitar,
}: {
  linea: LineaEditable;
  tipo: "compra" | "venta";
  productos: Producto[];
  moneda: string;
  onChange: (l: LineaEditable) => void;
  onQuitar: () => void;
}) {
  const [eligiendo, setEligiendo] = useState(false);
  const [q, setQ] = useState("");
  const vinculado = linea.vinculo.tipo === "producto" ? productos.find((p) => p.id === (linea.vinculo as { id: string }).id) : undefined;
  const textoVinculo =
    linea.vinculo.tipo === "omitir" ? "No registrar esta línea" : vinculado ? `Producto: ${vinculado.nombre}` : "Crear producto nuevo";

  return (
    <Tarjeta style={{ gap: 8, opacity: linea.vinculo.tipo === "omitir" ? 0.6 : 1 }}>
      <Campo etiqueta="Descripción" value={linea.descripcion} onChangeText={(t) => onChange({ ...linea, descripcion: t })} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Campo etiqueta="Cantidad" keyboardType="numeric" value={linea.cantidad} onChangeText={(t) => onChange({ ...linea, cantidad: t })} />
        <Campo
          etiqueta={tipo === "compra" ? "Costo unitario" : "Precio unitario"}
          keyboardType="numeric"
          value={linea.precio}
          onChangeText={(t) => onChange({ ...linea, precio: t })}
        />
      </View>
      {tipo === "compra" && linea.vinculo.tipo === "nuevo" && (
        <Campo etiqueta="Precio de venta del producto nuevo" keyboardType="numeric" value={linea.precioVenta} onChangeText={(t) => onChange({ ...linea, precioVenta: t })} />
      )}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <Pressable onPress={() => setEligiendo((e) => !e)} style={{ flex: 1 }}>
          <Text style={{ color: colores.primario }} numberOfLines={1}>
            {textoVinculo} ▾
          </Text>
        </Pressable>
        <Pressable onPress={onQuitar} hitSlop={8}>
          <Text style={{ color: colores.critico }}>Quitar</Text>
        </Pressable>
      </View>
      {eligiendo && (
        <View style={{ gap: 4 }}>
          <Campo etiqueta="Buscar producto existente" value={q} onChangeText={setQ} />
          {productos
            .filter((p) => p.nombre.toLowerCase().includes(q.trim().toLowerCase()))
            .slice(0, 5)
            .map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  onChange({ ...linea, vinculo: { tipo: "producto", id: p.id } });
                  setEligiendo(false);
                }}
                style={{ paddingVertical: 6 }}
              >
                <Text style={{ color: colores.texto }}>
                  {p.nombre} · stock {p.stock} · {dinero(tipo === "compra" ? p.costo : p.precio, moneda)}
                </Text>
              </Pressable>
            ))}
          {(["nuevo", "omitir"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                onChange({ ...linea, vinculo: { tipo: t } });
                setEligiendo(false);
              }}
              style={{ paddingVertical: 6 }}
            >
              <Text style={{ color: colores.primario }}>{t === "nuevo" ? "+ Crear producto nuevo" : "No registrar esta línea (ej. bolsa, descuento)"}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Tarjeta>
  );
}
