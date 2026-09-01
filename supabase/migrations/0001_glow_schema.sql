create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'en',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  onboarding_completed boolean not null default false,
  current_goal text not null default 'soft-glam',
  current_focus text not null default 'overall',
  consent_to_use_images boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.glow_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  face_shape text,
  undertone text check (undertone in ('warm', 'cool', 'neutral')),
  color_season text,
  current_hair_color text,
  current_hair_length text,
  preferred_aesthetic text,
  makeup_intensity text,
  best_hair_directions jsonb not null default '[]'::jsonb,
  hair_colors jsonb not null default '[]'::jsonb,
  makeup_direction jsonb not null default '[]'::jsonb,
  metals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  preferred_style text,
  preferred_makeup_intensity text,
  preferred_hair_length text,
  natural_hair_color text,
  age_range text,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.selfies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  storage_path text not null,
  angle text not null default 'unknown' check (angle in ('front', 'side', 'unknown')),
  consented_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  selfie_ids uuid[] not null default '{}',
  provider text not null,
  model text,
  result jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.glow_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  goal_key text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  goal_key text not null,
  category text not null,
  title text not null,
  payload jsonb not null,
  rank integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  feedback text not null check (feedback in ('love-it', 'not-for-me', 'too-bold', 'too-short', 'wrong-color', 'too-much-makeup')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.generated_looks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  recommendation_id uuid references public.recommendations(id) on delete set null,
  before_storage_path text,
  result_storage_path text,
  title text not null,
  is_favorite boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  generated_look_id uuid references public.generated_looks(id) on delete set null,
  provider_job_id text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  credit_cost integer not null check (credit_cost >= 0),
  credits_refunded boolean not null default false,
  error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.timeline_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  generated_look_id uuid references public.generated_looks(id) on delete set null,
  storage_path text,
  title text not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null,
  provider_customer_id text,
  provider_subscription_id text,
  plan_key text not null,
  status text not null check (status in ('free', 'trialing', 'active', 'paused', 'expired', 'cancelled')),
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.credit_wallets (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_granted integer not null default 0 check (lifetime_granted >= 0),
  lifetime_spent integer not null default 0 check (lifetime_spent >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('grant', 'purchase', 'reservation', 'refund')),
  amount integer not null,
  generation_job_id uuid references public.generation_jobs(id) on delete set null,
  purchase_id uuid,
  label text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null,
  provider_transaction_id text,
  product_key text not null,
  amount_minor integer,
  currency text,
  credits_granted integer,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.share_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  card_type text not null default 'glow-type',
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.remote_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists glow_profiles_set_updated_at on public.glow_profiles;
create trigger glow_profiles_set_updated_at before update on public.glow_profiles for each row execute function public.set_updated_at();
drop trigger if exists preferences_set_updated_at on public.user_preferences;
create trigger preferences_set_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();
drop trigger if exists generation_jobs_set_updated_at on public.generation_jobs;
create trigger generation_jobs_set_updated_at before update on public.generation_jobs for each row execute function public.set_updated_at();
drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
drop trigger if exists wallets_set_updated_at on public.credit_wallets;
create trigger wallets_set_updated_at before update on public.credit_wallets for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.glow_profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.selfies enable row level security;
alter table public.analysis_results enable row level security;
alter table public.glow_goals enable row level security;
alter table public.recommendations enable row level security;
alter table public.recommendation_feedback enable row level security;
alter table public.generated_looks enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.timeline_entries enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.purchases enable row level security;
alter table public.share_cards enable row level security;
alter table public.analytics_events enable row level security;
alter table public.remote_config enable row level security;

create policy users_self on public.users for all using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_self on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy glow_profiles_self on public.glow_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy preferences_self on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy selfies_self on public.selfies for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy analysis_results_self on public.analysis_results for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy glow_goals_self on public.glow_goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy recommendations_self on public.recommendations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy recommendation_feedback_self on public.recommendation_feedback for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy generated_looks_self on public.generated_looks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy generation_jobs_self on public.generation_jobs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy timeline_entries_self on public.timeline_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy subscriptions_self on public.subscriptions for select using (user_id = auth.uid());
create policy wallets_self on public.credit_wallets for select using (user_id = auth.uid());
create policy transactions_self on public.credit_transactions for select using (user_id = auth.uid());
create policy purchases_self on public.purchases for select using (user_id = auth.uid());
create policy share_cards_self on public.share_cards for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy analytics_events_self on public.analytics_events for insert with check (user_id = auth.uid() or user_id is null);
create policy remote_config_read on public.remote_config for select to authenticated using (true);

insert into public.remote_config (key, value) values
  ('generation_credit_costs', '{"hairstyle":5,"hair-color":5,"makeup":5,"complete-glow":15}'::jsonb),
  ('feature_limits', '{"freeProfiles":1,"freePreviewAllowance":3,"freeTimeline":true}'::jsonb)
on conflict (key) do nothing;

insert into storage.buckets (id, name, public)
values ('glow-selfies', 'glow-selfies', false)
on conflict (id) do nothing;

create policy glow_selfies_read on storage.objects for select to authenticated using (bucket_id = 'glow-selfies' and (storage.foldername(name))[1] = auth.uid()::text);
create policy glow_selfies_insert on storage.objects for insert to authenticated with check (bucket_id = 'glow-selfies' and (storage.foldername(name))[1] = auth.uid()::text);
create policy glow_selfies_delete on storage.objects for delete to authenticated using (bucket_id = 'glow-selfies' and (storage.foldername(name))[1] = auth.uid()::text);
