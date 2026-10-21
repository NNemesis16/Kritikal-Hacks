/**
 * Load the demo dataset into the configured database.
 *
 *   npm run db:seed
 *
 * The data itself lives in `src/lib/research/seed.ts`, which is also used by
 * the in-memory fallback in `src/lib/db.ts`.
 */
import { createClient } from "@libsql/client";

import { resolveDatabaseUrl } from "../src/lib/database-url";
import { seedDatabase } from "../src/lib/research/seed";

const rootDir = process.cwd();
const raw = (process.env.DATABASE_URL ?? "file:./dev.db").trim();
const url = resolveDatabaseUrl(raw, rootDir);
const authToken = process.env.DATABASE_AUTH_TOKEN?.trim() || undefined;

const client = createClient({ url, ...(authToken ? { authToken } : {}) });

async function main() {
  console.log("Seeding ProjectScope with the demo dataset…");
  console.log(`  target: ${url.startsWith("file:") ? url : "hosted database"}`);

  await seedDatabase(client);

  console.log("Done.");
  console.log("");
  console.log("Two demo runs were created:");
  console.log("  1. a topic-driven research run (12 projects, gaps, experiments, a pitch)");
  console.log("  2. a free-choice discovery run (5 ranked concepts, a full proposal)");
  console.log("");
  console.log("Open http://localhost:3000 to see it. Every record is labelled as demo data.");
}

main()
  .catch((error) => {
    console.error("The seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    client.close();
  });
