import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, EmptyState, Eyebrow, GlowImage, IconButton, Pill } from '@/components/ui';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

export default function SavedScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  return <Screen><View style={styles.top}><IconButton name="chevron-back" onPress={() => router.back()} label="Go back" /><Pill tone="accent">{state.savedLooks.length} saved</Pill></View><Eyebrow>YOUR PRIVATE LIBRARY</Eyebrow><AppText variant="display" style={styles.title}>Saved looks</AppText><AppText style={styles.subtitle}>The directions you want to remember, without a public feed.</AppText>{state.savedLooks.length ? state.savedLooks.map((look) => <View key={look.id} style={styles.look}><GlowImage uri={look.resultImageUri} style={styles.image} /><View style={styles.copy}><AppText variant="eyebrow" style={styles.clay}>{look.category.replace('-', ' ')}</AppText><AppText variant="title">{look.title}</AppText><AppText variant="caption" style={styles.muted}>{new Date(look.createdAt).toLocaleDateString()}</AppText></View><IconButton name="chevron-forward" onPress={() => router.push({ pathname: '/result', params: { lookId: look.id } })} label={`Open ${look.title}`} /></View>) : <EmptyState icon="bookmark-outline" title="Nothing saved yet." description="When a preview feels like you, save it here." action="Try my Glow" onAction={() => router.replace('/(tabs)/try')} />}</Screen>;
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { marginTop: spacing.md },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md },
  look: { alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, padding: spacing.sm },
  image: { borderRadius: radius.md, height: 94, width: 76 },
  copy: { flex: 1, gap: 4 },
  clay: { color: colors.clay },
  muted: { color: colors.muted },
});
