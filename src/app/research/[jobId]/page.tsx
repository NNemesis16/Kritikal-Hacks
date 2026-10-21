import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LiveResearch, type LiveEvent, type LiveJob } from "@/components/live-research";
import { ManualImport } from "@/components/manual-import";
import { parseJson } from "@/lib/json";
import { sourceCheckSchema } from "@/lib/schema";
import {
  getResearchJobWithEvents,
} from "@/lib/repo";


export const metadata: Metadata = {
  title: "Live research",
};

export const dynamic = "force-dynamic";

export default async function ResearchRunPage({ params }: PageProps<"/research/[jobId]">) {
  const { jobId } = await params;

  const bundle = await getResearchJobWithEvents(jobId);

  if (!bundle) notFound();

  const job = bundle.job;

  const liveJob: LiveJob = {
    id: job.id,
    topic: job.topic,
    problemStatement: job.problemStatement,
    domain: job.domain,
    targetUsers: job.targetUsers,
    geography: job.geography,
    status: job.status,
    stage: job.stage,
    isDemo: job.isDemo,
    errorMessage: job.errorMessage,
    resultCount: job.resultCount,
    sourcesChecked: parseJson(job.sourcesChecked, [], sourceCheckSchema.array()),
  };

  const liveEvents: LiveEvent[] = bundle.events.map((event) => ({
    id: event.id,
    type: event.type,
    stage: event.stage,
    message: event.message,
    level: event.level as LiveEvent["level"],
    payload: event.payload,
    createdAt: event.createdAt,
  }));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/research"
          className="text-sm font-medium text-punch hover:underline"
        >
          ← Back to research setup
        </Link>
      </div>
      <LiveResearch initialJob={liveJob} initialEvents={liveEvents} />

      <div className="mt-10">
        <ManualImport jobId={jobId} />
      </div>
    </div>
  );
}
