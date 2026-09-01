export type AnalyticsEvent =
  | 'app_open'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'selfie_uploaded'
  | 'glow_profile_created'
  | 'blueprint_viewed'
  | 'recommendation_viewed'
  | 'recommendation_liked'
  | 'recommendation_rejected'
  | 'generation_started'
  | 'generation_completed'
  | 'generation_failed'
  | 'share_created'
  | 'share_completed'
  | 'paywall_viewed'
  | 'subscription_started'
  | 'credit_pack_viewed'
  | 'credit_pack_purchased';

export function track(event: AnalyticsEvent, properties: Record<string, string | number | boolean> = {}) {
  if (__DEV__) console.info(`[analytics] ${event}`, properties);
  // Production adapter belongs server-side and must only receive these safe properties.
}
