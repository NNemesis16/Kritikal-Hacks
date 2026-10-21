-- ===========================================================================
-- ProjectScope — database schema (SQLite / libSQL)
-- ===========================================================================
-- This file is the single source of truth for the database structure.
-- It is written to be IDEMPOTENT: every statement can be run safely again,
-- so `npm run db:migrate` can be executed on every deploy.
--
-- How it works:
--   * Locally  -> `DATABASE_URL=file:./prisma/dev.db` (a normal SQLite file)
--   * On Vercel-> `DATABASE_URL=libsql://...` (Turso, free tier, persistent)
--
-- Notes for beginners:
--   * There is NO ORM and NO code generation. The app talks to the database
--     with plain SQL through `src/lib/db.ts` and `src/lib/repo.ts`.
--   * Dates are stored as ISO-8601 text so they sort correctly.
--   * Booleans are stored as 0 / 1 (SQLite has no boolean type).
--   * Structured JSON is stored as TEXT and parsed with Zod in the app.
-- ===========================================================================

-- One research run: the user query, the sources we were allowed to check, and
-- everything we produced from it.
CREATE TABLE IF NOT EXISTS research_jobs (
  id                TEXT PRIMARY KEY,
  topic             TEXT NOT NULL,
  problem_statement TEXT,
  domain            TEXT,
  target_users      TEXT,
  geography         TEXT,
  result_limit      INTEGER NOT NULL DEFAULT 20,
  -- JSON array of source ids selected for this run.
  sources           TEXT NOT NULL DEFAULT '[]',
  -- queued | running | completed | failed | cancelled
  status            TEXT NOT NULL DEFAULT 'queued',
  -- Human readable pipeline stage shown in the live research view.
  stage             TEXT NOT NULL DEFAULT 'queued',
  -- 1 when the run used bundled sample data because credentials were missing.
  is_demo           INTEGER NOT NULL DEFAULT 0,
  error_message     TEXT,
  -- Number of project records actually found (never an estimate).
  result_count      INTEGER NOT NULL DEFAULT 0,
  -- JSON array of SourceCheck objects: one entry per source contacted.
  sources_checked   TEXT NOT NULL DEFAULT '[]',
  -- 1 when the user bookmarked this search.
  is_bookmarked     INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  completed_at      TEXT
);

-- Progress events emitted during a run (also streamed to the browser over SSE).
CREATE TABLE IF NOT EXISTS research_events (
  id         TEXT PRIMARY KEY,
  job_id     TEXT NOT NULL REFERENCES research_jobs(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  stage      TEXT NOT NULL,
  message    TEXT NOT NULL,
  -- info | success | warning | error
  level      TEXT NOT NULL DEFAULT 'info',
  -- JSON payload for the event.
  payload    TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_research_events_job ON research_events(job_id, created_at);

-- A normalised project record, deduplicated across sources.
CREATE TABLE IF NOT EXISTS projects (
  id                 TEXT PRIMARY KEY,
  title              TEXT NOT NULL,
  platform           TEXT NOT NULL,
  source_id          TEXT NOT NULL,
  source_url         TEXT NOT NULL,
  attribution        TEXT NOT NULL,
  summary            TEXT NOT NULL,
  problem_addressed  TEXT,
  proposed_solution  TEXT,
  target_users       TEXT,
  -- JSON array of strings.
  technologies       TEXT NOT NULL DEFAULT '[]',
  business_model     TEXT,
  distribution       TEXT,
  -- Award / ranking, only populated when a source stated it.
  award              TEXT,
  award_verified     INTEGER NOT NULL DEFAULT 0,
  ranking            TEXT,
  domain             TEXT,
  -- Cluster id assigned by the OpenAI clustering pass.
  cluster_id         TEXT,
  -- JSON array: what we could NOT determine about this record.
  uncertainty_notes  TEXT NOT NULL DEFAULT '[]',
  -- JSON array: the raw search-result metadata this record came from.
  discovery_metadata TEXT NOT NULL DEFAULT '[]',
  retrieved_at       TEXT NOT NULL,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

-- A single retrieved source page / result that backs a project record.
CREATE TABLE IF NOT EXISTS source_references (
  id           TEXT PRIMARY KEY,
  job_id       TEXT NOT NULL REFERENCES research_jobs(id) ON DELETE CASCADE,
  source_id    TEXT NOT NULL,
  source_name  TEXT NOT NULL,
  url          TEXT NOT NULL,
  title        TEXT,
  attribution  TEXT NOT NULL,
  -- metadata-only | fetched | manual-import | search-grounded
  access_mode  TEXT NOT NULL,
  snippet      TEXT,
  retrieved_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_source_references_job ON source_references(job_id);

-- Join between a research job and a discovered project.
CREATE TABLE IF NOT EXISTS research_results (
  id             TEXT PRIMARY KEY,
  job_id         TEXT NOT NULL REFERENCES research_jobs(id) ON DELETE CASCADE,
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  relevance      REAL NOT NULL DEFAULT 0,
  rank           INTEGER NOT NULL DEFAULT 0,
  discovery_note TEXT,
  is_demo        INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  UNIQUE (job_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_research_results_job ON research_results(job_id, relevance);

-- Gemini-generated market gap report for a research job.
CREATE TABLE IF NOT EXISTS market_gap_reports (
  id           TEXT PRIMARY KEY,
  job_id       TEXT NOT NULL UNIQUE REFERENCES research_jobs(id) ON DELETE CASCADE,
  summary      TEXT NOT NULL,
  gaps         TEXT NOT NULL DEFAULT '[]',
  patterns     TEXT NOT NULL DEFAULT '[]',
  competitors  TEXT NOT NULL DEFAULT '[]',
  assumptions  TEXT NOT NULL DEFAULT '[]',
  experiments  TEXT NOT NULL DEFAULT '[]',
  sources      TEXT NOT NULL DEFAULT '[]',
  is_demo      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- A differentiated concept produced by the Idea Studio.
CREATE TABLE IF NOT EXISTS proposed_concepts (
  id                 TEXT PRIMARY KEY,
  job_id             TEXT NOT NULL REFERENCES research_jobs(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  tagline            TEXT NOT NULL,
  problem            TEXT NOT NULL,
  target_users       TEXT NOT NULL,
  solution           TEXT NOT NULL,
  differentiators    TEXT NOT NULL DEFAULT '[]',
  comparisons        TEXT NOT NULL DEFAULT '[]',
  risks              TEXT NOT NULL DEFAULT '[]',
  validation_plan    TEXT NOT NULL,
  -- Set when the concept overlaps heavily with an existing project.
  similarity_warning TEXT,
  is_demo            INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proposed_concepts_job ON proposed_concepts(job_id);

-- A validation experiment proposed for a market gap.
CREATE TABLE IF NOT EXISTS validation_experiments (
  id               TEXT PRIMARY KEY,
  job_id           TEXT NOT NULL REFERENCES research_jobs(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  hypothesis       TEXT NOT NULL,
  method           TEXT NOT NULL,
  metric           TEXT NOT NULL,
  success_criteria TEXT NOT NULL,
  duration         TEXT,
  cost             TEXT,
  related_gap_id   TEXT,
  is_demo          INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_validation_experiments_job ON validation_experiments(job_id);

-- The pitch deck content for a research job.
CREATE TABLE IF NOT EXISTS pitches (
  id            TEXT PRIMARY KEY,
  job_id        TEXT NOT NULL UNIQUE REFERENCES research_jobs(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  clarity_score INTEGER,
  clarity_notes TEXT NOT NULL DEFAULT '[]',
  is_demo       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- A project the user bookmarked.
CREATE TABLE IF NOT EXISTS saved_projects (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  note       TEXT,
  created_at TEXT NOT NULL
);

-- An exported report the user saved.
CREATE TABLE IF NOT EXISTS saved_reports (
  id         TEXT PRIMARY KEY,
  job_id     TEXT NOT NULL REFERENCES research_jobs(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  format     TEXT NOT NULL DEFAULT 'markdown',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_saved_reports_job ON saved_reports(job_id);

-- A free-choice discovery run: the user did not name a problem, so
-- ProjectScope researched open-ended sources and proposed problems itself.
CREATE TABLE IF NOT EXISTS idea_discoveries (
  id                TEXT PRIMARY KEY,
  -- The research job that holds the evidence this discovery was built from.
  job_id            TEXT NOT NULL UNIQUE REFERENCES research_jobs(id) ON DELETE CASCADE,
  -- All optional. The user may leave every one of them blank.
  interests         TEXT NOT NULL DEFAULT '',
  tech_preferences  TEXT NOT NULL DEFAULT '',
  team_capabilities TEXT NOT NULL DEFAULT '',
  constraints       TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'queued',
  stage             TEXT NOT NULL DEFAULT 'queued',
  is_demo           INTEGER NOT NULL DEFAULT 0,
  error_message     TEXT,
  concepts          TEXT NOT NULL DEFAULT '[]',
  recommendation    TEXT,
  analysis          TEXT NOT NULL DEFAULT '{}',
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_idea_discoveries_created ON idea_discoveries(created_at);

-- A complete project proposal for one concept.
CREATE TABLE IF NOT EXISTS proposals (
  id           TEXT PRIMARY KEY,
  discovery_id TEXT NOT NULL REFERENCES idea_discoveries(id) ON DELETE CASCADE,
  concept_id   TEXT NOT NULL,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  is_demo      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proposals_discovery ON proposals(discovery_id);
