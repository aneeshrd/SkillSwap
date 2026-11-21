import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module: keep it out of the bundler and
  // require it at runtime on the server.
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // Codespaces proxies the preview through app.github.dev. Trust that
    // origin only in development; production remains same-origin only.
    serverActions: {
      bodySizeLimit: "1mb",
      ...(isDevelopment ? { allowedOrigins: ["*.app.github.dev"] } : {}),
    },
  },
};

export default nextConfig;
