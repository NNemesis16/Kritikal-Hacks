import { jsonError } from "@/lib/api";
import { queryProjects } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/projects — the project explorer.
 *
 * Filters are only offered for metadata we actually collect. A filter value
 * that does not exist in the data is simply not shown in the UI, and an
 * unknown filter value returns an empty set rather than a fabricated one.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const awardParam = url.searchParams.get("award")?.trim();

    const result = await queryProjects({
      q: url.searchParams.get("q")?.trim() ?? "",
      platform: url.searchParams.get("platform")?.trim() ?? "",
      technology: url.searchParams.get("technology")?.trim() ?? "",
      domain: url.searchParams.get("domain")?.trim() ?? "",
      award:
        awardParam === "verified" || awardParam === "unverified" || awardParam === "none"
          ? awardParam
          : undefined,
      jobId: url.searchParams.get("jobId")?.trim() ?? "",
      minRelevance: Number(url.searchParams.get("minRelevance") ?? "0") || undefined,
      page: Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1),
      pageSize: Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "24") || 24)),
    });

    return Response.json({
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      pages: result.pages,
      projects: result.projects,
      facets: result.facets,
    });
  } catch (error) {
    return jsonError(error);
  }
}
