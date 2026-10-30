import type { NextConfig } from "next";
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

// Exposes D1 / Workers AI bindings from wrangler.toml to `next dev`.
if (process.env.NODE_ENV === "development") {
  setupDevPlatform().catch(console.error);
}

const nextConfig: NextConfig = {};

export default nextConfig;
