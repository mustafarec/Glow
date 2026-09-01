import { Subscription } from './types';

export const isGlowPlus = (subscription: Subscription) => subscription.status === 'active';

export function canUseFeature(subscription: Subscription, feature: 'premium-recommendations' | 'advanced-comparison' | 'saved-profiles') {
  if (subscription.status === 'active') return true;
  return feature === 'advanced-comparison';
}
