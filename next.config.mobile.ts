import type { NextConfig } from "next";

/**
 * Configuración de Next.js específica para build de Capacitor.
 * 
 * IMPORTANTE: Esta configuración exporta estáticamente las páginas.
 * Las API routes NO se incluirán en este build.
 * El servidor backend debe estar desplegado en un hosting separado
 * (Vercel, Railway, Render, etc.) y la URL configurada en capacitor.config.ts
 * 
 * USO: npx next build --config next.config.mobile.ts
 */
const nextConfig: NextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  // Las API routes se marcan como no exportables (se sirven desde el servidor remoto)
  // No se necesita hacer nada especial aquí, Next.js simplemente las ignora en export mode
};

export default nextConfig;
