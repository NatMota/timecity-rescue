insert into adventures (slug, title, age_band, version)
values ('timecity-rescue', 'TimeCity Rescue', '9-10', '0.1')
on conflict (slug) do update set title = excluded.title, age_band = excluded.age_band, version = excluded.version;

with adventure as (
  select id from adventures where slug = 'timecity-rescue'
), episode_upsert as (
  insert into episodes (adventure_id, episode_number, title, learning_objectives, fixed_room_sequence)
  select
    id,
    1,
    'The Missing Minute',
    '["Pupils explain that an AI agent needs a goal, inputs, rules and outputs before it can safely take action."]'::jsonb,
    '["future_agent_lab", "future_market", "future_agent_lab_return"]'::jsonb
  from adventure
  on conflict (adventure_id, episode_number) do update set
    title = excluded.title,
    learning_objectives = excluded.learning_objectives,
    fixed_room_sequence = excluded.fixed_room_sequence
  returning id
), room_values as (
  select id as episode_id, 'future_agent_lab' as slug, 'Future Agent Lab' as title, 'future' as era, '["ada", "cog9", "nix"]'::jsonb as allowed_characters, '["mission_compass"]'::jsonb as allowed_backpack_items from episode_upsert
  union all
  select id, 'future_market', 'Future Market', 'future', '["ada", "cog9", "nix"]'::jsonb, '["mission_compass"]'::jsonb from episode_upsert
  union all
  select id, 'future_agent_lab_return', 'Future Agent Lab', 'future', '["ada", "cog9", "nix"]'::jsonb, '["mission_compass"]'::jsonb from episode_upsert
), room_upsert as (
  insert into rooms (episode_id, slug, title, era, allowed_characters, allowed_backpack_items)
  select episode_id, slug, title, era, allowed_characters, allowed_backpack_items
  from room_values
  on conflict (episode_id, slug) do update set
    title = excluded.title,
    era = excluded.era,
    allowed_characters = excluded.allowed_characters,
    allowed_backpack_items = excluded.allowed_backpack_items
  returning id
)
select count(*) from room_upsert;

with episode as (
  select e.id as episode_id from episodes e join adventures a on a.id = e.adventure_id where a.slug = 'timecity-rescue' and e.episode_number = 1
), room_map as (
  select id, slug from rooms where episode_id = (select episode_id from episode)
)
insert into story_nodes (
  episode_id,
  room_id,
  node_key,
  bloom_level,
  curriculum_concept,
  fixed_story_beat,
  canonical_prompt_intent,
  allowed_choice_types,
  misconceptions,
  required_backpack_item,
  next_node_rules,
  sort_order
)
values
((select episode_id from episode), (select id from room_map where slug='future_agent_lab'), 'H1_N01', 'Remember', 'Agent goal', 'Ada welcomes the ChronoCadet.', 'Student identifies that an agent needs a goal.', '["action"]'::jsonb, '{"B":"irrelevant_preference","C":"speed_over_goal"}'::jsonb, null, '{"best":"H1_N02","retry":"H1_N01"}'::jsonb, 1),
((select episode_id from episode), (select id from room_map where slug='future_agent_lab'), 'H1_N02', 'Understand', 'Clear goals', 'COG-9 suggests fixing everything quickly.', 'Student sees that fix everything quickly is too vague.', '["why"]'::jsonb, '{"A":"speed_over_safety","C":"outsource_judgement"}'::jsonb, null, '{"best":"H1_N03","retry":"H1_N02"}'::jsonb, 2),
((select episode_id from episode), (select id from room_map where slug='future_agent_lab'), 'H1_N03', 'Analyse', 'Safe action', 'Nix tempts COG-9 with AUTO-FIX.', 'Student resists an unsafe shortcut.', '["ask_question"]'::jsonb, '{"A":"unsafe_shortcut","C":"avoid_without_understanding"}'::jsonb, null, '{"best":"H1_N04","retry":"H1_N03"}'::jsonb, 3),
((select episode_id from episode), (select id from room_map where slug='future_market'), 'H1_N04', 'Apply', 'Useful inputs', 'The Future Market loops.', 'Student identifies a useful clue/input.', '["evidence"]'::jsonb, '{"B":"irrelevant_visual_detail","C":"distracted_by_character"}'::jsonb, null, '{"best":"H1_N05","retry":"H1_N04"}'::jsonb, 4),
((select episode_id from episode), (select id from room_map where slug='future_market'), 'H1_N05', 'Understand', 'Input and output', 'COG-9 observes records entering and prices coming out.', 'Student distinguishes input from output.', '["why"]'::jsonb, '{"B":"output_as_input","C":"badge_as_data"}'::jsonb, null, '{"best":"H1_N06","retry":"H1_N05"}'::jsonb, 5),
((select episode_id from episode), (select id from room_map where slug='future_market'), 'H1_N06', 'Apply', 'Goal input rule output', 'Student uses Mission Compass.', 'Student uses backpack item.', '["backpack"]'::jsonb, '{"B":"objects_not_system_parts","C":"speed_only"}'::jsonb, 'mission_compass', '{"best":"H1_N07","retry":"H1_N06"}'::jsonb, 6),
((select episode_id from episode), (select id from room_map where slug='future_market'), 'H1_N07', 'Create', 'Safe rule', 'Student writes COG-9 first safe rule.', 'Student completes first safe agent rule.', '["autocomplete_finish"]'::jsonb, '{"B":"button_first","C":"unsafe_delegate"}'::jsonb, null, '{"best":"H1_N08","retry":"H1_N07"}'::jsonb, 7),
((select episode_id from episode), (select id from room_map where slug='future_market'), 'H1_N08', 'Evaluate', 'Explain why goals matter', 'Ada asks why an agent needs a goal.', 'Student explains why an agent needs a goal.', '["why"]'::jsonb, '{"B":"excitement_over_reasoning","C":"irrelevant_visual_detail"}'::jsonb, null, '{"best":"H1_N09","retry":"H1_N08"}'::jsonb, 8),
((select episode_id from episode), (select id from room_map where slug='future_agent_lab_return'), 'H1_N09', 'Understand', 'Human-supervised AI', 'COG-9 returns to the lab.', 'Student restates what COG-9 learned.', '["why"]'::jsonb, '{"B":"speed_over_safety","C":"no_human_review"}'::jsonb, null, '{"best":"H1_N10","retry":"H1_N09"}'::jsonb, 9),
((select episode_id from episode), (select id from room_map where slug='future_agent_lab_return'), 'H1_N10', 'Reflect', 'Mission reflection', 'Mission Compass points to 1888.', 'Preview next episode while ending Episode 1.', '["action"]'::jsonb, '{"B":"repeat_unsafe_shortcut","C":"ignore_evidence"}'::jsonb, null, '{"best":"COMPLETE","retry":"H1_N10"}'::jsonb, 10)
on conflict (node_key) do update set
  episode_id = excluded.episode_id,
  room_id = excluded.room_id,
  bloom_level = excluded.bloom_level,
  curriculum_concept = excluded.curriculum_concept,
  fixed_story_beat = excluded.fixed_story_beat,
  canonical_prompt_intent = excluded.canonical_prompt_intent,
  allowed_choice_types = excluded.allowed_choice_types,
  misconceptions = excluded.misconceptions,
  required_backpack_item = excluded.required_backpack_item,
  next_node_rules = excluded.next_node_rules,
  sort_order = excluded.sort_order;
