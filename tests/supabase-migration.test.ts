import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/0002_identity_state_snapshot.sql');

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
});
