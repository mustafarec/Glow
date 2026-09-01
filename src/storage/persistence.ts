import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

import { AppState } from '@/domain/types';
import { SupabaseStateStorage } from '@/storage/supabase';

const STORAGE_KEY = 'glow.mvp.app-state.v1';

export type StorageScope = string | null;

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface AppStateStorage {
  load(scope: StorageScope): Promise<Partial<AppState> | null>;
  save(scope: StorageScope, state: AppState): Promise<void>;
  clear(scope: StorageScope): Promise<void>;
}

export function getStorageKey(scope: StorageScope): string {
  return scope ? `${STORAGE_KEY}.user.${encodeURIComponent(scope)}` : STORAGE_KEY;
}

export function parsePersistedState(raw: string | null): Partial<AppState> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Partial<AppState> : null;
  } catch {
    return null;
  }
}

export class LocalStateStorage implements AppStateStorage {
  constructor(private readonly storage: KeyValueStorage = AsyncStorage) {}

  async load(scope: StorageScope): Promise<Partial<AppState> | null> {
    return parsePersistedState(await this.storage.getItem(getStorageKey(scope)));
  }

  async save(scope: StorageScope, state: AppState): Promise<void> {
    await this.storage.setItem(getStorageKey(scope), JSON.stringify(state));
  }

  async clear(scope: StorageScope): Promise<void> {
    await this.storage.removeItem(getStorageKey(scope));
  }
}

export class ScopedStateStorage implements AppStateStorage {
  constructor(private readonly local: AppStateStorage, private readonly remote: AppStateStorage | null = null) {}

  async load(scope: StorageScope): Promise<Partial<AppState> | null> {
    if (!scope || !this.remote) return this.local.load(scope);
    try {
      return (await this.remote.load(scope)) ?? (await this.local.load(scope));
    } catch {
      return this.local.load(scope);
    }
  }

  async save(scope: StorageScope, state: AppState): Promise<void> {
    if (scope && this.remote) {
      try {
        await this.remote.save(scope, state);
      } catch {
        // Offline signed-in sessions remain usable through the per-user cache.
      }
    }
    await this.local.save(scope, state);
  }

  async clear(scope: StorageScope): Promise<void> {
    // Do not clear the local cache when the authenticated deletion failed; that
    // would make the UI claim deletion while the remote snapshot still exists.
    if (scope && this.remote) await this.remote.clear(scope);
    await this.local.clear(scope);
  }
}

// ponytail: one snapshot table is the smallest remote sync seam for this MVP;
// normalized rows remain the production source of truth for the next slices.
export function createStateStorage(client: SupabaseClient | null): AppStateStorage {
  const local = new LocalStateStorage();
  return new ScopedStateStorage(local, client ? new SupabaseStateStorage(client) : null);
}

export async function loadPersistedState(): Promise<Partial<AppState> | null> {
  return new LocalStateStorage().load(null);
}

export async function savePersistedState(state: AppState): Promise<void> {
  await new LocalStateStorage().save(null, state);
}

export async function clearPersistedState(): Promise<void> {
  await new LocalStateStorage().clear(null);
}
