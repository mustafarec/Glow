import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, CreditBadge, Eyebrow, Pill, RecommendationCard, SectionTitle, Stat } from '@/components/ui';
import { formatGoal } from '@/domain/constants';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

export default function GlowScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  const profile = state.profile;

  return (
    <Screen>
      <View style={styles.topRow}><View style={styles.topCopy}><Eyebrow>THE PROFILE THAT LEARNS YOU</Eyebrow><AppText variant="display">Your Glow</AppText></View><CreditBadge balance={state.wallet.balance} /></View>
      <View style={styles.hero}><View style={styles.heroCircle}><AppText variant="display" style={styles.heroInitials}>SA</AppText></View><View style={styles.heroCopy}><Pill tone="accent">{formatGoal(state.goal)}</Pill><AppText variant="title">{profile?.colorSeason ?? 'Soft Autumn'}</AppText><AppText variant="caption" style={styles.muted}>A warm, softened palette with room for depth.</AppText></View></View>
      <SectionTitle>YOUR SIGNALS</SectionTitle>
      <View style={styles.stats}><Stat value={profile?.faceShape ?? 'Soft oval'} label="face shape" /><Stat value={profile?.undertone ?? 'warm'} label="undertone" /><Stat value={profile?.currentHairLength ?? 'mid'} label="current length" /></View>
      <SectionTitle action="Edit goal" onAction={() => router.push('/goal')}>BEST DIRECTIONS</SectionTitle>
      <View style={styles.directionBox}>{(profile?.bestHairDirections ?? ['Long layers', 'Face framing', 'Curtain bangs']).map((direction) => <View key={direction} style={styles.direction}><View style={styles.dot} /><AppText>{direction}</AppText></View>)}</View>
      <View style={styles.palette}><View><Eyebrow>COLOR PROFILE</Eyebrow><AppText variant="title">{profile?.colorSeason ?? 'Soft Autumn'}</AppText><AppText variant="caption" style={styles.muted}>{profile?.hairColors.join(' · ') ?? 'Warm chocolate · chestnut · soft caramel'}</AppText></View><View style={styles.swatches}><View style={[styles.swatch, { backgroundColor: '#8B5C43' }]} /><View style={[styles.swatch, { backgroundColor: '#C78D67' }]} /><View style={[styles.swatch, { backgroundColor: '#DDAF87' }]} /><View style={[styles.swatch, { backgroundColor: '#7D6D5A' }]} /></View></View>
      <SectionTitle action="See all" onAction={() => router.push('/change')}>WHAT TO TRY NEXT</SectionTitle>
      {state.recommendations.slice(0, 2).map((item) => <RecommendationCard key={item.id} compact title={item.title} subtitle={item.subtitle} tag={item.tag} imageUri={item.imageUri} onPress={() => router.push({ pathname: '/recommendation', params: { id: item.id } })} />)}
      <Button tone="light" icon="share-outline" onPress={() => router.push('/share-card')}>Share my Glow Type</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', paddingTop: spacing.sm },
  topCopy: { flex: 1, flexShrink: 1, minWidth: 0 },
  hero: { alignItems: 'center', backgroundColor: colors.blushSoft, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg, padding: spacing.lg },
  heroCircle: { alignItems: 'center', backgroundColor: colors.clay, borderRadius: 60, height: 104, justifyContent: 'center', width: 104 },
  heroInitials: { color: colors.white, fontSize: 28 },
  heroCopy: { flex: 1, gap: spacing.sm },
  muted: { color: colors.inkSoft },
  stats: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  directionBox: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md },
  direction: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  dot: { backgroundColor: colors.clay, borderRadius: 10, height: 8, width: 8 },
  palette: { alignItems: 'center', backgroundColor: colors.cream, borderRadius: radius.md, flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, padding: spacing.md },
  swatches: { flexDirection: 'row', gap: 4 },
  swatch: { borderRadius: 20, height: 28, width: 28 },
});
