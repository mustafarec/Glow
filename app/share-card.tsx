import { useRouter } from 'expo-router';
import React from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, EmptyState, Eyebrow, IconButton, Pill } from '@/components/ui';
import { useAppStore } from '@/store/AppStore';
import { track } from '@/services/analytics';
import { colors, radius, spacing } from '@/theme';

export default function ShareCardScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  const profile = state.profile;

  if (!profile) return <Screen><View style={styles.top}><IconButton name="chevron-back" onPress={() => router.back()} label="Go back" /><Pill tone="accent">Shareable result</Pill><View style={styles.spacer} /></View><EmptyState icon="person-outline" title="Nothing to share yet." description="Complete your Glow Profile before creating a share card." action="Start onboarding" onAction={() => router.replace('/onboarding')} /></Screen>;

  const share = async () => {
    track('share_created', { type: 'glow-type' });
    await Share.share({ message: `My Glow Type is ${profile.colorSeason} — best hair: ${profile.hairColors[0]}, best metal: ${profile.metals[0]}.` });
    track('share_completed', { type: 'glow-type' });
  };

  return <Screen><View style={styles.top}><IconButton name="chevron-back" onPress={() => router.back()} label="Go back" /><Pill tone="accent">Shareable result</Pill><View style={styles.spacer} /></View><Eyebrow>MADE TO SHARE, STILL YOURS</Eyebrow><AppText variant="display" style={styles.title}>My Glow Type</AppText><AppText style={styles.subtitle}>A compact visual direction for your next hair, color or makeup choice.</AppText><View style={styles.card}><View style={styles.cardTop}><AppText variant="eyebrow" style={styles.cardEyebrow}>GLOW / 01</AppText><AppText variant="display" style={styles.cardMark}>g</AppText></View><AppText variant="display" style={styles.season}>{profile.colorSeason}</AppText><AppText style={styles.cardLead}>{profile.preferredAesthetic} · {profile.undertone} undertone</AppText><View style={styles.cardGrid}><ShareStat label="BEST HAIR" value={profile.hairColors[0]} /><ShareStat label="BEST LIP" value={profile.makeupDirection[1] ?? profile.makeupDirection[0]} /><ShareStat label="BEST BLUSH" value={profile.makeupDirection[0]} /><ShareStat label="BEST METAL" value={profile.metals[0]} /></View><View style={styles.cardFooter}><AppText variant="caption" style={styles.cardFooterText}>discover what actually suits you</AppText><AppText variant="caption" style={styles.cardFooterText}>GLOW</AppText></View></View><Button tone="dark" icon="share-outline" onPress={share}>Share my Glow Type</Button><AppText variant="caption" style={styles.note}>Your card uses styling signals, never a beauty score or ranking.</AppText></Screen>;
}

function ShareStat({ label, value }: { label: string; value: string }) { return <View style={styles.shareStat}><AppText variant="eyebrow" style={styles.statLabel}>{label}</AppText><AppText variant="label" style={styles.statValue}>{value}</AppText></View>; }

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  spacer: { height: 40, width: 40 },
  title: { marginTop: spacing.md },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md },
  card: { backgroundColor: colors.ink, borderRadius: 30, marginVertical: spacing.xl, padding: spacing.lg },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  cardEyebrow: { color: colors.blush },
  cardMark: { color: colors.blush, fontSize: 34, lineHeight: 38 },
  season: { color: colors.paper, fontSize: 34, marginTop: spacing.xl },
  cardLead: { color: '#D2C6B9', marginTop: spacing.sm },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl },
  shareStat: { width: '45%' },
  statLabel: { color: colors.blush },
  statValue: { color: colors.paper, marginTop: 4 },
  cardFooter: { borderTopColor: '#4C4540', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl, paddingTop: spacing.md },
  cardFooterText: { color: '#B8ACA1' },
  note: { color: colors.muted, marginTop: spacing.md, textAlign: 'center' },
});
