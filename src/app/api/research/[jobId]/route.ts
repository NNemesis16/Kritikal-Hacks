import { jsonError } from "@/lib/api";
import { parseJson } from "@/lib/json";
import { sourceCheckSchema } from "@/lib/schema";
import {
  getResearchJob,
} from "@/lib/repo";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/research/[jobId] — the current state of a research run. */
export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;

    const job = await getResearchJob(jobId);

    if (!job) {
      return Response.json(
        { error: { code: "not_found", message: "That research job does not exist." } },
        { status: 404 },
      );
    }

    return Response.json({
      job: {
        ...job,
        sources: parseJson<string[]>(job.sources, []),
        sourcesChecked: parseJson(job.sourcesChecked, [], sourceCheckSchema.array()),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
