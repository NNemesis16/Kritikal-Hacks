import "server-only";

/**
 * The project explorer query.
 *
 * Filters only exist for metadata we actually collect. A facet with no values
 * in the database is simply not offered in the UI — it is never invented.
 */
import { query } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { listAllProjects } from "@/lib/repo";

export interface ProjectFilters {
  q?: string;
  platform?: string;
  technology?: string;
  domain?: string;
  award?: "verified" | "unverified" | "none";
  jobId?: string;
  minRelevance?: number;
  page?: number;
  pageSize?: number;
}

export interface ProjectRow {
  id: string;
  title: string;
  platform: string;
  summary: string;
  problemAddressed: string | null;
  proposedSolution: string | null;
  targetUsers: string | null;
  technologies: string[];
  businessModel: string | null;
  distribution: string | null;
  award: string | null;
  awardVerified: boolean;
  ranking: string | null;
  domain: string | null;
  clusterId: string | null;
  uncertaintyNotes: string[];
  sourceUrl: string;
  attribution: string;
  retrievedAt: string;
  relevance: number;
  jobId: string;
  isSaved: boolean;
  /** True when the record came from the bundled demo dataset. */
  isDemo: boolean;
}

export interface ProjectFacets {
  platforms: Array<{ value: string; count: number }>;
  technologies: Array<{ value: string; count: number }>;
  domains: Array<{ value: string; count: number }>;
  awards: { verified: number; unverified: number };
}

const PROJECT_COLUMNS = `
  p.id, p.title, p.platform, p.summary, p.problem_addressed, p.proposed_solution,
  p.target_users, p.technologies, p.business_model, p.distribution, p.award,
  p.award_verified, p.ranking, p.domain, p.cluster_id, p.uncertainty_notes,
  p.source_url, p.attribution, p.retrieved_at`;

function toProjectRow(row: Record<string, unknown>): ProjectRow {
  return {
    id: row.id as string,
    title: row.title as string,
    platform: row.platform as string,
    summary: row.summary as string,
    problemAddressed: (row.problem_addressed as string | null) ?? null,
    proposedSolution: (row.proposed_solution as string | null) ?? null,
    targetUsers: (row.target_users as string | null) ?? null,
    technologies: parseJson<string[]>(row.technologies as string, []),
    businessModel: (row.business_model as string | null) ?? null,
    distribution: (row.distribution as string | null) ?? null,
    award: (row.award as string | null) ?? null,
    awardVerified: row.award_verified === 1 || row.award_verified === true,
    ranking: (row.ranking as string | null) ?? null,
    domain: (row.domain as string | null) ?? null,
    clusterId: (row.cluster_id as string | null) ?? null,
    uncertaintyNotes: parseJson<string[]>(row.uncertainty_notes as string, []),
    sourceUrl: row.source_url as string,
    attribution: row.attribution as string,
    retrievedAt: row.retrieved_at as string,
    relevance: Number(row.relevance ?? 0),
    jobId: row.job_id as string,
    isSaved: Number(row.saved_total ?? 0) > 0,
    isDemo: Number(row.result_is_demo ?? 0) === 1,
  };
}

export async function queryProjects(filters: ProjectFilters): Promise<{
  projects: ProjectRow[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  facets: ProjectFacets;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, filters.pageSize ?? 24));

  const where: string[] = [];
  const params: Array<string | number> = [];

  if (filters.jobId) {
    where.push("r.job_id = ?");
    params.push(filters.jobId);
  }
  if (filters.platform) {
    where.push("p.platform = ?");
    params.push(filters.platform);
  }
  if (filters.domain) {
    where.push("p.domain = ?");
    params.push(filters.domain);
  }
  if (filters.award === "verified") {
    where.push("p.award_verified = 1");
  } else if (filters.award === "unverified") {
    where.push("p.award_verified = 0");
  } else if (filters.award === "none") {
    where.push("(p.award IS NULL OR p.award = '')");
  }
  if (typeof filters.minRelevance === "number" && filters.minRelevance > 0) {
    where.push("r.relevance >= ?");
    params.push(filters.minRelevance);
  }

  const keyword = (filters.q ?? "").trim().toLowerCase();
  if (keyword) {
    where.push(
      "(LOWER(p.title) LIKE ? OR LOWER(p.summary) LIKE ? OR LOWER(COALESCE(p.problem_addressed,'')) LIKE ? OR LOWER(COALESCE(p.proposed_solution,'')) LIKE ? OR LOWER(COALESCE(p.target_users,'')) LIKE ? OR LOWER(p.technologies) LIKE ? OR LOWER(COALESCE(p.domain,'')) LIKE ?)",
    );
    const like = `%${keyword}%`;
    params.push(like, like, like, like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await query(
    `SELECT ${PROJECT_COLUMNS}, r.job_id AS job_id, r.relevance AS relevance,
            r.is_demo AS result_is_demo,
            (SELECT COUNT(*) FROM saved_projects sp WHERE sp.project_id = p.id) AS saved_total
     FROM research_results r
     JOIN projects p ON p.id = r.project_id
     ${whereSql}
     ORDER BY r.relevance DESC, r.rank ASC, r.created_at ASC`,
    params,
  );

  // The technology filter works on the JSON array, so it is applied here
  // rather than in SQL (SQLite JSON1 support varies by host).
  let results = rows.map(toProjectRow);

  if (filters.technology) {
    const wanted = filters.technology.toLowerCase();
    results = results.filter((project) =>
      project.technologies.some((item) => item.toLowerCase() === wanted),
    );
  }

  const total = results.length;
  const start = (page - 1) * pageSize;
  const projects = results.slice(start, start + pageSize);

  // --- Facets, computed from the data that actually exists -----------------
  const facetProjects = await listAllProjects();

  const platforms = new Map<string, number>();
  const technologies = new Map<string, number>();
  const domains = new Map<string, number>();
  let verifiedAwards = 0;
  let unverifiedAwards = 0;

  for (const project of facetProjects) {
    platforms.set(project.platform, (platforms.get(project.platform) ?? 0) + 1);
    if (project.domain) domains.set(project.domain, (domains.get(project.domain) ?? 0) + 1);
    for (const technology of parseJson<string[]>(project.technologies, [])) {
      technologies.set(technology, (technologies.get(technology) ?? 0) + 1);
    }
    if (project.award) {
      if (project.awardVerified) verifiedAwards += 1;
      else unverifiedAwards += 1;
    }
  }

  const toOptions = (map: Map<string, number>) =>
    [...map.entries()]
      .filter(([value]) => value.trim().length > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, count }));

  return {
    projects,
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    facets: {
      platforms: toOptions(platforms),
      technologies: toOptions(technologies),
      domains: toOptions(domains),
      awards: { verified: verifiedAwards, unverified: unverifiedAwards },
    },
  };
}
