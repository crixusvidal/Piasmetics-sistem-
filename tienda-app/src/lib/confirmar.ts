import { Alert, Platform } from "react-native";

/**
 * Diálogos de confirmación y aviso. En el teléfono usan la alerta nativa; en
 * web se muestran dentro de la app (ver components/Dialogos.tsx), porque
 * algunos navegadores y visores bloquean confirm() y alert().
 */
export interface Dialogo {
  titulo: string;
  mensaje: string;
  /** Si existe, el diálogo pide confirmación y ejecuta esto al aceptar. */
  onSi?: () => void;
  /** Texto del botón que acepta (por defecto "Eliminar"). */
  textoSi?: string;
}

let mostrar: ((d: Dialogo) => void) | null = null;

/** Lo registra el componente Dialogos al montarse. */
export function registrarDialogos(fn: ((d: Dialogo) => void) | null) {
  mostrar = fn;
}

/** Pide confirmación antes de una acción destructiva. */
export function confirmar(titulo: string, mensaje: string, onSi: () => void, textoSi = "Eliminar") {
  if (Platform.OS === "web" && mostrar) {
    mostrar({ titulo, mensaje, onSi, textoSi });
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: "Cancelar", style: "cancel" },
    { text: textoSi, style: textoSi === "Eliminar" ? "destructive" : "default", onPress: onSi },
  ]);
}

export function avisar(titulo: string, mensaje: string) {
  if (Platform.OS === "web" && mostrar) mostrar({ titulo, mensaje });
  else Alert.alert(titulo, mensaje);
}
