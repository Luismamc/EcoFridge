import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración de Capacitor para EcoFridge
 * 
 * ARQUITECTURA: La app web se despliega en un servidor (Vercel, Railway, etc.)
 * y Capacitor crea la envoltura nativa que la carga en un WebView nativo.
 * 
 * PASOS:
 * 1. Despliega la app Next.js en Vercel/Railway
 * 2. Cambia la URL de server.url a la URL de tu despliegue
 * 3. Ejecuta: npx cap sync android / npx cap sync ios
 * 4. Abre en Android Studio / Xcode y compila
 */
const config: CapacitorConfig = {
  appId: 'com.ecofridge.app',
  appName: 'EcoFridge',
  webDir: 'public', // Se usa como fallback, server.url es la fuente principal
  
  // ⚠️ CAMBIA esta URL por la de tu despliegue (Vercel, Railway, etc.)
  server: {
    // Descomenta y pon tu URL cuando desplies:
    // url: 'https://ecofridge-tu-app.vercel.app',
    androidScheme: 'https',
    allowNavigation: ['*'],
  },
  
  plugins: {
    SplashScreen: {
      launchAutoHide: false, // Lo ocultamos manualmente cuando la web cargue
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
    Camera: {
      presentationStyle: 'fullscreen',
    },
    Network: {
      // Mostrar alerta si no hay conexión
    },
  },
};

export default config;
