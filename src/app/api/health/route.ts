import { getProviderStatus, isDemoMode } from "@/lib/env";
import { isEphemeralDatabase, isRemoteDatabase, queryOne } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — what is configured, and what actually works.
 *
 * This never returns a key value, only whether one is present. It is the
 * first thing to check when something is not working on a fresh deployment.
 */
export async function GET() {
  // Try the database. A failure here is the most common deployment problem,
  // so report it clearly instead of letting every page fail.
  let database: {
    ok: boolean;
    error: string | null;
    remote: boolean;
    ephemeral: boolean;
  };
  try {
    await queryOne("SELECT 1 AS ok");
    database = {
      ok: true,
      error: null,
      remote: isRemoteDatabase(),
      ephemeral: isEphemeralDatabase(),
    };
  } catch (error) {
    database = {
      ok: false,
      error: error instanceof Error ? error.message : "The database is not reachable.",
      remote: isRemoteDatabase(),
      ephemeral: false,
    };
  }

  return Response.json({
    ok: database.ok,
    demoMode: isDemoMode(),
    database: {
      ...database,
      // The URL is not a secret, but it can contain a database name, so only
      // the shape is reported.
      explicitlyConfigured: Boolean(process.env.DATABASE_URL),
      kind: isRemoteDatabase() ? "hosted (libSQL/Turso)" : "local SQLite file",
      message: database.ephemeral
        ? "The configured database cannot be written to, so the app is running on an in-memory copy. Nothing is saved. Add DATABASE_URL and DATABASE_AUTH_TOKEN to make it persistent."
        : undefined,
    },
    providers: getProviderStatus(),
    checkedAt: new Date().toISOString(),
  });
}
