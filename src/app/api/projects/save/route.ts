import { jsonError, parseJsonBody } from "@/lib/api";
import { saveProjectSchema } from "@/lib/schema";
import {
  getProjectWithRelations,
  upsertSavedProject,
  deleteSavedProject,
} from "@/lib/repo";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/projects/save — bookmark or un-bookmark a project.
 *
 * Send `{ projectId, note }` to save, or `{ projectId, note, unsave: true }`
 * to remove it again.
 */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, saveProjectSchema);
    const unsave =
      body.saved === false || request.headers.get("x-unsave") === "true";

    const project = await getProjectWithRelations(body.projectId);
    if (!project) {
      return Response.json(
        { error: { code: "not_found", message: "That project does not exist." } },
        { status: 404 },
      );
    }

    if (unsave) {
      await deleteSavedProject(body.projectId);
      return Response.json({ saved: false, projectId: body.projectId });
    }

    await upsertSavedProject(body.projectId, body.note || null);

    return Response.json({ saved: true, projectId: body.projectId });
  } catch (error) {
    return jsonError(error);
  }
}
