import { describe, expect, it } from 'vitest';

import { getServerGenerationCreditCost } from '../src/services/generation-job';

describe('durable generation job policy', () => {
  it('derives credit cost from the server-owned recommendation map', () => {
    expect(getServerGenerationCreditCost('complete-glow')).toBe(15);
    expect(getServerGenerationCreditCost('unknown-id')).toBe(5);
    expect(getServerGenerationCreditCost('unknown-id', 'complete-glow')).toBe(15);
  });
});
