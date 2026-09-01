import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, CreditBadge, Eyebrow, GlowImage, RecommendationCard, SectionTitle } from '@/components/ui';
import { formatGoal } from '@/domain/constants';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  const profile = state.profile;
  const topRecommendation = state.recommendations[0];

  return (
    <Screen>
      <View style={styles.topRow}><View style={styles.topCopy}><Eyebrow>YOUR PERSONAL GLOW</Eyebrow><AppText variant="display" style={styles.greeting}>Good evening, {profile?.displayName ?? state.displayName}</AppText></View><CreditBadge balance={state.wallet.balance} /></View>
      <View style={styles.goalStrip}><View><AppText variant="caption" style={styles.goalLabel}>CURRENT GOAL</AppText><AppText variant="title">{formatGoal(state.goal)}</AppText></View><Button tone="quiet" onPress={() => router.push('/goal')}>Change</Button></View>

      <SectionTitle action="See all" onAction={() => router.push('/change')}>TODAY FOR YOU</SectionTitle>
      <View style={styles.todayCard}>
        <GlowImage uri={topRecommendation?.imageUri ?? 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=85'} style={styles.todayImage} />
        <View style={styles.todayCopy}><Eyebrow>PERSONAL SUGGESTION</Eyebrow><AppText variant="title">Start with one small shift.</AppText><AppText variant="caption" style={styles.softText}>A little face-framing movement is the highest-impact place to explore today.</AppText><Button tone="dark" icon="arrow-forward" onPress={() => router.push(topRecommendation ? { pathname: '/recommendation', params: { id: topRecommendation.id } } : '/change')}>See me</Button></View>
      </View>

      <SectionTitle action="Open blueprint" onAction={() => router.push('/blueprint')}>YOUR GLOW PROFILE</SectionTitle>
      <View style={styles.profileCard}><View style={styles.profileSwatch}><AppText variant="display" style={styles.swatchText}>SA</AppText></View><View style={styles.profileCopy}><AppText variant="title">{profile?.colorSeason ?? 'Soft Autumn'}</AppText><AppText variant="caption" style={styles.softText}>Warm undertone · {profile?.faceShape ?? 'Soft oval'} · {profile?.currentHairLength ?? 'Shoulder length'}</AppText></View><AppText variant="caption" style={styles.arrow}>↗</AppText></View>

      <SectionTitle action="Browse" onAction={() => router.push('/category')}>TRY NEXT</SectionTitle>
      {state.recommendations.slice(0, 2).map((item) => <RecommendationCard key={item.id} compact title={item.title} subtitle={item.subtitle} tag={item.tag} imageUri={item.imageUri} onPress={() => router.push({ pathname: '/recommendation', params: { id: item.id } })} />)}
      {!state.recommendations.length ? <Button onPress={() => router.push('/onboarding')}>Build my blueprint</Button> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', paddingTop: spacing.sm },
  topCopy: { flex: 1, flexShrink: 1, minWidth: 0 },
  greeting: { fontSize: 32, lineHeight: 37 },
  goalStrip: { alignItems: 'center', backgroundColor: colors.cream, borderRadius: radius.md, flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, padding: spacing.md },
  goalLabel: { fontWeight: '700', letterSpacing: 1.2 },
  todayCard: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  todayImage: { borderRadius: 0, height: 190, width: '100%' },
  todayCopy: { gap: spacing.sm, padding: spacing.md },
  softText: { color: colors.inkSoft },
  profileCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  profileSwatch: { alignItems: 'center', backgroundColor: colors.sage, borderRadius: radius.md, height: 62, justifyContent: 'center', width: 62 },
  swatchText: { color: colors.white, fontSize: 25 },
  profileCopy: { flex: 1, gap: 3 },
  arrow: { color: colors.clay, fontSize: 22 },
});
