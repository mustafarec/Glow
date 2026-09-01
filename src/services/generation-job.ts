const serverCreditCosts: Record<string, number> = {
  'long-layers': 5,
  'warm-chocolate': 5,
  'peach-soft-glam': 5,
  'butterfly-cut': 5,
  'complete-glow': 15,
};

const serverCategoryCosts: Record<string, number> = {
  hairstyle: 5,
  'hair-color': 5,
  makeup: 5,
  'complete-glow': 15,
};

export function getServerGenerationCreditCost(recommendationId: string, recommendationCategory?: string): number {
  // ponytail: unknown ids pay the smallest preview cost until recommendations are server-owned.
  return serverCreditCosts[recommendationId] ?? serverCategoryCosts[recommendationCategory ?? ''] ?? 5;
}
