import type { SupabaseClient } from '@supabase/supabase-js';

import { createMockRecommendations } from '@/domain/profile';
import type { FocusId, GlowGoalId, GlowProfile, Recommendation } from '@/domain/types';

import type {
  ServerAIRequest,
  ServerAIResponse,
  ServerAnalyzeRequest,
  ServerGenerateRequest,
  ServerGetJobRequest,
  ServerSelfieRef,
} from './ai-contract';
import { AI_FUNCTION_NAME, isOwnedServerPath, parseServerAIResponse } from './ai-contract';
import type { GenerationInput, GlowAIProvider, ImageAnalysisInput, ProviderGenerationJob } from './ai';

const LOCAL_URI = /^(file|data):/i;

export function buildServerAnalysisRequest(input: ImageAnalysisInput): ServerAnalyzeRequest {
  if (input.selfies.some((selfie) => !selfie.storagePath && LOCAL_URI.test(selfie.uri))) {
    throw new Error('Consent is required before server AI can access selfies.');
  }

  const selfies: ServerSelfieRef[] = input.selfies.flatMap((selfie) => (
    selfie.storagePath ? [{ storagePath: selfie.storagePath, angle: selfie.angle }] : []
  ));

  return { action: 'analyze', displayName: input.displayName.trim(), goal: input.goal, selfies };
}

export function buildServerGenerationRequest(input: GenerationInput): ServerGenerateRequest {
  if (!input.sourceStoragePath && LOCAL_URI.test(input.sourceImageUri)) {
    throw new Error('Consent is required before server AI can access a selfie.');
  }

  return {
    action: 'generate',
    clientRequestId: input.clientRequestId,
    recommendationId: input.recommendationId,
    recommendationTitle: input.recommendationTitle,
    ...(input.sourceStoragePath ? { sourceStoragePath: input.sourceStoragePath } : {}),
  };
}

export class ServerAIProvider implements GlowAIProvider {
  constructor(private readonly client: SupabaseClient) {}

  private async invoke(request: ServerAIRequest): Promise<ServerAIResponse> {
    const { data, error } = await this.client.functions.invoke(AI_FUNCTION_NAME, { body: request });
    if (error) throw new Error('The server AI boundary is unavailable.');
    return parseServerAIResponse(data);
  }

  async analyze(input: ImageAnalysisInput): Promise<GlowProfile> {
    const response = await this.invoke(buildServerAnalysisRequest(input));
    if (response.action !== 'analyze') throw new Error('The server AI boundary returned the wrong response.');
    return response.profile;
  }

  async recommend(profile: GlowProfile, goal: GlowGoalId, focus: FocusId): Promise<Recommendation[]> {
    return createMockRecommendations(profile, goal, focus);
  }

  async generate(input: GenerationInput): Promise<ProviderGenerationJob> {
    const response = await this.invoke(buildServerGenerationRequest(input));
    if (response.action !== 'generate') throw new Error('The server AI boundary returned the wrong response.');
    return response.job;
  }

  async getJob(jobId: string): Promise<ProviderGenerationJob> {
    const response = await this.invoke({ action: 'get-job', jobId } satisfies ServerGetJobRequest);
    if (response.action !== 'get-job') throw new Error('The server AI boundary returned the wrong response.');
    return response.job;
  }
}

export { isOwnedServerPath };
