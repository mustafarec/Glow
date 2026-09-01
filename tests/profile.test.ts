import { describe, expect, it } from 'vitest';

import { createMockGlowProfile, createMockRecommendations } from '../src/domain/profile';

describe('Glow Profile', () => {
  it('creates structured styling signals without an attractiveness score', () => {
    const profile = createMockGlowProfile('Maya', 'soft-glam');
    expect(profile).toMatchObject({ displayName: 'Maya', faceShape: 'Soft oval', undertone: 'warm', colorSeason: 'Soft Autumn' });
    expect(JSON.stringify(profile).toLowerCase()).not.toContain('attractiveness');
  });

  it('ranks five recommendations around the selected goal and focus', () => {
    const profile = createMockGlowProfile('Maya', 'natural');
    const recommendations = createMockRecommendations(profile, 'natural', 'hair');
    expect(recommendations).toHaveLength(5);
    expect(recommendations[0].impact).toBe('biggest-impact');
    expect(recommendations.every((item) => item.goalFit === 'natural')).toBe(true);
  });
});
