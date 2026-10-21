"use client";

/**
 * The global error boundary.
 *
 * If something goes wrong — most often because the database is not
 * configured or not reachable — the user gets a readable explanation and a
 * way forward, instead of a blank page or a stack trace.
 */
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log it so it shows up in the Vercel function logs.
    console.error("[projectscope] render error:", error);
  }, [error]);

  const message = error.message || "An unexpected error occurred.";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center">
      <div className="grid h-14 w-14 place-items-center border-[3px] border-ink bg-punch text-2xl font-black text-ink">
        !
      </div>

      <h1 className="brutal-display mt-6 text-3xl">Something went wrong</h1>

      <p className="mt-4 max-w-xl text-ink/70">{message}</p>

      <div className="mt-6 w-full max-w-xl border-[3px] border-ink bg-acid p-4 text-left">
        <p className="brutal-label">Most likely cause</p>
        <p className="mt-2 text-sm">
          The database is not reachable. On Vercel that means <code>DATABASE_URL</code> and
          <code> DATABASE_AUTH_TOKEN</code> are missing or wrong, or the schema has not been
          applied.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>
            Check <strong>Settings → Environment Variables</strong> in Vercel.
          </li>
          <li>
            Make sure <code>DATABASE_URL</code> starts with <code>libsql://</code>.
          </li>
          <li>
            Redeploy — the build applies <code>db/schema.sql</code> for you.
          </li>
          <li>
            <code>curl https://your-app.vercel.app/api/health</code> tells you what is configured.
          </li>
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/"
          className="brutal-btn bg-paper-2 text-ink"
        >
          Back to the start
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-6 text-xs text-ink/50">Reference: {error.digest}</p>
      ) : null}
    </div>
  );
}
