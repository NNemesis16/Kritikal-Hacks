import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `cacheComponents` stays off so every page and route handler renders at
  // request time. This keeps the research dashboard (which reads live
  // provider data) simple to reason about.
  cacheComponents: false,

  // The database driver must stay outside the bundler so its native parts are
  // not rewritten. In production the app talks to a hosted database over
  // HTTPS, so no native code is needed at runtime.
  serverExternalPackages: ["@libsql/client", "libsql"],

  // The schema file is read at runtime when the app falls back to an
  // in-memory database, so it has to travel with the deployment.
  outputFileTracingIncludes: {
    "/api/**/*": ["./db/schema.sql"],
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
