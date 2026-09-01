import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/0002_identity_state_snapshot.sql');
const schemaPath = path.resolve(process.cwd(), 'supabase/migrations/0001_glow_schema.sql');
const aiMigrationPath = path.resolve(process.cwd(), 'supabase/migrations/0003_openai_media_jobs.sql');
const creditsMigrationPath = path.resolve(process.cwd(), 'supabase/migrations/0004_server_authoritative_credits.sql');

describe('Supabase identity migration contract', () => {
  it('creates a user-owned snapshot with RLS and an update timestamp', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    expect(sql).toContain('create table if not exists public.app_state_snapshots');
    expect(sql).toContain('references auth.users(id) on delete cascade');
    expect(sql).toContain('alter table public.app_state_snapshots enable row level security');
    expect(sql).toMatch(/create policy app_state_snapshots_self[\s\S]*user_id = auth\.uid\(\)/);
    expect(sql).toContain('with check (user_id = auth.uid())');
    expect(sql).toContain('app_state_snapshots_set_updated_at');
  });

  it('does not grant public access to the snapshot table', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).not.toMatch(/to public/i);
    expect(sql).not.toMatch(/using \(true\)/i);
  });

  it('keeps generation jobs durable and owner-scoped', async () => {
    const sql = await readFile(schemaPath, 'utf8');

    expect(sql).toContain('create table if not exists public.generation_jobs');
    expect(sql).toContain('provider_job_id text');
    expect(sql).toContain("status text not null default 'queued'");
    expect(sql).toContain("status in ('queued', 'processing', 'completed', 'failed')");
    expect(sql).toContain('credits_refunded boolean not null default false');
    expect(sql).toMatch(/create policy generation_jobs_self[\s\S]*user_id = auth\.uid\(\)/);
  });

  it('keeps production generated media private', async () => {
    const sql = await readFile(aiMigrationPath, 'utf8');
    expect(sql).toContain("values ('glow-generated', 'glow-generated', false)");
    expect(sql).toContain('add column if not exists source_storage_path text');
    expect(sql).toContain('add column if not exists result_storage_path text');
    expect(sql).toMatch(/create policy glow_generated_read[\s\S]*bucket_id = 'glow-generated'[\s\S]*auth\.uid\(\)/);
    expect(sql).toMatch(/create policy glow_generated_insert[\s\S]*bucket_id = 'glow-generated'[\s\S]*auth\.uid\(\)/);
  });

  it('keeps credits server-authoritative and refunds failed jobs exactly once', async () => {
    const sql = await readFile(creditsMigrationPath, 'utf8');
    expect(sql).toContain('create or replace function public.ensure_credit_wallet()');
    expect(sql).toContain('grant execute on function public.ensure_credit_wallet() to authenticated');
    expect(sql).toContain('create or replace function public.reserve_generation_credits(');
    expect(sql).toContain('raise exception \'INSUFFICIENT_CREDITS\'');
    expect(sql).toContain('create or replace function public.fail_generation_job_and_refund(');
    expect(sql).toContain('if not job_row.credits_refunded then');
    expect(sql).not.toMatch(/grant execute on function public\.(ensure_credit_wallet|reserve_generation_credits|fail_generation_job_and_refund)[^;]* to anon/i);
  });
});
