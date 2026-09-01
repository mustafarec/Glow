import { describe, expect, it } from 'vitest';

import { AppState } from '../src/domain/types';
import { AppStateStorage, LocalStateStorage, ScopedStateStorage, getStorageKey } from '../src/storage/persistence';
import { SupabaseStateStorage, sanitizeRemoteState } from '../src/storage/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

const state = (displayName: string): AppState => ({
  displayName,
  goal: 'soft-glam',
  focus: 'overall',
  hasOnboarded: true,
  consentToUseImages: true,
  selfies: [],
  profile: null,
  recommendations: [],
  feedback: {},
  generatedLooks: [],
  savedLooks: [],
  timelineEntries: [],
  wallet: { balance: 15, lifetimeGranted: 15, lifetimeSpent: 0 },
  creditTransactions: [],
  subscription: { status: 'free', plan: 'free' },
  purchases: [],
  generationJobs: {},
  activeJobId: null,
});

class MemoryKeyValueStorage {
  readonly values = new Map<string, string>();

  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { this.values.set(key, value); }
  async removeItem(key: string) { this.values.delete(key); }
}

class MemoryStateStorage implements AppStateStorage {
  readonly values = new Map<string, AppState>();
  shouldFail = false;

  async load(scope: string | null) {
    if (this.shouldFail) throw new Error('offline');
    return scope ? this.values.get(scope) ?? null : null;
  }

  async save(scope: string | null, value: AppState) {
    if (this.shouldFail) throw new Error('offline');
    if (scope) this.values.set(scope, value);
  }

  async clear(scope: string | null) {
    if (this.shouldFail) throw new Error('offline');
    if (scope) this.values.delete(scope);
  }
}

describe('identity-scoped persistence', () => {
  it('keeps guest, account A and account B in separate local scopes', async () => {
    const keyValue = new MemoryKeyValueStorage();
    const local = new LocalStateStorage(keyValue);

    await local.save(null, state('Guest'));
    await local.save('account-a', state('A'));
    await local.save('account-b', state('B'));

    expect(getStorageKey(null)).not.toBe(getStorageKey('account-a'));
    expect((await local.load(null))?.displayName).toBe('Guest');
    expect((await local.load('account-a'))?.displayName).toBe('A');
    expect((await local.load('account-b'))?.displayName).toBe('B');

    await local.clear('account-a');
    expect(await local.load('account-a')).toBeNull();
    expect((await local.load('account-b'))?.displayName).toBe('B');
  });

  it('falls back to a user cache when remote persistence is unavailable', async () => {
    const local = new MemoryStateStorage();
    const remote = new MemoryStateStorage();
    const scoped = new ScopedStateStorage(local, remote);

    remote.shouldFail = true;
    await scoped.save('account-a', state('Offline A'));
    expect((await local.load('account-a'))?.displayName).toBe('Offline A');
    expect((await scoped.load('account-a'))?.displayName).toBe('Offline A');
  });

  it('does not send local image paths or in-flight jobs to the snapshot', () => {
    const original = state('Maya');
    original.selfies = [
      { id: 'local', uri: 'file:///private/selfie.jpg', angle: 'front', createdAt: 'now' },
      { id: 'remote', uri: 'https://cdn.example.com/selfie.jpg', angle: 'side', createdAt: 'now' },
      { id: 'data', uri: 'data:image/jpeg;base64,secret', angle: 'front', createdAt: 'now' },
    ];
    original.timelineEntries = [{ id: 'timeline', title: 'Local', note: '', imageUri: 'file:///private/timeline.jpg', createdAt: 'now' }];
    original.generationJobs = { 'job-1': { id: 'job-1', recommendationId: 'rec-1', status: 'processing', creditCost: 5, refunded: false, createdAt: 'now', updatedAt: 'now' } };
    original.activeJobId = 'job-1';

    const sanitized = sanitizeRemoteState(original);
    const serialized = JSON.stringify(sanitized);

    expect(sanitized.selfies).toHaveLength(1);
    expect(serialized).not.toContain('file:///');
    expect(serialized).not.toContain('data:image');
    expect(sanitized.timelineEntries?.[0]?.imageUri).toBeUndefined();
    expect(sanitized.generationJobs).toEqual({});
    expect(sanitized.activeJobId).toBeNull();
  });

  it('uses the authenticated user id for remote read, write and delete calls', async () => {
    const calls: Array<{ operation: string; table: string; userId?: string; state?: unknown }> = [];
    const client = {
      from(table: string) {
        return {
          select() {
            return { eq: (_column: string, userId: string) => ({ maybeSingle: async () => { calls.push({ operation: 'load', table, userId }); return { data: null, error: null }; } }) };
          },
          upsert: async (values: { user_id: string; state: unknown }) => { calls.push({ operation: 'save', table, userId: values.user_id, state: values.state }); return { error: null }; },
          delete() {
            return { eq: async (_column: string, userId: string) => { calls.push({ operation: 'clear', table, userId }); return { error: null }; } };
          },
        };
      },
    } as unknown as SupabaseClient;
    const remote = new SupabaseStateStorage(client);

    await remote.load('account-a');
    await remote.save('account-a', state('A'));
    await remote.clear('account-a');

    expect(calls.map(({ operation, table, userId }) => ({ operation, table, userId }))).toEqual([
      { operation: 'load', table: 'app_state_snapshots', userId: 'account-a' },
      { operation: 'save', table: 'app_state_snapshots', userId: 'account-a' },
      { operation: 'clear', table: 'app_state_snapshots', userId: 'account-a' },
    ]);
  });
});
