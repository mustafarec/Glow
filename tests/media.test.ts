import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SelfieAsset } from '../src/domain/types';
import { isOwnedSelfiePath, SELFIE_BUCKET, SELFIE_SIGNED_URL_TTL_SECONDS, SupabaseMediaStorage } from '../src/storage/media';
import type { SupabaseClient } from '@supabase/supabase-js';

const source: SelfieAsset = {
  id: 'local-selfie',
  uri: 'file:///selfie.jpg',
  angle: 'front',
  createdAt: '2026-09-01T10:00:00.000Z',
};

function createDeleteBuilder() {
  const builder = {
    eq: vi.fn(),
    then: (resolve: (value: { error: null }) => unknown) => Promise.resolve({ error: null }).then(resolve),
  };
  builder.eq.mockReturnValue(builder);
  return builder;
}

function createClient(options: { metadataError?: Error; files?: Array<{ name: string }> } = {}) {
  const arrayBuffer = new ArrayBuffer(8);
  const bucket = {
    upload: vi.fn(async () => ({ data: { path: 'ignored' }, error: null })),
    createSignedUrl: vi.fn(async (storagePath: string): Promise<{ data: { signedUrl: string } | null; error: Error | null }> => ({ data: { signedUrl: `https://signed.example/${storagePath}` }, error: null })),
    remove: vi.fn(async () => ({ data: [], error: null })),
    list: vi.fn(async () => ({ data: options.files ?? [], error: null })),
  };
  const userUpsert = vi.fn(async () => ({ error: null }));
  const metadataDelete = createDeleteBuilder();
  const metadataRow = {
    id: 'remote-row',
    storage_path: 'user-a/remote.jpg',
    angle: 'front' as const,
    consented_at: '2026-09-01T10:01:00.000Z',
    created_at: '2026-09-01T10:01:01.000Z',
  };
  let insertedStoragePath = metadataRow.storage_path;
  const metadataSingle = vi.fn(async () => ({ data: options.metadataError ? null : { ...metadataRow, storage_path: insertedStoragePath }, error: options.metadataError ?? null }));
  const metadataSelect = vi.fn(() => ({ single: metadataSingle }));
  const metadataInsert = vi.fn((values: { storage_path: string }) => {
    insertedStoragePath = values.storage_path;
    return { select: metadataSelect };
  });

  const client = {
    storage: { from: vi.fn(() => bucket) },
    from: vi.fn((table: string) => {
      if (table === 'users') return { upsert: userUpsert };
      return { insert: metadataInsert, delete: () => metadataDelete };
    }),
  } as unknown as SupabaseClient;

  return { arrayBuffer, bucket, client, metadataDelete, metadataInsert, metadataSingle, userUpsert };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('private selfie media boundary', () => {
  it('uploads bytes only after the adapter receives an authenticated scope and returns a signed asset', async () => {
    const mocks = createClient();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => mocks.arrayBuffer,
    })));

    const result = await new SupabaseMediaStorage(mocks.client).uploadSelfies('user-a', [source], '2026-09-01T10:02:00.000Z');
    const storagePath = (mocks.bucket.upload.mock.calls as unknown as Array<[string, unknown, unknown]>)[0][0];

    expect(storagePath).toMatch(/^user-a\/\d+-[a-z0-9]+\.png$/);
    expect(mocks.bucket.upload).toHaveBeenCalledWith(storagePath, mocks.arrayBuffer, expect.objectContaining({ contentType: 'image/png', upsert: false }));
    expect(mocks.userUpsert).toHaveBeenCalledWith({ id: 'user-a' }, { onConflict: 'id' });
    expect(mocks.metadataInsert).toHaveBeenCalledWith({ user_id: 'user-a', storage_path: storagePath, angle: 'front', consented_at: '2026-09-01T10:02:00.000Z' });
    expect(mocks.bucket.createSignedUrl).toHaveBeenCalledWith(storagePath, SELFIE_SIGNED_URL_TTL_SECONDS);
    expect(result[0]).toMatchObject({ id: source.id, storagePath, uri: `https://signed.example/${storagePath}`, consentedAt: '2026-09-01T10:01:00.000Z' });
  });

  it('rolls back the object and metadata when the metadata request fails', async () => {
    const metadataError = new Error('metadata unavailable');
    const mocks = createClient({ metadataError });
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => mocks.arrayBuffer,
    })));

    await expect(new SupabaseMediaStorage(mocks.client).uploadSelfie('user-a', source, '2026-09-01T10:02:00.000Z')).rejects.toThrow('metadata unavailable');

    const storagePath = (mocks.bucket.upload.mock.calls as unknown as Array<[string, unknown, unknown]>)[0][0];
    expect(mocks.metadataDelete.eq).toHaveBeenCalledWith('user_id', 'user-a');
    expect(mocks.metadataDelete.eq).toHaveBeenCalledWith('storage_path', storagePath);
    expect(mocks.bucket.remove).toHaveBeenCalledWith([storagePath]);
  });

  it('rejects another user path before making a signed-url request', async () => {
    const mocks = createClient();
    const media = new SupabaseMediaStorage(mocks.client);

    expect(isOwnedSelfiePath('user-a', 'user-a/selfie.jpg')).toBe(true);
    expect(isOwnedSelfiePath('user-a', 'user-b/selfie.jpg')).toBe(false);
    expect(isOwnedSelfiePath('user-a', 'user-a/nested/selfie.jpg')).toBe(false);
    await expect(media.refreshSignedUrl('user-a', { ...source, storagePath: 'user-b/selfie.jpg' })).rejects.toThrow('outside the current user scope');
    expect(mocks.bucket.createSignedUrl).not.toHaveBeenCalled();
  });

  it('removes only one-level owned objects before deleting the user selfie rows', async () => {
    const mocks = createClient({ files: [{ name: 'front.jpg' }, { name: 'nested/folder' }] });
    await new SupabaseMediaStorage(mocks.client).clear('user-a');

    expect(mocks.bucket.list).toHaveBeenCalledWith('user-a', { limit: 1000, offset: 0 });
    expect(mocks.bucket.remove).toHaveBeenCalledWith(['user-a/front.jpg']);
    expect(mocks.metadataDelete.eq).toHaveBeenCalledWith('user_id', 'user-a');
  });

  it('keeps a cached URI when a signed-url refresh is temporarily unavailable', async () => {
    const mocks = createClient();
    mocks.bucket.createSignedUrl.mockResolvedValue({ data: null, error: new Error('offline') });

    const result = await new SupabaseMediaStorage(mocks.client).refreshSignedUrls('user-a', [{ ...source, storagePath: 'user-a/front.jpg' }]);

    expect(result).toEqual([{ ...source, storagePath: 'user-a/front.jpg' }]);
  });

  it('uses the expected private bucket boundary', async () => {
    const mocks = createClient();
    const media = new SupabaseMediaStorage(mocks.client);

    await media.refreshSignedUrl('user-a', { ...source, storagePath: 'user-a/front.jpg' });
    expect(mocks.client.storage.from).toHaveBeenCalledWith(SELFIE_BUCKET);
  });
});
