import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { createMockGlowProfile } from '../src/domain/profile';
import type { ImageAnalysisInput } from '../src/services/ai';
import { ServerAIProvider, buildServerAnalysisRequest, buildServerGenerationRequest, buildServerRecommendationRequest } from '../src/services/server-ai';
import { parseServerAIResponse } from '../src/services/ai-contract';

const analysisInput: ImageAnalysisInput = {
  displayName: 'Maya',
  goal: 'soft-glam',
  selfies: [{ id: 'selfie-1', uri: 'file:///private.jpg', storagePath: 'user-a/private.jpg', angle: 'front', createdAt: '2026-09-01T10:00:00.000Z' }],
};

function createClient(response: unknown) {
  const invoke = vi.fn(async () => ({ data: response, error: null }));
  return { client: { functions: { invoke } }, invoke };
}

describe('server AI boundary contract', () => {
  it('sends only consented storage paths, never local image URIs', () => {
    const request = buildServerAnalysisRequest(analysisInput);
    expect(request).toEqual({ action: 'analyze', displayName: 'Maya', goal: 'soft-glam', selfies: [{ storagePath: 'user-a/private.jpg', angle: 'front' }] });
    expect(JSON.stringify(request)).not.toContain('file:///');
  });

  it('rejects a local selfie that has not crossed the consented media boundary', () => {
    expect(() => buildServerAnalysisRequest({ ...analysisInput, selfies: [{ ...analysisInput.selfies[0], storagePath: undefined }] })).toThrow('Consent is required');
  });

  it('keeps generation requests path-only', () => {
    const request = buildServerGenerationRequest({ clientRequestId: 'job-1', recommendationId: 'look-1', recommendationTitle: 'Layers', recommendationCategory: 'hairstyle', sourceImageUri: 'https://signed.example/private.jpg', sourceStoragePath: 'user-a/private.jpg', resultImageUri: 'https://demo.example/result.jpg' });
    expect(request).toEqual({ action: 'generate', clientRequestId: 'job-1', recommendationId: 'look-1', recommendationTitle: 'Layers', recommendationCategory: 'hairstyle', sourceStoragePath: 'user-a/private.jpg' });
    expect(JSON.stringify(request)).not.toContain('signed.example');
  });

  it('parses valid profile and job responses but rejects malformed server data', () => {
    const profile = createMockGlowProfile('Maya', 'soft-glam');
    expect(parseServerAIResponse({ action: 'analyze', profile })).toMatchObject({ action: 'analyze', profile });
    expect(parseServerAIResponse({ action: 'get-job', job: { id: 'job-1', status: 'completed', providerJobId: 'provider-1' } })).toEqual({ action: 'get-job', job: { id: 'job-1', status: 'completed', providerJobId: 'provider-1' } });
    expect(() => parseServerAIResponse({ action: 'analyze', profile: { displayName: 'Maya' } })).toThrow('invalid profile');
  });

  it('invokes the authenticated function for analysis and job observation', async () => {
    const profile = createMockGlowProfile('Maya', 'soft-glam');
    const first = createClient({ action: 'analyze', profile });
    const provider = new ServerAIProvider(first.client as never);
    await expect(provider.analyze(analysisInput)).resolves.toMatchObject({ displayName: 'Maya' });
    expect(first.invoke).toHaveBeenCalledWith('ai', { body: buildServerAnalysisRequest(analysisInput) });

    const second = createClient({ action: 'get-job', job: { id: 'job-1', status: 'completed' } });
    await expect(new ServerAIProvider(second.client as never).getJob('job-1')).resolves.toEqual({ id: 'job-1', status: 'completed' });
    expect(second.invoke).toHaveBeenCalledWith('ai', { body: { action: 'get-job', jobId: 'job-1' } });
  });

  it('sends the analyzed profile and focus to the server recommendation boundary', async () => {
    const profile = createMockGlowProfile('Maya', 'soft-glam');
    expect(buildServerRecommendationRequest(profile, 'soft-glam', 'overall')).toEqual({ action: 'recommend', profile, goal: 'soft-glam', focus: 'overall' });
  });

  it('keeps the Edge Function on the authenticated, non-service-role path', async () => {
    const source = await readFile(path.resolve(process.cwd(), 'supabase/functions/ai/index.ts'), 'utf8');
    expect(source).toContain('auth.getUser(token)');
    expect(source).toContain('Authorization: `Bearer ${token}`');
    expect(source).toContain("from('selfies')");
    expect(source).toContain("from('generation_jobs')");
    expect(source).toContain(".eq('user_id', userId)");
    expect(source).toContain('crypto.subtle.digest');
    expect(source).not.toContain('stagingJob(jobId)');
    expect(source).not.toMatch(/SERVICE_ROLE|service_role/);
    expect(source).toContain('OPENAI_API_KEY');
    expect(source).toContain("gpt-5.6-luna");
    expect(source).toContain("gpt-image-2");
  });
});
