import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module: keep it out of the bundler and
  // require it at runtime on the server.
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // Server Actions receive form posts from our own origin only.
    serverActions: { bodySizeLimit: "1mb" },
  },
};

export default nextConfig;
