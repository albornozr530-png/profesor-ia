import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.profesor.ia',
  appName: 'Profesor IA',
  webDir: 'client/dist',
  android: {
    // Necesario para el backend HTTP local del emulador; desactivalo en
    // distribuciones que usen exclusivamente HTTPS.
    allowMixedContent: process.env.PROFESOR_IA_ALLOW_CLEARTEXT !== 'false',
  },
  server: {
    // El origen https://localhost es un contexto seguro para getUserMedia.
    androidScheme: 'https',
    // Se puede sustituir por una URL HTTPS en una distribución real.
    // Se permite HTTP solo para el servidor local del emulador. En una
    // distribución real usa HTTPS y ejecuta con PROFESOR_IA_ALLOW_CLEARTEXT=false.
    cleartext: process.env.PROFESOR_IA_ALLOW_CLEARTEXT !== 'false',
  },
  plugins: {
    SpeechRecognition: {
      language: 'es-ES',
    },
  },
};

export default config;
