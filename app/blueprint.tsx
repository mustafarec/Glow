import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Divider, Eyebrow, IconButton, Pill, SectionTitle } from '@/components/ui';
import { formatGoal } from '@/domain/constants';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

export default function BlueprintScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  const profile = state.profile;

  return (
    <Screen>
      <View style={styles.top}><IconButton name="chevron-back" onPress={() => router.replace('/(tabs)')} label="Go to home" /><Pill tone="accent">Your blueprint</Pill><IconButton name="share-outline" onPress={() => router.push('/share-card')} label="Share blueprint" /></View>
      <Eyebrow>{formatGoal(state.goal).toUpperCase()} · MADE FOR {profile?.displayName?.toUpperCase() ?? state.displayName.toUpperCase()}</Eyebrow><AppText variant="display" style={styles.title}>Your Glow Blueprint</AppText><AppText style={styles.subtitle}>A starting point for choices that feel more like you — not a verdict on how you look.</AppText>
      <View style={styles.hero}><View style={styles.heroCircle}><AppText variant="display" style={styles.heroText}>SA</AppText></View><View style={styles.heroCopy}><Pill tone="sage">Warm · softened · versatile</Pill><AppText variant="title">{profile?.colorSeason ?? 'Soft Autumn'}</AppText><AppText variant="caption" style={styles.muted}>Your personal color direction</AppText></View></View>
      <SectionTitle>THE SIGNALS WE FOUND</SectionTitle>
      <View style={styles.signalGrid}><Signal label="Face shape" value={profile?.faceShape ?? 'Soft oval'} /><Signal label="Undertone" value={profile?.undertone ?? 'Warm'} /><Signal label="Current hair" value={profile?.currentHairColor ?? 'Brunette'} /><Signal label="Style energy" value={profile?.preferredAesthetic ?? 'Softly polished'} /></View>
      <Divider /><SectionTitle>BEST HAIR DIRECTION</SectionTitle><View style={styles.list}>{(profile?.bestHairDirections ?? ['Long layers', 'Face framing layers', 'Curtain bangs']).map((item, index) => <View style={styles.listItem} key={item}><AppText variant="title" style={styles.number}>{`0${index + 1}`}</AppText><AppText>{item}</AppText></View>)}</View>
      <SectionTitle>YOUR EASY PALETTE</SectionTitle><AppText variant="title">Hair color</AppText><AppText style={styles.muted}>{profile?.hairColors.join(' · ') ?? 'Warm chocolate · chestnut · soft caramel'}</AppText><AppText variant="title" style={styles.makeupTitle}>Makeup</AppText><AppText style={styles.muted}>{profile?.makeupDirection.join(' · ') ?? 'Peach blush · warm nude lips · soft brown liner'}</AppText>
      <Button tone="dark" icon="sparkles-outline" onPress={() => router.push('/change')} style={styles.cta}>See what I should change</Button><Button tone="quiet" onPress={() => router.replace('/(tabs)')}>Take me home</Button>
    </Screen>
  );
}

function Signal({ label, value }: { label: string; value: string }) { return <View style={styles.signal}><AppText variant="caption" style={styles.muted}>{label}</AppText><AppText variant="label">{value}</AppText></View>; }

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { marginTop: spacing.md },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md },
  hero: { alignItems: 'center', backgroundColor: colors.sageSoft, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg, padding: spacing.lg },
  heroCircle: { alignItems: 'center', backgroundColor: colors.sage, borderRadius: 60, height: 90, justifyContent: 'center', width: 90 },
  heroText: { color: colors.white, fontSize: 25 },
  heroCopy: { flex: 1, gap: spacing.sm },
  muted: { color: colors.inkSoft },
  signalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  signal: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, gap: 4, minHeight: 76, padding: spacing.md, width: '48%' },
  list: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md },
  listItem: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  number: { color: colors.clay, fontSize: 16, width: 26 },
  makeupTitle: { marginTop: spacing.md },
  cta: { marginTop: spacing.xl },
});
