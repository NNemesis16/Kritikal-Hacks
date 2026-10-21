import "server-only";

/**
 * The database connection.
 *
 * There is no ORM and no code generation. This module owns one libSQL client
 * and exposes two tiny helpers: `query` for reading rows and `execute` for
 * writing them.
 *
 * WHERE THE DATA LIVES
 * --------------------
 *   file:./dev.db   → a SQLite file in `prisma/` (local development)
 *   libsql://…       → a hosted libSQL/Turso database (production on Vercel)
 *
 * WHY THERE IS A FALLBACK
 * -----------------------
 * On Vercel the file system is read-only. If the configured database cannot
 * be written to, the app would be broken with a confusing error. Instead it
 * falls back to an **in-memory SQLite database** loaded with the bundled demo
 * dataset. That fallback is NOT silent: `/api/health` reports it, and the
 * interface shows a banner saying that changes are not saved. As soon as a
 * real database is attached, it is used and the fallback never happens.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { createClient, type Client, type InValue } from "@libsql/client";

import { DEFAULT_DATABASE_URL, resolveDatabaseUrl } from "@/lib/database-url";

export { DEFAULT_DATABASE_URL, resolveDatabaseUrl };

/** The raw connection string, before it is resolved. */
export function getDatabaseUrl(): string {
  return (process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL).trim();
}

/** The auth token for a hosted (Turso) database. Not needed for local files. */
export function getDatabaseAuthToken(): string | undefined {
  const token = process.env.DATABASE_AUTH_TOKEN?.trim();
  return token && token.length > 0 ? token : undefined;
}

/** True when we are pointed at a remote (hosted) database. */
export function isRemoteDatabase(): boolean {
  const url = getDatabaseUrl();
  return url.startsWith("libsql://") || url.startsWith("http://") || url.startsWith("https://");
}

/* -------------------------------------------------------------------------- */
/* Connection                                                                 */
/* -------------------------------------------------------------------------- */

let client: Client | undefined;
let ephemeral = false;
let ready: Promise<void> | undefined;

/** True when the app is running on an in-memory database (nothing is saved). */
export function isEphemeralDatabase(): boolean {
  return ephemeral;
}

/** Read the schema file. It is bundled with the app by next.config.ts. */
function readSchema(): string {
  const candidates = [
    path.join(process.cwd(), "db", "schema.sql"),
    path.join(process.cwd(), "..", "db", "schema.sql"),
  ];
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, "utf8");
    } catch {
      // Try the next location.
    }
  }
  throw new Error(
    "db/schema.sql could not be found. The database schema must be included with the deployment.",
  );
}

/** Split a schema file into individual statements. */
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

/** Can this connection actually be written to? */
async function isWritable(target: Client): Promise<boolean> {
  try {
    await target.execute(
      "CREATE TABLE IF NOT EXISTS __write_probe (id INTEGER PRIMARY KEY, created_at TEXT)",
    );
    await target.execute("DROP TABLE __write_probe");
    return true;
  } catch {
    return false;
  }
}

async function connect(): Promise<void> {
  const url = resolveDatabaseUrl(getDatabaseUrl(), process.cwd());
  const authToken = getDatabaseAuthToken();

  const primary = createClient({ url, ...(authToken ? { authToken } : {}) });

  if (await isWritable(primary)) {
    client = primary;
    ephemeral = false;
    return;
  }

  // The database exists but cannot be written to (a read-only deployment, a
  // file inside a read-only bundle, a file that is not there yet). Fall back
  // to an in-memory database so the app still works, and say so out loud.
  primary.close();

  const memory = createClient({ url: "file::memory:" });
  const schema = splitStatements(readSchema());
  for (const statement of schema) {
    await memory.execute(statement);
  }

  const { seedDatabase } = await import("@/lib/research/seed");
  await seedDatabase(memory);

  client = memory;
  ephemeral = true;
}

function getClient(): Client {
  if (!ready) {
    ready = connect().catch((error) => {
      // Let the next call try again, but keep the reason for the health check.
      ready = undefined;
      throw error;
    });
  }
  // The client is assigned by `connect()`; if it is not ready yet the caller
  // waits for the same promise.
  if (!client) {
    throw new Error("The database connection is still starting. Please retry in a moment.");
  }
  return client;
}

/** Wait until the connection is ready (or failed). */
export async function waitForDatabase(): Promise<void> {
  if (!ready) {
    ready = connect().catch((error) => {
      ready = undefined;
      throw error;
    });
  }
  await ready;
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

/** A row returned by the database. Values are plain JS types. */
export type Row = Record<string, unknown>;

/**
 * SQLite allows only one writer at a time. When two requests write at the
 * same moment the second one gets `SQLITE_BUSY`. That is not a bug in the
 * query — it is SQLite's locking model — so we wait a moment and retry.
 */
function isBusyError(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code;
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === "SQLITE_BUSY" ||
    code === "SQLITE_LOCKED" ||
    /SQLITE_BUSY|database is locked/i.test(message)
  );
}

async function withBusyRetry<T>(operation: () => Promise<T>, attempts = 6): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isBusyError(error) || attempt === attempts - 1) throw error;
      // 25ms, 100ms, 225ms, 400ms, 625ms, 900ms
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1) * (attempt + 1)));
    }
  }
  throw lastError;
}

/** Run a SELECT and return the rows. */
export async function query<T = Row>(sql: string, params: InValue[] = []): Promise<T[]> {
  await waitForDatabase();
  const result = await withBusyRetry(() => getClient().execute(sql, params));
  return result.rows as unknown as T[];
}

/** Run a SELECT and return the first row, or null. */
export async function queryOne<T = Row>(sql: string, params: InValue[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/** Run an INSERT / UPDATE / DELETE. */
export async function execute(sql: string, params: InValue[] = []): Promise<void> {
  await waitForDatabase();
  await withBusyRetry(() => getClient().execute(sql, params));
}

/** A fresh id for a row. */
export function newId(): string {
  return crypto.randomUUID();
}

/** The current time as an ISO-8601 string (what the schema stores). */
export function now(): string {
  return new Date().toISOString();
}

/** Close the connection. Only used by scripts and tests. */
export async function closeDatabase(): Promise<void> {
  if (client) {
    client.close();
    client = undefined;
  }
  ready = undefined;
}
