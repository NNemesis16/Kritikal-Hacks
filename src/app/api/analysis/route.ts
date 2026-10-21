import { jsonError, parseJsonBody, parseQuery } from "@/lib/api";
import { z } from "zod";

import { readAnalysis, runAnalysis } from "@/lib/research/analysis";
import { analysisRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * How long this function may run. Vercel clamps this to your plan's limit
 * (60s on Hobby, 300s on Pro). A research run calls three external APIs, so
 * it needs more than the default.
 */
export const maxDuration = 300;

const querySchema = z.object({ jobId: z.string().min(1) });

/** POST /api/analysis — generate (or refresh) the market-gap report. */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, analysisRequestSchema);
    const report = await runAnalysis(body.jobId, body.focus);
    return Response.json({ report });
  } catch (error) {
    return jsonError(error);
  }
}

/** GET /api/analysis?jobId=… — read the stored market-gap report. */
export async function GET(request: Request) {
  try {
    const { jobId } = parseQuery(request.url, querySchema);
    const report = await readAnalysis(jobId);
    if (!report) {
      return Response.json(
        { error: { code: "not_found", message: "No report has been generated for that job yet." } },
        { status: 404 },
      );
    }
    return Response.json({ report });
  } catch (error) {
    return jsonError(error);
  }
}
