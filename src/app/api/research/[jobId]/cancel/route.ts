import { jsonError } from "@/lib/api";
import { emitEvent } from "@/lib/research/events";
import {
  getResearchJob,
  updateResearchJob,
} from "@/lib/repo";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/research/[jobId]/cancel — stop a running research job. */
export async function POST(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;

    const job = await getResearchJob(jobId);

    if (!job) {
      return Response.json(
        { error: { code: "not_found", message: "That research job does not exist." } },
        { status: 404 },
      );
    }

    if (["completed", "failed", "cancelled"].includes(job.status)) {
      return Response.json({ job: { id: jobId, status: job.status } });
    }

    await updateResearchJob(jobId, {status: "cancelled", stage: "cancelled"});

    await emitEvent(jobId, {
      type: "job.cancelled",
      stage: "cancelled",
      level: "warning",
      message: "Research cancelled by the user.",
    });

    return Response.json({ job: { id: jobId, status: "cancelled" } });
  } catch (error) {
    return jsonError(error);
  }
}
