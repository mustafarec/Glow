-- Transitional identity/data-perimeter seam for the mobile MVP.
-- The normalized tables in 0001 remain the production source of truth.
create table if not exists public.app_state_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_app_state_snapshot_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists app_state_snapshots_set_updated_at on public.app_state_snapshots;
create trigger app_state_snapshots_set_updated_at
before update on public.app_state_snapshots
for each row execute function public.set_app_state_snapshot_updated_at();

alter table public.app_state_snapshots enable row level security;

drop policy if exists app_state_snapshots_self on public.app_state_snapshots;
create policy app_state_snapshots_self
on public.app_state_snapshots
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
