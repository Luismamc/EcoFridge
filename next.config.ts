import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Para build móvil con Capacitor (export estático del frontend)
  // Las API routes se sirven desde el servidor remoto
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
