import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Divider, Eyebrow, IconButton } from '@/components/ui';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

export default function AuthScreen() {
  const router = useRouter();
  const { state, auth, authReady, authConfigured, requestMagicLink, signInWithProvider, signOut } = useAppStore();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const explainFailure = (provider: string, reason: string) => {
    if (reason === 'not-configured') return `${provider} sign in is ready in the app, but Supabase public configuration is not set yet.`;
    if (reason === 'cancelled') return `${provider} sign in was cancelled.`;
    if (reason === 'invalid-email') return 'Enter a valid email address.';
    return `${provider} sign in is temporarily unavailable. Try again in a moment.`;
  };

  const handleProvider = async (provider: 'apple' | 'google') => {
    setBusy(true);
    const result = await signInWithProvider(provider);
    setBusy(false);
    if (!result.ok) Alert.alert(`${provider[0].toUpperCase()}${provider.slice(1)} sign in`, explainFailure(provider, result.reason));
  };

  const handleEmail = async () => {
    setBusy(true);
    const result = await requestMagicLink(email);
    setBusy(false);
    Alert.alert(result.ok ? 'Check your inbox' : 'Email sign in', result.ok ? 'We sent a secure magic link. Open it on this device to finish signing in.' : explainFailure('Email', result.reason));
  };

  const handleSignOut = async () => {
    setBusy(true);
    const result = await signOut();
    setBusy(false);
    if (!result.ok) Alert.alert('Sign out', explainFailure('Sign out', result.reason));
  };

  return <Screen><View style={styles.top}><IconButton name="chevron-back" onPress={() => router.back()} label="Go back" /><View style={styles.spacer} /></View><View style={styles.mark}><AppText variant="display" style={styles.markText}>g</AppText></View><Eyebrow>YOUR ACCOUNT, YOUR DATA</Eyebrow><AppText variant="display" style={styles.title}>Keep your Glow close.</AppText><AppText style={styles.subtitle}>Create an account to keep your profile, saved looks and timeline across devices.</AppText>{auth.userId ? <><AppText variant="label" style={styles.signedIn}>Signed in{auth.email ? ` as ${auth.email}` : ''}</AppText><Button tone="light" disabled={busy} onPress={() => { void handleSignOut(); }}>Sign out</Button></> : <><Button tone="dark" disabled={!authReady || busy} icon="logo-apple" onPress={() => { void handleProvider('apple'); }}>Continue with Apple</Button><Button tone="light" disabled={!authReady || busy} icon="logo-google" onPress={() => { void handleProvider('google'); }} style={styles.provider}>Continue with Google</Button><Divider /><AppText variant="label" style={styles.label}>CONTINUE WITH EMAIL</AppText><TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" style={styles.input} /><Button tone="accent" disabled={!authReady || busy || !email.includes('@')} onPress={() => { void handleEmail(); }} style={styles.emailButton}>Send magic link</Button></>}<Button tone="quiet" onPress={() => router.back()}>Continue as {state.displayName} for now</Button><AppText variant="caption" style={styles.note}>{authConfigured ? 'Your session is stored by Supabase and your app state is scoped to your account.' : 'Guest mode is fully available. Add Supabase public configuration to enable account sign-in.'}</AppText></Screen>;
}

const styles = StyleSheet.create({
  top: { marginBottom: spacing.xl },
  spacer: { height: 40, width: 40 },
  mark: { alignItems: 'center', backgroundColor: colors.clay, borderRadius: 40, height: 64, justifyContent: 'center', marginBottom: spacing.lg, width: 64 },
  markText: { color: colors.white, fontSize: 38, lineHeight: 44 },
  title: { marginTop: spacing.md },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md },
  provider: { marginTop: spacing.sm },
  label: { marginBottom: spacing.sm },
  input: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 54, paddingHorizontal: spacing.md },
  emailButton: { marginTop: spacing.sm },
  signedIn: { backgroundColor: colors.sageSoft, borderRadius: radius.md, marginBottom: spacing.sm, marginTop: spacing.md, padding: spacing.md },
  note: { color: colors.muted, marginTop: spacing.md, textAlign: 'center' },
});
