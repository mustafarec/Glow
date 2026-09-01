export type GlowGoalId =
  | 'natural'
  | 'soft-glam'
  | 'elegant'
  | 'clean'
  | 'professional'
  | 'date-night'
  | 'wedding-guest'
  | 'summer'
  | 'birthday';

export type FocusId = 'hair' | 'hair-color' | 'makeup' | 'personal-colors' | 'overall';

export type RecommendationCategory = 'hairstyle' | 'hair-color' | 'makeup' | 'complete-glow';

export type RecommendationImpact = 'biggest-impact' | 'high-impact' | 'explore';

export type RecommendationFeedback = 'love-it' | 'not-for-me' | 'too-bold' | 'too-short' | 'wrong-color' | 'too-much-makeup';

export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface SelfieAsset {
  id: string;
  uri: string;
  angle: 'front' | 'side' | 'unknown';
  createdAt: string;
  storagePath?: string;
  consentedAt?: string;
}

export interface GlowProfile {
  displayName: string;
  faceShape: string;
  undertone: 'warm' | 'cool' | 'neutral';
  colorSeason: string;
  currentHairColor: string;
  currentHairLength: string;
  preferredAesthetic: string;
  makeupIntensity: string;
  bestHairDirections: string[];
  hairColors: string[];
  makeupDirection: string[];
  metals: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Recommendation {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: RecommendationCategory;
  impact: RecommendationImpact;
  tag: string;
  imageUri?: string;
  explanation: string;
  creditCost: number;
  goalFit: GlowGoalId;
}

export interface GeneratedLook {
  id: string;
  recommendationId: string;
  title: string;
  category: RecommendationCategory;
  beforeImageUri: string;
  resultImageUri: string;
  createdAt: string;
  isFavorite: boolean;
}

export interface GenerationJob {
  id: string;
  recommendationId: string;
  status: GenerationStatus;
  creditCost: number;
  providerJobId?: string;
  resultLookId?: string;
  error?: string;
  refunded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditWallet {
  balance: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
}

export interface CreditTransaction {
  id: string;
  type: 'grant' | 'purchase' | 'reservation' | 'refund';
  amount: number;
  label: string;
  createdAt: string;
}

export interface Subscription {
  status: 'free' | 'active';
  plan: 'free' | 'monthly' | 'annual';
  renewsAt?: string;
}

export interface TimelineEntry {
  id: string;
  title: string;
  note: string;
  imageUri?: string;
  createdAt: string;
}

export interface PurchaseRecord {
  id: string;
  label: string;
  amountLabel: string;
  credits?: number;
  createdAt: string;
}

export interface AppState {
  displayName: string;
  goal: GlowGoalId;
  focus: FocusId;
  hasOnboarded: boolean;
  consentToUseImages: boolean;
  selfies: SelfieAsset[];
  profile: GlowProfile | null;
  recommendations: Recommendation[];
  feedback: Record<string, RecommendationFeedback>;
  generatedLooks: GeneratedLook[];
  savedLooks: GeneratedLook[];
  timelineEntries: TimelineEntry[];
  wallet: CreditWallet;
  creditTransactions: CreditTransaction[];
  subscription: Subscription;
  purchases: PurchaseRecord[];
  generationJobs: Record<string, GenerationJob>;
  activeJobId: string | null;
}
