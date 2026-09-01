import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Eyebrow } from '@/components/ui';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

export default function EntryScreen() {
  const router = useRouter();
  const { state, hydrated } = useAppStore();

  useEffect(() => {
    if (hydrated) router.replace(state.hasOnboarded ? '/(tabs)' : '/onboarding');
  }, [hydrated, router, state.hasOnboarded]);

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.mark}><AppText variant="display" style={styles.markText}>g</AppText></View>
      <Eyebrow>PERSONAL STYLE, DECODED</Eyebrow>
      <AppText variant="display" style={styles.title}>Discover what actually suits you.</AppText>
      <AppText style={styles.subtitle}>A more personal way to explore hair, color and makeup — built around the way you want to feel.</AppText>
      {hydrated ? <Button tone="dark" onPress={() => router.replace(state.hasOnboarded ? '/(tabs)' : '/onboarding')}>Open Glow</Button> : <AppText variant="caption" style={styles.loading}>Preparing your private space…</AppText>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', justifyContent: 'center', paddingBottom: 70 },
  mark: { alignItems: 'center', backgroundColor: colors.clay, borderRadius: 48, height: 78, justifyContent: 'center', marginBottom: spacing.lg, width: 78 },
  markText: { color: colors.white, fontSize: 46, lineHeight: 55 },
  title: { marginTop: spacing.md, maxWidth: 340, textAlign: 'center' },
  subtitle: { color: colors.inkSoft, marginBottom: spacing.xl, marginTop: spacing.md, maxWidth: 330, textAlign: 'center' },
  loading: { color: colors.muted },
});
