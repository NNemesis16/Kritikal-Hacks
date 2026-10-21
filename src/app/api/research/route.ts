import { jsonError, parseJsonBody } from "@/lib/api";
import { getEnv, getProviderStatus, isDemoMode } from "@/lib/env";
import { stringifyJson } from "@/lib/json";
import { researchRequestSchema } from "@/lib/schema";
import { runResearch } from "@/lib/research/pipeline";
import {
  createResearchJob,
  listResearchJobs,
} from "@/lib/repo";
import { runInBackground } from "@/lib/background";



export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * How long this function may run. Vercel clamps this to your plan's limit
 * (60s on Hobby, 300s on Pro). A research run calls three external APIs, so
 * it needs more than the default.
 */
export const maxDuration = 300;

/**
 * POST /api/research — start a research run.
 *
 * The job is created synchronously (so the client always gets an id) and the
 * pipeline runs in the background. Progress is streamed from
 * GET /api/research/[jobId]/events.
 */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, researchRequestSchema);
    const env = getEnv();

    const limit = Math.min(body.resultLimit, env.MAX_RESULTS_LIMIT);

    const job = await createResearchJob({topic: body.topic, problemStatement: body.problemStatement || null, domain: body.domain || null, targetUsers: body.targetUsers || null, geography: body.geography || null, resultLimit: limit, sources: stringifyJson(body.sources), status: "queued", stage: "queued", isDemo: isDemoMode()});

    // Fire and forget. The pipeline records its own progress and failures.
    runInBackground("research", () =>
      runResearch({
        jobId: job.id,
        topic: job.topic,
        problemStatement: job.problemStatement ?? "",
        domain: job.domain ?? "",
        targetUsers: job.targetUsers ?? "",
        geography: job.geography ?? "",
        sources: body.sources,
        resultLimit: limit,
        language: body.language,
        location: body.location,
        isDemo: isDemoMode(),
      }),
    );

    return Response.json(
      {
        job: {
          id: job.id,
          topic: job.topic,
          status: job.status,
          stage: job.stage,
          isDemo: job.isDemo,
          createdAt: job.createdAt,
        },
        demoMode: isDemoMode(),
      },
      { status: 202 },
    );
  } catch (error) {
    return jsonError(error);
  }
}

/** GET /api/research - list the research runs (used by Saved research). */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const bookmarkedOnly = url.searchParams.get("bookmarked") === "true";

    const jobs = await listResearchJobs({ limit: 50, bookmarkedOnly });

    return Response.json({
      jobs,
      demoMode: isDemoMode(),
      providers: getProviderStatus(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
