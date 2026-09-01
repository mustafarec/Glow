import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Eyebrow, IconButton, RecommendationCard, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

export default function ChangeScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  const impact = state.recommendations.filter((item) => item.impact !== 'explore');

  return <Screen><View style={styles.top}><IconButton name="chevron-back" onPress={() => router.back()} label="Go back" /><View style={styles.spacer} /></View><Eyebrow>OPTIONAL, ACTIONABLE, PERSONAL</Eyebrow><AppText variant="display" style={styles.title}>What should I change?</AppText><AppText style={styles.subtitle}>A few high-impact ideas to explore, ranked by your current goal. Keep what resonates; skip what doesn’t.</AppText><SectionTitle>BIGGEST IMPACT</SectionTitle>{impact.map((item, index) => <View key={item.id} style={styles.suggestion}><View style={styles.suggestionNumber}><AppText variant="title" style={styles.number}>{index + 1}</AppText></View><View style={styles.suggestionCopy}><AppText variant="eyebrow" style={styles.clay}>{item.category.replace('-', ' ')}</AppText><AppText variant="title">{item.title}</AppText><AppText variant="caption" style={styles.muted}>{item.explanation}</AppText><Button tone="light" onPress={() => router.push({ pathname: '/recommendation', params: { id: item.id } })} style={styles.seeButton}>See me</Button></View></View>)}<Button tone="dark" icon="sparkles-outline" onPress={() => router.push('/category')}>Explore more directions</Button></Screen>;
}

const styles = StyleSheet.create({
  top: { marginBottom: spacing.xl },
  spacer: { height: 40, width: 40 },
  title: { marginTop: spacing.md },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md },
  suggestion: { backgroundColor: colors.card, borderRadius: 24, flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, padding: spacing.md },
  suggestionNumber: { alignItems: 'center', backgroundColor: colors.blushSoft, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  number: { color: colors.clay },
  suggestionCopy: { flex: 1, gap: spacing.sm },
  clay: { color: colors.clay },
  muted: { color: colors.inkSoft },
  seeButton: { alignSelf: 'flex-start', minHeight: 42, paddingHorizontal: spacing.md },
});
