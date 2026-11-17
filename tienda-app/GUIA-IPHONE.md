# Mi Tienda en iPhone

Hay tres caminos, de más simple a más completo. La app es la misma; cambia cómo se instala.

| | Costo | Escáner de bordes y OCR del teléfono | Notas |
|---|---|---|---|
| **A. Web en Safari** | Gratis | No (usa el escáner y el OCR del navegador, que funcionan bien) | Se agrega a la pantalla de inicio como una app |
| **B. Expo Go** | Gratis | No (solo texto a mano o IA del servidor) | Sirve para probar rápido, con el PC encendido |
| **C. App nativa** | 99 USD al año (Apple Developer) | Sí (VisionKit y Apple Vision) | Se instala en el iPhone o se publica en la App Store |

## A. Web en Safari (sin pagar nada)

1. Genera la carpeta de la app: `npx expo export -p web` (queda en `dist/`).
2. Súbela a un hosting estático gratuito, por ejemplo arrastrando `dist/` a app.netlify.com/drop. Te da una dirección con https.
3. En el iPhone abre esa dirección en **Safari**, toca Compartir y luego **Agregar a pantalla de inicio**.

Los datos quedan en ese iPhone. Si la agregas a la pantalla de inicio, iOS no los borra por falta de uso; si solo la dejas como pestaña de Safari, puede hacerlo.

## B. Expo Go

En el PC, dentro de `tienda-app`: `npm install` y `npx expo start`. Instala **Expo Go** desde la App Store en el iPhone y escanea el QR con la cámara. PC y iPhone deben estar en el mismo wifi.

## C. App nativa

Necesitas:

- Una cuenta de **Apple Developer** (developer.apple.com/programs/enroll). La aprobación puede tardar de horas a un par de días.
- Una cuenta gratuita de **Expo** (expo.dev). El plan gratuito tiene un cupo mensual de compilaciones; revisa el límite vigente en expo.dev.
- **Node.js** y **Git** en tu PC. No necesitas un Mac ni Xcode: Expo compila en la nube.

### 1. Preparar el proyecto (una sola vez)

En PowerShell, dentro de `tienda-app`:

```powershell
npm install
npx eas-cli@latest login
npx eas-cli@latest init
```

Abre `app.json` y cambia `ios.bundleIdentifier` (hoy es `com.mitienda.app`) por uno propio y único, por ejemplo `com.tunombre.mitienda`. No se puede repetir en todo el mundo.

### 2. Instalarla en tu propio iPhone

```powershell
npx eas-cli@latest device:create
npx eas-cli@latest build --profile preview -p ios
```

- `device:create` te da un enlace o QR para abrir en el iPhone e instalar un perfil que registra tu equipo.
- En el iPhone activa el **Modo de desarrollador**: Ajustes, Privacidad y seguridad, Modo de desarrollador. Pide reiniciar.
- Cuando termina la compilación, Expo te da un enlace para instalar la app en ese iPhone.

Solo funciona en los iPhone que registraste, hasta el límite que permita tu cuenta de Apple.

### 3. Probarla con otras personas o publicarla

```powershell
npx eas-cli@latest build --profile production -p ios
npx eas-cli@latest submit -p ios
```

Esto sube la app a **TestFlight**, donde cada persona que invites la instala sin registrar su equipo, y de ahí se puede enviar a la App Store. Antes de enviar a la App Store necesitas:

- un ícono y una pantalla de inicio propios (hoy son los de ejemplo de Expo, en `assets/`);
- capturas de pantalla y una descripción;
- una **política de privacidad** con dirección web. Los datos de la app se guardan en el dispositivo; la IA es opcional y solo envía texto a tu propio servidor.

## Qué está verificado y qué no

- `npx expo-doctor` pasa sus 20 controles.
- El proyecto de iOS se genera sin errores, con los permisos de cámara y fotos y la marca de cifrado que evita una pregunta de Apple al subir.
- **No se ha compilado ni ejecutado en un iPhone real**, porque eso requiere tu cuenta de Apple. Si la compilación o la app fallan, copia el mensaje y se corrige.
