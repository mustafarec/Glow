import { FocusId, GlowGoalId, RecommendationCategory } from './types';

export const DEMO_SELFIE_URI =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85';

export const DEMO_LOOK_URIS = {
  layers: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
  butterfly: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85',
  bob: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1000&q=85',
  color: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85',
  makeup: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=85',
  glow: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=1000&q=85',
} as const;

export const FOCUS_OPTIONS: Array<{ id: FocusId; label: string; description: string }> = [
  { id: 'hair', label: 'Hair', description: 'Cuts, layers & shape' },
  { id: 'hair-color', label: 'Hair color', description: 'Tones that feel like you' },
  { id: 'makeup', label: 'Makeup', description: 'Easy, personal direction' },
  { id: 'personal-colors', label: 'Personal colors', description: 'Your palette, decoded' },
  { id: 'overall', label: 'Overall glow-up', description: 'A little bit of everything' },
];

export const GOAL_OPTIONS: Array<{ id: GlowGoalId; label: string; description: string; accent: string }> = [
  { id: 'natural', label: 'Natural Glow', description: 'Fresh, effortless, still you', accent: '#C6D2BF' },
  { id: 'soft-glam', label: 'Soft Glam', description: 'Polished with a soft edge', accent: '#E6B8AA' },
  { id: 'elegant', label: 'Elegant', description: 'Quietly refined', accent: '#D6C2A7' },
  { id: 'clean', label: 'Clean', description: 'Crisp, simple, luminous', accent: '#D6E0E3' },
  { id: 'professional', label: 'Professional', description: 'Confident and considered', accent: '#B8C2BC' },
  { id: 'date-night', label: 'Date Night', description: 'A little more intention', accent: '#D8A29A' },
  { id: 'wedding-guest', label: 'Wedding Guest', description: 'Softly memorable', accent: '#DED0D7' },
  { id: 'summer', label: 'Summer', description: 'Warm, light, sunlit', accent: '#E7CF9D' },
  { id: 'birthday', label: 'Birthday', description: 'Your best kind of extra', accent: '#CDB3D1' },
];

export const CATEGORY_OPTIONS: Array<{ id: RecommendationCategory; label: string; description: string; icon: string }> = [
  { id: 'hairstyle', label: 'Hairstyles', description: 'Shape, layers & movement', icon: '✦' },
  { id: 'hair-color', label: 'Hair colors', description: 'Tones made for your palette', icon: '◐' },
  { id: 'makeup', label: 'Makeup looks', description: 'Placement, not perfection', icon: '◒' },
  { id: 'complete-glow', label: 'Complete Glow', description: 'The full direction', icon: '✧' },
];

export const formatGoal = (goal: GlowGoalId) => GOAL_OPTIONS.find((item) => item.id === goal)?.label ?? 'Natural Glow';
