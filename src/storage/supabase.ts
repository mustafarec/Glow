import type { SupabaseClient } from '@supabase/supabase-js';

import type { AppState } from '@/domain/types';
import type { AppStateStorage, StorageScope } from '@/storage/persistence';

function isRemoteUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

function isSafeLook(look: AppState['generatedLooks'][number]): boolean {
  return isRemoteUri(look.beforeImageUri) && isRemoteUri(look.resultImageUri);
}

/**
 * Keep the first remote seam intentionally small. Local file/data URIs never
 * cross it; the private Storage adapter will own selfie bytes in the next slice.
 */
export function sanitizeRemoteState(state: AppState): Partial<AppState> {
  return {
    ...state,
    selfies: state.selfies.filter((selfie) => isRemoteUri(selfie.uri)),
    generatedLooks: state.generatedLooks.filter(isSafeLook),
    savedLooks: state.savedLooks.filter(isSafeLook),
    timelineEntries: state.timelineEntries.map((entry) => ({
      ...entry,
      ...(entry.imageUri && !isRemoteUri(entry.imageUri) ? { imageUri: undefined } : {}),
    })),
    generationJobs: {},
    activeJobId: null,
  };
}

export class SupabaseStateStorage implements AppStateStorage {
  constructor(private readonly client: SupabaseClient) {}

  async load(scope: StorageScope): Promise<Partial<AppState> | null> {
    if (!scope) return null;
    const { data, error } = await this.client
      .from('app_state_snapshots')
      .select('state')
      .eq('user_id', scope)
      .maybeSingle();
    if (error) throw error;
    return (data?.state as Partial<AppState> | null | undefined) ?? null;
  }

  async save(scope: StorageScope, state: AppState): Promise<void> {
    if (!scope) return;
    const { error } = await this.client
      .from('app_state_snapshots')
      .upsert({ user_id: scope, state: sanitizeRemoteState(state) }, { onConflict: 'user_id' });
    if (error) throw error;
  }

  async clear(scope: StorageScope): Promise<void> {
    if (!scope) return;
    const { error } = await this.client.from('app_state_snapshots').delete().eq('user_id', scope);
    if (error) throw error;
  }
}
