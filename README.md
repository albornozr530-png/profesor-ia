# Profesor IA

Tutor de estudios adaptable a la edad y al nivel académico del estudiante. El cliente funciona como PWA web y se puede compilar como aplicación de Windows (Electron) o Android (Capacitor).

## 1. Instalación local

Requisitos: Node.js 22 o superior y npm.

```powershell
npm.cmd run install:all
Copy-Item .env.example .env
npm.cmd run dev
```

Abre `http://localhost:5173`. El servidor API queda en `http://localhost:3001`.

Para probar desde un teléfono en la misma red, el micrófono exige HTTPS. No basta con abrir una IP HTTP desde el navegador: usa un dominio HTTPS, un túnel HTTPS o la aplicación Android nativo.

## 2. Edad

La edad de un perfil nuevo comienza **sin seleccionar**. No se presupone que el estudiante tiene 15 años. Los perfiles antiguos que tenían 15 años se vuelven a pedir una sola vez para que puedas corregirla. El selector permite elegir cualquier edad entre 5 y 100 años, y el perfil no se guarda hasta validarla.

## 3. Micrófono y voz

- Navegador: Web Speech API en Chrome, Edge y Opera; el permiso se solicita al pulsar el micrófono.
- Android: plugin nativo de reconocimiento de voz con permiso `RECORD_AUDIO`.
- Windows/Electron: Chromium con permisos de audio gestionados por la aplicación.
- Fallback: `MediaRecorder` captura audio real y lo envía a `/api/speech/transcribe` cuando el navegador no implementa Web Speech. Configura `POLLINATIONS_API_KEY` o `TRANSCRIPTION_API_URL` en el servidor para activarlo.
- Las teclas nunca se exponen en el bundle del cliente.

## 4. Web / PWA

```powershell
npm.cmd run build:web
npm.cmd start
```

Express sirve `client/dist` y `/api` en el mismo origen. En producción, publica el resultado detrás de HTTPS (por ejemplo, Nginx, Caddy o el proveedor de hosting). La PWA registra el service worker automáticamente en builds de producción, precachea el shell y excluye `/api`.

## 5. Windows (.exe)

```powershell
npm.cmd install
npm.cmd run electron:dev
npm.cmd run build:win
```

Los artefactos se generan en `release/`: `Profesor-IA-Setup-1.0.0-x64.exe` (instalador) y `Profesor-IA-Portable-1.0.0-x64.exe` (portátil). Electron inicia un servidor local integrado; no usa `file://` para la API. La primera compilación puede descargar los binarios de Electron y no requiere Java.

## 6. Android (APK)

Capacitor mantiene el proyecto nativo en `android/`:

```powershell
npm.cmd run android:sync
npm.cmd run android:open
npm.cmd run android:build
```

Para abrir Android Studio se necesita Android Studio, un SDK y JDK 17 o superior. `cap build android` deja el APK en `android/app/build/outputs/apk/`. Para un dispositivo físico, configura `VITE_API_BASE_URL` con una URL HTTPS del backend; `10.0.2.2` solo funciona en el emulador. El manifiesto Android solicita permiso de grabación de audio al usar el plugin nativo.

## 7. Configuración importante

Para publicar en un servidor propio o en Render sin servidor, sigue [DEPLOY.md](DEPLOY.md).

Copia `.env.example` a `.env`. Las claves de IA y transcripción se leen únicamente en el servidor. `CLIENT_ORIGINS` debe incluir el origen web desplegado. No edites `client/dist` manualmente: se regenera con `npm run build:web`.

Las opciones de correo y teléfono del onboarding son identificadores locales: esta versión no implementa OAuth de Google ni un proveedor SMS.
