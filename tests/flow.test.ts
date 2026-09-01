import { describe, expect, it } from 'vitest';

import { createMockGlowProfile, createMockRecommendations } from '../src/domain/profile';
import { reserveCredits } from '../src/domain/credits';

describe('primary onboarding to generation path', () => {
  it('persists a profile-shaped result and reserves the configured preview cost', () => {
    const initialWallet = { balance: 15, lifetimeGranted: 15, lifetimeSpent: 0 };
    const profile = createMockGlowProfile('Maya', 'soft-glam');
    const recommendations = createMockRecommendations(profile, 'soft-glam', 'overall');
    const reservation = reserveCredits(initialWallet, recommendations[0].creditCost);
    expect(profile.colorSeason).toBeTruthy();
    expect(recommendations).toHaveLength(5);
    expect(reservation.ok).toBe(true);
    if (reservation.ok) expect(reservation.wallet.balance).toBe(10);
  });
});
