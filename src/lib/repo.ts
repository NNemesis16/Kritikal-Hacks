import "server-only";

/**
 * Data access layer.
 *
 * Every database read and write in the app goes through this file. The
 * functions are named after the thing they do, not after a table, so the
 * rest of the app never has to think about SQL.
 *
 * Columns are stored in snake_case (see `db/schema.sql`) and are aliased back
 * to camelCase in the SELECTs, so the shapes returned here are the same
 * shapes the UI already expects.
 */
import { execute, newId, now, query, queryOne, type Row } from "@/lib/db";





/* -------------------------------------------------------------------------- */
/* Row types                                                                  */
/* -------------------------------------------------------------------------- */

export interface ResearchJobRow {
  id: string;
  topic: string;
  problemStatement: string | null;
  domain: string | null;
  targetUsers: string | null;
  geography: string | null;
  resultLimit: number;
  sources: string;
  status: string;
  stage: string;
  isDemo: boolean;
  errorMessage: string | null;
  resultCount: number;
  sourcesChecked: string;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ProjectRow {
  id: string;
  title: string;
  platform: string;
  sourceId: string;
  sourceUrl: string;
  attribution: string;
  summary: string;
  problemAddressed: string | null;
  proposedSolution: string | null;
  targetUsers: string | null;
  technologies: string;
  businessModel: string | null;
  distribution: string | null;
  award: string | null;
  awardVerified: boolean;
  ranking: string | null;
  domain: string | null;
  clusterId: string | null;
  uncertaintyNotes: string;
  discoveryMetadata: string;
  retrievedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchResultRow {
  id: string;
  jobId: string;
  projectId: string;
  relevance: number;
  rank: number;
  discoveryNote: string | null;
  isDemo: boolean;
  createdAt: string;
  project?: ProjectRow;
}

export interface ResearchEventRow {
  id: string;
  jobId: string;
  type: string;
  stage: string;
  message: string;
  level: string;
  payload: string;
  createdAt: string;
}

export interface SourceReferenceRow {
  id: string;
  jobId: string;
  sourceId: string;
  sourceName: string;
  url: string;
  title: string | null;
  attribution: string;
  accessMode: string;
  snippet: string | null;
  retrievedAt: string;
}

export interface MarketGapReportRow {
  id: string;
  jobId: string;
  summary: string;
  gaps: string;
  patterns: string;
  competitors: string;
  assumptions: string;
  experiments: string;
  sources: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProposedConceptRow {
  id: string;
  jobId: string;
  title: string;
  tagline: string;
  problem: string;
  targetUsers: string;
  solution: string;
  differentiators: string;
  comparisons: string;
  risks: string;
  validationPlan: string;
  similarityWarning: string | null;
  isDemo: boolean;
  createdAt: string;
}

export interface ValidationExperimentRow {
  id: string;
  jobId: string;
  title: string;
  hypothesis: string;
  method: string;
  metric: string;
  successCriteria: string;
  duration: string | null;
  cost: string | null;
  relatedGapId: string | null;
  isDemo: boolean;
  createdAt: string;
}

export interface PitchRow {
  id: string;
  jobId: string;
  content: string;
  clarityScore: number | null;
  clarityNotes: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedProjectRow {
  id: string;
  projectId: string;
  note: string | null;
  createdAt: string;
  project?: ProjectRow;
}

export interface SavedReportRow {
  id: string;
  jobId: string;
  title: string;
  format: string;
  createdAt: string;
  job?: { id: string; topic: string };
}

export interface IdeaDiscoveryRow {
  id: string;
  jobId: string;
  interests: string;
  techPreferences: string;
  teamCapabilities: string;
  constraints: string;
  status: string;
  stage: string;
  isDemo: boolean;
  errorMessage: string | null;
  concepts: string;
  recommendation: string | null;
  analysis: string;
  createdAt: string;
  updatedAt: string;
  job?: ResearchJobRow;
  proposals?: ProposalRow[];
}

export interface ProposalRow {
  id: string;
  discoveryId: string;
  conceptId: string;
  title: string;
  content: string;
  isDemo: boolean;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Column helpers                                                             */
/* -------------------------------------------------------------------------- */

const bool = (value: unknown): boolean => value === 1 || value === true || value === "1";

function toJob(row: Row): ResearchJobRow {
  return {
    id: row.id as string,
    topic: row.topic as string,
    problemStatement: (row.problem_statement as string | null) ?? null,
    domain: (row.domain as string | null) ?? null,
    targetUsers: (row.target_users as string | null) ?? null,
    geography: (row.geography as string | null) ?? null,
    resultLimit: Number(row.result_limit ?? 20),
    sources: (row.sources as string) ?? "[]",
    status: row.status as string,
    stage: row.stage as string,
    isDemo: bool(row.is_demo),
    errorMessage: (row.error_message as string | null) ?? null,
    resultCount: Number(row.result_count ?? 0),
    sourcesChecked: (row.sources_checked as string) ?? "[]",
    isBookmarked: bool(row.is_bookmarked),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

function toProject(row: Row): ProjectRow {
  return {
    id: row.id as string,
    title: row.title as string,
    platform: row.platform as string,
    sourceId: row.source_id as string,
    sourceUrl: row.source_url as string,
    attribution: row.attribution as string,
    summary: row.summary as string,
    problemAddressed: (row.problem_addressed as string | null) ?? null,
    proposedSolution: (row.proposed_solution as string | null) ?? null,
    targetUsers: (row.target_users as string | null) ?? null,
    technologies: (row.technologies as string) ?? "[]",
    businessModel: (row.business_model as string | null) ?? null,
    distribution: (row.distribution as string | null) ?? null,
    award: (row.award as string | null) ?? null,
    awardVerified: bool(row.award_verified),
    ranking: (row.ranking as string | null) ?? null,
    domain: (row.domain as string | null) ?? null,
    clusterId: (row.cluster_id as string | null) ?? null,
    uncertaintyNotes: (row.uncertainty_notes as string) ?? "[]",
    discoveryMetadata: (row.discovery_metadata as string) ?? "[]",
    retrievedAt: row.retrieved_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toResult(row: Row): ResearchResultRow {
  const result: ResearchResultRow = {
    id: row.id as string,
    jobId: row.job_id as string,
    projectId: row.project_id as string,
    relevance: Number(row.relevance ?? 0),
    rank: Number(row.rank ?? 0),
    discoveryNote: (row.discovery_note as string | null) ?? null,
    isDemo: bool(row.is_demo),
    createdAt: row.created_at as string,
  };
  if (row.project_title !== undefined && row.project_title !== null) {
    result.project = toProject(row);
  }
  return result;
}

const PROJECT_COLUMNS = `
  p.id, p.title, p.platform, p.source_id, p.source_url, p.attribution, p.summary,
  p.problem_addressed, p.proposed_solution, p.target_users, p.technologies,
  p.business_model, p.distribution, p.award, p.award_verified, p.ranking, p.domain,
  p.cluster_id, p.uncertainty_notes, p.discovery_metadata, p.retrieved_at,
  p.created_at, p.updated_at`;

const JOB_COLUMNS = `
  j.id, j.topic, j.problem_statement, j.domain, j.target_users, j.geography,
  j.result_limit, j.sources, j.status, j.stage, j.is_demo, j.error_message,
  j.result_count, j.sources_checked, j.is_bookmarked, j.created_at, j.updated_at,
  j.completed_at`;

/* -------------------------------------------------------------------------- */
/* Research jobs                                                              */
/* -------------------------------------------------------------------------- */

export interface CreateResearchJobInput {
  topic: string;
  problemStatement?: string | null;
  domain?: string | null;
  targetUsers?: string | null;
  geography?: string | null;
  resultLimit?: number;
  sources: string;
  status?: string;
  stage?: string;
  isDemo?: boolean;
  resultCount?: number;
  sourcesChecked?: string;
  isBookmarked?: boolean;
  errorMessage?: string | null;
  completedAt?: string | null;
}

export async function createResearchJob(input: CreateResearchJobInput): Promise<ResearchJobRow> {
  const id = newId();
  const timestamp = now();
  await execute(
    `INSERT INTO research_jobs (
       id, topic, problem_statement, domain, target_users, geography,
       result_limit, sources, status, stage, is_demo, result_count,
       sources_checked, is_bookmarked, created_at, updated_at, completed_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.topic,
      input.problemStatement ?? null,
      input.domain ?? null,
      input.targetUsers ?? null,
      input.geography ?? null,
      input.resultLimit ?? 20,
      input.sources,
      input.status ?? "queued",
      input.stage ?? "queued",
      input.isDemo ? 1 : 0,
      input.resultCount ?? 0,
      input.sourcesChecked ?? "[]",
      input.isBookmarked ? 1 : 0,
      timestamp,
      timestamp,
      input.completedAt ?? null,
    ],
  );
  const created = await getResearchJob(id);
  if (!created) throw new Error("The research job could not be created.");
  return created;
}

export async function getResearchJob(id: string): Promise<ResearchJobRow | null> {
  const row = await queryOne(`SELECT ${JOB_COLUMNS} FROM research_jobs j WHERE j.id = ?`, [id]);
  return row ? toJob(row) : null;
}

export async function listResearchJobs(options?: {
  bookmarkedOnly?: boolean;
  /** Put bookmarked runs first (used by the "Saved research" page). */
  bookmarkedFirst?: boolean;
  limit?: number;
}): Promise<ResearchJobRow[]> {
  const where = options?.bookmarkedOnly ? "WHERE j.is_bookmarked = 1" : "";
  const order = options?.bookmarkedFirst
    ? "ORDER BY j.is_bookmarked DESC, j.created_at DESC"
    : "ORDER BY j.created_at DESC";
  const limit = Math.max(1, Math.min(200, options?.limit ?? 50));
  const rows = await query(
    `SELECT ${JOB_COLUMNS} FROM research_jobs j ${where} ${order} LIMIT ?`,
    [limit],
  );
  return rows.map(toJob);
}

export type UpdateResearchJobInput = Partial<
  Omit<CreateResearchJobInput, "topic" | "sources">
>;

export async function updateResearchJob(
  id: string,
  data: UpdateResearchJobInput,
): Promise<void> {
  const columns: Record<string, string> = {
    topic: "topic",
    problemStatement: "problem_statement",
    domain: "domain",
    targetUsers: "target_users",
    geography: "geography",
    resultLimit: "result_limit",
    sources: "sources",
    status: "status",
    stage: "stage",
    errorMessage: "error_message",
    resultCount: "result_count",
    sourcesChecked: "sources_checked",
    isBookmarked: "is_bookmarked",
    completedAt: "completed_at",
  };

  const sets: string[] = [];
  const values: Array<string | number | null> = [];

  for (const [key, column] of Object.entries(columns)) {
    const value = (data as Record<string, unknown>)[key];
    if (value === undefined) continue;
    sets.push(`${column} = ?`);
    if (key === "isBookmarked") {
      values.push(value ? 1 : 0);
    } else {
      values.push(value as string | number | null);
    }
  }

  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  values.push(now());
  values.push(id);

  await execute(`UPDATE research_jobs SET ${sets.join(", ")} WHERE id = ?`, values);
}

/* -------------------------------------------------------------------------- */
/* Research events                                                            */
/* -------------------------------------------------------------------------- */

export async function createResearchEvent(input: {
  jobId: string;
  type: string;
  stage: string;
  message: string;
  level?: string;
  payload?: string;
}): Promise<ResearchEventRow> {
  const id = newId();
  const timestamp = now();
  await execute(
    `INSERT INTO research_events (id, job_id, type, stage, message, level, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.jobId,
      input.type,
      input.stage,
      input.message,
      input.level ?? "info",
      input.payload ?? "{}",
      timestamp,
    ],
  );
  return {
    id,
    jobId: input.jobId,
    type: input.type,
    stage: input.stage,
    message: input.message,
    level: input.level ?? "info",
    payload: input.payload ?? "{}",
    createdAt: timestamp,
  };
}

export async function listResearchEvents(
  jobId: string,
  afterId?: string,
): Promise<ResearchEventRow[]> {
  const rows = afterId
    ? await query(
        `SELECT id, job_id, type, stage, message, level, payload, created_at
         FROM research_events WHERE job_id = ? AND id > ?
         ORDER BY created_at ASC, rowid ASC`,
        [jobId, afterId],
      )
    : await query(
        `SELECT id, job_id, type, stage, message, level, payload, created_at
         FROM research_events WHERE job_id = ? ORDER BY created_at ASC, rowid ASC`,
        [jobId],
      );

  return rows.map((row) => ({
    id: row.id as string,
    jobId: row.job_id as string,
    type: row.type as string,
    stage: row.stage as string,
    message: row.message as string,
    level: row.level as string,
    payload: row.payload as string,
    createdAt: row.created_at as string,
  }));
}

/* -------------------------------------------------------------------------- */
/* Projects                                                                   */
/* -------------------------------------------------------------------------- */

export interface CreateProjectInput {
  title: string;
  platform: string;
  sourceId: string;
  sourceUrl: string;
  attribution: string;
  summary: string;
  problemAddressed?: string | null;
  proposedSolution?: string | null;
  targetUsers?: string | null;
  technologies?: string;
  businessModel?: string | null;
  distribution?: string | null;
  award?: string | null;
  awardVerified?: boolean;
  ranking?: string | null;
  domain?: string | null;
  clusterId?: string | null;
  uncertaintyNotes?: string;
  discoveryMetadata?: string;
  retrievedAt?: string;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectRow> {
  const id = newId();
  const timestamp = now();
  await execute(
    `INSERT INTO projects (
       id, title, platform, source_id, source_url, attribution, summary,
       problem_addressed, proposed_solution, target_users, technologies,
       business_model, distribution, award, award_verified, ranking, domain,
       cluster_id, uncertainty_notes, discovery_metadata, retrieved_at,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.title,
      input.platform,
      input.sourceId,
      input.sourceUrl,
      input.attribution,
      input.summary,
      input.problemAddressed ?? null,
      input.proposedSolution ?? null,
      input.targetUsers ?? null,
      input.technologies ?? "[]",
      input.businessModel ?? null,
      input.distribution ?? null,
      input.award ?? null,
      input.awardVerified ? 1 : 0,
      input.ranking ?? null,
      input.domain ?? null,
      input.clusterId ?? null,
      input.uncertaintyNotes ?? "[]",
      input.discoveryMetadata ?? "[]",
      input.retrievedAt ?? timestamp,
      timestamp,
      timestamp,
    ],
  );
  const created = await getProject(id);
  if (!created) throw new Error("The project could not be created.");
  return created;
}

export async function getProject(id: string): Promise<ProjectRow | null> {
  const row = await queryOne(`SELECT ${PROJECT_COLUMNS} FROM projects p WHERE p.id = ?`, [id]);
  return row ? toProject(row) : null;
}

export async function updateProject(
  id: string,
  data: Partial<CreateProjectInput>,
): Promise<void> {
  const columns: Record<string, string> = {
    title: "title",
    platform: "platform",
    sourceId: "source_id",
    sourceUrl: "source_url",
    attribution: "attribution",
    summary: "summary",
    problemAddressed: "problem_addressed",
    proposedSolution: "proposed_solution",
    targetUsers: "target_users",
    technologies: "technologies",
    businessModel: "business_model",
    distribution: "distribution",
    award: "award",
    ranking: "ranking",
    domain: "domain",
    clusterId: "cluster_id",
    uncertaintyNotes: "uncertainty_notes",
    discoveryMetadata: "discovery_metadata",
    retrievedAt: "retrieved_at",
  };

  const sets: string[] = [];
  const values: Array<string | number | null> = [];

  for (const [key, column] of Object.entries(columns)) {
    const value = (data as Record<string, unknown>)[key];
    if (value === undefined) continue;
    sets.push(`${column} = ?`);
    values.push(value as string | number | null);
  }

  if (typeof data.awardVerified === "boolean") {
    sets.push("award_verified = ?");
    values.push(data.awardVerified ? 1 : 0);
  }

  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  values.push(now());
  values.push(id);

  await execute(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`, values);
}

/** Every project, used to build the explorer's filter facets. */
export async function listAllProjects(): Promise<ProjectRow[]> {
  const rows = await query(`SELECT ${PROJECT_COLUMNS} FROM projects p`);
  return rows.map(toProject);
}

/* -------------------------------------------------------------------------- */
/* Research results                                                           */
/* -------------------------------------------------------------------------- */

export async function createResearchResult(input: {
  jobId: string;
  projectId: string;
  relevance?: number;
  rank?: number;
  discoveryNote?: string | null;
  isDemo?: boolean;
}): Promise<ResearchResultRow> {
  const id = newId();
  const timestamp = now();
  await execute(
    `INSERT INTO research_results (id, job_id, project_id, relevance, rank, discovery_note, is_demo, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.jobId,
      input.projectId,
      input.relevance ?? 0,
      input.rank ?? 0,
      input.discoveryNote ?? null,
      input.isDemo ? 1 : 0,
      timestamp,
    ],
  );
  return {
    id,
    jobId: input.jobId,
    projectId: input.projectId,
    relevance: input.relevance ?? 0,
    rank: input.rank ?? 0,
    discoveryNote: input.discoveryNote ?? null,
    isDemo: Boolean(input.isDemo),
    createdAt: timestamp,
  };
}

export async function getResearchResult(
  jobId: string,
  projectId: string,
): Promise<ResearchResultRow | null> {
  const row = await queryOne(
    `SELECT id, job_id, project_id, relevance, rank, discovery_note, is_demo, created_at
     FROM research_results WHERE job_id = ? AND project_id = ?`,
    [jobId, projectId],
  );
  if (!row) return null;
  return toResult(row);
}

export async function listResearchResults(
  jobId?: string,
  options?: { orderByRelevance?: boolean; limit?: number },
): Promise<ResearchResultRow[]> {
  const where = jobId ? "WHERE r.job_id = ?" : "";
  const order = options?.orderByRelevance
    ? "ORDER BY r.relevance DESC, r.rank ASC, r.created_at ASC"
    : "ORDER BY r.rank ASC, r.created_at ASC";
  const limit = Math.max(1, Math.min(500, options?.limit ?? 500));
  const params = jobId ? [jobId, limit] : [limit];

  const rows = await query(
    `SELECT r.id, r.job_id, r.project_id, r.relevance, r.rank, r.discovery_note,
            r.is_demo, r.created_at, ${PROJECT_COLUMNS}
     FROM research_results r JOIN projects p ON p.id = r.project_id
     ${where} ${order} LIMIT ?`,
    params,
  );
  return rows.map(toResult);
}

export async function updateResearchResult(
  id: string,
  data: { relevance?: number; rank?: number },
): Promise<void> {
  const sets: string[] = [];
  const values: Array<string | number> = [];
  if (typeof data.relevance === "number") {
    sets.push("relevance = ?");
    values.push(data.relevance);
  }
  if (typeof data.rank === "number") {
    sets.push("rank = ?");
    values.push(data.rank);
  }
  if (sets.length === 0) return;
  values.push(id);
  await execute(`UPDATE research_results SET ${sets.join(", ")} WHERE id = ?`, values);
}

export async function countResearchResults(jobId: string): Promise<number> {
  const row = await queryOne<{ total: number }>(
    "SELECT COUNT(*) AS total FROM research_results WHERE job_id = ?",
    [jobId],
  );
  return Number(row?.total ?? 0);
}

/* -------------------------------------------------------------------------- */
/* Source references                                                          */
/* -------------------------------------------------------------------------- */

export async function createSourceReference(input: {
  jobId: string;
  sourceId: string;
  sourceName: string;
  url: string;
  title?: string | null;
  attribution: string;
  accessMode: string;
  snippet?: string | null;
}): Promise<SourceReferenceRow> {
  const id = newId();
  const timestamp = now();
  await execute(
    `INSERT INTO source_references
       (id, job_id, source_id, source_name, url, title, attribution, access_mode, snippet, retrieved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.jobId,
      input.sourceId,
      input.sourceName,
      input.url,
      input.title ?? null,
      input.attribution,
      input.accessMode,
      input.snippet ?? null,
      timestamp,
    ],
  );
  return {
    id,
    jobId: input.jobId,
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    url: input.url,
    title: input.title ?? null,
    attribution: input.attribution,
    accessMode: input.accessMode,
    snippet: input.snippet ?? null,
    retrievedAt: timestamp,
  };
}

export async function listSourceReferences(jobIds: string[]): Promise<SourceReferenceRow[]> {
  if (jobIds.length === 0) return [];
  const placeholders = jobIds.map(() => "?").join(", ");
  const rows = await query(
    `SELECT id, job_id, source_id, source_name, url, title, attribution, access_mode, snippet, retrieved_at
     FROM source_references WHERE job_id IN (${placeholders}) ORDER BY retrieved_at DESC`,
    jobIds,
  );
  return rows.map((row) => ({
    id: row.id as string,
    jobId: row.job_id as string,
    sourceId: row.source_id as string,
    sourceName: row.source_name as string,
    url: row.url as string,
    title: (row.title as string | null) ?? null,
    attribution: row.attribution as string,
    accessMode: row.access_mode as string,
    snippet: (row.snippet as string | null) ?? null,
    retrievedAt: row.retrieved_at as string,
  }));
}

/* -------------------------------------------------------------------------- */
/* Market gap reports                                                         */
/* -------------------------------------------------------------------------- */

export async function getMarketGapReport(jobId: string): Promise<MarketGapReportRow | null> {
  const row = await queryOne(
    `SELECT id, job_id, summary, gaps, patterns, competitors, assumptions,
            experiments, sources, is_demo, created_at, updated_at
     FROM market_gap_reports WHERE job_id = ?`,
    [jobId],
  );
  if (!row) return null;
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    summary: row.summary as string,
    gaps: (row.gaps as string) ?? "[]",
    patterns: (row.patterns as string) ?? "[]",
    competitors: (row.competitors as string) ?? "[]",
    assumptions: (row.assumptions as string) ?? "[]",
    experiments: (row.experiments as string) ?? "[]",
    sources: (row.sources as string) ?? "[]",
    isDemo: bool(row.is_demo),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function upsertMarketGapReport(
  jobId: string,
  data: {
    summary: string;
    gaps: string;
    patterns: string;
    competitors: string;
    assumptions: string;
    experiments: string;
    sources: string;
    isDemo?: boolean;
  },
): Promise<void> {
  const id = newId();
  const timestamp = now();
  await execute(
    `INSERT INTO market_gap_reports
       (id, job_id, summary, gaps, patterns, competitors, assumptions, experiments, sources, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(job_id) DO UPDATE SET
       summary = excluded.summary, gaps = excluded.gaps, patterns = excluded.patterns,
       competitors = excluded.competitors, assumptions = excluded.assumptions,
       experiments = excluded.experiments, sources = excluded.sources,
       is_demo = excluded.is_demo, updated_at = excluded.updated_at`,
    [
      id,
      jobId,
      data.summary,
      data.gaps,
      data.patterns,
      data.competitors,
      data.assumptions,
      data.experiments,
      data.sources,
      data.isDemo ? 1 : 0,
      timestamp,
      timestamp,
    ],
  );
}

/* -------------------------------------------------------------------------- */
/* Proposed concepts                                                          */
/* -------------------------------------------------------------------------- */

export async function createProposedConcept(input: {
  jobId: string;
  title: string;
  tagline: string;
  problem: string;
  targetUsers: string;
  solution: string;
  differentiators: string;
  comparisons: string;
  risks: string;
  validationPlan: string;
  similarityWarning?: string | null;
  isDemo?: boolean;
}): Promise<ProposedConceptRow> {
  const id = newId();
  const timestamp = now();
  await execute(
    `INSERT INTO proposed_concepts
       (id, job_id, title, tagline, problem, target_users, solution, differentiators,
        comparisons, risks, validation_plan, similarity_warning, is_demo, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.jobId,
      input.title,
      input.tagline,
      input.problem,
      input.targetUsers,
      input.solution,
      input.differentiators,
      input.comparisons,
      input.risks,
      input.validationPlan,
      input.similarityWarning ?? null,
      input.isDemo ? 1 : 0,
      timestamp,
    ],
  );
  return {
    id,
    jobId: input.jobId,
    title: input.title,
    tagline: input.tagline,
    problem: input.problem,
    targetUsers: input.targetUsers,
    solution: input.solution,
    differentiators: input.differentiators,
    comparisons: input.comparisons,
    risks: input.risks,
    validationPlan: input.validationPlan,
    similarityWarning: input.similarityWarning ?? null,
    isDemo: Boolean(input.isDemo),
    createdAt: timestamp,
  };
}

export async function listProposedConcepts(jobId: string): Promise<ProposedConceptRow[]> {
  const rows = await query(
    `SELECT id, job_id, title, tagline, problem, target_users, solution, differentiators,
            comparisons, risks, validation_plan, similarity_warning, is_demo, created_at
     FROM proposed_concepts WHERE job_id = ? ORDER BY created_at ASC, rowid ASC`,
    [jobId],
  );
  return rows.map((row) => ({
    id: row.id as string,
    jobId: row.job_id as string,
    title: row.title as string,
    tagline: row.tagline as string,
    problem: row.problem as string,
    targetUsers: row.target_users as string,
    solution: row.solution as string,
    differentiators: (row.differentiators as string) ?? "[]",
    comparisons: (row.comparisons as string) ?? "[]",
    risks: (row.risks as string) ?? "[]",
    validationPlan: row.validation_plan as string,
    similarityWarning: (row.similarity_warning as string | null) ?? null,
    isDemo: bool(row.is_demo),
    createdAt: row.created_at as string,
  }));
}

export async function findProposedConcept(
  id: string,
  jobId?: string,
): Promise<ProposedConceptRow | null> {
  const rows = await query(
    `SELECT id, job_id, title, tagline, problem, target_users, solution, differentiators,
            comparisons, risks, validation_plan, similarity_warning, is_demo, created_at
     FROM proposed_concepts WHERE id = ?${jobId ? " AND job_id = ?" : ""} LIMIT 1`,
    jobId ? [id, jobId] : [id],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    title: row.title as string,
    tagline: row.tagline as string,
    problem: row.problem as string,
    targetUsers: row.target_users as string,
    solution: row.solution as string,
    differentiators: (row.differentiators as string) ?? "[]",
    comparisons: (row.comparisons as string) ?? "[]",
    risks: (row.risks as string) ?? "[]",
    validationPlan: row.validation_plan as string,
    similarityWarning: (row.similarity_warning as string | null) ?? null,
    isDemo: bool(row.is_demo),
    createdAt: row.created_at as string,
  };
}

export async function deleteProposedConcepts(jobId: string): Promise<void> {
  await execute("DELETE FROM proposed_concepts WHERE job_id = ?", [jobId]);
}

/* -------------------------------------------------------------------------- */
/* Validation experiments                                                     */
/* -------------------------------------------------------------------------- */

export async function createValidationExperiment(input: {
  jobId: string;
  title: string;
  hypothesis: string;
  method: string;
  metric: string;
  successCriteria: string;
  duration?: string | null;
  cost?: string | null;
  relatedGapId?: string | null;
  isDemo?: boolean;
}): Promise<ValidationExperimentRow> {
  const id = newId();
  const timestamp = now();
  await execute(
    `INSERT INTO validation_experiments
       (id, job_id, title, hypothesis, method, metric, success_criteria, duration, cost, related_gap_id, is_demo, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.jobId,
      input.title,
      input.hypothesis,
      input.method,
      input.metric,
      input.successCriteria,
      input.duration ?? null,
      input.cost ?? null,
      input.relatedGapId ?? null,
      input.isDemo ? 1 : 0,
      timestamp,
    ],
  );
  return {
    id,
    jobId: input.jobId,
    title: input.title,
    hypothesis: input.hypothesis,
    method: input.method,
    metric: input.metric,
    successCriteria: input.successCriteria,
    duration: input.duration ?? null,
    cost: input.cost ?? null,
    relatedGapId: input.relatedGapId ?? null,
    isDemo: Boolean(input.isDemo),
    createdAt: timestamp,
  };
}

export async function listValidationExperiments(
  jobId: string,
): Promise<ValidationExperimentRow[]> {
  const rows = await query(
    `SELECT id, job_id, title, hypothesis, method, metric, success_criteria, duration, cost, related_gap_id, is_demo, created_at
     FROM validation_experiments WHERE job_id = ? ORDER BY created_at ASC, rowid ASC`,
    [jobId],
  );
  return rows.map((row) => ({
    id: row.id as string,
    jobId: row.job_id as string,
    title: row.title as string,
    hypothesis: row.hypothesis as string,
    method: row.method as string,
    metric: row.metric as string,
    successCriteria: row.success_criteria as string,
    duration: (row.duration as string | null) ?? null,
    cost: (row.cost as string | null) ?? null,
    relatedGapId: (row.related_gap_id as string | null) ?? null,
    isDemo: bool(row.is_demo),
    createdAt: row.created_at as string,
  }));
}

export async function deleteValidationExperiments(jobId: string): Promise<void> {
  await execute("DELETE FROM validation_experiments WHERE job_id = ?", [jobId]);
}

/* -------------------------------------------------------------------------- */
/* Pitches                                                                    */
/* -------------------------------------------------------------------------- */

export async function getPitch(jobId: string): Promise<PitchRow | null> {
  const row = await queryOne(
    `SELECT id, job_id, content, clarity_score, clarity_notes, is_demo, created_at, updated_at
     FROM pitches WHERE job_id = ?`,
    [jobId],
  );
  if (!row) return null;
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    content: row.content as string,
    clarityScore: row.clarity_score === null ? null : Number(row.clarity_score),
    clarityNotes: (row.clarity_notes as string) ?? "[]",
    isDemo: bool(row.is_demo),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function upsertPitch(
  jobId: string,
  data: {
    content: string;
    clarityScore?: number | null;
    clarityNotes?: string;
    isDemo?: boolean;
  },
): Promise<void> {
  const id = newId();
  const timestamp = now();
  await execute(
    `INSERT INTO pitches (id, job_id, content, clarity_score, clarity_notes, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(job_id) DO UPDATE SET
       content = excluded.content, clarity_score = excluded.clarity_score,
       clarity_notes = excluded.clarity_notes, is_demo = excluded.is_demo,
       updated_at = excluded.updated_at`,
    [
      id,
      jobId,
      data.content,
      data.clarityScore ?? null,
      data.clarityNotes ?? "[]",
      data.isDemo ? 1 : 0,
      timestamp,
      timestamp,
    ],
  );
}

/* -------------------------------------------------------------------------- */
/* Saved projects                                                             */
/* -------------------------------------------------------------------------- */

export async function upsertSavedProject(projectId: string, note?: string | null): Promise<void> {
  await execute(
    `INSERT INTO saved_projects (id, project_id, note, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(project_id) DO UPDATE SET note = excluded.note`,
    [newId(), projectId, note ?? null, now()],
  );
}

export async function deleteSavedProject(projectId: string): Promise<void> {
  await execute("DELETE FROM saved_projects WHERE project_id = ?", [projectId]);
}

export async function listSavedProjects(): Promise<SavedProjectRow[]> {
  const rows = await query(
    `SELECT s.id, s.project_id, s.note, s.created_at, ${PROJECT_COLUMNS}
     FROM saved_projects s JOIN projects p ON p.id = s.project_id
     ORDER BY s.created_at DESC`,
  );
  return rows.map((row) => ({
    id: row.id as string,
    projectId: row.project_id as string,
    note: (row.note as string | null) ?? null,
    createdAt: row.created_at as string,
    project: toProject(row),
  }));
}

export async function isProjectSaved(projectId: string): Promise<boolean> {
  const row = await queryOne<{ total: number }>(
    "SELECT COUNT(*) AS total FROM saved_projects WHERE project_id = ?",
    [projectId],
  );
  return Number(row?.total ?? 0) > 0;
}

/* -------------------------------------------------------------------------- */
/* Saved reports                                                              */
/* -------------------------------------------------------------------------- */

export async function createSavedReport(input: {
  jobId: string;
  title: string;
  format?: string;
}): Promise<void> {
  await execute(
    `INSERT INTO saved_reports (id, job_id, title, format, created_at) VALUES (?, ?, ?, ?, ?)`,
    [newId(), input.jobId, input.title, input.format ?? "markdown", now()],
  );
}

export async function listSavedReports(): Promise<SavedReportRow[]> {
  const rows = await query(
    `SELECT r.id, r.job_id, r.title, r.format, r.created_at, j.id AS job_id_2, j.topic
     FROM saved_reports r JOIN research_jobs j ON j.id = r.job_id
     ORDER BY r.created_at DESC`,
  );
  return rows.map((row) => ({
    id: row.id as string,
    jobId: row.job_id as string,
    title: row.title as string,
    format: row.format as string,
    createdAt: row.created_at as string,
    job: { id: row.job_id_2 as string, topic: row.topic as string },
  }));
}

/* -------------------------------------------------------------------------- */
/* Idea discoveries                                                           */
/* -------------------------------------------------------------------------- */

export interface CreateIdeaDiscoveryInput {
  jobId: string;
  interests?: string;
  techPreferences?: string;
  teamCapabilities?: string;
  constraints?: string;
  status?: string;
  stage?: string;
  isDemo?: boolean;
}

export async function createIdeaDiscovery(
  input: CreateIdeaDiscoveryInput,
): Promise<IdeaDiscoveryRow> {
  const id = newId();
  const timestamp = now();
  await execute(
    `INSERT INTO idea_discoveries
       (id, job_id, interests, tech_preferences, team_capabilities, constraints,
        status, stage, is_demo, error_message, concepts, recommendation, analysis,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.jobId,
      input.interests ?? "",
      input.techPreferences ?? "",
      input.teamCapabilities ?? "",
      input.constraints ?? "",
      input.status ?? "queued",
      input.stage ?? "queued",
      input.isDemo ? 1 : 0,
      null,
      "[]",
      null,
      "{}",
      timestamp,
      timestamp,
    ],
  );
  const created = await getIdeaDiscovery(id);
  if (!created) throw new Error("The discovery run could not be created.");
  return created;
}

export async function getIdeaDiscovery(id: string): Promise<IdeaDiscoveryRow | null> {
  const row = await queryOne(
    `SELECT id, job_id, interests, tech_preferences, team_capabilities,
            constraints, status, stage, is_demo, error_message, concepts,
            recommendation, analysis, created_at, updated_at
     FROM idea_discoveries WHERE id = ?`,
    [id],
  );
  if (!row) return null;
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    interests: (row.interests as string) ?? "",
    techPreferences: (row.tech_preferences as string) ?? "",
    teamCapabilities: (row.team_capabilities as string) ?? "",
    constraints: (row.constraints as string) ?? "",
    status: row.status as string,
    stage: row.stage as string,
    isDemo: bool(row.is_demo),
    errorMessage: (row.error_message as string | null) ?? null,
    concepts: (row.concepts as string) ?? "[]",
    recommendation: (row.recommendation as string | null) ?? null,
    analysis: (row.analysis as string) ?? "{}",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** A discovery plus its research job and its saved proposals. */
export async function getIdeaDiscoveryWithRelations(
  id: string,
): Promise<IdeaDiscoveryRow | null> {
  const discovery = await getIdeaDiscovery(id);
  if (!discovery) return null;

  const job = await getResearchJob(discovery.jobId);
  const proposals = await listProposals(discovery.id);

  return { ...discovery, job: job ?? undefined, proposals };
}

export async function listIdeaDiscoveries(limit = 20): Promise<IdeaDiscoveryRow[]> {
  const rows = await query(
    `SELECT id, job_id, interests, tech_preferences, team_capabilities, constraints,
            status, stage, is_demo, error_message, concepts, recommendation, analysis,
            created_at, updated_at
     FROM idea_discoveries ORDER BY created_at DESC LIMIT ?`,
    [Math.max(1, Math.min(200, limit))],
  );
  return rows.map((row) => ({
    id: row.id as string,
    jobId: row.job_id as string,
    interests: (row.interests as string) ?? "",
    techPreferences: (row.tech_preferences as string) ?? "",
    teamCapabilities: (row.team_capabilities as string) ?? "",
    constraints: (row.constraints as string) ?? "",
    status: row.status as string,
    stage: row.stage as string,
    isDemo: bool(row.is_demo),
    errorMessage: (row.error_message as string | null) ?? null,
    concepts: (row.concepts as string) ?? "[]",
    recommendation: (row.recommendation as string | null) ?? null,
    analysis: (row.analysis as string) ?? "{}",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function updateIdeaDiscovery(
  id: string,
  data: {
    status?: string;
    stage?: string;
    errorMessage?: string | null;
    concepts?: string;
    recommendation?: string | null;
    analysis?: string;
  },
): Promise<void> {
  const columns: Record<string, string> = {
    status: "status",
    stage: "stage",
    errorMessage: "error_message",
    concepts: "concepts",
    recommendation: "recommendation",
    analysis: "analysis",
  };

  const sets: string[] = [];
  const values: Array<string | null> = [];

  for (const [key, column] of Object.entries(columns)) {
    const value = (data as Record<string, unknown>)[key];
    if (value === undefined) continue;
    sets.push(`${column} = ?`);
    values.push(value as string | null);
  }

  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  values.push(now());
  values.push(id);

  await execute(`UPDATE idea_discoveries SET ${sets.join(", ")} WHERE id = ?`, values);
}

/* -------------------------------------------------------------------------- */
/* Proposals                                                                  */
/* -------------------------------------------------------------------------- */

export async function createProposal(input: {
  discoveryId: string;
  conceptId: string;
  title: string;
  content: string;
  isDemo?: boolean;
}): Promise<ProposalRow> {
  const id = newId();
  const timestamp = now();
  await execute(
    `INSERT INTO proposals (id, discovery_id, concept_id, title, content, is_demo, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.discoveryId,
      input.conceptId,
      input.title,
      input.content,
      input.isDemo ? 1 : 0,
      timestamp,
    ],
  );
  return {
    id,
    discoveryId: input.discoveryId,
    conceptId: input.conceptId,
    title: input.title,
    content: input.content,
    isDemo: Boolean(input.isDemo),
    createdAt: timestamp,
  };
}

export async function listProposals(discoveryId: string): Promise<ProposalRow[]> {
  const rows = await query(
    `SELECT id, discovery_id, concept_id, title, content, is_demo, created_at
     FROM proposals WHERE discovery_id = ? ORDER BY created_at DESC, rowid DESC`,
    [discoveryId],
  );
  return rows.map((row) => ({
    id: row.id as string,
    discoveryId: row.discovery_id as string,
    conceptId: row.concept_id as string,
    title: row.title as string,
    content: row.content as string,
    isDemo: bool(row.is_demo),
    createdAt: row.created_at as string,
  }));
}

/* -------------------------------------------------------------------------- */
/* Composite reads                                                            */
/* -------------------------------------------------------------------------- */

/** A research job plus its results (and the project behind each result). */
export async function getResearchJobWithResults(
  id: string,
): Promise<{ job: ResearchJobRow; results: ResearchResultRow[] } | null> {
  const job = await getResearchJob(id);
  if (!job) return null;
  const results = await listResearchResults(id);
  return { job, results };
}

/** A research job plus the market-gap report and its experiments. */
export async function getResearchJobWithReport(
  id: string,
): Promise<
  | {
      job: ResearchJobRow;
      report: MarketGapReportRow | null;
      results: ResearchResultRow[];
      experiments: ValidationExperimentRow[];
    }
  | null
> {
  const job = await getResearchJob(id);
  if (!job) return null;
  const [report, results, experiments] = await Promise.all([
    getMarketGapReport(id),
    listResearchResults(id),
    listValidationExperiments(id),
  ]);
  return { job, report, results, experiments };
}

/** A research job plus the progress events recorded for it. */
export async function getResearchJobWithEvents(
  id: string,
): Promise<{ job: ResearchJobRow; events: ResearchEventRow[] } | null> {
  const job = await getResearchJob(id);
  if (!job) return null;
  const events = await listResearchEvents(id);
  return { job, events };
}

/** Everything the markdown/JSON export needs. */
export async function getResearchJobForExport(id: string): Promise<{
  job: ResearchJobRow;
  results: ResearchResultRow[];
  report: MarketGapReportRow | null;
  concepts: ProposedConceptRow[];
  pitch: PitchRow | null;
  experiments: ValidationExperimentRow[];
  sourceReferences: SourceReferenceRow[];
} | null> {
  const job = await getResearchJob(id);
  if (!job) return null;

  const [results, report, concepts, pitch, experiments, sourceReferences] = await Promise.all([
    listResearchResults(id),
    getMarketGapReport(id),
    listProposedConcepts(id),
    getPitch(id),
    listValidationExperiments(id),
    listSourceReferences([id]),
  ]);

  return { job, results, report, concepts, pitch, experiments, sourceReferences };
}

/** A project plus the runs it appeared in and whether it is bookmarked. */
export async function getProjectWithRelations(
  id: string,
): Promise<{
  project: ProjectRow;
  results: Array<ResearchResultRow & { job?: { id: string; topic: string; createdAt: string } }>;
  savedBy: SavedProjectRow[];
} | null> {
  const project = await getProject(id);
  if (!project) return null;

  const rows = await query(
    `SELECT r.id, r.job_id, r.project_id, r.relevance, r.rank, r.discovery_note,
            r.is_demo, r.created_at, j.id AS job_id_2, j.topic AS job_topic,
            j.created_at AS job_created_at
     FROM research_results r JOIN research_jobs j ON j.id = r.job_id
     WHERE r.project_id = ? ORDER BY r.created_at DESC`,
    [id],
  );

  const results = rows.map((row) => ({
    ...toResult(row),
    job: {
      id: row.job_id_2 as string,
      topic: row.job_topic as string,
      createdAt: row.job_created_at as string,
    },
  }));

  const savedBy = (await listSavedProjects()).filter((saved) => saved.projectId === id);
  return { project, results, savedBy };
}
