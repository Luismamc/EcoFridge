import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  // External packages that should not be bundled by webpack
  // Required for Turso/LibSQL native TCP connection on Vercel
  serverExternalPackages: ['@libsql/client'],
};

export default nextConfig;
