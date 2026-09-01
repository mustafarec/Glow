import { createMockGlowProfile, createMockRecommendations } from '@/domain/profile';
import { FocusId, GenerationStatus, GlowGoalId, GlowProfile, Recommendation, RecommendationCategory, SelfieAsset } from '@/domain/types';
import { supabase } from '@/services/supabase';

import { ServerAIProvider } from './server-ai';

export interface ImageAnalysisInput {
  displayName: string;
  goal: GlowGoalId;
  selfies: SelfieAsset[];
}

export interface GenerationInput {
  clientRequestId: string;
  recommendationId: string;
  recommendationTitle: string;
  recommendationCategory: RecommendationCategory;
  sourceImageUri: string;
  sourceStoragePath?: string;
  resultImageUri: string;
}

export interface ProviderGenerationJob {
  id: string;
  status: GenerationStatus;
  providerJobId?: string;
  resultUri?: string;
  error?: string;
}

export interface ImageAnalysisProvider {
  analyze(input: ImageAnalysisInput): Promise<GlowProfile>;
}

export interface RecommendationProvider {
  recommend(profile: GlowProfile, goal: GlowGoalId, focus: FocusId): Promise<Recommendation[]>;
}

export interface ImageGenerationProvider {
  generate(input: GenerationInput): Promise<ProviderGenerationJob>;
  getJob(jobId: string): Promise<ProviderGenerationJob>;
}

export interface GlowAIProvider extends ImageAnalysisProvider, RecommendationProvider, ImageGenerationProvider {}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

class MockAIProvider implements GlowAIProvider {
  private readonly jobs = new Map<string, ProviderGenerationJob>();

  async analyze(input: ImageAnalysisInput): Promise<GlowProfile> {
    await wait(1200);
    return createMockGlowProfile(input.displayName, input.goal);
  }

  async recommend(profile: GlowProfile, goal: GlowGoalId, focus: FocusId): Promise<Recommendation[]> {
    await wait(240);
    return createMockRecommendations(profile, goal, focus);
  }

  async generate(input: GenerationInput): Promise<ProviderGenerationJob> {
    const id = `mock-provider-${Date.now()}`;
    const job: ProviderGenerationJob = { id, status: 'queued' };
    this.jobs.set(id, job);

    setTimeout(() => {
      const shouldFail = process.env.EXPO_PUBLIC_MOCK_FAILURE === 'true';
      this.jobs.set(id, shouldFail
        ? { id, status: 'failed', error: 'The mock renderer was asked to fail.' }
        : { id, status: 'completed', resultUri: input.resultImageUri });
    }, 1600);

    return job;
  }

  async getJob(jobId: string): Promise<ProviderGenerationJob> {
    await wait(80);
    return this.jobs.get(jobId) ?? { id: jobId, status: 'failed', error: 'Generation job was not found.' };
  }
}

export type AIMode = 'MOCK' | 'STAGING' | 'PRODUCTION';

const requestedMode = process.env.EXPO_PUBLIC_AI_MODE?.trim().toUpperCase();
export const AI_MODE: AIMode = requestedMode === 'STAGING' || requestedMode === 'PRODUCTION' ? requestedMode : 'MOCK';

// ponytail: one server function covers staging and production until a real provider/job store is selected.
export const aiProvider: GlowAIProvider = AI_MODE === 'MOCK' || !supabase
  ? new MockAIProvider()
  : new ServerAIProvider(supabase);
