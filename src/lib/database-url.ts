/**
 * Resolve the database URL.
 *
 * A relative `file:` URL is resolved against the `prisma/` folder, so
 * `file:./dev.db` always means `<project>/prisma/dev.db` no matter what the
 * current working directory is. The CLI scripts and the running app use the
 * same helper, so they always open the same file.
 */
import path from "node:path";

/** The default for local development: a SQLite file inside `prisma/`. */
export const DEFAULT_DATABASE_URL = "file:./dev.db";

export function resolveDatabaseUrl(raw: string | undefined, rootDir: string): string {
  const value = (raw ?? DEFAULT_DATABASE_URL).trim();
  if (!value.startsWith("file:")) return value;

  const filePath = value.slice("file:".length);
  if (!filePath || filePath === ":memory:" || filePath.startsWith(":memory:")) {
    return "file::memory:";
  }
  if (path.isAbsolute(filePath)) return value;

  const absolute = path.join(rootDir, "prisma", filePath).replace(/\\/g, "/");
  return `file:${absolute}`;
}
