import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración de Capacitor para EcoFridge
 *
 * IMPORTANTE: La app Next.js DEBE estar desplegada en internet (Vercel, Railway, etc.)
 * para que las APIs (código de barras, inventario, recetas, etc.) funcionen.
 *
 * PASOS:
 * 1. Despliega la app Next.js en Vercel/Railway
 * 2. Copia la URL de tu despliegue (ej: https://ecofridge-tu-app.vercel.app)
 * 3. Pon esa URL en server.url abajo (descomenta la línea y sustitúyela)
 * 4. Ejecuta: npx cap sync android && npx cap open android
 * 5. Compila desde Android Studio
 */
const config: CapacitorConfig = {
  appId: 'com.ecofridge.app',
  appName: 'EcoFridge',
  webDir: 'public',

  server: {
    url: 'https://eco-fridge-rlu1.vercel.app',
    androidScheme: 'https',
    allowNavigation: ['*'],
  },

  plugins: {
    Camera: {
      // En Android, usar la cámara del sistema directamente
      presentationStyle: 'fullscreen',
    },
    SplashScreen: {
      launchAutoHide: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
      backgroundColor: '#16a34a',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      spinnerColor: '#ffffff',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#16a34a',
    },
  },
};

export default config;
