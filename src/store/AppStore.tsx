import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  AppState,
  GeneratedLook,
  GenerationJob,
  GlowGoalId,
  RecommendationFeedback,
  TimelineEntry,
} from '@/domain/types';
import { aiProvider } from '@/services/ai';
import { track } from '@/services/analytics';
import { AuthActionResult, AuthProvider, AuthSnapshot, getCurrentAuthSnapshot, getInitialAuthSnapshot, requestMagicLink, signInWithProvider, signOutCurrentUser, subscribeToAuthChanges } from '@/services/auth';
import { supabase, supabaseConfigured } from '@/services/supabase';
import { loadCreditAccount, type CreditAccount } from '@/services/account';
import { ServerAIError } from '@/services/server-ai';
import { SupabaseMediaStorage } from '@/storage/media';
import { createStateStorage, StorageScope } from '@/storage/persistence';

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function createInitialState(): AppState {
  return {
    displayName: '',
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
    wallet: { balance: 0, lifetimeGranted: 0, lifetimeSpent: 0 },
    creditTransactions: [],
    subscription: { status: 'free', plan: 'free' },
    purchases: [],
    generationJobs: {},
    activeJobId: null,
  };
}

type StartGenerationResult = { ok: true; jobId: string } | { ok: false; reason: 'insufficient-credits' | 'missing-recommendation' | 'auth-required' | 'missing-selfie' | 'provider-unavailable' };

export function mergePersistedState(saved: Partial<AppState> | null, creditAccount: CreditAccount | null = null): AppState {
  const initial = createInitialState();
  const persisted = saved ?? {};
  return {
    ...initial,
    ...persisted,
    selfies: Array.isArray(persisted.selfies) ? persisted.selfies : initial.selfies,
    recommendations: Array.isArray(persisted.recommendations) ? persisted.recommendations : initial.recommendations,
    generatedLooks: Array.isArray(persisted.generatedLooks) ? persisted.generatedLooks : initial.generatedLooks,
    savedLooks: Array.isArray(persisted.savedLooks) ? persisted.savedLooks : initial.savedLooks,
    timelineEntries: Array.isArray(persisted.timelineEntries) ? persisted.timelineEntries : initial.timelineEntries,
    creditTransactions: creditAccount?.creditTransactions ?? initial.creditTransactions,
    feedback: persisted.feedback ?? initial.feedback,
    generationJobs: persisted.generationJobs ?? initial.generationJobs,
    wallet: creditAccount?.wallet ?? initial.wallet,
    subscription: initial.subscription,
    purchases: initial.purchases,
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
  runAnalysis: () => Promise<void>;
  setGoal: (goal: GlowGoalId) => Promise<void>;
  setFeedback: (recommendationId: string, feedback: RecommendationFeedback) => void;
  startGeneration: (recommendationId: string) => Promise<StartGenerationResult>;
  saveLook: (lookId: string) => void;
  toggleFavorite: (lookId: string) => void;
  addTimelineEntry: (entry: Omit<TimelineEntry, 'id' | 'createdAt'>) => void;
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
    let creditAccount: CreditAccount | null = null;
    try {
      const accountState = await storage.load(nextAuth.userId);
      saved = accountState ?? (nextAuth.userId ? await storage.load(null) : null);
      if (nextAuth.userId && mediaStorage && saved?.selfies?.length) {
        saved = { ...saved, selfies: await mediaStorage.refreshSignedUrls(nextAuth.userId, saved.selfies) };
      }
    } catch {
      // The local cache is still the safe fallback if a storage adapter fails.
    }
    if (nextAuth.userId && supabase) {
      try {
        creditAccount = await loadCreditAccount(supabase);
      } catch {
        // A missing or unavailable account service must never become local credit data.
      }
    }
    if (generation !== hydrationGenerationRef.current) return;

    const next = mergePersistedState(saved, creditAccount);
    stateRef.current = next;
    setState(next);
    setAuthReady(true);
    setHydrated(true);
    track('app_open', { mode: nextAuth.userId ? 'supabase' : supabaseConfigured ? 'guest' : 'unconfigured' });
  }, [mediaStorage, storage]);

  const refreshCreditAccount = useCallback(async () => {
    const userId = scopeRef.current;
    if (!userId || !supabase) return;
    try {
      const creditAccount = await loadCreditAccount(supabase);
      if (scopeRef.current !== userId) return;
      updateState((current) => ({ ...current, wallet: creditAccount.wallet, creditTransactions: creditAccount.creditTransactions }));
    } catch {
      // Keep the last verified balance visible; never synthesize a replacement.
    }
  }, [updateState]);

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
    updateState((current) => ({ ...current, displayName: displayName.trim(), goal, focus }));
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
    const current = stateRef.current;
    if (!scope || !mediaStorage) return current.selfies.length > 0 && current.selfies.every((selfie) => Boolean(selfie.storagePath));

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

  const runAnalysis = useCallback(async () => {
    const current = stateRef.current;
    if (!scopeRef.current || !mediaStorage) throw new Error('Sign in is required before creating a private Glow Profile.');
    if (!current.displayName.trim()) throw new Error('A name is required before creating a private Glow Profile.');
    if (!current.selfies.length || current.selfies.some((selfie) => !selfie.storagePath)) {
      throw new Error('A consented selfie is required before creating a private Glow Profile.');
    }
    const selfies = current.selfies;
    const profile = await aiProvider.analyze({ displayName: current.displayName, goal: current.goal, selfies });
    const recommendations = await aiProvider.recommend(profile, current.goal, current.focus);
    updateState((next) => ({ ...next, profile, recommendations, hasOnboarded: true }));
    track('glow_profile_created', { mode: 'production', selfieCount: selfies.length });
    track('onboarding_completed', { goal: current.goal });
  }, [mediaStorage, updateState]);

  const setGoal = useCallback(async (goal: GlowGoalId) => {
    const current = stateRef.current;
    if (!current.profile) {
      updateState((next) => ({ ...next, goal }));
      return;
    }
    const recommendations = await aiProvider.recommend(current.profile, goal, current.focus);
    updateState((next) => ({ ...next, goal, recommendations }));
  }, [updateState]);

  const setFeedback = useCallback((recommendationId: string, feedback: RecommendationFeedback) => {
    updateState((current) => ({ ...current, feedback: { ...current.feedback, [recommendationId]: feedback } }));
    track(feedback === 'love-it' ? 'recommendation_liked' : 'recommendation_rejected', { recommendationId, feedback });
  }, [updateState]);

  const completeGeneration = useCallback((jobId: string, providerJobId: string, providerStatus: 'completed' | 'failed', resultUri?: string, error?: string) => {
    updateState((current) => {
      const job = current.generationJobs[jobId];
      if (!job || job.status === 'completed' || (job.status === 'failed' && job.refunded)) return current;
      const recommendation = current.recommendations.find((item) => item.id === job.recommendationId);
      const beforeImageUri = current.selfies[0]?.uri;
      if (providerStatus === 'failed' || !recommendation || !beforeImageUri || !resultUri) {
        const failure = error
          ?? (providerStatus === 'failed' ? 'The production AI provider failed.' : !recommendation ? 'The recommendation is no longer available.' : !beforeImageUri ? 'The source selfie is no longer available.' : 'The AI provider returned no generated preview.');
        const failedJob: GenerationJob = { ...job, status: 'failed', refunded: true, providerJobId, error: failure, updatedAt: new Date().toISOString() };
        track('generation_failed', { jobId, refunded: true });
        return { ...current, generationJobs: { ...current.generationJobs, [jobId]: failedJob } };
      }

      const look: GeneratedLook = {
        id: id('look'),
        recommendationId: recommendation.id,
        title: recommendation.title,
        category: recommendation.category,
        beforeImageUri,
        resultImageUri: resultUri,
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
    if (!scopeRef.current || !mediaStorage) return { ok: false, reason: 'auth-required' };
    const sourceSelfie = current.selfies[0];
    if (!current.consentToUseImages || !sourceSelfie?.storagePath) return { ok: false, reason: 'missing-selfie' };
    const jobId = id('job');
    const now = new Date().toISOString();
    const job: GenerationJob = { id: jobId, recommendationId, status: 'queued', creditCost: recommendation.creditCost, refunded: false, createdAt: now, updatedAt: now };
    updateState((next) => ({ ...next, generationJobs: { ...next.generationJobs, [jobId]: job }, activeJobId: jobId }));
    track('generation_started', { recommendationId, creditCost: recommendation.creditCost });

    try {
      const providerJob = await aiProvider.generate({
        clientRequestId: jobId,
        recommendationId,
        recommendationTitle: recommendation.title,
        recommendationCategory: recommendation.category,
        sourceImageUri: sourceSelfie.uri,
        sourceStoragePath: sourceSelfie.storagePath,
      });
      const providerJobId = providerJob.providerJobId ?? providerJob.id;
      updateState((next) => ({ ...next, generationJobs: { ...next.generationJobs, [jobId]: { ...next.generationJobs[jobId], status: 'processing', providerJobId, updatedAt: new Date().toISOString() } } }));
      void refreshCreditAccount();

      const poll = async () => {
        try {
          const result = await aiProvider.getJob(providerJob.id);
          if (result.status === 'completed' || result.status === 'failed') {
            completeGeneration(jobId, result.providerJobId ?? providerJobId, result.status, result.resultUri, result.error);
            void refreshCreditAccount();
            return;
          }
          setTimeout(() => void poll(), 300);
        } catch (error) {
          completeGeneration(jobId, providerJob.id, 'failed', undefined, error instanceof Error ? error.message : undefined);
          void refreshCreditAccount();
        }
      };
      void poll();
    } catch (error) {
      completeGeneration(jobId, 'unavailable', 'failed', undefined, error instanceof Error ? error.message : undefined);
      void refreshCreditAccount();
      return { ok: false, reason: error instanceof ServerAIError && error.code === 'insufficient_credits' ? 'insufficient-credits' : 'provider-unavailable' };
    }

    return { ok: true, jobId };
  }, [completeGeneration, mediaStorage, refreshCreditAccount, updateState]);

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
    runAnalysis,
    setGoal,
    setFeedback,
    startGeneration,
    saveLook,
    toggleFavorite,
    addTimelineEntry,
    deleteAllData,
  }), [state, hydrated, auth, authReady, setOnboarding, addSelfie, setImageConsent, uploadConsentedSelfies, runAnalysis, setGoal, setFeedback, startGeneration, saveLook, toggleFavorite, addTimelineEntry, deleteAllData]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const value = useContext(AppStoreContext);
  if (!value) throw new Error('useAppStore must be used inside AppProvider');
  return value;
}
