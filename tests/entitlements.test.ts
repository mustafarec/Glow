import { describe, expect, it } from 'vitest';

import { canUseFeature, isGlowPlus } from '../src/domain/entitlements';

describe('Glow+ entitlements', () => {
  it('keeps free users on the useful core while limiting premium features', () => {
    const free = { status: 'free' as const, plan: 'free' as const };
    expect(isGlowPlus(free)).toBe(false);
    expect(canUseFeature(free, 'advanced-comparison')).toBe(true);
    expect(canUseFeature(free, 'premium-recommendations')).toBe(false);
  });

  it('unlocks premium capabilities for an active subscription', () => {
    const active = { status: 'active' as const, plan: 'annual' as const };
    expect(isGlowPlus(active)).toBe(true);
    expect(canUseFeature(active, 'premium-recommendations')).toBe(true);
    expect(canUseFeature(active, 'saved-profiles')).toBe(true);
  });
});
