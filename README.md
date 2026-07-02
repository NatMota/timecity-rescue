# TimeCity Rescue

TimeCity Rescue is a classroom-safe AI literacy prototype for 9-10 year olds. Pupils join a fixed Episode 1 adventure, make multiple-choice decisions, and learn that an AI agent needs a clear goal, useful inputs, rules, outputs, and human oversight.

The product is intentionally sandboxed:

- Pupils do not type free-text prompts or chat with AI.
- The story graph, rooms, characters, choices, and evaluation keys are fixed.
- Teachers can start, pause, monitor, assist, skip, or reset pupils.
- Supabase persistence is optional locally but recommended for Vercel.
- OpenAI scene generation is optional; deterministic fallback scenes are always available.

## Run locally

```bash
pnpm install
pnpm dev
```

Open:

- Teacher dashboard: `http://localhost:3000/teacher`
- Student demo join: `http://localhost:3000/play/DEMO`

## Environment

Copy `.env.example` to `.env.local` for local development. With no env vars, the app runs in memory-only demo mode.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SECRET_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
LANGFUSE_BASE_URL=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
NEXT_PUBLIC_DEMO_MODE=true
```

## Supabase

The schema is in `supabase/migrations/001_init.sql` and the Episode 1 seed data is in `supabase/seed/episode1_nodes.sql`.

For a linked Supabase project:

```bash
supabase db push
supabase db query --linked --file supabase/seed/episode1_nodes.sql
```

To create the project from the CLI once a Supabase access token is available:

```bash
export SUPABASE_ACCESS_TOKEN=...
export SUPABASE_ORG_ID=...
export SUPABASE_DB_PASSWORD=...
./scripts/provision-supabase.sh
```

The current deployed runtime persists classroom state in `session_snapshots`. It also writes append-only server-side telemetry to `clickstream_events` and `llm_generation_events`. The normalized curriculum tables are included for future reporting, authoring, and evidence capture.

## Verification

```bash
pnpm lint
pnpm build
```

Expected checks:

- Teacher can create a session and copy a join link.
- Student can join with a preset codename, language, and avatar colour.
- Student choices advance through Episode 1 without free-text input.
- Teacher dashboard refreshes progress and can override a selected pupil.
- Completed pupils can generate a mission goal card.

## Assets

Room graphics are stored in `public/assets/rooms`. Source dumped/generated assets live one level up in `../timecity_graphics_dump`.
