import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Dialogos } from "../components/Dialogos";
import { StoreProvider } from "../lib/store";
import { colores } from "../lib/tema";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colores.superficie },
            headerTintColor: colores.primario,
            headerTitleStyle: { color: colores.texto },
            contentStyle: { backgroundColor: colores.fondo },
            headerBackTitle: "Volver",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="venta-nueva" options={{ title: "Nueva venta", presentation: "modal" }} />
          <Stack.Screen name="chat-venta" options={{ title: "Venta desde chat", presentation: "modal" }} />
          <Stack.Screen name="producto" options={{ title: "Producto", presentation: "modal" }} />
          <Stack.Screen name="campana" options={{ title: "Campaña", presentation: "modal" }} />
          <Stack.Screen name="gasto-nuevo" options={{ title: "Nuevo gasto", presentation: "modal" }} />
          <Stack.Screen name="ajustes" options={{ title: "Ajustes" }} />
        </Stack>
        <Dialogos />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
