/**
 * Create the database tables.
 *
 * This replaces `prisma migrate deploy`. It reads `db/schema.sql` and runs
 * every statement, so it is safe to run again — the schema uses
 * `CREATE TABLE IF NOT EXISTS` throughout.
 *
 *   npm run db:migrate           # fails loudly if something is wrong
 *   npm run db:migrate:soft      # warns and continues (used by the build)
 *
 * It works against BOTH a local SQLite file and a hosted Turso database,
 * because both speak the same SQL.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@libsql/client";

import { resolveDatabaseUrl } from "../src/lib/database-url";

/** `--soft` turns a failure into a warning (used during a deploy build). */
const soft = process.argv.includes("--soft");

const rootDir = process.cwd();
const raw = (process.env.DATABASE_URL ?? "file:./dev.db").trim();

const url = resolveDatabaseUrl(raw, rootDir);
const authToken = process.env.DATABASE_AUTH_TOKEN?.trim() || undefined;

const client = createClient({ url, ...(authToken ? { authToken } : {}) });

/** Split the schema file into individual statements. */
function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((statement) =>
      statement
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter((statement) => statement.length > 0);
}

async function main() {
  const schemaPath = path.join(rootDir, "db", "schema.sql");
  const sql = readFileSync(schemaPath, "utf8");
  const statements = splitStatements(sql);

  console.log(`Applying ${statements.length} statement(s) from db/schema.sql`);
  console.log(`  target: ${url.startsWith("file:") ? url : "hosted database"}`);

  for (const statement of statements) {
    await client.execute(statement);
  }

  console.log("Done. The database is up to date.");
}

main()
  .catch((error) => {
    if (soft) {
      // The build must not be blocked by a database that is briefly
      // unreachable, but the problem has to be impossible to miss.
      console.warn("");
      console.warn("=========================================================");
      console.warn("  THE DATABASE MIGRATION DID NOT COMPLETE");
      console.warn("=========================================================");
      console.warn("  The app will build, but it will not be able to read or");
      console.warn("  write data until the migration succeeds.");
      console.warn("  Check DATABASE_URL and DATABASE_AUTH_TOKEN in Vercel.");
      console.warn(`  Original error: ${error instanceof Error ? error.message : String(error)}`);
      console.warn("");
    } else {
      console.error("The migration failed:", error);
      process.exitCode = 1;
    }
  })
  .finally(() => {
    client.close();
  });
