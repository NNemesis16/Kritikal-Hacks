import { jsonError } from "@/lib/api";
import {
  getResearchJob,
  updateResearchJob,
} from "@/lib/repo";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/research/[jobId]/bookmark — save or unsave a research run.
 *
 * Send `{ saved: false }` to remove it from the saved list.
 */
export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;

    const job = await getResearchJob(jobId);
    if (!job) {
      return Response.json(
        { error: { code: "not_found", message: "That research job does not exist." } },
        { status: 404 },
      );
    }

    let saved = true;
    try {
      const body = (await request.json()) as { saved?: boolean };
      if (typeof body.saved === "boolean") saved = body.saved;
    } catch {
      // An empty body means "toggle" -> save.
    }

    await updateResearchJob(jobId, {isBookmarked: saved});

    return Response.json({ jobId, saved });
  } catch (error) {
    return jsonError(error);
  }
}
