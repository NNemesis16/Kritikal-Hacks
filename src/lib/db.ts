import "server-only";

/**
 * The database connection.
 *
 * There is no ORM and no code generation. This module owns a single libSQL
 * client and exposes two tiny helpers: `query` for reading rows and
 * `execute` for writing them.
 *
 * Where the data lives:
 *   * `file:./prisma/dev.db`  → a normal SQLite file on your machine (local dev)
 *   * `libsql://host`         → Turso, a hosted SQLite-compatible database
 *                               (this is what you use on Vercel)
 *
 * Both are the same SQL dialect, so the app behaves identically in both
 * places. See `db/schema.sql` for the table definitions.
 */
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

let client: Client | undefined;

function getClient(): Client {
  if (client) return client;

  const url = resolveDatabaseUrl(process.env.DATABASE_URL, process.cwd());
  const authToken = getDatabaseAuthToken();

  client = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });

  return client;
}

/** A row returned by the database. Values are plain JS types. */
export type Row = Record<string, unknown>;

/**
 * SQLite allows only one writer at a time. When two requests write at the
 * same moment the second one gets `SQLITE_BUSY`. That is not a bug in the
 * query — it is SQLite's locking model — so we wait a moment and retry.
 *
 * On a hosted (Turso) database this is handled by the server, but the retry
 * also makes local development feel solid.
 */
function isBusyError(error: unknown): boolean {
  const code = (error as { code?: string; extendedCode?: number } | undefined)?.code;
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
  await withBusyRetry(() => getClient().execute(sql, params));
}

/**
 * Run several statements as one unit of work.
 *
 * libSQL over HTTP does not support multi-statement transactions, so the
 * statements are executed in order. Every statement in this project is
 * idempotent, which makes that safe.
 */
export async function executeBatch(statements: Array<{ sql: string; params?: InValue[] }>) {
  for (const statement of statements) {
    await execute(statement.sql, statement.params ?? []);
  }
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
}
