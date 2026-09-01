import { RecommendationCategory } from './types';

export type AiMode = 'MOCK' | 'STAGING' | 'PRODUCTION';

export const APP_CONFIG = {
  aiMode: (process.env.EXPO_PUBLIC_AI_MODE as AiMode | undefined) ?? 'MOCK',
  freePreviewAllowance: 3,
  creditCosts: {
    hairstyle: 5,
    'hair-color': 5,
    makeup: 5,
    'complete-glow': 15,
  } satisfies Record<RecommendationCategory, number>,
  creditPacks: [
    { id: 'starter', label: 'Starter glow', credits: 25, amountLabel: '$4.99' },
    { id: 'ritual', label: 'Glow ritual', credits: 75, amountLabel: '$9.99' },
    { id: 'studio', label: 'Studio set', credits: 180, amountLabel: '$19.99' },
  ],
  subscriptionPlans: [
    { id: 'monthly', label: 'Monthly', amountLabel: '$7.99 / month', detail: 'Flexible month to month' },
    { id: 'annual', label: 'Annual', amountLabel: '$59.99 / year', detail: 'Best value for a full year of exploring' },
  ],
  featureLimits: {
    freeProfiles: 1,
    freeTimeline: true,
    premiumRecommendations: false,
  },
} as const;
