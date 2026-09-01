type GenerationJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

const serverCreditCosts: Record<string, number> = {
  'long-layers': 5,
  'warm-chocolate': 5,
  'peach-soft-glam': 5,
  'butterfly-cut': 5,
  'complete-glow': 15,
};

export const STAGING_JOB_TIMINGS = {
  processingAfterMs: 250,
  completedAfterMs: 900,
} as const;

export function getServerGenerationCreditCost(recommendationId: string): number {
  // ponytail: unknown ids pay the smallest preview cost until recommendations are server-owned.
  return serverCreditCosts[recommendationId] ?? 5;
}

export function getNextStagingStatus(status: GenerationJobStatus, ageMs: number): GenerationJobStatus {
  if (status === 'queued' && ageMs >= STAGING_JOB_TIMINGS.processingAfterMs) return 'processing';
  if (status === 'processing' && ageMs >= STAGING_JOB_TIMINGS.completedAfterMs) return 'completed';
  return status;
}
