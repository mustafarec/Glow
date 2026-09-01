import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, CreditBadge, EmptyState, Eyebrow, Pill, RecommendationCard, SectionTitle, Stat } from '@/components/ui';
import { formatGoal } from '@/domain/constants';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

export default function GlowScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  const profile = state.profile;
  const profileMark = profile?.colorSeason.slice(0, 2).toUpperCase() ?? '—';

  return (
    <Screen>
      <View style={styles.topRow}><View style={styles.topCopy}><Eyebrow>THE PROFILE THAT LEARNS YOU</Eyebrow><AppText variant="display">Your Glow</AppText></View><CreditBadge balance={state.wallet.balance} /></View>
      {profile ? <View style={styles.hero}><View style={styles.heroCircle}><AppText variant="display" style={styles.heroInitials}>{profileMark}</AppText></View><View style={styles.heroCopy}><Pill tone="accent">{formatGoal(state.goal)}</Pill><AppText variant="title">{profile.colorSeason}</AppText><AppText variant="caption" style={styles.muted}>{profile.preferredAesthetic}</AppText></View></View> : <EmptyState icon="person-outline" title="Your Glow Profile is empty." description="Complete onboarding with a consented selfie to receive production AI signals." action="Start onboarding" onAction={() => router.push('/onboarding')} />}
      <SectionTitle>YOUR SIGNALS</SectionTitle>
      {profile ? <View style={styles.stats}><Stat value={profile.faceShape} label="face shape" /><Stat value={profile.undertone} label="undertone" /><Stat value={profile.currentHairLength} label="current length" /></View> : null}
      <SectionTitle action="Edit goal" onAction={() => router.push('/goal')}>BEST DIRECTIONS</SectionTitle>
      {profile ? <View style={styles.directionBox}>{profile.bestHairDirections.map((direction) => <View key={direction} style={styles.direction}><View style={styles.dot} /><AppText>{direction}</AppText></View>)}</View> : null}
      {profile ? <View style={styles.palette}><View><Eyebrow>COLOR PROFILE</Eyebrow><AppText variant="title">{profile.colorSeason}</AppText><AppText variant="caption" style={styles.muted}>{profile.hairColors.join(' · ')}</AppText></View></View> : null}
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
});
