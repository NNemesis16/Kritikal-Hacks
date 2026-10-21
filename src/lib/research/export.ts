import "server-only";

/**
 * Report export.
 *
 * The exported document always contains an "Inspiration & source attribution"
 * section listing the public projects the work drew on, so a reader can see
 * what is borrowed and what is the user's own.
 */
import { parseJson } from "@/lib/json";
import { marketGapSchema, pitchContentSchema, type PitchContent } from "@/lib/schema";
import {
  getResearchJobForExport,
} from "@/lib/repo";


function bullet(value: string): string {
  return value.trim() ? `- ${value.trim()}` : "- _(not stated)_";
}

export async function buildMarkdownReport(jobId: string): Promise<string> {
  const bundle = await getResearchJobForExport(jobId);

  if (!bundle) throw new Error("That research job does not exist.");

  const job = bundle.job;
  const lines: string[] = [];
  const isDemo = job.isDemo;

  lines.push(`# ProjectScope research report`);
  lines.push("");
  lines.push(`**Topic:** ${job.topic}`);
  if (job.problemStatement) lines.push(`**Problem statement:** ${job.problemStatement}`);
  if (job.domain) lines.push(`**Domain:** ${job.domain}`);
  if (job.targetUsers) lines.push(`**Target users:** ${job.targetUsers}`);
  if (job.geography) lines.push(`**Geography:** ${job.geography}`);
  lines.push(`**Generated:** ${job.createdAt}`);
  lines.push(`**Records found:** ${job.resultCount}`);
  lines.push("");

  if (isDemo) {
    lines.push(
      "> **DEMO MODE.** This report was produced from the bundled sample dataset because no " +
        "provider credentials were configured. Nothing in it describes a real project, award or market.",
    );
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## 1. Coverage");
  lines.push("");
  const checks = parseJson<Array<{ sourceName: string; status: string; found: number; note: string }>>(
    job.sourcesChecked,
    [],
  );
  if (checks.length === 0) {
    lines.push("_No source checks were recorded for this run._");
  } else {
    lines.push("| Source | Status | Records found | Note |");
    lines.push("| --- | --- | --- | --- |");
    for (const check of checks) {
      lines.push(
        `| ${check.sourceName} | ${check.status} | ${check.found} | ${check.note.replace(/\|/g, "/")} |`,
      );
    }
  }
  lines.push("");
  lines.push(
    "ProjectScope only reports the records it actually found, from the sources it actually " +
      "checked. It does not claim comprehensive coverage of any platform.",
  );
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("## 2. Projects found");
  lines.push("");
  if (bundle.results.length === 0) {
    lines.push("_No project records were collected for this run._");
  } else {
    for (const [index, result] of bundle.results.entries()) {
      const project = result.project;
      if (!project) continue;
      lines.push(`### ${index + 1}. ${project.title}`);
      lines.push("");
      lines.push(`- **Platform:** ${project.platform}`);
      lines.push(`- **Source:** ${project.attribution}`);
      lines.push(`- **Link:** ${project.sourceUrl}`);
      lines.push(`- **Retrieved:** ${project.retrievedAt}`);
      lines.push(`- **Relevance:** ${Math.round(result.relevance * 100)}%`);
      lines.push("");
      lines.push(`**Summary:** ${project.summary}`);
      lines.push("");
      lines.push(`- **Problem addressed:** ${project.problemAddressed || "_not stated in the source_"}`);
      lines.push(`- **Proposed solution:** ${project.proposedSolution || "_not stated in the source_"}`);
      lines.push(`- **Target users:** ${project.targetUsers || "_not stated in the source_"}`);
      const technologies = parseJson<string[]>(project.technologies, []);
      lines.push(
        `- **Technologies:** ${technologies.length ? technologies.join(", ") : "_not stated in the source_"}`,
      );
      lines.push(
        `- **Award / ranking:** ${
          project.award
            ? `${project.award}${project.awardVerified ? " (verified from the source)" : " (stated in the source, not independently verified)"}`
            : "_none found_"
        }`,
      );
      const uncertainty = parseJson<string[]>(project.uncertaintyNotes, []);
      if (uncertainty.length) {
        lines.push("- **Uncertainty:**");
        for (const note of uncertainty) lines.push(`  - ${note}`);
      }
      lines.push("");
    }
  }

  if (bundle.report) {
    const gaps = parseJson(bundle.report.gaps, [], marketGapSchema.array());
    const patterns = parseJson<Array<{ pattern: string; occurrences: string[]; evidenceCount: number }>>(
      bundle.report.patterns,
      [],
    );
    const competitors = parseJson<Array<Record<string, unknown>>>(bundle.report.competitors, []);
    const assumptions = parseJson<Array<Record<string, unknown>>>(bundle.report.assumptions, []);
    const sources = parseJson<Array<{ title: string; url: string; source: string }>>(
      bundle.report.sources,
      [],
    );

    lines.push("---");
    lines.push("");
    lines.push("## 3. Market-gap report");
    lines.push("");
    lines.push(bundle.report.summary);
    lines.push("");

    lines.push("### Gaps");
    lines.push("");
    if (gaps.length === 0) {
      lines.push("_No gaps were identified._");
    }
    for (const gap of gaps) {
      lines.push(`#### ${gap.title}`);
      lines.push("");
      lines.push(`- **Claim type:** ${gap.claimType} (${gap.claimType === "evidence" ? "backed by a source" : "our reasoning"})`);
      lines.push(`- **Observation:** ${gap.observation}`);
      lines.push(`- **Confidence:** ${gap.confidence}`);
      lines.push("- **Supporting evidence:**");
      for (const evidence of gap.supportingEvidence) lines.push(`  - ${evidence}`);
      if (gap.sourceUrls.length) {
        lines.push("- **Source links:**");
        for (const url of gap.sourceUrls) lines.push(`  - ${url}`);
      }
      lines.push("- **Assumptions:**");
      for (const assumption of gap.assumptions) lines.push(`  - ${assumption}`);
      lines.push("- **Affected users:**");
      for (const user of gap.affectedUsers) lines.push(`  - ${user}`);
      lines.push(`- **Proposed improvement:** ${gap.proposedImprovement || "_not stated_"}`);
      lines.push(`- **Potential business value:** ${gap.potentialBusinessValue || "_not stated_"}`);
      lines.push(`- **Validation experiment:** ${gap.validationExperiment || "_not stated_"}`);
      lines.push("");
    }

    lines.push("### Repeated patterns");
    lines.push("");
    if (patterns.length === 0) lines.push("_No repeated patterns were identified._");
    for (const pattern of patterns) {
      lines.push(`- **${pattern.pattern}** (seen in ${pattern.evidenceCount} record(s))`);
      for (const occurrence of pattern.occurrences) lines.push(`  - ${occurrence}`);
    }
    lines.push("");

    lines.push("### Competitor comparison");
    lines.push("");
    if (competitors.length === 0) lines.push("_No competitor profiles were produced._");
    for (const competitor of competitors) {
      lines.push(`#### ${String(competitor.name ?? "")}`);
      lines.push("");
      lines.push(`- **Link:** ${String(competitor.url ?? "") || "_none_"}`);
      lines.push(`- **Approach:** ${String(competitor.approach ?? "") || "_not stated_"}`);
      lines.push(`- **Target users:** ${String(competitor.targetUsers ?? "") || "_not stated_"}`);
      lines.push(`- **Business model:** ${String(competitor.businessModel ?? "") || "_not stated_"}`);
      lines.push(`- **Distribution:** ${String(competitor.distribution ?? "") || "_not stated_"}`);
      const limitations = Array.isArray(competitor.limitations) ? (competitor.limitations as string[]) : [];
      lines.push("- **Evidenced limitations:**");
      for (const limitation of limitations.length ? limitations : ["_none evidenced_"]) {
        lines.push(`  - ${limitation}`);
      }
      lines.push("");
    }

    lines.push("### Assumptions");
    lines.push("");
    if (assumptions.length === 0) lines.push("_No assumptions were recorded._");
    for (const assumption of assumptions) {
      lines.push(`- **${String(assumption.assumption ?? "")}**`);
      lines.push(`  - Why it matters: ${String(assumption.whyItMatters ?? "") || "_not stated_"}`);
      lines.push(`  - How to validate: ${String(assumption.howToValidate ?? "") || "_not stated_"}`);
    }
    lines.push("");

    lines.push("### Validation experiments");
    lines.push("");
    if (bundle.experiments.length === 0) lines.push("_No experiments were proposed._");
    for (const experiment of bundle.experiments) {
      lines.push(`#### ${experiment.title}`);
      lines.push("");
      lines.push(`- **Hypothesis:** ${experiment.hypothesis}`);
      lines.push(`- **Method:** ${experiment.method}`);
      lines.push(`- **Metric:** ${experiment.metric}`);
      lines.push(`- **Success criteria:** ${experiment.successCriteria}`);
      if (experiment.duration) lines.push(`- **Duration:** ${experiment.duration}`);
      if (experiment.cost) lines.push(`- **Estimated cost:** ${experiment.cost}`);
      lines.push("");
    }

    lines.push("### Sources cited in the report");
    lines.push("");
    if (sources.length === 0) lines.push("_No sources were cited._");
    for (const source of sources) {
      lines.push(`- [${source.title || source.url}](${source.url})${source.source ? ` — ${source.source}` : ""}`);
    }
    lines.push("");
  }

  if (bundle.concepts.length) {
    lines.push("---");
    lines.push("");
    lines.push("## 4. Proposed concepts");
    lines.push("");
    for (const concept of bundle.concepts) {
      lines.push(`### ${concept.title}`);
      lines.push("");
      lines.push(`> ${concept.tagline}`);
      lines.push("");
      lines.push(`- **Problem:** ${concept.problem}`);
      lines.push(`- **Target users:** ${concept.targetUsers}`);
      lines.push(`- **Solution:** ${concept.solution}`);
      lines.push("- **Differentiators:**");
      for (const differentiator of parseJson<string[]>(concept.differentiators, [])) {
        lines.push(`  - ${differentiator}`);
      }
      lines.push("- **Comparison with existing work:**");
      for (const comparison of parseJson<
        Array<{ existingProjectTitle: string; existingProjectUrl: string; overlap: string; similarity: number; differences: string[] }>
      >(concept.comparisons, [])) {
        lines.push(
          `  - **${comparison.existingProjectTitle}** (${Math.round(comparison.similarity * 100)}% similar) — ${comparison.overlap}`,
        );
        for (const difference of comparison.differences) lines.push(`    - difference: ${difference}`);
      }
      if (concept.similarityWarning) {
        lines.push(`- **Similarity warning:** ${concept.similarityWarning}`);
      }
      lines.push("- **Risks / unvalidated assumptions:**");
      for (const risk of parseJson<string[]>(concept.risks, [])) lines.push(`  - ${risk}`);
      lines.push(`- **Validation plan:** ${concept.validationPlan}`);
      lines.push("");
    }
  }

  if (bundle.pitch) {
    const content = parseJson(bundle.pitch.content, {} as PitchContent, pitchContentSchema);
    lines.push("---");
    lines.push("");
    lines.push("## 5. Pitch");
    lines.push("");
    lines.push(`### Problem\n${content.problem || "_not written_"}`);
    lines.push("");
    lines.push(`### Target user\n${content.targetUser || "_not written_"}`);
    lines.push("");
    lines.push(`### Solution\n${content.solution || "_not written_"}`);
    lines.push("");
    lines.push(`### Differentiator\n${content.differentiator || "_not written_"}`);
    lines.push("");
    lines.push(`### Value proposition\n${content.valueProposition || "_not written_"}`);
    lines.push("");
    lines.push(`### Validation results\n${content.validationResults || "_not written_"}`);
    lines.push("");
    lines.push(`### Business model\n${content.businessModel || "_not written_"}`);
    lines.push("");
    lines.push(`### Go-to-market\n${content.goToMarket || "_not written_"}`);
    lines.push("");
    lines.push("### Demo outline");
    for (const beat of content.demoOutline.length ? content.demoOutline : ["_not written_"]) {
      lines.push(bullet(beat));
    }
    lines.push("");
    lines.push("### Likely judge questions");
    for (const question of content.judgeQuestions.length ? content.judgeQuestions : ["_not written_"]) {
      lines.push(bullet(question));
    }
    lines.push("");
    const honesty = parseJson<string[]>(bundle.pitch.clarityNotes, []);
    if (honesty.length) {
      lines.push("### Reviewer notes");
      for (const note of honesty) lines.push(bullet(note));
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("");
  lines.push("## Inspiration & source attribution");
  lines.push("");
  lines.push(
    "The public projects below belong to their creators. ProjectScope lists them so the work can " +
      "be compared honestly. They are not the user's project, and reusing them without " +
      "attribution is not acceptable.",
  );
  lines.push("");
  const seen = new Set<string>();
  for (const result of bundle.results) {
    const project = result.project;
    if (!project) continue;
    if (seen.has(project.sourceUrl)) continue;
    seen.add(project.sourceUrl);
    lines.push(`- [${project.title}](${project.sourceUrl}) — ${project.attribution}`);
  }
  if (seen.size === 0) {
    lines.push("_No public projects were used for this run._");
  }
  lines.push("");
  lines.push("### Source pages retrieved");
  lines.push("");
  if (bundle.sourceReferences.length === 0) {
    lines.push("_No source pages were retrieved._");
  } else {
    for (const reference of bundle.sourceReferences) {
      lines.push(
        `- [${reference.title ?? reference.url}](${reference.url}) — ${reference.sourceName} — access: ${reference.accessMode} — retrieved ${reference.retrievedAt}`,
      );
    }
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push(
    "_Generated by ProjectScope. AI-generated text is a starting point, not evidence. " +
      "Describe your own implementation, tests and results truthfully._",
  );

  return lines.join("\n");
}

export async function buildJsonExport(jobId: string): Promise<unknown> {
  const bundle = await getResearchJobForExport(jobId);

  if (!bundle) throw new Error("That research job does not exist.");

  const job = bundle.job;

  return {
    job: {
      id: job.id,
      topic: job.topic,
      problemStatement: job.problemStatement,
      domain: job.domain,
      targetUsers: job.targetUsers,
      geography: job.geography,
      status: job.status,
      isDemo: job.isDemo,
      resultCount: job.resultCount,
      createdAt: job.createdAt,
      completedAt: job.completedAt ?? null,
    },
    sourcesChecked: parseJson(job.sourcesChecked, []),
    projects: bundle.results.map((result) => {
      const project = result.project;
      return {
        id: project?.id ?? "",
        title: project?.title ?? "",
        platform: project?.platform ?? "",
        summary: project?.summary ?? "",
        problemAddressed: project?.problemAddressed ?? null,
        proposedSolution: project?.proposedSolution ?? null,
        targetUsers: project?.targetUsers ?? null,
        technologies: parseJson<string[]>(project?.technologies ?? "[]", []),
        businessModel: project?.businessModel ?? null,
        distribution: project?.distribution ?? null,
        award: project?.award ?? null,
        awardVerified: project?.awardVerified ?? false,
        domain: project?.domain ?? null,
        uncertaintyNotes: parseJson<string[]>(project?.uncertaintyNotes ?? "[]", []),
        sourceUrl: project?.sourceUrl ?? "",
        attribution: project?.attribution ?? "",
        retrievedAt: project?.retrievedAt ?? "",
        relevance: result.relevance,
      };
    }),
    report: bundle.report
      ? {
          summary: bundle.report?.summary ?? "",
          gaps: parseJson(bundle.report.gaps, [], marketGapSchema.array()),
          patterns: parseJson(bundle.report.patterns, []),
          competitors: parseJson(bundle.report.competitors, []),
          assumptions: parseJson(bundle.report.assumptions, []),
          sources: parseJson(bundle.report.sources, []),
          isDemo: bundle.report?.isDemo ?? false,
        }
      : null,
    experiments: bundle.experiments.map((experiment) => ({
      title: experiment.title,
      hypothesis: experiment.hypothesis,
      method: experiment.method,
      metric: experiment.metric,
      successCriteria: experiment.successCriteria,
      duration: experiment.duration,
      cost: experiment.cost,
      relatedGapId: experiment.relatedGapId,
    })),
    concepts: bundle.concepts.map((concept) => ({
      title: concept.title,
      tagline: concept.tagline,
      problem: concept.problem,
      targetUsers: concept.targetUsers,
      solution: concept.solution,
      differentiators: parseJson<string[]>(concept.differentiators, []),
      comparisons: parseJson(concept.comparisons, []),
      risks: parseJson<string[]>(concept.risks, []),
      validationPlan: concept.validationPlan,
      similarityWarning: concept.similarityWarning,
    })),
    pitch: bundle.pitch
      ? {
          content: parseJson(bundle.pitch?.content ?? "{}", {} as PitchContent, pitchContentSchema),
          clarityScore: bundle.pitch?.clarityScore ?? null,
          clarityNotes: parseJson<string[]>(bundle.pitch?.clarityNotes ?? "[]", []),
          isDemo: bundle.pitch?.isDemo ?? false,
        }
      : null,
    sourceReferences: bundle.sourceReferences.map((reference) => ({
      url: reference.url,
      title: reference.title,
      sourceName: reference.sourceName,
      attribution: reference.attribution,
      accessMode: reference.accessMode,
      retrievedAt: reference.retrievedAt,
    })),
  };
}
