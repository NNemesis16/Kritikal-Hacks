<div align="center">

# PROJECTSCOPE

**Find the gap nobody filled — before you build it.**

`AI-powered hackathon project intelligence · Neo Brutalist UI · Next.js 16`

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io)
[![License](https://img.shields.io/badge/License-MIT-d7ff3e?style=flat-square)](#licence)

</div>

---

## THE PROBLEM

You have 48 hours and a blank page. Somewhere out there, forty teams have already built your idea.
One of them won.

Most AI research tools will happily tell you your idea is "novel". They will not tell you that the
same gap-assistant-for-students app has been submitted fourteen times, or that the assistive
technology you are excited about has a two-year-old winner with the same architecture.

**ProjectScope does the opposite.** It finds the existing work first, shows you what everybody
already does, and then helps you build something genuinely different — with every factual claim
linked back to its source.

---

## TWO WAYS IN

| | **FREE-CHOICE** | **TOPIC-DRIVEN** |
| --- | --- | --- |
| **You provide** | Nothing. Optionally: interests, preferred tech, team capabilities, constraints. | A theme, problem statement, domain, target users, geography, sources, result limit. |
| **Entry point** | `★ Find Me a Winning Project Idea` | `I already have a topic →` |
| **You get** | 5 ranked concepts in 5 domains, a recommended one with its evidence, and a complete project proposal. | A project explorer, a market-gap report, a comparison workspace, concepts and a pitch. |

Both modes use the same evidence, the same source policy and the same honesty rules.

---

## THE PIPELINE

```
┌─ FREE-CHOICE ──────────────────────────────────────────┐
│                                                        │
│  1. OPEN-ENDED DISCOVERY                               │
│     TinyFish searches the permitted sources for past   │
│     winners, existing projects, emerging technology    │
│     and real-world problems.                           │
│                                                        │
│  2. NORMALISE + STORE                                  │
│     OpenAI turns raw hits into one consistent shape.   │
│     Attribution, source URLs and timestamps are saved. │
│                                                        │
│  3. ANALYSE WHAT IS BROKEN                             │
│     Gemini finds recurring patterns, weaknesses,       │
│     underserved users and candidate problems.          │
│                                                        │
│  4. DESIGN, SCORE, RANK                                │
│     5 concepts · 5 domains · scored on feasibility,    │
│     originality, impact, ambition, demo potential.     │
│     Every score is justified with evidence.            │
│                                                        │
│  5. RECOMMEND + PROPOSE                                │
│     The strongest idea, why it wins, how it differs,   │
│     and a full buildable proposal.                     │
└────────────────────────────────────────────────────────┘

┌─ TOPIC-DRIVEN ─────────────────────────────────────────┐
│                                                        │
│  1. VALIDATE  →  2. SEARCH  →  3. DEDUPE + NORMALISE   │
│  4. STORE  →  5. ANALYSE  →  6. CLUSTER  →  7. DESIGN │
└────────────────────────────────────────────────────────┘
```

Every stage is resilient. A failing source becomes a warning; the run continues with whatever
succeeded. The number of results you see is always the number that was **actually found**.

---

## SOURCE RULES WE DO NOT BEND

This is the part that matters most, so it lives in code rather than in good intentions.

| Source | What ProjectScope does | Why |
| --- | --- | --- |
| **Devpost** | Search-result **metadata only** (title, snippet, URL) plus the outbound link. Project pages are **never** fetched automatically — not even when you paste the URL. Manual import is offered instead. | Devpost's Terms of Service prohibit scraping and crawling. |
| **Unstop** | Search plus page retrieval for paths its `robots.txt` allows. `/u/`, `/p/`, `/api/` and registration flows are never requested. | Unstop's `robots.txt` explicitly allows AI crawlers on `/competitions/` and `/hackathons/` and disallows the rest. |
| **Hacker News** | Search via the public `hn.algolia.com` API, linking back to the original thread. | The API is intended for programmatic use. |
| **Open web** | Search, plus retrieval where permitted. | Standard respectful crawling limits. |

**The hard rules, enforced in code:**

- No login bypass. No CAPTCHA solving. No access-control circumvention. No rate-limit evasion.
- No user input ever becomes an unrestricted server-side fetch. The only outbound URLs are the ones
  the search providers returned, filtered by an allow-list of permitted hosts.
- We store **short summaries, factual metadata, attribution, source URLs and retrieval
  timestamps** — never a republished third-party submission.
- The UI always shows **the number of records actually found** and **the sources actually
  checked**. It never claims comprehensive coverage.
- When a source cannot be retrieved permissibly, its metadata and the limitation are still shown,
  with a manual-import alternative.

---

## HONESTY RULES THE AI IS INSTRUCTED TO FOLLOW

- Every factual claim in a report carries a source link. Anything without a link is labelled a
  **hypothesis**, not evidence.
- Awards and rankings are only recorded when a source states them, and are labelled *verified* or
  *stated but not independently verified*.
- The model is told never to invent statistics, interviews, awards, citations or competitor
  features, and never to claim a project is novel just because an AI wrote it.
- Every concept is compared explicitly against the existing projects, with a similarity score. A
  similarity of **0.7 or more** raises a visible **"high similarity — not novel"** warning.
- Exported reports end with an **Inspiration & source attribution** section naming the public
  projects the work drew on.
- Validation experiments are proposed so that *you* can produce the evidence. We do not pretend
  the evidence already exists.

---

## THE SCORING MODEL

Free-choice concepts are scored on five axes, **0–10 each**, and the total is the plain sum
(max 50). Every score carries a written rationale, so a score can never be a vibe.

| Axis | What it actually measures |
| --- | --- |
| **Feasibility** | Can a small team build a demonstrable version of this in a hackathon? |
| **Originality** | How different is it from the projects we actually retrieved? (Not how clever it sounds.) |
| **Real-world impact** | How much value could it have if it worked? |
| **Technical ambition** | How technically ambitious is it, without becoming unrealistic? |
| **Live-demo potential** | Can you show this working in 3–5 minutes on a stage? |

---

## STACK

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router, React 19, Turbopack) |
| Language | **TypeScript 5** (strict) |
| Styling | **Tailwind CSS v4** + a hand-rolled Neo Brutalist component system |
| Smooth scroll | **Lenis** |
| Database | **Prisma 7 + SQLite** (driver adapter: `better-sqlite3`) |
| Validation | **Zod v4** — requests, responses, environment, structured AI output |
| Live progress | **Server-sent events** (resumable via `Last-Event-ID`) |
| Discovery | [`@tiny-fish/sdk`](https://www.npmjs.com/package/@tiny-fish/sdk) — Search API + Fetch API |
| Normalisation & design | [`openai`](https://www.npmjs.com/package/openai) — Responses API + structured outputs |
| Gap analysis | [`@google/genai`](https://www.npmjs.com/package/@google/genai) — Interactions API + `google_search` grounding |

Provider SDKs are isolated in three files so any one of them can be replaced without touching the
rest of the app:

```
src/lib/providers/tinyfish.ts   →  discovery
src/lib/providers/openai.ts     →  normalise · cluster · compare · score · propose · pitch
src/lib/providers/gemini.ts     →  market-gap report · free-choice analysis (grounded)
```

---

## QUICK START (WINDOWS POWERSHELL)

```powershell
# 1. Install dependencies
npm.cmd install

# 2. Create your local environment file
Copy-Item .env.example .env.local

# 3. (optional) Paste your keys into .env.local — see "Credentials" below.
#    Without keys the app runs in clearly-labelled demo mode.

# 4. Create the SQLite database and generate the Prisma client
npx.cmd prisma migrate deploy
npx.cmd prisma generate

# 5. (optional) Load the demo dataset so every page has content
npx.cmd prisma db seed

# 6. Start the development server
npm.cmd run dev

# 7. Open http://localhost:3000
```

> On Windows, `npm` may be blocked by the PowerShell execution policy. Use `npm.cmd` instead, or
> run the command in `cmd.exe`.

---

## CREDENTIALS

All three secrets are read **on the server only**. They are never exposed to the browser, never
put in a `NEXT_PUBLIC_` variable, and never logged.

| Variable | Where to get it | What it does |
| --- | --- | --- |
| `TINYFISH_API_KEY` | [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) | Discovery. The TinyFish **Search API** finds candidate projects; the **Fetch API** retrieves pages from sources whose terms allow it. |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Normalising records, clustering approaches, comparing your idea against what exists, scoring concepts, reviewing the pitch. |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Synthesising the market-gap report and the free-choice analysis, with Google Search grounding when the model supports it. |

Optional:

| Variable | Default | Meaning |
| --- | --- | --- |
| `OPENAI_MODEL` | `gpt-6.1-sol` | Any model supporting the Responses API and structured outputs. |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Any Gemini model supporting the Interactions API and the `google_search` tool. |
| `DATABASE_URL` | `file:./dev.db` | Resolved to `prisma/dev.db`. |
| `DEMO_MODE` | — | `true` forces demo mode even if keys are present. |
| `MAX_RESULTS_LIMIT` | `40` | Ceiling on records collected per run. |
| `PROVIDER_TIMEOUT_MS` | `45000` | Timeout for every outbound provider call. |

### Rotating a key

1. Create a new key in the provider's dashboard.
2. Update the value in `.env.local` and restart the dev server.
3. Revoke the old key in the provider's dashboard.
4. Confirm the rotation with `curl http://localhost:3000/api/health` — it reports *which*
   providers are configured, never a key value.

`.env.local` is git-ignored. `.env.example` contains no real values.

---

## DEMO MODE

If no provider credentials are configured (or `DEMO_MODE=true`), the app runs on a bundled sample
dataset. Demo records are stored with a `demo` source id, flagged `isDemo`, and rendered behind a
permanent banner on every page and a badge on every card.

**Demo records are never presented as live research.**

The seed (`npx.cmd prisma db seed`) creates two fully-worked demo runs: a topic-driven research
run with 12 projects, a market-gap report, experiments, a concept and a pitch — and a free-choice
discovery run with 5 ranked concepts and a complete project proposal.

---

## CHECKS

```powershell
npm.cmd run typecheck   # tsc --noEmit
npm.cmd run lint        # eslint
npm.cmd test            # vitest — unit + integration
npm.cmd run build       # production build
```

The suite covers:

- request, response and structured-AI schema validation
- source policy (Devpost is never fetched, Unstop's disallowed paths are blocked)
- query construction for both pipelines
- secret redaction and error mapping in all three provider clients
- the provider clients against **mocked SDKs** — success, malformed payloads, quota, rate limit,
  timeout, key rejection
- a full integration run of **both** pipelines against an isolated test database

`prisma/test.db` is recreated from the migrations on every run, so tests never touch your
development data and never make a network call.

---

## PROJECT STRUCTURE

```
prisma/
  schema.prisma            Data model (SQLite; JSON payloads stored as strings)
  seed.ts                  Demo dataset — a topic run AND a free-choice run
prisma.config.ts           Prisma 7 config (env loading + datasource URL)
src/
  app/
    page.tsx               Landing page + "Find Me a Winning Project Idea"
    discover/              FREE-CHOICE mode
    research/              Configuration + live research view (SSE)
    projects/              Project explorer + detail
    compare/               Comparison workspace
    report/                Market-gap report
    ideas/                 Original Idea Studio
    pitch/                 Pitch Studio
    saved/                 Saved research, projects and exports
    api/                   Route handlers — every provider call happens here
  components/
    ui.tsx                 The Neo Brutalist component system
    app-shell.tsx          Header, nav, demo banner, footer
    smooth-scroll.tsx      Lenis
    discovery-studio.tsx   The free-choice UI
    live-research.tsx      SSE progress view
    project-card.tsx  compare-workspace.tsx  idea-studio.tsx  pitch-studio.tsx
    landing-search.tsx  research-form.tsx  manual-import.tsx  export-buttons.tsx
  lib/
    ai-json.ts             Zod → JSON Schema (for Gemini `response_format`)
    ai-schemas.ts          Strict schemas for every structured AI output
    api.ts                 Route-handler helpers (validation + error shape)
    database-url.ts        Resolves the SQLite URL consistently
    db.ts                  Prisma client singleton
    env.ts                 Server-only environment (guarded with `server-only`)
    errors.ts              Typed errors + secret redaction
    json.ts                Safe JSON (de)serialisation
    products.ts            Project queries and facets
    schema.ts              Request/response Zod schemas + source registry
    utils.ts               Small shared helpers
    providers/
      tinyfish.ts          Search + Fetch
      openai.ts            Normalise · cluster · compare · score · propose · pitch
      gemini.ts            Market-gap report + free-choice analysis (grounded)
    research/
      collect.ts           Shared search → normalise → store stage
      pipeline.ts          Topic-driven pipeline
      discovery.ts         Free-choice pipeline
      events.ts            Persisted progress events
      sources.ts           Source policy + query construction
      demo.ts              Bundled sample dataset
tests/                     Vitest unit + integration tests
```

---

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/research` | Start a topic-driven run. |
| `GET` | `/api/research` | List runs. |
| `GET` | `/api/research/[jobId]` | Run status + sources checked. |
| `GET` | `/api/research/[jobId]/events` | **SSE** progress stream (resumable). |
| `POST` | `/api/research/[jobId]/cancel` | Cancel a run. |
| `POST` | `/api/research/[jobId]/import` | Manual import (the permitted alternative). |
| `POST` | `/api/research/[jobId]/bookmark` | Save / unsave a run. |
| `POST` | `/api/discover` | Start a free-choice discovery run. |
| `GET` | `/api/discover?discoveryId=` | Read a discovery run. |
| `POST` | `/api/discover/[discoveryId]/proposal` | Build a proposal, or regenerate concepts. |
| `GET` | `/api/projects` | Explorer with keyword / platform / award / technology / domain filters. |
| `GET` | `/api/projects/[id]` | One project with full source attribution. |
| `POST` | `/api/projects/save` | Bookmark a project. |
| `POST` `GET` | `/api/analysis` | Generate / read the market-gap report. |
| `POST` `GET` | `/api/concepts` | Generate / read concepts. |
| `POST` `GET` | `/api/pitch` | Generate / read the pitch. |
| `POST` | `/api/compare` | Compare a set of approaches. |
| `POST` | `/api/export` | Export Markdown or JSON. |
| `GET` | `/api/health` | Which providers are configured. Never a key value. |

---

## TROUBLESHOOTING

| Symptom | Cause | Fix |
| --- | --- | --- |
| "Demo mode" banner but you have keys | The keys are in `.env` not `.env.local`, or the server was not restarted. | Put them in `.env.local` and restart `npm.cmd run dev`. |
| `P1012` on `prisma migrate` | The schema changed but no migration was created. | `npx.cmd prisma migrate dev --name <name>`. |
| "Cannot find module '@/generated/prisma/client'" | The client has not been generated. | `npx.cmd prisma generate`. |
| `too many connections` | The Prisma client was re-instantiated. | `src/lib/db.ts` caches the client on `globalThis` — always import it from there. |
| `Invalid environment configuration for: …` | A value in `.env.local` is malformed. | The error names the offending fields, never their values. |
| Provider returns `invalid_key` | The key is wrong, revoked, or has whitespace. | Recreate it in the provider dashboard and paste it without trailing spaces. |

---

## LICENCE

MIT © ProjectScope.

The demo dataset is **synthetic**. It describes no real project, competition result, award or
market. The public projects referenced during a live run belong to their creators — ProjectScope
lists them so the work can be compared honestly, and reusing them without attribution is not
acceptable.

</div>
