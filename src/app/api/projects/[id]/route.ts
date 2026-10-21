import { jsonError } from "@/lib/api";
import { parseJson } from "@/lib/json";
import {
  getProjectWithRelations,
  listSourceReferences,
} from "@/lib/repo";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/projects/[id] — one project with its full source attribution. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const relation = await getProjectWithRelations(id);

    if (!relation) {
      return Response.json(
        { error: { code: "not_found", message: "That project does not exist." } },
        { status: 404 },
      );
    }

    const project = relation.project;
    const sources = await listSourceReferences(
      relation.results.map((result) => result.jobId),
    );

    return Response.json({
      project: {
        id: project.id,
        title: project.title,
        platform: project.platform,
        summary: project.summary,
        problemAddressed: project.problemAddressed,
        proposedSolution: project.proposedSolution,
        targetUsers: project.targetUsers,
        technologies: parseJson<string[]>(project.technologies, []),
        businessModel: project.businessModel,
        distribution: project.distribution,
        award: project.award,
        awardVerified: project.awardVerified,
        ranking: project.ranking,
        domain: project.domain,
        clusterId: project.clusterId,
        uncertaintyNotes: parseJson<string[]>(project.uncertaintyNotes, []),
        discoveryMetadata: parseJson(project.discoveryMetadata, []),
        sourceUrl: project.sourceUrl,
        sourceId: project.sourceId,
        attribution: project.attribution,
        retrievedAt: project.retrievedAt,
        isSaved: relation.savedBy.length > 0,
        savedNote: relation.savedBy[0]?.note ?? null,
        relevance: relation.results[0]?.relevance ?? 0,
        jobs: relation.results.map((result) => ({
          id: result.job?.id ?? result.jobId,
          topic: result.job?.topic ?? "",
          createdAt: result.job?.createdAt ?? result.createdAt,
        })),
        sources: sources.map((source) => ({
          id: source.id,
          sourceId: source.sourceId,
          sourceName: source.sourceName,
          url: source.url,
          title: source.title,
          attribution: source.attribution,
          accessMode: source.accessMode,
          snippet: source.snippet,
          retrievedAt: source.retrievedAt,
        })),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
