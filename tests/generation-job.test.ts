import { describe, expect, it } from 'vitest';

import { getNextStagingStatus, getServerGenerationCreditCost, STAGING_JOB_TIMINGS } from '../src/services/generation-job';

describe('durable generation job policy', () => {
  it('advances the staging lifecycle without skipping an active state', () => {
    expect(getNextStagingStatus('queued', STAGING_JOB_TIMINGS.processingAfterMs - 1)).toBe('queued');
    expect(getNextStagingStatus('queued', STAGING_JOB_TIMINGS.processingAfterMs)).toBe('processing');
    expect(getNextStagingStatus('processing', STAGING_JOB_TIMINGS.completedAfterMs - 1)).toBe('processing');
    expect(getNextStagingStatus('processing', STAGING_JOB_TIMINGS.completedAfterMs)).toBe('completed');
    expect(getNextStagingStatus('failed', 10_000)).toBe('failed');
  });

  it('derives credit cost from the server-owned recommendation map', () => {
    expect(getServerGenerationCreditCost('complete-glow')).toBe(15);
    expect(getServerGenerationCreditCost('unknown-id')).toBe(5);
  });
});
