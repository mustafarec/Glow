import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase';
import { AuthCallbackParams, parseAuthCallbackParams } from '@/services/auth-callback';

export type { AuthCallbackParams } from '@/services/auth-callback';
export { parseAuthCallbackParams } from '@/services/auth-callback';

export type AuthProvider = 'apple' | 'google';

export interface AuthSnapshot {
  userId: string | null;
  email: string | null;
  displayName: string | null;
}

export type AuthFailureReason = 'not-configured' | 'invalid-email' | 'cancelled' | 'unavailable';

export type AuthActionResult = { ok: true } | { ok: false; reason: AuthFailureReason };

export function getInitialAuthSnapshot(): AuthSnapshot {
  return { userId: null, email: null, displayName: null };
}

function getDisplayName(user: User | null): string | null {
  const metadata = user?.user_metadata;
  const displayName = metadata?.display_name ?? metadata?.full_name ?? metadata?.name;
  return typeof displayName === 'string' && displayName.trim() ? displayName.trim() : null;
}

export function snapshotFromSession(session: Session | null): AuthSnapshot {
  const user = session?.user ?? null;
  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    displayName: getDisplayName(user),
  };
}

export async function getCurrentAuthSnapshot(): Promise<AuthSnapshot> {
  if (!supabase) return getInitialAuthSnapshot();
  try {
    const { data } = await supabase.auth.getSession();
    return snapshotFromSession(data.session);
  } catch {
    return getInitialAuthSnapshot();
  }
}

export function subscribeToAuthChanges(listener: (snapshot: AuthSnapshot) => void): () => void {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(snapshotFromSession(session)));
  return () => data.subscription.unsubscribe();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function requestMagicLink(email: string): Promise<AuthActionResult> {
  if (!supabase) return { ok: false, reason: 'not-configured' };
  const normalizedEmail = email.trim();
  if (!isValidEmail(normalizedEmail)) return { ok: false, reason: 'invalid-email' };

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: Linking.createURL('auth/callback') },
    });
    return error ? { ok: false, reason: 'unavailable' } : { ok: true };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

function isEmailOtpType(value: string | undefined): value is 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email' {
  return value === 'signup' || value === 'invite' || value === 'magiclink' || value === 'recovery' || value === 'email_change' || value === 'email';
}

export async function completeAuthCallback(params: AuthCallbackParams): Promise<AuthActionResult> {
  if (!supabase) return { ok: false, reason: 'not-configured' };
  if (params.error || params.error_description) return { ok: false, reason: 'unavailable' };

  try {
    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      return error ? { ok: false, reason: 'unavailable' } : { ok: true };
    }

    if (params.access_token && params.refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token });
      return error ? { ok: false, reason: 'unavailable' } : { ok: true };
    }

    if (params.token_hash && isEmailOtpType(params.type)) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: params.token_hash, type: params.type });
      return error ? { ok: false, reason: 'unavailable' } : { ok: true };
    }
  } catch {
    return { ok: false, reason: 'unavailable' };
  }

  return { ok: false, reason: 'unavailable' };
}

export async function signInWithProvider(provider: AuthProvider): Promise<AuthActionResult> {
  if (!supabase) return { ok: false, reason: 'not-configured' };

  try {
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
    });
    if (error || !data.url) return { ok: false, reason: 'unavailable' };
    if (Platform.OS === 'web') return { ok: true };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) return { ok: false, reason: 'cancelled' };
    return completeAuthCallback(parseAuthCallbackParams(result.url));
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export async function signOutCurrentUser(): Promise<AuthActionResult> {
  if (!supabase) return { ok: false, reason: 'not-configured' };
  try {
    const { error } = await supabase.auth.signOut();
    return error ? { ok: false, reason: 'unavailable' } : { ok: true };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
