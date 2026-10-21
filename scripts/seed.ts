/**
 * Load the demo dataset.
 *
 * This replaces `prisma db seed`. It creates two fully-worked demo runs:
 *
 *   1. a topic-driven research run  (12 projects, gaps, experiments, a pitch)
 *   2. a free-choice discovery run  (5 ranked concepts, a full proposal)
 *
 *   npm run db:seed
 *
 * Every record it creates is flagged as demo data so the UI can label it.
 */
import { createClient, type InValue } from "@libsql/client";
import { resolveDatabaseUrl } from "../src/lib/database-url";


import {
  DEMO_CLUSTERS,
  DEMO_DISCOVERY_ANALYSIS,
  DEMO_DISCOVERY_COMMON_GROUND,
  DEMO_DISCOVERY_CONCEPTS,
  DEMO_DISCOVERY_RECOMMENDATION,
  DEMO_DISCOVERY_UNVALIDATED,
  DEMO_PROPOSAL,
  DEMO_RECORDS,
  DEMO_REPORT,
} from "../src/lib/research/demo";

const rootDir = process.cwd();
const raw = (process.env.DATABASE_URL ?? "file:./dev.db").trim();


const url = resolveDatabaseUrl(raw, rootDir);
const authToken = process.env.DATABASE_AUTH_TOKEN?.trim() || undefined;
const client = createClient({ url, ...(authToken ? { authToken } : {}) });

const json = (value: unknown) => JSON.stringify(value) ?? "null";
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

async function run(sql: string, params: InValue[] = []) {
  await client.execute(sql, params);
}

async function main() {
  console.log("Seeding ProjectScope with the demo dataset…");

  // Start from a clean slate so the seed is repeatable.
  for (const table of [
    "saved_reports",
    "pitches",
    "proposed_concepts",
    "validation_experiments",
    "market_gap_reports",
    "source_references",
    "research_events",
    "research_results",
    "saved_projects",
    "proposals",
    "idea_discoveries",
    "research_jobs",
    "projects",
  ]) {
    await run(`DELETE FROM ${table}`);
  }

  // ------------------------------------------------------------------
  // 1. The topic-driven research run
  // ------------------------------------------------------------------
  const jobId = id();
  const timestamp = now();

  await run(
    `INSERT INTO research_jobs
       (id, topic, problem_statement, domain, target_users, geography,
        result_limit, sources, status, stage, is_demo, result_count,
        sources_checked, is_bookmarked, created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      jobId,
      "AI tools that work without a reliable internet connection",
      "Students and health workers in low-connectivity regions lose access to AI features the moment the network drops.",
      "Education, Health",
      "First-year students and community health workers in low-connectivity areas",
      "India",
      20,
      json(["demo"]),
      "completed",
      "done",
      1,
      DEMO_RECORDS.length,
      json([
        {
          sourceId: "demo",
          sourceName: "ProjectScope demo dataset",
          status: "ok",
          found: DEMO_RECORDS.length,
          note: "Bundled sample data. No live source was contacted.",
        },
      ]),
      1,
      timestamp,
      timestamp,
      timestamp,
    ],
  );

  const projectIds: string[] = [];

  for (const [index, record] of DEMO_RECORDS.entries()) {
    const projectId = id();
    projectIds.push(projectId);

    await run(
      `INSERT INTO projects
         (id, title, platform, source_id, source_url, attribution, summary,
          problem_addressed, proposed_solution, target_users, technologies,
          business_model, distribution, award, award_verified, ranking, domain,
          cluster_id, uncertainty_notes, discovery_metadata, retrieved_at,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        record.title,
        record.platform,
        "demo",
        record.sourceUrl,
        `ProjectScope demo dataset — "${record.title}"`,
        record.summary,
        record.problemAddressed,
        record.proposedSolution,
        record.targetUsers,
        json(record.technologies),
        record.businessModel,
        record.distribution,
        null,
        0,
        null,
        record.domain,
        null,
        json(record.uncertaintyNotes),
        json([
          {
            sourceId: "demo",
            sourceName: "ProjectScope demo dataset",
            siteName: record.platform,
            snippet: record.summary,
            accessMode: "manual-import",
            retrievedAt: timestamp,
          },
        ]),
        timestamp,
        timestamp,
        timestamp,
      ],
    );

    await run(
      `INSERT INTO research_results
         (id, job_id, project_id, relevance, rank, discovery_note, is_demo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id(),
        jobId,
        projectId,
        Math.max(0.25, 0.85 - index * 0.05),
        index + 1,
        "manual-import",
        1,
        timestamp,
      ],
    );

    await run(
      `INSERT INTO source_references
         (id, job_id, source_id, source_name, url, title, attribution, access_mode, snippet, retrieved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id(),
        jobId,
        "demo",
        "ProjectScope demo dataset",
        record.sourceUrl,
        record.title,
        `ProjectScope demo dataset — "${record.title}"`,
        "manual-import",
        record.summary,
        timestamp,
      ],
    );
  }

  for (const cluster of DEMO_CLUSTERS) {
    for (const index of cluster.memberIndexes) {
      const projectId = projectIds[index];
      if (!projectId) continue;
      await run("UPDATE projects SET cluster_id = ? WHERE id = ?", [cluster.clusterId, projectId]);
    }
  }

  for (const [type, stage, level, message] of [
    [
      "demo.start",
      "discovering",
      "warning",
      "Demo mode: no provider credentials are configured, so bundled sample records are used. These are NOT live research results.",
    ],
    [
      "source.search",
      "discovering",
      "success",
      `Demo dataset: ${DEMO_RECORDS.length} sample record(s) loaded.`,
    ],
    [
      "store.done",
      "storing",
      "success",
      `Saved ${DEMO_RECORDS.length} project record(s) with attribution, source URLs and retrieval timestamps.`,
    ],
    [
      "analysis.done",
      "analysing",
      "success",
      `Report ready: ${DEMO_REPORT.gaps.length} gap(s), ${DEMO_REPORT.patterns.length} repeated pattern(s), ${DEMO_REPORT.sources.length} cited source(s).`,
    ],
    [
      "job.completed",
      "done",
      "success",
      `Research finished: ${DEMO_RECORDS.length} project record(s) found.`,
    ],
  ] as const) {
    await run(
      `INSERT INTO research_events (id, job_id, type, stage, message, level, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id(), jobId, type, stage, message, level, json({}), timestamp],
    );
  }

  await run(
    `INSERT INTO market_gap_reports
       (id, job_id, summary, gaps, patterns, competitors, assumptions, experiments, sources, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id(),
      jobId,
      DEMO_REPORT.summary,
      json(DEMO_REPORT.gaps),
      json(DEMO_REPORT.patterns),
      json(DEMO_REPORT.competitors),
      json(DEMO_REPORT.assumptions),
      json(DEMO_REPORT.experiments),
      json(DEMO_REPORT.sources),
      1,
      timestamp,
      timestamp,
    ],
  );

  for (const experiment of DEMO_REPORT.experiments) {
    await run(
      `INSERT INTO validation_experiments
         (id, job_id, title, hypothesis, method, metric, success_criteria, duration, cost, related_gap_id, is_demo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id(),
        jobId,
        experiment.title,
        experiment.hypothesis,
        experiment.method,
        experiment.metric,
        experiment.successCriteria,
        experiment.duration ?? null,
        experiment.cost ?? null,
        experiment.relatedGapId ?? null,
        1,
        timestamp,
      ],
    );
  }

  await run(
    `INSERT INTO proposed_concepts
       (id, job_id, title, tagline, problem, target_users, solution, differentiators,
        comparisons, risks, validation_plan, similarity_warning, is_demo, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id(),
      jobId,
      "Demo concept: Offline-first assistive companion for low-bandwidth clinics",
      "Works without a connection, escalates only when a human must.",
      "Health workers in low-connectivity areas lose triage context every time the network drops.",
      "Community health workers in low-connectivity areas",
      "An offline-first triage log with a deterministic escalation list and a deferred sync queue.",
      json([
        "Every feature works with the radio off — the sampled records assumed connectivity.",
        "Escalation is rule-based and auditable rather than model-generated.",
      ]),
      json([
        {
          existingProjectTitle: "Sample: Telehealth triage assistant for rural clinics",
          existingProjectUrl: "https://unstop.com/demo/rural-triage-assistant",
          overlap: "Both target community health workers with a triage workflow.",
          similarity: 0.62,
          differences: [
            "This concept treats the offline case as the default rather than an edge case.",
            "Escalation is deterministic instead of model-generated.",
          ],
        },
      ]),
      json([
        "No user has been interviewed yet.",
        "The assumption that a rule-based escalation list is acceptable to clinicians is untested.",
      ]),
      "Run three offline sessions with health workers using a paper-equivalent prototype; measure whether triage decisions match a supervisor's review.",
      null,
      1,
      timestamp,
    ],
  );

  await run(
    `INSERT INTO pitches (id, job_id, content, clarity_score, clarity_notes, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id(),
      jobId,
      json({
        problem:
          "Health workers in low-connectivity areas lose triage context every time the network drops.",
        targetUser: "Community health workers in low-connectivity areas",
        solution:
          "An offline-first triage log with a deterministic escalation list and a deferred sync queue.",
        differentiator:
          "Every feature works with the radio off, and escalation is rule-based so it can be audited.",
        valueProposition:
          "A health worker can complete a triage in a dead spot and still escalate the urgent case when signal returns.",
        validationResults:
          "No experiments have been run yet. Run the suggested sessions and report the real numbers here.",
        businessModel: "Paid by the district health authority; hardware optional.",
        goToMarket:
          "Start with two district clinics as pilot partners, then the regional health ministry.",
        demoOutline: [
          "1. The problem: a dropped connection mid-triage (30 seconds)",
          "2. The user: one health worker, one dead spot (20 seconds)",
          "3. The demo: triage offline, sync later (2 minutes)",
          "4. What we tested and what happened (1 minute)",
          "5. What is next (30 seconds)",
        ],
        judgeQuestions: [
          "How do you know a dropped connection is the real problem for this user?",
          "What happens when the deferred sync queue has a conflict?",
          "Why would a district pay for this over a paper register?",
        ],
        attribution: [
          "Sample: Telehealth triage assistant for rural clinics — inspiration only, not our project.",
        ],
        honestyNotes: [
          "We have not run a user session yet.",
          "The demo dataset these examples come from is synthetic and says nothing about a real market.",
        ],
      }),
      58,
      json([
        "The problem is stated in terms of the user's situation — keep that in the demo.",
        "Validation results are still empty. Judges will ask; prepare the answer now.",
        "The comparison with existing work is only mentioned in the attribution line. Say it out loud.",
      ]),
      1,
      timestamp,
      timestamp,
    ],
  );

  await run(
    `INSERT INTO saved_projects (id, project_id, note, created_at) VALUES (?, ?, ?, ?)`,
    [
      id(),
      projectIds[0],
      "Closest existing work — check the offline assumptions before pitching against it.",
      timestamp,
    ],
  );

  await run(
    `INSERT INTO saved_reports (id, job_id, title, format, created_at) VALUES (?, ?, ?, ?, ?)`,
    [
      id(),
      jobId,
      "AI tools that work without a reliable internet connection (report)",
      "markdown",
      timestamp,
    ],
  );

  // ------------------------------------------------------------------
  // 2. The free-choice discovery run
  // ------------------------------------------------------------------
  const discoveryJobId = id();

  await run(
    `INSERT INTO research_jobs
       (id, topic, problem_statement, domain, target_users, geography,
        result_limit, sources, status, stage, is_demo, result_count,
        sources_checked, is_bookmarked, created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      discoveryJobId,
      "Free-choice discovery — finding a problem worth solving",
      null,
      null,
      null,
      null,
      30,
      json(["demo"]),
      "completed",
      "done",
      1,
      DEMO_RECORDS.length,
      json([
        {
          sourceId: "demo",
          sourceName: "ProjectScope demo dataset",
          status: "ok",
          found: DEMO_RECORDS.length,
          note: "Bundled sample data. No live source was contacted.",
        },
      ]),
      0,
      timestamp,
      timestamp,
      timestamp,
    ],
  );

  for (const [index, record] of DEMO_RECORDS.entries()) {
    const projectId = id();

    await run(
      `INSERT INTO projects
         (id, title, platform, source_id, source_url, attribution, summary,
          problem_addressed, proposed_solution, target_users, technologies,
          business_model, distribution, award, award_verified, ranking, domain,
          cluster_id, uncertainty_notes, discovery_metadata, retrieved_at,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        record.title,
        record.platform,
        "demo",
        record.sourceUrl,
        `ProjectScope demo dataset — "${record.title}"`,
        record.summary,
        record.problemAddressed,
        record.proposedSolution,
        record.targetUsers,
        json(record.technologies),
        record.businessModel,
        record.distribution,
        null,
        0,
        null,
        record.domain,
        null,
        json(record.uncertaintyNotes),
        json([
          {
            sourceId: "demo",
            sourceName: "ProjectScope demo dataset",
            snippet: record.summary,
            accessMode: "manual-import",
            retrievedAt: timestamp,
          },
        ]),
        timestamp,
        timestamp,
        timestamp,
      ],
    );

    await run(
      `INSERT INTO research_results
         (id, job_id, project_id, relevance, rank, discovery_note, is_demo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id(),
        discoveryJobId,
        projectId,
        Math.max(0.3, 0.8 - index * 0.04),
        index + 1,
        "manual-import",
        1,
        timestamp,
      ],
    );
  }

  const discoveryId = id();

  await run(
    `INSERT INTO idea_discoveries
       (id, job_id, interests, tech_preferences, team_capabilities, constraints,
        status, stage, is_demo, error_message, concepts, recommendation, analysis,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      discoveryId,
      discoveryJobId,
      "",
      "",
      "",
      "",
      "completed",
      "done",
      1,
      null,
      json(DEMO_DISCOVERY_CONCEPTS),
      json(DEMO_DISCOVERY_RECOMMENDATION),
      json({
        ...DEMO_DISCOVERY_ANALYSIS,
        commonGround: DEMO_DISCOVERY_COMMON_GROUND,
        unvalidated: DEMO_DISCOVERY_UNVALIDATED,
      }),
      timestamp,
      timestamp,
    ],
  );

  await run(
    `INSERT INTO proposals (id, discovery_id, concept_id, title, content, is_demo, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id(),
      discoveryId,
      DEMO_DISCOVERY_RECOMMENDATION.conceptId,
      DEMO_PROPOSAL.title,
      json(DEMO_PROPOSAL),
      1,
      timestamp,
    ],
  );

  console.log(`Seeded topic-driven run: ${jobId}`);
  console.log(`  ${DEMO_RECORDS.length} demo project records`);
  console.log(`  ${DEMO_REPORT.gaps.length} market gaps`);
  console.log(`  ${DEMO_REPORT.experiments.length} validation experiments`);
  console.log(`  1 concept and 1 pitch`);
  console.log(`Seeded free-choice discovery run: ${discoveryId}`);
  console.log(`  ${DEMO_DISCOVERY_CONCEPTS.length} ranked concepts`);
  console.log(`  1 full project proposal`);
  console.log("");
  console.log("Open http://localhost:3000 to see it. Every record is labelled as demo data.");
}

main()
  .catch((error) => {
    console.error("The seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    client.close();
  });
