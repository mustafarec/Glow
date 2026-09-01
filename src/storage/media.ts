import type { SupabaseClient } from '@supabase/supabase-js';

import type { SelfieAsset } from '@/domain/types';

export const SELFIE_BUCKET = 'glow-selfies';
export const SELFIE_SIGNED_URL_TTL_SECONDS = 60 * 60;

type SelfieAngle = SelfieAsset['angle'];

type SelfieRow = {
  id: string;
  storage_path: string;
  angle: SelfieAngle;
  consented_at: string;
  created_at: string;
};

const CONTENT_TYPES: Record<string, string> = {
  'image/heic': 'heic',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function assertUserId(userId: string): void {
  if (!userId.trim()) throw new Error('An authenticated user is required for private selfie storage.');
}

export function isOwnedSelfiePath(userId: string, storagePath: string): boolean {
  const prefix = `${userId}/`;
  const objectName = storagePath.startsWith(prefix) ? storagePath.slice(prefix.length) : '';
  return Boolean(userId && objectName && !objectName.includes('/') && !objectName.includes('..'));
}

function assertOwnedSelfiePath(userId: string, storagePath: string): void {
  assertUserId(userId);
  if (!isOwnedSelfiePath(userId, storagePath)) throw new Error('Selfie storage path is outside the current user scope.');
}

function getContentType(response: Response): { contentType: string; extension: string } {
  const rawType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
  const extension = CONTENT_TYPES[rawType] ? CONTENT_TYPES[rawType] : 'jpg';
  return { contentType: CONTENT_TYPES[rawType] ? rawType : 'image/jpeg', extension };
}

function createStoragePath(userId: string, extension: string): string {
  const nonce = Math.random().toString(36).slice(2, 10);
  return `${userId}/${Date.now()}-${nonce}.${extension}`;
}

function rowToAsset(row: SelfieRow, source: SelfieAsset, signedUrl: string): SelfieAsset {
  return {
    ...source,
    uri: signedUrl,
    storagePath: row.storage_path,
    consentedAt: row.consented_at,
    createdAt: row.created_at || source.createdAt,
  };
}

export class SupabaseMediaStorage {
  constructor(private readonly client: SupabaseClient) {}

  private bucket() {
    return this.client.storage.from(SELFIE_BUCKET);
  }

  private async ensureUserRow(userId: string): Promise<void> {
    const { error } = await this.client.from('users').upsert({ id: userId }, { onConflict: 'id' });
    if (error) throw error;
  }

  private async deleteMetadata(userId: string, storagePath: string): Promise<void> {
    const { error } = await this.client
      .from('selfies')
      .delete()
      .eq('user_id', userId)
      .eq('storage_path', storagePath);
    if (error) throw error;
  }

  private async removeUploadedAsset(userId: string, storagePath: string): Promise<void> {
    try {
      await this.deleteMetadata(userId, storagePath);
    } catch {
      // Keep the original upload error visible; the next delete-all retry can reconcile metadata.
    }
    try {
      await this.bucket().remove([storagePath]);
    } catch {
      // Keep the original upload error visible; the next delete-all retry can reconcile the object.
    }
  }

  async uploadSelfie(userId: string, source: SelfieAsset, consentedAt: string): Promise<SelfieAsset> {
    assertUserId(userId);
    if (source.storagePath) return this.refreshSignedUrl(userId, source);

    const response = await fetch(source.uri);
    if (!response.ok) throw new Error('The selected selfie could not be read.');
    const { contentType, extension } = getContentType(response);
    const body = await response.arrayBuffer();
    const storagePath = createStoragePath(userId, extension);
    let metadataCreated = false;

    try {
      const { error: uploadError } = await this.bucket().upload(storagePath, body, {
        cacheControl: '3600',
        contentType,
        upsert: false,
      });
      if (uploadError) throw uploadError;

      await this.ensureUserRow(userId);

      const { data: row, error: metadataError } = await this.client
        .from('selfies')
        .insert({ user_id: userId, storage_path: storagePath, angle: source.angle, consented_at: consentedAt })
        .select('id, storage_path, angle, consented_at, created_at')
        .single();
      metadataCreated = true;
      if (metadataError) throw metadataError;
      if (!row || typeof row.storage_path !== 'string') throw new Error('Supabase did not return selfie metadata.');

      const { data: signed, error: signedUrlError } = await this.bucket().createSignedUrl(storagePath, SELFIE_SIGNED_URL_TTL_SECONDS);
      if (signedUrlError) throw signedUrlError;
      if (!signed?.signedUrl) throw new Error('Supabase did not return a signed selfie URL.');

      return rowToAsset(row as SelfieRow, source, signed.signedUrl);
    } catch (error) {
      if (metadataCreated) await this.removeUploadedAsset(userId, storagePath);
      else {
        try {
          await this.bucket().remove([storagePath]);
        } catch {
          // Keep the original upload error visible.
        }
      }
      throw error;
    }
  }

  async uploadSelfies(userId: string, sources: SelfieAsset[], consentedAt: string): Promise<SelfieAsset[]> {
    const uploaded: SelfieAsset[] = [];
    const createdPaths: string[] = [];
    try {
      for (const source of sources) {
        const result = await this.uploadSelfie(userId, source, consentedAt);
        uploaded.push(result);
        if (!source.storagePath && result.storagePath) createdPaths.push(result.storagePath);
      }
      return uploaded;
    } catch (error) {
      await Promise.all(createdPaths.map((storagePath) => this.removeUploadedAsset(userId, storagePath)));
      throw error;
    }
  }

  async refreshSignedUrl(userId: string, source: SelfieAsset): Promise<SelfieAsset> {
    if (!source.storagePath) return source;
    assertOwnedSelfiePath(userId, source.storagePath);
    const { data, error } = await this.bucket().createSignedUrl(source.storagePath, SELFIE_SIGNED_URL_TTL_SECONDS);
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Supabase did not return a refreshed selfie URL.');
    return { ...source, uri: data.signedUrl };
  }

  async refreshSignedUrls(userId: string, sources: SelfieAsset[]): Promise<SelfieAsset[]> {
    return Promise.all(sources.map(async (source) => {
      try {
        return await this.refreshSignedUrl(userId, source);
      } catch {
        // Keep the cached URI available when a signed-in session is temporarily offline.
        return source;
      }
    }));
  }

  async clear(userId: string): Promise<void> {
    assertUserId(userId);
    const { data, error: listError } = await this.bucket().list(userId, { limit: 1000, offset: 0 });
    if (listError) throw listError;

    const storagePaths = (data ?? [])
      .map((file) => file.name)
      .filter((name): name is string => Boolean(name))
      .map((name) => `${userId}/${name}`)
      .filter((storagePath) => isOwnedSelfiePath(userId, storagePath));

    if (storagePaths.length) {
      const { error: removeError } = await this.bucket().remove(storagePaths);
      if (removeError) throw removeError;
    }

    await this.deleteAllMetadata(userId);
  }

  private async deleteAllMetadata(userId: string): Promise<void> {
    const { error } = await this.client.from('selfies').delete().eq('user_id', userId);
    if (error) throw error;
  }
}
