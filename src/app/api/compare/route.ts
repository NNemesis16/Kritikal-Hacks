import { jsonError, parseJsonBody } from "@/lib/api";

import { runComparison } from "@/lib/research/analysis";
import { compareRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * How long this function may run. Vercel clamps this to your plan's limit
 * (60s on Hobby, 300s on Pro). A research run calls three external APIs, so
 * it needs more than the default.
 */
export const maxDuration = 300;

/** POST /api/compare — compare the approaches behind a set of projects. */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, compareRequestSchema);
    const comparison = await runComparison(body.jobId, body.projectIds);
    return Response.json({ comparison });
  } catch (error) {
    return jsonError(error);
  }
}
