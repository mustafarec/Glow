import { APP_CONFIG } from '../../src/domain/config';
import { FocusId, GlowGoalId, GlowProfile, Recommendation } from '../../src/domain/types';

const now = () => new Date().toISOString();

export function createMockGlowProfile(displayName: string, goal: GlowGoalId): GlowProfile {
  const aestheticByGoal: Record<GlowGoalId, string> = {
    natural: 'fresh and effortless',
    'soft-glam': 'softly polished',
    elegant: 'quietly refined',
    clean: 'clean and luminous',
    professional: 'considered and confident',
    'date-night': 'softly magnetic',
    'wedding-guest': 'romantic and refined',
    summer: 'sunlit and warm',
    birthday: 'playful with polish',
  };

  return {
    displayName: displayName.trim() || 'Test user',
    faceShape: 'Soft oval',
    undertone: 'warm',
    colorSeason: 'Soft Autumn',
    currentHairColor: 'Medium brunette',
    currentHairLength: 'Shoulder length',
    preferredAesthetic: aestheticByGoal[goal],
    makeupIntensity: goal === 'natural' || goal === 'clean' ? 'light and skin-led' : 'softly defined',
    bestHairDirections: ['Long layers', 'Face-framing pieces', 'Curtain bangs'],
    hairColors: ['Warm chocolate', 'Chestnut', 'Soft caramel'],
    makeupDirection: ['Peach blush', 'Warm nude lips', 'Soft brown liner'],
    metals: ['Gold', 'Warm mixed metals'],
    createdAt: now(),
    updatedAt: now(),
  };
}

export function createMockRecommendations(profile: GlowProfile, goal: GlowGoalId, focus: FocusId): Recommendation[] {
  const focusBoost: Record<FocusId, Recommendation['category'][]> = {
    hair: ['hairstyle', 'hairstyle', 'hair-color', 'makeup', 'complete-glow'],
    'hair-color': ['hair-color', 'hair-color', 'hairstyle', 'makeup', 'complete-glow'],
    makeup: ['makeup', 'makeup', 'hairstyle', 'hair-color', 'complete-glow'],
    'personal-colors': ['hair-color', 'makeup', 'complete-glow', 'hairstyle', 'hair-color'],
    overall: ['hairstyle', 'hair-color', 'makeup', 'complete-glow', 'hairstyle'],
  };
  const categories = focusBoost[focus];
  const base: Array<Omit<Recommendation, 'category' | 'goalFit'>> = [
    { id: 'long-layers', title: 'Long layers + curtain bangs', subtitle: 'Movement around the face', description: 'A gentle shape change that keeps your length while opening up the face.', impact: 'biggest-impact', tag: 'BEST MATCH', explanation: `The softness mirrors your ${profile.faceShape.toLowerCase()} proportions and keeps the ${profile.preferredAesthetic} feeling.`, creditCost: APP_CONFIG.creditCosts.hairstyle },
    { id: 'warm-chocolate', title: 'Warm chocolate brunette', subtitle: 'A deeper, richer tone', description: 'A low-drama color shift that brings warmth and dimension to your palette.', impact: 'high-impact', tag: 'YOUR COLOR', explanation: 'Warm chocolate sits naturally inside your Soft Autumn palette and looks considered in every light.', creditCost: APP_CONFIG.creditCosts['hair-color'] },
    { id: 'peach-soft-glam', title: 'Peach soft-glam placement', subtitle: 'Lifted blush + warm nude lip', description: 'A simple makeup map that adds light without feeling heavy.', impact: 'high-impact', tag: 'EASY WIN', explanation: 'Peach tones echo your warm undertone; placing blush a little higher creates a fresh, awake finish.', creditCost: APP_CONFIG.creditCosts.makeup },
    { id: 'butterfly-cut', title: 'Butterfly cut', subtitle: 'Airy volume, easy movement', description: 'A bolder layered option when you want more visible shape and swing.', impact: 'explore', tag: 'ALTERNATIVE', explanation: 'This keeps the softness of your best direction while giving the silhouette more editorial energy.', creditCost: APP_CONFIG.creditCosts.hairstyle },
    { id: 'complete-glow', title: 'The complete warm glow', subtitle: 'Hair, color + makeup together', description: 'A full look direction built from the recommendations you already liked.', impact: 'explore', tag: 'FULL LOOK', explanation: `A cohesive ${profile.colorSeason} direction for your ${goal.replace('-', ' ')} goal.`, creditCost: APP_CONFIG.creditCosts['complete-glow'] },
  ];

  return base.map((item, index) => ({ ...item, category: categories[index], goalFit: goal }));
}
