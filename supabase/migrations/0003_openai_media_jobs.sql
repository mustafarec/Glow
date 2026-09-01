-- Production AI media and request metadata stay private and owner-scoped.
alter table public.generation_jobs
  add column if not exists recommendation_id text,
  add column if not exists recommendation_title text,
  add column if not exists recommendation_category text,
  add column if not exists source_storage_path text,
  add column if not exists result_storage_path text;

insert into storage.buckets (id, name, public)
values ('glow-generated', 'glow-generated', false)
on conflict (id) do nothing;

drop policy if exists glow_generated_read on storage.objects;
create policy glow_generated_read
on storage.objects for select to authenticated
using (bucket_id = 'glow-generated' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists glow_generated_insert on storage.objects;
create policy glow_generated_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'glow-generated' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists glow_generated_update on storage.objects;
create policy glow_generated_update
on storage.objects for update to authenticated
using (bucket_id = 'glow-generated' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'glow-generated' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists glow_generated_delete on storage.objects;
create policy glow_generated_delete
on storage.objects for delete to authenticated
using (bucket_id = 'glow-generated' and (storage.foldername(name))[1] = auth.uid()::text);
