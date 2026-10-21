import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Vite resolves tsconfig `paths` natively.
    tsconfigPaths: true,
    alias: {
      // `server-only` throws outside a React Server Component graph. The tests
      // import server modules directly, so we swap it for an empty stub.
      "server-only": path.join(rootDir, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      // Each test run gets its own SQLite file so a run never touches the
      // development database.
      DATABASE_URL: "file:./test.db",
      // Demo mode is forced so no test can ever make a live network call.
      DEMO_MODE: "true",
      // Placeholder keys so the provider modules can be exercised against
      // mocked SDKs. These are not real credentials.
      TINYFISH_API_KEY: "test-tinyfish-key",
      OPENAI_API_KEY: "test-openai-key",
      GEMINI_API_KEY: "test-gemini-key",
    },
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
    // Every test file shares one SQLite database, and SQLite only allows one
    // writer at a time. Run the files one after another so they do not
    // fight over the write lock.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
