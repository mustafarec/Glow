import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { DEMO_SELFIE_URI } from '@/domain/constants';
import { APP_CONFIG } from '@/domain/config';
import { grantCredits, reserveCredits } from '@/domain/credits';
import { settleFailedGeneration } from '@/domain/generation';
import { createMockGlowProfile, createMockRecommendations } from '@/domain/profile';
import {
  AppState,
  CreditTransaction,
  GeneratedLook,
  GenerationJob,
  GlowGoalId,
  RecommendationFeedback,
  TimelineEntry,
} from '@/domain/types';
import { AI_MODE, aiProvider } from '@/services/ai';
import { track } from '@/services/analytics';
import { AuthActionResult, AuthProvider, AuthSnapshot, getCurrentAuthSnapshot, getInitialAuthSnapshot, requestMagicLink, signInWithProvider, signOutCurrentUser, subscribeToAuthChanges } from '@/services/auth';
import { supabase, supabaseConfigured } from '@/services/supabase';
import { SupabaseMediaStorage } from '@/storage/media';
import { createStateStorage, StorageScope } from '@/storage/persistence';

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function createInitialState(): AppState {
  const createdAt = new Date().toISOString();
  return {
    displayName: 'Maya',
    goal: 'soft-glam',
    focus: 'overall',
    hasOnboarded: false,
    consentToUseImages: false,
    selfies: [],
    profile: null,
    recommendations: [],
    feedback: {},
    generatedLooks: [],
    savedLooks: [],
    timelineEntries: [],
    wallet: { balance: 15, lifetimeGranted: 15, lifetimeSpent: 0 },
    creditTransactions: [{ id: 'welcome-credits', type: 'grant', amount: 15, label: 'Welcome credits', createdAt }],
    subscription: { status: 'free', plan: 'free' },
    purchases: [],
    generationJobs: {},
    activeJobId: null,
  };
}

type StartGenerationResult = { ok: true; jobId: string } | { ok: false; reason: 'insufficient-credits' | 'missing-recommendation' };

export function mergePersistedState(saved: Partial<AppState> | null): AppState {
  const initial = createInitialState();
  if (!saved) return initial;
  return {
    ...initial,
    ...saved,
    selfies: Array.isArray(saved.selfies) ? saved.selfies : initial.selfies,
    recommendations: Array.isArray(saved.recommendations) ? saved.recommendations : initial.recommendations,
    generatedLooks: Array.isArray(saved.generatedLooks) ? saved.generatedLooks : initial.generatedLooks,
    savedLooks: Array.isArray(saved.savedLooks) ? saved.savedLooks : initial.savedLooks,
    timelineEntries: Array.isArray(saved.timelineEntries) ? saved.timelineEntries : initial.timelineEntries,
    creditTransactions: Array.isArray(saved.creditTransactions) ? saved.creditTransactions : initial.creditTransactions,
    purchases: Array.isArray(saved.purchases) ? saved.purchases : initial.purchases,
    feedback: saved.feedback ?? initial.feedback,
    generationJobs: saved.generationJobs ?? initial.generationJobs,
    wallet: saved.wallet ? { ...initial.wallet, ...saved.wallet } : initial.wallet,
    subscription: saved.subscription ? { ...initial.subscription, ...saved.subscription } : initial.subscription,
  };
}

interface AppStoreValue {
  state: AppState;
  hydrated: boolean;
  auth: AuthSnapshot;
  authReady: boolean;
  authConfigured: boolean;
  requestMagicLink: (email: string) => Promise<AuthActionResult>;
  signInWithProvider: (provider: AuthProvider) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  setOnboarding: (displayName: string, goal: GlowGoalId, focus: AppState['focus']) => void;
  addSelfie: (uri: string, angle?: 'front' | 'side' | 'unknown') => void;
  setImageConsent: (allowed: boolean) => void;
  uploadConsentedSelfies: () => Promise<boolean>;
  useDemoProfile: (overrides?: Partial<Pick<AppState, 'displayName' | 'goal' | 'focus'>>) => void;
  runAnalysis: () => Promise<void>;
  setGoal: (goal: GlowGoalId) => Promise<void>;
  setFeedback: (recommendationId: string, feedback: RecommendationFeedback) => void;
  startGeneration: (recommendationId: string) => Promise<StartGenerationResult>;
  saveLook: (lookId: string) => void;
  toggleFavorite: (lookId: string) => void;
  addTimelineEntry: (entry: Omit<TimelineEntry, 'id' | 'createdAt'>) => void;
  purchaseCredits: (packId: string) => void;
  activateSubscription: (plan: 'monthly' | 'annual') => void;
  deleteAllData: () => Promise<void>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(createInitialState);
  const stateRef = useRef(state);
  const [hydrated, setHydrated] = useState(false);
  const [auth, setAuth] = useState<AuthSnapshot>(getInitialAuthSnapshot);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const storage = useMemo(() => createStateStorage(supabase), []);
  const mediaStorage = useMemo(() => (supabase ? new SupabaseMediaStorage(supabase) : null), []);
  const scopeRef = useRef<StorageScope>(null);
  const hydrationGenerationRef = useRef(0);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const suppressNextPersistRef = useRef(false);

  const updateState = useCallback((updater: (current: AppState) => AppState) => {
    setState((current) => {
      const next = updater(current);
      stateRef.current = next;
      return next;
    });
  }, []);

  const hydrateScope = useCallback(async (nextAuth: AuthSnapshot) => {
    const generation = hydrationGenerationRef.current + 1;
    hydrationGenerationRef.current = generation;
    scopeRef.current = nextAuth.userId;
    setAuth(nextAuth);
    setAuthReady(false);
    setHydrated(false);

    let saved: Partial<AppState> | null = null;
    try {
      saved = await storage.load(nextAuth.userId);
      if (nextAuth.userId && mediaStorage && saved?.selfies?.length) {
        saved = { ...saved, selfies: await mediaStorage.refreshSignedUrls(nextAuth.userId, saved.selfies) };
      }
    } catch {
      // The local cache is still the safe fallback if a storage adapter fails.
    }
    if (generation !== hydrationGenerationRef.current) return;

    const next = mergePersistedState(saved);
    stateRef.current = next;
    setState(next);
    setAuthReady(true);
    setHydrated(true);
    track('app_open', { mode: nextAuth.userId ? 'supabase' : supabaseConfigured ? 'guest' : 'mock' });
  }, [mediaStorage, storage]);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAuthChanges((nextAuth) => {
      // Let Supabase finish its auth callback before starting a remote query.
      if (active) setTimeout(() => { if (active) void hydrateScope(nextAuth); }, 0);
    });
    void getCurrentAuthSnapshot().then((nextAuth) => {
      if (active) void hydrateScope(nextAuth);
    });
    return () => {
      active = false;
      hydrationGenerationRef.current += 1;
      unsubscribe();
    };
  }, [hydrateScope]);

  useEffect(() => {
    if (!hydrated) return;
    if (suppressNextPersistRef.current) {
      suppressNextPersistRef.current = false;
      return;
    }

    const scope = scopeRef.current;
    const generation = hydrationGenerationRef.current;
    const snapshot = state;
    persistQueueRef.current = persistQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (generation !== hydrationGenerationRef.current) return;
        await storage.save(scope, snapshot);
      })
      .catch(() => undefined);
  }, [hydrated, state, storage]);

  const setOnboarding = useCallback((displayName: string, goal: GlowGoalId, focus: AppState['focus']) => {
    updateState((current) => ({ ...current, displayName: displayName.trim() || 'Maya', goal, focus }));
    track('onboarding_started', { goal, focus });
  }, [updateState]);

  const addSelfie = useCallback((uri: string, angle: 'front' | 'side' | 'unknown' = 'unknown') => {
    updateState((current) => ({
      ...current,
      selfies: [...current.selfies, { id: id('selfie'), uri, angle, createdAt: new Date().toISOString() }].slice(-3),
    }));
    track('selfie_uploaded', { angle });
  }, [updateState]);

  const setImageConsent = useCallback((allowed: boolean) => {
    updateState((current) => ({ ...current, consentToUseImages: allowed }));
  }, [updateState]);

  const uploadConsentedSelfies = useCallback(async (): Promise<boolean> => {
    const scope = scopeRef.current;
    if (!scope || !mediaStorage) return true;

    const current = stateRef.current;
    const pending = current.selfies.filter((selfie) => !selfie.storagePath && !/^https?:\/\//i.test(selfie.uri));
    if (!pending.length) return true;

    try {
      const uploaded = await mediaStorage.uploadSelfies(scope, pending, new Date().toISOString());
      const uploadedById = new Map(uploaded.map((selfie) => [selfie.id, selfie]));
      updateState((next) => ({ ...next, selfies: next.selfies.map((selfie) => uploadedById.get(selfie.id) ?? selfie) }));
      return true;
    } catch {
      return false;
    }
  }, [mediaStorage, updateState]);

  const useDemoProfile = useCallback((overrides: Partial<Pick<AppState, 'displayName' | 'goal' | 'focus'>> = {}) => {
    const current = { ...stateRef.current, ...overrides };
    const profile = createMockGlowProfile(current.displayName, current.goal);
    const recommendations = createMockRecommendations(profile, current.goal, current.focus);
    const demoSelfie = { id: 'demo-selfie', uri: DEMO_SELFIE_URI, angle: 'front' as const, createdAt: new Date().toISOString() };
    updateState((next) => ({
      ...next,
      displayName: current.displayName,
      goal: current.goal,
      focus: current.focus,
      profile,
      recommendations,
      selfies: next.selfies.length ? next.selfies : [demoSelfie],
      hasOnboarded: true,
    }));
    track('glow_profile_created', { mode: 'demo' });
  }, [updateState]);

  const runAnalysis = useCallback(async () => {
    const current = stateRef.current;
    const selfies = current.selfies.length
      ? current.selfies
      : [{ id: 'demo-selfie', uri: DEMO_SELFIE_URI, angle: 'front' as const, createdAt: new Date().toISOString() }];
    const profile = await aiProvider.analyze({ displayName: current.displayName, goal: current.goal, selfies });
    const recommendations = await aiProvider.recommend(profile, current.goal, current.focus);
    updateState((next) => ({ ...next, profile, recommendations, selfies: next.selfies.length ? next.selfies : selfies, hasOnboarded: true }));
    track('glow_profile_created', { mode: AI_MODE.toLowerCase(), selfieCount: selfies.length });
    track('onboarding_completed', { goal: current.goal });
  }, [updateState]);

  const setGoal = useCallback(async (goal: GlowGoalId) => {
    const current = stateRef.current;
    if (!current.profile) {
      updateState((next) => ({ ...next, goal }));
      return;
    }
    const profile = createMockGlowProfile(current.displayName, goal);
    const recommendations = await aiProvider.recommend(profile, goal, current.focus);
    updateState((next) => ({ ...next, goal, profile, recommendations }));
  }, [updateState]);

  const setFeedback = useCallback((recommendationId: string, feedback: RecommendationFeedback) => {
    updateState((current) => ({ ...current, feedback: { ...current.feedback, [recommendationId]: feedback } }));
    track(feedback === 'love-it' ? 'recommendation_liked' : 'recommendation_rejected', { recommendationId, feedback });
  }, [updateState]);

  const completeGeneration = useCallback((jobId: string, providerJobId: string, providerStatus: 'completed' | 'failed', resultUri?: string, error?: string) => {
    updateState((current) => {
      const job = current.generationJobs[jobId];
      if (!job || job.status === 'completed' || (job.status === 'failed' && job.refunded)) return current;
      if (providerStatus === 'failed') {
        const settlement = settleFailedGeneration(job, current.wallet);
        const refund: CreditTransaction = { id: id('refund'), type: 'refund', amount: settlement.refundAmount, label: 'Generation restored', createdAt: new Date().toISOString() };
        const failedJob: GenerationJob = { ...settlement.job, providerJobId, error: error ?? settlement.job.error, updatedAt: new Date().toISOString() };
        track('generation_failed', { jobId, refunded: true });
        return { ...current, wallet: settlement.wallet, creditTransactions: settlement.refundAmount ? [...current.creditTransactions, refund] : current.creditTransactions, generationJobs: { ...current.generationJobs, [jobId]: failedJob } };
      }

      const recommendation = current.recommendations.find((item) => item.id === job.recommendationId);
      if (!recommendation) return current;
      const look: GeneratedLook = {
        id: id('look'),
        recommendationId: recommendation.id,
        title: recommendation.title,
        category: recommendation.category,
        beforeImageUri: current.selfies[0]?.uri ?? DEMO_SELFIE_URI,
        resultImageUri: resultUri ?? recommendation.imageUri,
        createdAt: new Date().toISOString(),
        isFavorite: false,
      };
      const completedJob: GenerationJob = { ...job, providerJobId, status: 'completed', resultLookId: look.id, refunded: false, updatedAt: new Date().toISOString() };
      track('generation_completed', { jobId, recommendationId: recommendation.id });
      return { ...current, generatedLooks: [look, ...current.generatedLooks], generationJobs: { ...current.generationJobs, [jobId]: completedJob } };
    });
  }, [updateState]);

  const startGeneration = useCallback(async (recommendationId: string): Promise<StartGenerationResult> => {
    const current = stateRef.current;
    const recommendation = current.recommendations.find((item) => item.id === recommendationId);
    if (!recommendation) return { ok: false, reason: 'missing-recommendation' };
    const reservation = reserveCredits(current.wallet, recommendation.creditCost);
    if (!reservation.ok) return { ok: false, reason: 'insufficient-credits' };

    const jobId = id('job');
    const now = new Date().toISOString();
    const job: GenerationJob = { id: jobId, recommendationId, status: 'queued', creditCost: recommendation.creditCost, refunded: false, createdAt: now, updatedAt: now };
    const transaction: CreditTransaction = { id: id('reservation'), type: 'reservation', amount: -recommendation.creditCost, label: `Preview: ${recommendation.title}`, createdAt: now };
    updateState((next) => ({ ...next, wallet: reservation.wallet, generationJobs: { ...next.generationJobs, [jobId]: job }, activeJobId: jobId, creditTransactions: [...next.creditTransactions, transaction] }));
    track('generation_started', { recommendationId, creditCost: recommendation.creditCost });

    try {
      const providerJob = await aiProvider.generate({
        clientRequestId: jobId,
        recommendationId,
        recommendationTitle: recommendation.title,
        sourceImageUri: current.selfies[0]?.uri ?? DEMO_SELFIE_URI,
        sourceStoragePath: current.selfies[0]?.storagePath,
        resultImageUri: recommendation.imageUri,
      });
      const providerJobId = providerJob.providerJobId ?? providerJob.id;
      updateState((next) => ({ ...next, generationJobs: { ...next.generationJobs, [jobId]: { ...next.generationJobs[jobId], status: 'processing', providerJobId, updatedAt: new Date().toISOString() } } }));

      const poll = async () => {
        try {
          const result = await aiProvider.getJob(providerJob.id);
          if (result.status === 'completed' || result.status === 'failed') {
            completeGeneration(jobId, result.providerJobId ?? providerJobId, result.status, result.resultUri, result.error);
            return;
          }
          setTimeout(() => void poll(), 300);
        } catch (error) {
          completeGeneration(jobId, providerJob.id, 'failed', undefined, error instanceof Error ? error.message : undefined);
        }
      };
      void poll();
    } catch (error) {
      completeGeneration(jobId, 'unavailable', 'failed', undefined, error instanceof Error ? error.message : undefined);
    }

    return { ok: true, jobId };
  }, [completeGeneration, updateState]);

  const saveLook = useCallback((lookId: string) => {
    updateState((current) => {
      const look = current.generatedLooks.find((item) => item.id === lookId);
      if (!look || current.savedLooks.some((item) => item.id === lookId)) return current;
      return { ...current, savedLooks: [{ ...look }, ...current.savedLooks] };
    });
  }, [updateState]);

  const toggleFavorite = useCallback((lookId: string) => {
    updateState((current) => {
      const toggle = (look: GeneratedLook) => look.id === lookId ? { ...look, isFavorite: !look.isFavorite } : look;
      return { ...current, generatedLooks: current.generatedLooks.map(toggle), savedLooks: current.savedLooks.map(toggle) };
    });
  }, [updateState]);

  const addTimelineEntry = useCallback((entry: Omit<TimelineEntry, 'id' | 'createdAt'>) => {
    updateState((current) => ({ ...current, timelineEntries: [{ ...entry, id: id('timeline'), createdAt: new Date().toISOString() }, ...current.timelineEntries] }));
  }, [updateState]);

  const purchaseCredits = useCallback((packId: string) => {
    const pack = APP_CONFIG.creditPacks.find((item) => item.id === packId);
    if (!pack) return;
    updateState((current) => ({
      ...current,
      wallet: grantCredits(current.wallet, pack.credits),
      purchases: [{ id: id('purchase'), label: pack.label, amountLabel: pack.amountLabel, credits: pack.credits, createdAt: new Date().toISOString() }, ...current.purchases],
      creditTransactions: [...current.creditTransactions, { id: id('purchase-credit'), type: 'purchase', amount: pack.credits, label: pack.label, createdAt: new Date().toISOString() }],
    }));
    track('credit_pack_purchased', { packId, credits: pack.credits });
  }, [updateState]);

  const activateSubscription = useCallback((plan: 'monthly' | 'annual') => {
    const renewsAt = new Date(Date.now() + (plan === 'annual' ? 365 : 30) * 86400000).toISOString();
    const selectedPlan = APP_CONFIG.subscriptionPlans.find((item) => item.id === plan);
    updateState((current) => ({ ...current, subscription: { status: 'active', plan, renewsAt }, purchases: [{ id: id('subscription'), label: `Glow+ ${plan}`, amountLabel: selectedPlan?.amountLabel ?? 'Configured in store', createdAt: new Date().toISOString() }, ...current.purchases] }));
    track('subscription_started', { plan });
  }, [updateState]);

  const deleteAllData = useCallback(async () => {
    const scope = scopeRef.current;
    if (scope && mediaStorage) await mediaStorage.clear(scope);
    hydrationGenerationRef.current += 1;
    setHydrated(false);
    await storage.clear(scope);
    const next = createInitialState();
    stateRef.current = next;
    setState(next);
    suppressNextPersistRef.current = true;
    setHydrated(true);
  }, [mediaStorage, storage]);

  const value = useMemo<AppStoreValue>(() => ({
    state,
    hydrated,
    auth,
    authReady,
    authConfigured: supabaseConfigured,
    requestMagicLink,
    signInWithProvider,
    signOut: signOutCurrentUser,
    setOnboarding,
    addSelfie,
    setImageConsent,
    uploadConsentedSelfies,
    useDemoProfile,
    runAnalysis,
    setGoal,
    setFeedback,
    startGeneration,
    saveLook,
    toggleFavorite,
    addTimelineEntry,
    purchaseCredits,
    activateSubscription,
    deleteAllData,
  }), [state, hydrated, auth, authReady, setOnboarding, addSelfie, setImageConsent, uploadConsentedSelfies, useDemoProfile, runAnalysis, setGoal, setFeedback, startGeneration, saveLook, toggleFavorite, addTimelineEntry, purchaseCredits, activateSubscription, deleteAllData]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const value = useContext(AppStoreContext);
  if (!value) throw new Error('useAppStore must be used inside AppProvider');
  return value;
}
