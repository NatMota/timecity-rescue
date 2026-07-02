create table if not exists clickstream_events (
  id uuid primary key default gen_random_uuid(),
  session_code text not null,
  student_id text,
  actor text not null default 'student',
  event_type text not null,
  route text,
  node_key text,
  room_slug text,
  choice_id text,
  choice_classification text,
  misconception text,
  response_ms int,
  scene_elapsed_ms int,
  first_choice_ms int,
  clue_count int,
  read_again_count int,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_clickstream_events_session_time
  on clickstream_events(session_code, created_at desc);

create index if not exists idx_clickstream_events_student_time
  on clickstream_events(student_id, created_at desc)
  where student_id is not null;

create index if not exists idx_clickstream_events_type_time
  on clickstream_events(event_type, created_at desc);

create table if not exists llm_generation_events (
  id uuid primary key default gen_random_uuid(),
  session_code text,
  student_id text,
  node_key text not null,
  room_slug text,
  language text not null default 'en',
  model text not null,
  resolved_model text,
  prompt_hash text not null,
  prompt_chars int,
  latency_ms int,
  success boolean not null default false,
  used_fallback boolean not null default false,
  validation_errors jsonb not null default '[]',
  error_message text,
  usage_details jsonb not null default '{}',
  scene_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_llm_generation_events_session_time
  on llm_generation_events(session_code, created_at desc)
  where session_code is not null;

create index if not exists idx_llm_generation_events_student_time
  on llm_generation_events(student_id, created_at desc)
  where student_id is not null;

create index if not exists idx_llm_generation_events_node_time
  on llm_generation_events(node_key, created_at desc);

comment on table clickstream_events is
  'Server-side TimeCity interaction telemetry. Uses app-level session/student ids; no direct browser Supabase writes.';

comment on table llm_generation_events is
  'Server-side TimeCity LLM scene generation telemetry, including model, prompt hash, validation, fallback, and token usage details.';
