// Fechas guardadas como "YYYY-MM-DD" (hora local) para agrupar por día sin
// problemas de zona horaria.
export type Fecha = string;

export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  /** Costo unitario promedio ponderado. */
  costo: number;
  /** Precio de venta unitario. */
  precio: number;
  stock: number;
  stockMinimo: number;
}

export interface ItemVenta {
  productoId: string;
  nombre: string;
  cantidad: number;
  /** Precio unitario cobrado. */
  precio: number;
  /** Costo unitario al momento de la venta (para la utilidad). */
  costo: number;
}

export interface Venta {
  id: string;
  fecha: Fecha;
  items: ItemVenta[];
  metodoPago: "efectivo" | "tarjeta" | "transferencia" | "otro";
  /** Campaña de marketing que trajo la venta, si se conoce. */
  campanaId?: string;
  clienteNuevo: boolean;
  origen: "manual" | "ia" | "escaner" | "chat";
  /** Canal por el que se vendió; sin valor significa venta en la tienda. */
  canal?: "whatsapp" | "messenger";
  /** Nombre del cliente, cuando viene de un chat. */
  cliente?: string;
}

export interface ItemCompra {
  productoId?: string;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
}

export interface Compra {
  id: string;
  fecha: Fecha;
  proveedor: string;
  items: ItemCompra[];
  origen: "manual" | "ia" | "escaner";
}

export const CATEGORIAS_GASTO = ["arriendo", "servicios", "sueldos", "publicidad", "otros"] as const;
export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];

export interface Gasto {
  id: string;
  fecha: Fecha;
  categoria: CategoriaGasto;
  descripcion: string;
  monto: number;
  origen: "manual" | "ia" | "escaner";
}

export const CANALES = ["Instagram", "Facebook", "TikTok", "Google", "Volantes", "Otro"] as const;

export interface Campana {
  id: string;
  nombre: string;
  canal: string;
  inicio: Fecha;
  fin: Fecha;
  inversion: number;
  impresiones: number;
  clics: number;
}

export interface Ajustes {
  moneda: string;
  servidorUrl: string;
  claveApp: string;
}

export interface Datos {
  productos: Producto[];
  ventas: Venta[];
  compras: Compra[];
  gastos: Gasto[];
  campanas: Campana[];
  ajustes: Ajustes;
}

/** Resultado del análisis IA de una boleta (lo devuelve el servidor). */
export interface BoletaIA {
  tipo: "compra" | "venta" | "gasto";
  comercio: string;
  fecha: string;
  numero_documento: string;
  moneda: string;
  items: { descripcion: string; cantidad: number; precio_unitario: number; total: number }[];
  impuesto: number;
  total: number;
  categoria_gasto: string;
  confianza: "alta" | "media" | "baja";
  notas: string;
}
