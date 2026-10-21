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
 *   libsql://…       → a hosted libSQL/Turso database (the recommended setup)
 *
 * WHY THERE IS A FALLBACK
 * -----------------------
 * On Vercel the file system is read-only, and each serverless bundle gets its
 * own memory. So without a hosted database the app would either crash or lose
 * everything between two requests. This module handles that in two steps:
 *
 *   1. If the configured database cannot be written to, it falls back to a
 *      local SQLite file in the temporary directory.
 *   2. If a Vercel Blob store is attached (`BLOB_STORE_ID`), that file is
 *      mirrored to Blob, so every serverless instance reads and writes the
 *      SAME data. The interface says so, and `/api/health` reports it.
 *
 * The fallback is never silent, and it disappears the moment a real database
 * is attached.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
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
/* Blob mirror (the fallback storage on Vercel)                               */
/* -------------------------------------------------------------------------- */

const BLOB_PATHNAME = "projectscope-state.db";

interface BlobMirror {
  get(): Promise<Uint8Array | null>;
  put(bytes: Uint8Array): Promise<void>;
}

/**
 * A Vercel Blob store used to mirror the database.
 *
 * Returns null when no store is attached, which is the case in local
 * development.
 */
async function createBlobMirror(): Promise<BlobMirror | null> {
  const storeId = process.env.BLOB_STORE_ID?.trim();
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  const readWriteToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();

  if (!storeId && !readWriteToken) return null;

  try {
    const { put, get } = await import("@vercel/blob");

    const options = storeId && oidcToken ? { storeId, oidcToken } : readWriteToken ? { token: readWriteToken } : null;
    if (!options) return null;

    return {
      async get() {
        const result = await get(BLOB_PATHNAME, {
          ...options,
          access: "private",
          // A missing blob is not an error — it just means a fresh database.
        }).catch(() => null);
        if (!result) return null;
        if (result instanceof Uint8Array) return result;
        if (result && typeof result === "object" && "arrayBuffer" in result) {
          const buffer = await (result as { arrayBuffer(): Promise<ArrayBuffer> }).arrayBuffer();
          return new Uint8Array(buffer);
        }
        return null;
      },
      async put(bytes) {
        await put(BLOB_PATHNAME, Buffer.from(bytes), {
          ...options,
          access: "private",
          contentType: "application/octet-stream",
          addRandomSuffix: false,
          allowOverwrite: true,
        });
      },
    };
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Connection                                                                 */
/* -------------------------------------------------------------------------- */

let client: Client | undefined;
let ready: Promise<void> | undefined;
let ephemeral = false;
let blobMirror: BlobMirror | null = null;
let localFilePath: string | null = null;
let dirty = false;
let flushing: Promise<void> | null = null;

/** True when the app is running on the fallback database. */
export function isEphemeralDatabase(): boolean {
  return ephemeral;
}

/** True when the fallback is mirrored to a Vercel Blob store. */
export function hasBlobMirror(): boolean {
  return blobMirror !== null;
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

/** Upload the local database file to Blob so other instances can see it. */
async function flushToBlob(): Promise<void> {
  if (!blobMirror || !localFilePath) return;
  if (!dirty) return;

  dirty = false;
  try {
    const bytes = readFileSync(localFilePath);
    await blobMirror.put(new Uint8Array(bytes));
  } catch {
    // A failed mirror is not fatal — the data is still in this instance.
  }
}

/** Mark the database as changed and schedule a mirror upload. */
function scheduleFlush(): void {
  if (!blobMirror) return;
  dirty = true;
  if (flushing) return;
  // Coalesce bursts of writes into one upload.
  flushing = new Promise<void>((resolve) => {
    setTimeout(() => {
      flushing = null;
      void flushToBlob().finally(resolve);
    }, 250);
  });
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

  // The configured database cannot be written to. Fall back to a local file in
  // the temporary directory, mirrored to Blob when a store is attached.
  primary.close();

  blobMirror = await createBlobMirror();

  const directory = path.join(os.tmpdir(), "projectscope");
  mkdirSync(directory, { recursive: true });
  localFilePath = path.join(directory, "state.db");

  if (blobMirror) {
    const existing = await blobMirror.get();
    if (existing) {
      try {
        writeFileSync(localFilePath, existing);
      } catch {
        // Fall through and start fresh.
      }
    }
  }

  const fallback = createClient({ url: `file:${localFilePath}` });
  const schema = splitStatements(readSchema());
  for (const statement of schema) {
    await fallback.execute(statement);
  }

  // If the file was empty (or restored empty), fill it with the demo data.
  const row = await fallback.execute("SELECT COUNT(*) AS total FROM research_jobs");
  const total = Number((row.rows[0] as { total?: number })?.total ?? 0);
  if (total === 0) {
    const { seedDatabase } = await import("@/lib/research/seed");
    await seedDatabase(fallback);
    scheduleFlush();
  }

  client = fallback;
  ephemeral = true;
}

function getClient(): Client {
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
  scheduleFlush();
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
