import type { NextConfig } from "next";

const config: NextConfig = {
  // The worker imports ffmpeg and Chromium; keep them out of the web bundle.
  serverExternalPackages: ["pg-boss", "postgres", "playwright-core"],
  typedRoutes: true,
};

export default config;
