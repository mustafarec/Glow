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

class ProductionUnavailableProvider implements GlowAIProvider {
  constructor(private readonly reason: string) {}

  async analyze(): Promise<GlowProfile> {
    throw new Error(this.reason);
  }

  async recommend(): Promise<Recommendation[]> {
    throw new Error(this.reason);
  }

  async generate(): Promise<ProviderGenerationJob> {
    throw new Error(this.reason);
  }

  async getJob(): Promise<ProviderGenerationJob> {
    throw new Error(this.reason);
  }
}

const productionMode = process.env.EXPO_PUBLIC_AI_MODE?.trim().toUpperCase() === 'PRODUCTION';
const unavailableReason = !productionMode
  ? 'Production AI is not enabled in this build.'
  : 'Production AI is not configured. Check the Supabase connection.';

export const aiProvider: GlowAIProvider = productionMode && supabase
  ? new ServerAIProvider(supabase)
  : new ProductionUnavailableProvider(unavailableReason);
