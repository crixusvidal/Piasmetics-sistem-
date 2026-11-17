import { Redirect } from "expo-router";

// Cualquier dirección desconocida vuelve al Resumen (útil cuando la versión
// web se abre desde una ruta que no es la raíz).
export default function NoEncontrado() {
  return <Redirect href="/" />;
}
