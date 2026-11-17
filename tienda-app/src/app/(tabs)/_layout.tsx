import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { useLayout } from "../../lib/layout";
import { colores } from "../../lib/tema";

type Icono = ComponentProps<typeof Ionicons>["name"];
function icono(nombre: Icono) {
  function TabIcono({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={nombre} color={color as string} size={size} />;
  }
  return TabIcono;
}

export default function TabsLayout() {
  const { ancho, esPc } = useLayout();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Celular: barra inferior. Tablet y PC: barra lateral con las secciones.
        tabBarPosition: ancho ? "left" : "bottom",
        tabBarVariant: ancho ? "material" : undefined,
        tabBarLabelPosition: ancho ? (esPc ? "beside-icon" : "below-icon") : undefined,
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoSec,
        tabBarStyle: { backgroundColor: colores.superficie, borderColor: colores.borde, ...(esPc ? { width: 230, minWidth: 230 } : {}) },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Resumen", tabBarIcon: icono("stats-chart") }} />
      <Tabs.Screen name="ventas" options={{ title: "Ventas", tabBarIcon: icono("cart") }} />
      <Tabs.Screen name="escanear" options={{ title: "Escanear", tabBarIcon: icono("scan") }} />
      <Tabs.Screen name="inventario" options={{ title: "Inventario", tabBarIcon: icono("cube") }} />
      <Tabs.Screen name="marketing" options={{ title: "Marketing", tabBarIcon: icono("megaphone") }} />
    </Tabs>
  );
}
