import "server-only";

/**
 * Run work in the background, after the response has been sent.
 *
 * WHY THIS EXISTS
 * ---------------
 * On Vercel (and any serverless platform) a function is frozen or shut down
 * as soon as it returns its response. A plain `void somePromise()` therefore
 * gets killed mid-way and the research run would never finish.
 *
 * Next.js exposes `after()`, which is the supported way to schedule work that
 * must outlive the response: the platform keeps the invocation alive until
 * the callback settles, and still runs it if the response was an error.
 *
 * During local `next dev` this behaves exactly like the old fire-and-forget
 * call, so nothing changes for you on your own machine.
 */
import { after } from "next/server";

export function runInBackground(label: string, task: () => Promise<void>): void {
  const run = async () => {
    try {
      await task();
    } catch (error) {
      // The pipeline records its own failures; this is the last-resort log so
      // a crash is visible in the Vercel function logs.
      console.error(`[projectscope] background task "${label}" failed:`, error);
    }
  };

  try {
    after(run);
  } catch {
    // `after()` needs a request scope. Outside one (a unit test, a script, or
    // a direct function call) we fall back to a detached run so the work is
    // still started.
    void run();
  }
}
