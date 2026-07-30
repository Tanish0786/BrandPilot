-- ----------------------------------------------------------------------------
-- brand_profiles
-- ----------------------------------------------------------------------------
-- One row per user (v1: single brand profile per account, no multi-brand
-- accounts yet). Written by app/api/extract-profile (source = 'url') today;
-- the questionnaire fallback path will also write here via source = 'questionnaire'.
create table if not exists public.brand_profiles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references auth.users (id) on delete cascade,
  business_name      text not null,
  vertical           text not null,
  tone_descriptors   jsonb not null default '[]'::jsonb,
  target_audience    text not null,
  value_props        jsonb not null default '[]'::jsonb,
  keywords           jsonb not null default '[]'::jsonb,
  example_phrases    jsonb not null default '[]'::jsonb,
  source             text not null check (source in ('url', 'questionnaire')),
  source_url         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Safe to re-run against a table created before this column existed.
alter table public.brand_profiles add column if not exists source_url text;

create index if not exists brand_profiles_user_id_idx on public.brand_profiles (user_id);

-- Keep updated_at current on every row update (re-extraction updates the
-- existing row rather than inserting a second one, per the one-profile-per-user rule).
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_brand_profiles_updated_at on public.brand_profiles;
create trigger set_brand_profiles_updated_at
  before update on public.brand_profiles
  for each row
  execute function public.set_updated_at();

alter table public.brand_profiles enable row level security;

drop policy if exists "Users can view their own brand profile" on public.brand_profiles;
create policy "Users can view their own brand profile"
  on public.brand_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own brand profile" on public.brand_profiles;
create policy "Users can insert their own brand profile"
  on public.brand_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own brand profile" on public.brand_profiles;
create policy "Users can update their own brand profile"
  on public.brand_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- content_pieces
-- ----------------------------------------------------------------------------
-- Generated content (captions today, other types later). Many rows per user —
-- regenerating inserts a fresh row rather than overwriting, so rejected/replaced
-- attempts remain as history instead of being lost.
create table if not exists public.content_pieces (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  type            text not null default 'social_caption',
  input_prompt    text not null,
  generated_text  text not null,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'edited', 'rejected')),
  model_used      text not null,
  feedback_note   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Safe to re-run against a table created before this column existed.
alter table public.content_pieces add column if not exists feedback_note text;

create index if not exists content_pieces_user_id_created_at_idx
  on public.content_pieces (user_id, created_at desc);

drop trigger if exists set_content_pieces_updated_at on public.content_pieces;
create trigger set_content_pieces_updated_at
  before update on public.content_pieces
  for each row
  execute function public.set_updated_at();

alter table public.content_pieces enable row level security;

drop policy if exists "Users can view their own content pieces" on public.content_pieces;
create policy "Users can view their own content pieces"
  on public.content_pieces for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own content pieces" on public.content_pieces;
create policy "Users can insert their own content pieces"
  on public.content_pieces for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own content pieces" on public.content_pieces;
create policy "Users can update their own content pieces"
  on public.content_pieces for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
