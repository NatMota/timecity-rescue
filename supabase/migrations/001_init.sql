create extension if not exists "pgcrypto";

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  created_at timestamptz default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references teachers(id),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists adventures (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  age_band text not null,
  version text default '0.1'
);

create table if not exists episodes (
  id uuid primary key default gen_random_uuid(),
  adventure_id uuid references adventures(id),
  episode_number int not null,
  title text not null,
  learning_objectives jsonb not null default '[]',
  fixed_room_sequence jsonb not null default '[]',
  unique (adventure_id, episode_number)
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references episodes(id),
  slug text not null,
  title text not null,
  era text not null,
  background_asset_url text,
  allowed_characters jsonb not null default '[]',
  allowed_backpack_items jsonb not null default '[]',
  unique (episode_id, slug)
);

create table if not exists story_nodes (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references episodes(id),
  room_id uuid references rooms(id),
  node_key text unique not null,
  bloom_level text,
  curriculum_concept text,
  fixed_story_beat text not null,
  canonical_prompt_intent text not null,
  allowed_choice_types jsonb not null default '[]',
  misconceptions jsonb not null default '{}',
  required_backpack_item text,
  next_node_rules jsonb not null default '{}',
  sort_order int not null
);

create table if not exists class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id),
  adventure_id uuid references adventures(id),
  current_episode int default 1,
  session_code text unique not null,
  age_band text not null default '9-10',
  language_default text not null default 'en',
  status text not null default 'draft',
  created_at timestamptz default now()
);

create table if not exists session_students (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid references class_sessions(id),
  display_name text not null,
  avatar_config jsonb not null default '{}',
  language text not null default 'en',
  current_episode int default 1,
  current_room_id uuid references rooms(id),
  current_node_id uuid references story_nodes(id),
  created_at timestamptz default now()
);

create table if not exists student_state (
  id uuid primary key default gen_random_uuid(),
  session_student_id uuid references session_students(id) unique,
  mastery jsonb not null default '{}',
  engagement jsonb not null default '{}',
  learning_preference jsonb not null default '{}',
  risk_flags jsonb not null default '{}',
  backpack_items jsonb not null default '[]',
  badges jsonb not null default '{}',
  guild_scores jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table if not exists generated_scenes (
  id uuid primary key default gen_random_uuid(),
  session_student_id uuid references session_students(id),
  story_node_id uuid references story_nodes(id),
  model text,
  prompt_hash text,
  difficulty_level int default 2,
  language text not null default 'en',
  character_state text,
  scene_payload jsonb not null,
  evaluation_key jsonb not null,
  validated boolean default false,
  created_at timestamptz default now()
);

create table if not exists student_responses (
  id uuid primary key default gen_random_uuid(),
  session_student_id uuid references session_students(id),
  story_node_id uuid references story_nodes(id),
  generated_scene_id uuid references generated_scenes(id),
  choice_id text,
  choice_classification text,
  misconception text,
  response_ms int,
  used_clue boolean default false,
  used_read_again boolean default false,
  created_at timestamptz default now()
);

create table if not exists mementos (
  id uuid primary key default gen_random_uuid(),
  session_student_id uuid references session_students(id),
  type text not null,
  payload jsonb not null,
  pdf_url text,
  created_at timestamptz default now()
);

create table if not exists session_snapshots (
  session_code text primary key,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_session_students_session on session_students(class_session_id);
create index if not exists idx_student_responses_student on student_responses(session_student_id);
create index if not exists idx_generated_scenes_student on generated_scenes(session_student_id);

comment on schema public is 'TimeCity Rescue hackathon schema. Production must enable RLS policies before direct client access; the MVP routes use server-side service-role writes.';
